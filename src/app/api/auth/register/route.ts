import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createEmailVerificationToken, sendVerificationEmail } from "@/lib/auth-utils";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        name,
        passwordHash,
        emailVerified: false,
      },
    });

    // Create email verification token and send email
    try {
      const verificationToken = await createEmailVerificationToken(user.id);
      await sendVerificationEmail(normalizedEmail, name || "", verificationToken);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Continue - user is created, they can request verification later
    }

    await createAuditLog({
      userId: user.id,
      action: "register",
      resourceType: "user",
      resourceId: user.id,
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
