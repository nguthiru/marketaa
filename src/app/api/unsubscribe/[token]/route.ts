import { NextRequest, NextResponse } from "next/server";
import { validateUnsubscribeToken, markTokenUsed } from "@/lib/unsubscribe/tokens";
import { addToSuppressionList } from "@/lib/unsubscribe/suppression";

/**
 * RFC 8058 One-Click Unsubscribe - POST method
 * Email clients send POST request with "List-Unsubscribe=One-Click"
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const validation = await validateUnsubscribeToken(token);

    if (!validation.valid || !validation.record) {
      return NextResponse.json(
        { error: validation.reason || "Invalid token" },
        { status: 400 }
      );
    }

    const { record } = validation;

    // Add to suppression list
    await addToSuppressionList(
      record.email,
      "unsubscribe",
      "one_click",
      record.action.lead.projectId,
      {
        originalLeadId: record.action.leadId,
        ipAddress:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          undefined,
        userAgent: request.headers.get("user-agent") || undefined,
      }
    );

    // Mark token as used
    await markTokenUsed(record.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json(
      { error: "Failed to process unsubscribe request" },
      { status: 500 }
    );
  }
}

/**
 * GET method - Redirect to unsubscribe confirmation page
 * Used when user clicks the unsubscribe link in email
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const validation = await validateUnsubscribeToken(token);

    if (!validation.valid) {
      // Redirect to error page
      const errorUrl = new URL("/unsubscribe/error", request.url);
      errorUrl.searchParams.set("reason", validation.reason || "invalid");
      return NextResponse.redirect(errorUrl);
    }

    // Redirect to confirmation page
    const confirmUrl = new URL(`/unsubscribe/${token}`, request.url);
    return NextResponse.redirect(confirmUrl);
  } catch (error) {
    console.error("Unsubscribe redirect error:", error);
    const errorUrl = new URL("/unsubscribe/error", request.url);
    errorUrl.searchParams.set("reason", "error");
    return NextResponse.redirect(errorUrl);
  }
}
