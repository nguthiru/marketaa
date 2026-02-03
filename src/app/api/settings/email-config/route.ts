import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - fetch account email config
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const config = await db.userEmailConfig.findUnique({
    where: { userId: userId },
  });

  if (!config) {
    return NextResponse.json({ config: null });
  }

  return NextResponse.json({
    config: {
      id: config.id,
      provider: config.provider,
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      replyTo: config.replyTo,
      // Mask sensitive fields
      resendApiKey: config.resendApiKey ? "••••••••" + config.resendApiKey.slice(-4) : null,
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpSecure: config.smtpSecure,
      smtpUser: config.smtpUser,
      smtpPassword: config.smtpPassword ? "••••••••" : null,
      isVerified: config.isVerified,
      lastTestedAt: config.lastTestedAt,
    },
  });
}

// POST - create or update account email config
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await request.json();
  const {
    provider,
    fromEmail,
    fromName,
    replyTo,
    resendApiKey,
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPassword,
  } = body;

  // Prepare data
  const data: Record<string, unknown> = {
    provider: provider || "resend",
    fromEmail: fromEmail || null,
    fromName: fromName || null,
    replyTo: replyTo || null,
    isVerified: false,
  };

  // Handle Resend config
  if (provider === "resend") {
    if (resendApiKey && !resendApiKey.startsWith("••••")) {
      data.resendApiKey = resendApiKey;
    }
    data.smtpHost = null;
    data.smtpPort = null;
    data.smtpUser = null;
    data.smtpPassword = null;
  }

  // Handle SMTP config
  if (provider === "smtp") {
    data.smtpHost = smtpHost || null;
    data.smtpPort = smtpPort ? parseInt(smtpPort) : null;
    data.smtpSecure = smtpSecure ?? true;
    data.smtpUser = smtpUser || null;
    if (smtpPassword && !smtpPassword.startsWith("••••")) {
      data.smtpPassword = smtpPassword;
    }
    data.resendApiKey = null;
  }

  const config = await db.userEmailConfig.upsert({
    where: { userId: userId },
    create: {
      userId: userId,
      ...data,
    } as Parameters<typeof db.userEmailConfig.create>[0]["data"],
    update: data,
  });

  return NextResponse.json({
    success: true,
    config: {
      id: config.id,
      provider: config.provider,
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      replyTo: config.replyTo,
      isVerified: config.isVerified,
    },
  });
}

// DELETE - remove account email config
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  await db.userEmailConfig.deleteMany({
    where: { userId },
  });

  return NextResponse.json({ success: true });
}
