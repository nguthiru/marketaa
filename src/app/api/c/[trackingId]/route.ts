import { NextRequest, NextResponse } from "next/server";
import { recordClickEvent } from "@/lib/tracking/links";

/**
 * GET /api/c/[trackingId] - Click tracking redirect endpoint
 * Records the click event and redirects to the original URL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  const { trackingId } = await params;

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined;
  const userAgent = request.headers.get("user-agent") || undefined;

  // Record click and get original URL
  const originalUrl = await recordClickEvent(trackingId, ipAddress, userAgent);

  if (!originalUrl) {
    // If no valid tracking record found, redirect to homepage
    return NextResponse.redirect(
      new URL("/", process.env.NEXTAUTH_URL || "http://localhost:3000")
    );
  }

  // Redirect to the original URL
  return NextResponse.redirect(originalUrl);
}
