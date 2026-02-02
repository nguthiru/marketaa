import { NextRequest, NextResponse } from "next/server";
import { createPasswordResetToken, sendPasswordResetEmail } from "@/lib/auth-utils";

// POST /api/auth/forgot-password - Request password reset
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Create token (returns null if user doesn't exist, but we don't reveal that)
    const token = await createPasswordResetToken(normalizedEmail);

    if (token) {
      // Send reset email
      await sendPasswordResetEmail(normalizedEmail, token);
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, you will receive a password reset link.",
    });
  } catch (error) {
    console.error("Failed to process password reset:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
