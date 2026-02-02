import { NextRequest, NextResponse } from "next/server";
import { verifyEmail } from "@/lib/auth-utils";
import { createAuditLog } from "@/lib/audit";

// POST /api/auth/verify-email - Verify email with token
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      );
    }

    const result = await verifyEmail(token);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Verification failed" },
        { status: 400 }
      );
    }

    if (result.user) {
      await createAuditLog({
        userId: result.user.id,
        action: "email_verified",
        resourceType: "user",
        resourceId: result.user.id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to verify email:", error);
    return NextResponse.json(
      { error: "Failed to verify email" },
      { status: 500 }
    );
  }
}
