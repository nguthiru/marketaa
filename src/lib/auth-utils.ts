import { db } from "./db";
import { sendEmail } from "./email";
import crypto from "crypto";

// Generate a secure random token
export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Password reset
export async function createPasswordResetToken(email: string): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    // Don't reveal if user exists
    return null;
  }

  // Invalidate any existing tokens
  await db.passwordReset.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  });

  // Create new token
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.passwordReset.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  return token;
}

export async function validatePasswordResetToken(token: string) {
  const reset = await db.passwordReset.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!reset) {
    return { valid: false, error: "Invalid token" };
  }

  if (reset.used) {
    return { valid: false, error: "Token already used" };
  }

  if (reset.expiresAt < new Date()) {
    return { valid: false, error: "Token expired" };
  }

  return { valid: true, reset };
}

export async function usePasswordResetToken(token: string) {
  await db.passwordReset.update({
    where: { token },
    data: { used: true },
  });
}

// Email verification
export async function createEmailVerificationToken(userId: string): Promise<string> {
  // Invalidate any existing tokens
  await db.emailVerification.updateMany({
    where: { userId, used: false },
    data: { used: true },
  });

  // Create new token
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.emailVerification.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return token;
}

export async function validateEmailVerificationToken(token: string) {
  const verification = await db.emailVerification.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!verification) {
    return { valid: false, error: "Invalid token" };
  }

  if (verification.used) {
    return { valid: false, error: "Token already used" };
  }

  if (verification.expiresAt < new Date()) {
    return { valid: false, error: "Token expired" };
  }

  return { valid: true, verification };
}

export async function verifyEmail(token: string) {
  const { valid, error, verification } = await validateEmailVerificationToken(token);

  if (!valid || !verification) {
    return { success: false, error };
  }

  await db.$transaction([
    db.emailVerification.update({
      where: { token },
      data: { used: true },
    }),
    db.user.update({
      where: { id: verification.userId },
      data: { emailVerified: true },
    }),
  ]);

  return { success: true, user: verification.user };
}

// Send password reset email
export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

  await sendEmail({
    to: email,
    subject: "Reset your password - Marketaa",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10b981;">Reset Your Password</h1>
        <p>You requested to reset your password. Click the button below to create a new password:</p>
        <a href="${resetUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

// Send email verification email
export async function sendVerificationEmail(email: string, name: string, token: string) {
  const verifyUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`;

  await sendEmail({
    to: email,
    subject: "Verify your email - Marketaa",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10b981;">Welcome to Marketaa!</h1>
        <p>Hi ${name || "there"},</p>
        <p>Thanks for signing up! Please verify your email address by clicking the button below:</p>
        <a href="${verifyUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
          Verify Email
        </a>
        <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
        <p style="color: #666; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
  });
}

// Send team invite email
export async function sendTeamInviteEmail(
  email: string,
  inviterName: string,
  projectName: string,
  token: string
) {
  const inviteUrl = `${process.env.NEXTAUTH_URL}/invite?token=${token}`;

  await sendEmail({
    to: email,
    subject: `${inviterName} invited you to join ${projectName} on Marketaa`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10b981;">You're invited!</h1>
        <p><strong>${inviterName}</strong> has invited you to collaborate on <strong>${projectName}</strong> in Marketaa.</p>
        <a href="${inviteUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
          Accept Invitation
        </a>
        <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
      </div>
    `,
  });
}
