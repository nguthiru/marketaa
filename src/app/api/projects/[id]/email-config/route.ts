import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - fetch email config for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { id } = await params;

  // Check access
  const project = await db.project.findFirst({
    where: {
      id,
      OR: [
        { ownerId: userId },
        { members: { some: { userId: userId } } },
      ],
    },
    include: { emailConfig: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Also fetch account config to check if available
  const accountConfig = await db.userEmailConfig.findUnique({
    where: { userId: userId },
  });

  const config = project.emailConfig;
  if (!config) {
    return NextResponse.json({
      config: null,
      hasAccountConfig: !!accountConfig,
      accountConfigVerified: accountConfig?.isVerified || false,
    });
  }

  return NextResponse.json({
    config: {
      id: config.id,
      useAccountConfig: config.useAccountConfig,
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
    hasAccountConfig: !!accountConfig,
    accountConfigVerified: accountConfig?.isVerified || false,
  });
}

// POST - create or update email config
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { id } = await params;

  // Check access (only owner/admin can configure email)
  const project = await db.project.findFirst({
    where: {
      id,
      OR: [
        { ownerId: userId },
        { members: { some: { userId: userId, role: "admin" } } },
      ],
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await request.json();
  const {
    useAccountConfig,
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

  // Prepare data - only update fields that are provided
  const data: Record<string, unknown> = {
    useAccountConfig: useAccountConfig || false,
    provider: provider || "resend",
    fromEmail: fromEmail || null,
    fromName: fromName || null,
    replyTo: replyTo || null,
    isVerified: false, // Reset verification on update
  };

  // If using account config, we don't need to store provider-specific settings
  if (useAccountConfig) {
    data.resendApiKey = null;
    data.smtpHost = null;
    data.smtpPort = null;
    data.smtpUser = null;
    data.smtpPassword = null;
    data.isVerified = true; // Account config is already verified
  }

  // Handle Resend config
  if (provider === "resend") {
    // Only update API key if a new one is provided (not masked)
    if (resendApiKey && !resendApiKey.startsWith("••••")) {
      data.resendApiKey = resendApiKey;
    }
    // Clear SMTP fields
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
    // Only update password if a new one is provided (not masked)
    if (smtpPassword && !smtpPassword.startsWith("••••")) {
      data.smtpPassword = smtpPassword;
    }
    // Clear Resend fields
    data.resendApiKey = null;
  }

  // Upsert the config
  const config = await db.projectEmailConfig.upsert({
    where: { projectId: id },
    create: {
      projectId: id,
      ...data,
    } as Parameters<typeof db.projectEmailConfig.create>[0]["data"],
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

// DELETE - remove email config
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { id } = await params;

  // Check access
  const project = await db.project.findFirst({
    where: {
      id,
      OR: [
        { ownerId: userId },
        { members: { some: { userId: userId, role: "admin" } } },
      ],
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  await db.projectEmailConfig.deleteMany({
    where: { projectId: id },
  });

  return NextResponse.json({ success: true });
}
