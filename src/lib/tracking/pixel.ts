import { db } from "@/lib/db";
import crypto from "crypto";

/**
 * Generate a unique tracking ID
 */
export function generateTrackingId(): string {
  return crypto.randomUUID();
}

/**
 * Create a tracking record for an action
 */
export async function createOpenTracker(actionId: string): Promise<string> {
  const trackingId = generateTrackingId();

  await db.emailTrackingEvent.create({
    data: {
      type: "open",
      actionId,
      trackingId,
    },
  });

  return trackingId;
}

/**
 * Generate HTML for tracking pixel
 */
export function generateTrackingPixelHtml(
  trackingId: string,
  baseUrl?: string
): string {
  const base = baseUrl || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const pixelUrl = `${base}/api/t/${trackingId}`;

  return `<img src="${pixelUrl}" width="1" height="1" style="display:none;width:1px;height:1px;border:0;" alt="" />`;
}

/**
 * Build the tracking pixel URL
 */
export function buildTrackingPixelUrl(
  trackingId: string,
  baseUrl?: string
): string {
  const base = baseUrl || process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${base}/api/t/${trackingId}`;
}

/**
 * Record an open event
 */
export async function recordOpenEvent(
  trackingId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> {
  try {
    // Find the tracking record
    const tracker = await db.emailTrackingEvent.findUnique({
      where: { trackingId },
      include: { action: true },
    });

    if (!tracker || tracker.type !== "open") {
      return false;
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

    // Update action open counts
    const action = tracker.action;
    await db.action.update({
      where: { id: action.id },
      data: {
        openCount: { increment: 1 },
        firstOpenedAt: action.firstOpenedAt || new Date(),
        lastOpenedAt: new Date(),
      },
    });

    return true;
  } catch (error) {
    console.error("Error recording open event:", error);
    return false;
  }
}

/**
 * Inject tracking pixel into HTML email body
 */
export function injectTrackingPixel(
  htmlBody: string,
  trackingId: string,
  baseUrl?: string
): string {
  const pixel = generateTrackingPixelHtml(trackingId, baseUrl);

  // Try to inject before closing body tag
  if (htmlBody.toLowerCase().includes("</body>")) {
    return htmlBody.replace(/<\/body>/i, `${pixel}</body>`);
  }

  // Otherwise append at the end
  return htmlBody + pixel;
}

// 1x1 transparent GIF as a Buffer
export const TRANSPARENT_GIF_BUFFER = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);
