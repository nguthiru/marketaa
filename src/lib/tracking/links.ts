import { db } from "@/lib/db";
import crypto from "crypto";

/**
 * Generate a unique tracking ID for a link
 */
export function generateLinkTrackingId(): string {
  return crypto.randomUUID();
}

/**
 * Store click tracking mapping
 */
export async function createClickTracker(
  actionId: string,
  originalUrl: string
): Promise<string> {
  const trackingId = generateLinkTrackingId();

  await db.emailTrackingEvent.create({
    data: {
      type: "click",
      actionId,
      trackingId,
      originalUrl,
    },
  });

  return trackingId;
}

/**
 * Build the click tracking URL
 */
export function buildClickTrackingUrl(
  trackingId: string,
  baseUrl?: string
): string {
  const base = baseUrl || process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${base}/api/c/${trackingId}`;
}

/**
 * Record a click event and get the original URL
 */
export async function recordClickEvent(
  trackingId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string | null> {
  try {
    const tracker = await db.emailTrackingEvent.findUnique({
      where: { trackingId },
      include: { action: true },
    });

    if (!tracker || tracker.type !== "click" || !tracker.originalUrl) {
      return null;
    }

    // Update the tracking event with request info
    await db.emailTrackingEvent.update({
      where: { id: tracker.id },
      data: {
        ipAddress,
        userAgent,
        timestamp: new Date(),
      },
    });

    // Update action click counts
    await db.action.update({
      where: { id: tracker.action.id },
      data: {
        clickCount: { increment: 1 },
      },
    });

    return tracker.originalUrl;
  } catch (error) {
    console.error("Error recording click event:", error);
    return null;
  }
}

/**
 * Rewrite links in HTML for click tracking
 */
export async function rewriteLinksForTracking(
  htmlBody: string,
  actionId: string,
  baseUrl?: string
): Promise<string> {
  // Regex to match href attributes in anchor tags
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["']/gi;
  const links: { match: string; url: string }[] = [];

  // First pass: collect all links
  let match;
  while ((match = linkRegex.exec(htmlBody)) !== null) {
    const url = match[1];

    // Skip special URLs
    if (
      url.startsWith("mailto:") ||
      url.startsWith("tel:") ||
      url.startsWith("#") ||
      url.startsWith("javascript:") ||
      // Skip unsubscribe links (they already have tracking)
      url.includes("/api/unsubscribe/") ||
      url.includes("/unsubscribe/")
    ) {
      continue;
    }

    links.push({ match: match[0], url });
  }

  // Second pass: create trackers and replace
  let result = htmlBody;
  for (const link of links) {
    const trackingId = await createClickTracker(actionId, link.url);
    const trackingUrl = buildClickTrackingUrl(trackingId, baseUrl);

    // Replace the href value
    const newMatch = link.match.replace(link.url, trackingUrl);
    result = result.replace(link.match, newMatch);
  }

  return result;
}

/**
 * Get click statistics for an action
 */
export async function getClickStats(actionId: string): Promise<{
  totalClicks: number;
  uniqueLinks: number;
  clicksByUrl: Record<string, number>;
}> {
  const events = await db.emailTrackingEvent.findMany({
    where: {
      actionId,
      type: "click",
    },
  });

  const clicksByUrl: Record<string, number> = {};
  for (const event of events) {
    if (event.originalUrl) {
      clicksByUrl[event.originalUrl] = (clicksByUrl[event.originalUrl] || 0) + 1;
    }
  }

  return {
    totalClicks: events.length,
    uniqueLinks: Object.keys(clicksByUrl).length,
    clicksByUrl,
  };
}
