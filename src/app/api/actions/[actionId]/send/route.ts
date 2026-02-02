import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail, validateEmailRecipient } from "@/lib/email";

// POST /api/actions/[actionId]/send - Send email via Resend
export async function POST(
  request: Request,
  { params }: { params: Promise<{ actionId: string }> }
) {
  const session = await getServerSession(authOptions);
  const { actionId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const action = await db.action.findUnique({
    where: { id: actionId },
    include: {
      lead: { include: { project: true } },
    },
  });

  if (!action) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  // Verify access
  const hasAccess =
    action.lead.project.ownerId === session.user.id ||
    (await db.projectMember.findFirst({
      where: {
        projectId: action.lead.project.id,
        userId: session.user.id,
      },
    }));

  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validate action is ready to send
  if (action.type !== "email") {
    return NextResponse.json(
      { error: "Action is not an email" },
      { status: 400 }
    );
  }

  if (action.sentAt) {
    return NextResponse.json(
      { error: "Email has already been sent" },
      { status: 400 }
    );
  }

  // Validate recipient email
  const toEmail = validateEmailRecipient(action.lead.email);
  if (!toEmail) {
    return NextResponse.json(
      { error: "Lead does not have a valid email address" },
      { status: 400 }
    );
  }

  // Get optional from email from request body
  let fromEmail: string | undefined;
  try {
    const body = await request.json();
    fromEmail = body.fromEmail;
  } catch {
    // No body provided, use default
  }

  // Send the email
  const result = await sendEmail({
    to: toEmail,
    subject: action.subject || "No Subject",
    body: action.body,
    from: fromEmail,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "Failed to send email" },
      { status: 500 }
    );
  }

  const now = new Date();

  // Update action with sent details
  const updatedAction = await db.action.update({
    where: { id: actionId },
    data: {
      status: "sent",
      resendId: result.resendId,
      sentAt: now,
      fromEmail: fromEmail || process.env.RESEND_FROM_EMAIL || "noreply@example.com",
      toEmail: toEmail,
    },
    include: {
      plan: true,
      feedback: true,
      emailMessages: { orderBy: { createdAt: "asc" } },
    },
  });

  // Create outbound email message record
  const emailMessage = await db.emailMessage.create({
    data: {
      actionId: actionId,
      direction: "outbound",
      subject: action.subject,
      body: action.body,
      resendId: result.resendId,
    },
  });

  // Update lead status to "contacted" if not already
  if (action.lead.status === "not_contacted") {
    await db.lead.update({
      where: { id: action.lead.id },
      data: { status: "contacted" },
    });
  }

  return NextResponse.json({
    success: true,
    resendId: result.resendId,
    sentAt: now.toISOString(),
    action: updatedAction,
    emailMessage,
  });
}
