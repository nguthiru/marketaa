import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createTransport } from "nodemailer";
import { Resend } from "resend";

// POST - test account email configuration
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const config = await db.userEmailConfig.findUnique({
    where: { userId },
  });

  if (!config) {
    return NextResponse.json({ error: "No email configuration found" }, { status: 400 });
  }

  const { testEmail } = await request.json();
  if (!testEmail) {
    return NextResponse.json({ error: "Test email address required" }, { status: 400 });
  }

  try {
    if (config.provider === "resend") {
      if (!config.resendApiKey) {
        return NextResponse.json({ error: "Resend API key not configured" }, { status: 400 });
      }

      const resend = new Resend(config.resendApiKey);
      const { error } = await resend.emails.send({
        from: config.fromEmail || "test@resend.dev",
        to: testEmail,
        subject: "Account Email Configuration Test",
        html: `
          <h2>Account Email Configuration Test</h2>
          <p>This is a test email from your account email settings.</p>
          <p>If you received this email, your email configuration is working correctly.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Sent via Resend</p>
        `,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    } else if (config.provider === "smtp") {
      if (!config.smtpHost || !config.smtpPort) {
        return NextResponse.json({ error: "SMTP host and port required" }, { status: 400 });
      }

      const transporter = createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure,
        auth: config.smtpUser ? {
          user: config.smtpUser,
          pass: config.smtpPassword || "",
        } : undefined,
      });

      await transporter.verify();

      const fromAddress = config.fromEmail || config.smtpUser;
      if (!fromAddress) {
        return NextResponse.json({ error: "From email address required" }, { status: 400 });
      }

      await transporter.sendMail({
        from: config.fromName
          ? `"${config.fromName}" <${fromAddress}>`
          : fromAddress,
        to: testEmail,
        subject: "Account Email Configuration Test",
        html: `
          <h2>Account Email Configuration Test</h2>
          <p>This is a test email from your account email settings.</p>
          <p>If you received this email, your SMTP configuration is working correctly.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Sent via SMTP (${config.smtpHost})</p>
        `,
      });
    } else {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    await db.userEmailConfig.update({
      where: { id: config.id },
      data: {
        isVerified: true,
        lastTestedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${testEmail}`,
    });
  } catch (error) {
    console.error("Email test failed:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to send test email",
    }, { status: 400 });
  }
}
