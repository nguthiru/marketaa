import { NextRequest, NextResponse } from "next/server";
import { recordOpenEvent, TRANSPARENT_GIF_BUFFER } from "@/lib/tracking/pixel";

/**
 * GET /api/t/[trackingId] - Tracking pixel endpoint
 * Returns a 1x1 transparent GIF and records the open event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  const { trackingId } = await params;

  // Record the open event asynchronously (don't block response)
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined;
  const userAgent = request.headers.get("user-agent") || undefined;

  // Fire and forget - don't wait for DB write
  recordOpenEvent(trackingId, ipAddress, userAgent).catch((err) => {
    console.error("Failed to record open event:", err);
  });

  // Return 1x1 transparent GIF with no-cache headers
  return new NextResponse(TRANSPARENT_GIF_BUFFER, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(TRANSPARENT_GIF_BUFFER.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
