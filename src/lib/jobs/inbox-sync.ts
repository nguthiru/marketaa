import { db } from "@/lib/db";
import { getGmailAccessToken, listGmailMessages, getGmailMessage, parseEmailHeaders, decodeEmailBody } from "@/lib/integrations/gmail/client";
import { classifyAndStoreReply, getClassificationDisplayInfo } from "@/lib/ai/reply-classifier";

interface SyncResult {
  provider: string;
  messagesChecked: number;
  repliesFound: number;
  errors: string[];
}

// Sync inbox for a user
export async function syncUserInbox(userId: string): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  // Get all connected email integrations
  const integrations = await db.integration.findMany({
    where: {
      userId,
      status: "connected",
      type: { in: ["email_gmail", "email_outlook"] },
    },
  });

  for (const integration of integrations) {
    if (integration.type === "email_gmail") {
      const result = await syncGmailInbox(userId, integration.id);
      results.push(result);
    }
    // TODO: Add Outlook sync
  }

  return results;
}

// Sync Gmail inbox
async function syncGmailInbox(userId: string, integrationId: string): Promise<SyncResult> {
  const result: SyncResult = {
    provider: "gmail",
    messagesChecked: 0,
    repliesFound: 0,
    errors: [],
  };

  try {
    const auth = await getGmailAccessToken(userId);
    if (!auth) {
      result.errors.push("Gmail not connected");
      return result;
    }

    // Get sent emails from the last 7 days that we need to track
    const recentActions = await db.action.findMany({
      where: {
        lead: {
          project: {
            OR: [
              { ownerId: userId },
              { members: { some: { userId } } },
            ],
          },
        },
        status: "sent",
        sentAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        toEmail: { not: null },
      },
      include: {
        lead: true,
        emailMessages: {
          where: { direction: "inbound" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (recentActions.length === 0) {
      return result;
    }

    // Build search query for replies
    // Search for emails from any of the leads we've contacted
    const leadEmails = [...new Set(recentActions.map((a) => a.toEmail).filter(Boolean))];

    for (const leadEmail of leadEmails) {
      try {
        // Search for emails from this address
        const query = `from:${leadEmail} newer_than:7d`;
        const messages = await listGmailMessages(userId, query, 20);

        if (!messages.messages || messages.messages.length === 0) {
          continue;
        }

        result.messagesChecked += messages.messages.length;

        // Process each message
        for (const msg of messages.messages) {
          const processed = await processGmailReply(userId, msg.id, msg.threadId, recentActions);
          if (processed) {
            result.repliesFound++;
          }
        }
      } catch (error) {
        result.errors.push(`Error checking ${leadEmail}: ${error}`);
      }
    }

    // Update last sync time
    await db.integration.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    });

  } catch (error) {
    result.errors.push(`Gmail sync error: ${error}`);
  }

  return result;
}

// Process a single Gmail reply
async function processGmailReply(
  userId: string,
  messageId: string,
  threadId: string,
  recentActions: Awaited<ReturnType<typeof db.action.findMany>>
): Promise<boolean> {
  try {
    // Check if we already processed this message
    const existing = await db.emailMessage.findFirst({
      where: { externalId: messageId },
    });

    if (existing) {
      return false;
    }

    // Get full message details
    const message = await getGmailMessage(userId, messageId);
    const headers = parseEmailHeaders(message.payload.headers);

    const from = headers["from"] || "";
    const subject = headers["subject"] || "";
    const to = headers["to"] || "";
    const date = headers["date"];

    // Extract sender email
    const senderMatch = from.match(/<([^>]+)>/) || [null, from];
    const senderEmail = senderMatch[1]?.toLowerCase().trim();
    const senderName = from.replace(/<[^>]+>/, "").trim();

    if (!senderEmail) {
      return false;
    }

    // Find matching action (email we sent to this person)
    const matchingAction = recentActions.find((action) => {
      const actionEmail = action.toEmail?.toLowerCase().trim();
      return actionEmail === senderEmail;
    });

    if (!matchingAction) {
      return false;
    }

    // Decode email body
    let body = "";
    if (message.payload.body?.data) {
      body = decodeEmailBody(message.payload.body.data);
    } else if (message.payload.parts) {
      const textPart = message.payload.parts.find((p) => p.mimeType === "text/plain");
      if (textPart?.body?.data) {
        body = decodeEmailBody(textPart.body.data);
      }
    }

    // Create email message record
    const emailMessage = await db.emailMessage.create({
      data: {
        actionId: matchingAction.id,
        direction: "inbound",
        subject,
        body: body || message.snippet,
        senderName,
        externalId: messageId,
        receivedAt: date ? new Date(date) : new Date(parseInt(message.internalDate)),
      },
    });

    // Classify the reply using AI
    let classification = null;
    let classificationInfo = null;
    try {
      classification = await classifyAndStoreReply(emailMessage.id);
      if (classification) {
        classificationInfo = getClassificationDisplayInfo(classification.classification);
      }
    } catch (error) {
      console.error("Error classifying reply:", error);
    }

    // Get lead details for notification
    const lead = await db.lead.findUnique({
      where: { id: matchingAction.leadId },
    });

    // Lead status is now updated by the classifier based on classification
    // But if classification failed, fall back to basic "responded" status
    if (!classification) {
      await db.lead.update({
        where: { id: matchingAction.leadId },
        data: { status: "responded" },
      });
    }

    // Create enhanced notification with classification info
    const notificationTitle = classification && classificationInfo
      ? `${classificationInfo.label} reply received`
      : "New reply received";

    const notificationMessage = classification
      ? `${senderName || senderEmail} replied: ${classificationInfo?.description || classification.classification}`
      : `${senderName || senderEmail} replied to your email`;

    await db.notification.create({
      data: {
        userId,
        type: "lead_reply",
        title: notificationTitle,
        message: notificationMessage,
        link: lead ? `/projects/${lead.projectId}?lead=${matchingAction.leadId}` : `/projects`,
        metadata: JSON.stringify({
          leadId: matchingAction.leadId,
          actionId: matchingAction.id,
          leadName: lead?.name || "Unknown",
          emailMessageId: emailMessage.id,
          classification: classification?.classification,
          requiresResponse: classification?.requiresResponse,
          nextActionSuggestion: classification?.nextActionSuggestion,
        }),
      },
    });

    return true;
  } catch (error) {
    console.error("Error processing reply:", error);
    return false;
  }
}

// Manual sync trigger
export async function triggerInboxSync(userId: string): Promise<SyncResult[]> {
  return syncUserInbox(userId);
}

// Sync all users with connected email (for cron job)
export async function syncAllInboxes(): Promise<{ userId: string; results: SyncResult[] }[]> {
  const usersWithEmail = await db.integration.findMany({
    where: {
      status: "connected",
      type: { in: ["email_gmail", "email_outlook"] },
    },
    select: { userId: true },
    distinct: ["userId"],
  });

  const allResults: { userId: string; results: SyncResult[] }[] = [];

  for (const { userId } of usersWithEmail) {
    try {
      const results = await syncUserInbox(userId);
      allResults.push({ userId, results });
    } catch (error) {
      console.error(`Inbox sync failed for user ${userId}:`, error);
    }
  }

  return allResults;
}

// Process inbox sync job (called from job processor)
export async function processInboxSyncJob(params: { userId: string; provider: string }): Promise<SyncResult> {
  const { userId, provider } = params;

  if (provider === "gmail") {
    const integration = await db.integration.findFirst({
      where: {
        userId,
        type: "email_gmail",
        status: "connected",
      },
    });

    if (!integration) {
      return {
        provider: "gmail",
        messagesChecked: 0,
        repliesFound: 0,
        errors: ["Gmail not connected"],
      };
    }

    const results = await syncUserInbox(userId);
    return results.find((r) => r.provider === "gmail") || {
      provider: "gmail",
      messagesChecked: 0,
      repliesFound: 0,
      errors: [],
    };
  }

  return {
    provider,
    messagesChecked: 0,
    repliesFound: 0,
    errors: [`Unknown provider: ${provider}`],
  };
}
