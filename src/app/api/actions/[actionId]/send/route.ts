import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail, validateEmailRecipient, textToHtml } from "@/lib/email";
import { isEmailSuppressed, getSuppressionDetails } from "@/lib/unsubscribe/suppression";
import { getOrCreateUnsubscribeToken } from "@/lib/unsubscribe/tokens";
import {
  buildUnsubscribeUrl,
  injectUnsubscribeFooter,
  injectUnsubscribeText,
  generateListUnsubscribeHeaders,
} from "@/lib/unsubscribe/footer";
import { createOpenTracker, injectTrackingPixel } from "@/lib/tracking/pixel";
import { rewriteLinksForTracking } from "@/lib/tracking/links";

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

  // Check if email is suppressed
  const suppressed = await isEmailSuppressed(toEmail, action.lead.projectId);
  if (suppressed) {
    const details = await getSuppressionDetails(toEmail, action.lead.projectId);
    return NextResponse.json(
      {
        error: "Email is suppressed",
        reason: details?.reason || "unsubscribed",
        message: `This email address has been suppressed (${details?.reason || "unsubscribed"}). Cannot send emails to suppressed addresses.`,
      },
      { status: 400 }
    );
  }

  // Get optional from email from request body
  let fromEmail: string | undefined;
  let skipUnsubscribe = false;
  let skipTracking = false;
  try {
    const body = await request.json();
    fromEmail = body.fromEmail;
    skipUnsubscribe = body.skipUnsubscribe === true;
    skipTracking = body.skipTracking === true;
  } catch {
    // No body provided, use default
  }

  // Generate unsubscribe token and URL
  let unsubscribeUrl: string | undefined;
  let unsubscribeHeaders: Record<string, string> = {};

  if (!skipUnsubscribe) {
    const unsubscribeToken = await getOrCreateUnsubscribeToken(actionId, toEmail);
    unsubscribeUrl = buildUnsubscribeUrl(unsubscribeToken);
    unsubscribeHeaders = generateListUnsubscribeHeaders(unsubscribeUrl, toEmail);
  }

  // Prepare email body with unsubscribe footer
  let htmlBody = textToHtml(action.body);
  let textBody = action.body;

  if (unsubscribeUrl) {
    htmlBody = injectUnsubscribeFooter(htmlBody, unsubscribeUrl);
    textBody = injectUnsubscribeText(textBody, unsubscribeUrl);
  }

  // Add email tracking (opens and clicks)
  if (!skipTracking) {
    // Create open tracker and inject pixel
    const openTrackingId = await createOpenTracker(actionId);
    htmlBody = injectTrackingPixel(htmlBody, openTrackingId);

    // Rewrite links for click tracking
    htmlBody = await rewriteLinksForTracking(htmlBody, actionId);
  }

  // Send the email
  const result = await sendEmail({
    to: toEmail,
    subject: action.subject || "No Subject",
    body: textBody,
    html: htmlBody,
    from: fromEmail,
    headers: unsubscribeHeaders,
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

  // Increment template/variant send count if this action used a template
  if (action.templateId) {
    await db.emailTemplate.update({
      where: { id: action.templateId },
      data: { sendCount: { increment: 1 } },
    });

    // If a specific variant was used, increment its count too
    if (action.variantId) {
      await db.templateVariant.update({
        where: { id: action.variantId },
        data: { sendCount: { increment: 1 } },
      });
    }
  }

  return NextResponse.json({
    success: true,
    resendId: result.resendId,
    sentAt: now.toISOString(),
    action: updatedAction,
    emailMessage,
  });
}
