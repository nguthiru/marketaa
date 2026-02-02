import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createEmailVerificationToken, sendVerificationEmail } from "@/lib/auth-utils";

// POST /api/auth/resend-verification - Resend verification email
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email already verified" },
        { status: 400 }
      );
    }

    // Create new verification token
    const token = await createEmailVerificationToken(user.id);

    // Send verification email
    await sendVerificationEmail(user.email, user.name || "", token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to resend verification:", error);
    return NextResponse.json(
      { error: "Failed to resend verification email" },
      { status: 500 }
    );
  }
}
