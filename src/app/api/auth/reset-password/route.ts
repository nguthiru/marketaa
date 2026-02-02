import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validatePasswordResetToken, usePasswordResetToken } from "@/lib/auth-utils";
import { createAuditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";

// POST /api/auth/reset-password - Reset password with token
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Validate token
    const result = await validatePasswordResetToken(token);

    if (!result.valid || !result.reset) {
      return NextResponse.json(
        { error: result.error || "Invalid or expired token" },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password
    await db.user.update({
      where: { id: result.reset.userId },
      data: { passwordHash: hashedPassword },
    });

    // Mark token as used
    await usePasswordResetToken(token);

    await createAuditLog({
      userId: result.reset.userId,
      action: "password_reset",
      resourceType: "user",
      resourceId: result.reset.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to reset password:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
