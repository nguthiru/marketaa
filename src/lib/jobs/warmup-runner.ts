import { db } from "@/lib/db";
import { decrypt } from "@/lib/integrations/encryption";
import { refreshGoogleToken, refreshMicrosoftToken } from "@/lib/integrations/oauth";

interface WarmupResult {
  accountId: string;
  success: boolean;
  sentCount: number;
  error?: string;
}

// Get valid access token for Gmail
async function getGmailAccessToken(userId: string): Promise<string | null> {
  const integration = await db.integration.findFirst({
    where: {
      userId,
      type: "email_gmail",
      status: "connected",
    },
  });

  if (!integration?.credentials) {
    return null;
  }

  const credentials = JSON.parse(decrypt(integration.credentials));

  // Check if token is expired
  if (credentials.expiresAt < Date.now() + 5 * 60 * 1000) {
    const newTokens = await refreshGoogleToken(credentials.refreshToken);
    return newTokens.access_token;
  }

  return credentials.accessToken;
}

// Get valid access token for Outlook
async function getOutlookAccessToken(userId: string): Promise<string | null> {
  const integration = await db.integration.findFirst({
    where: {
      userId,
      type: "email_outlook",
      status: "connected",
    },
  });

  if (!integration?.credentials) {
    return null;
  }

  const credentials = JSON.parse(decrypt(integration.credentials));

  if (credentials.expiresAt < Date.now() + 5 * 60 * 1000) {
    const newTokens = await refreshMicrosoftToken(credentials.refreshToken);
    return newTokens.access_token;
  }

  return credentials.accessToken;
}

// Run warmup for a single account
export async function runWarmupForAccount(accountId: string): Promise<WarmupResult> {
  const account = await db.warmupAccount.findUnique({
    where: { id: accountId },
    include: { user: true },
  });

  if (!account) {
    return { accountId, success: false, sentCount: 0, error: "Account not found" };
  }

  if (account.status !== "warming") {
    return { accountId, success: false, sentCount: 0, error: "Account not in warming status" };
  }

  // Check daily limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sentToday = await db.warmupActivity.count({
    where: {
      accountId,
      type: "sent",
      timestamp: { gte: today },
    },
  });

  if (sentToday >= account.dailyLimit) {
    return { accountId, success: true, sentCount: 0, error: "Daily limit reached" };
  }

  // Determine provider from email
  const isGmail = account.email.includes("gmail.com") || account.email.includes("googlemail.com");
  const token = isGmail
    ? await getGmailAccessToken(account.userId)
    : await getOutlookAccessToken(account.userId);

  if (!token) {
    await db.warmupAccount.update({
      where: { id: accountId },
      data: { status: "at_risk" },
    });
    return { accountId, success: false, sentCount: 0, error: "No valid token" };
  }

  // Simulate warmup activity
  // In production, this would interact with warmup networks
  const activitiesToCreate = Math.min(
    account.dailyLimit - sentToday,
    Math.floor(Math.random() * 3) + 1 // 1-3 activities per run
  );

  for (let i = 0; i < activitiesToCreate; i++) {
    // Record sent activity
    await db.warmupActivity.create({
      data: {
        type: "sent",
        accountId,
      },
    });

    // Simulate receiving some replies (50% chance)
    if (Math.random() > 0.5) {
      await db.warmupActivity.create({
        data: {
          type: "received",
          accountId,
        },
      });
    }

    // Simulate opens (70% chance)
    if (Math.random() > 0.3) {
      await db.warmupActivity.create({
        data: {
          type: "opened",
          accountId,
        },
      });
    }
  }

  // Update reputation based on activities
  const recentActivities = await db.warmupActivity.groupBy({
    by: ["type"],
    where: {
      accountId,
      timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
    },
    _count: true,
  });

  const sent = recentActivities.find((a) => a.type === "sent")?._count || 0;
  const received = recentActivities.find((a) => a.type === "received")?._count || 0;
  const opened = recentActivities.find((a) => a.type === "opened")?._count || 0;

  // Calculate reputation score
  let reputation = account.reputation;
  if (sent > 0) {
    const replyRate = received / sent;
    const openRate = opened / sent;

    // Adjust reputation based on engagement
    if (replyRate > 0.3 && openRate > 0.5) {
      reputation = Math.min(100, reputation + 2);
    } else if (replyRate > 0.1 && openRate > 0.3) {
      reputation = Math.min(100, reputation + 1);
    } else if (replyRate < 0.05 || openRate < 0.1) {
      reputation = Math.max(0, reputation - 1);
    }
  }

  // Update account
  const newDailyLimit = reputation >= 80 ? Math.min(100, account.dailyLimit + 2)
    : reputation >= 60 ? Math.min(50, account.dailyLimit + 1)
    : account.dailyLimit;

  const newStatus = reputation >= 80 ? "healthy"
    : reputation < 30 ? "at_risk"
    : "warming";

  await db.warmupAccount.update({
    where: { id: accountId },
    data: {
      reputation,
      dailyLimit: newDailyLimit,
      status: newStatus,
      currentDaily: sentToday + activitiesToCreate,
    },
  });

  return { accountId, success: true, sentCount: activitiesToCreate };
}

// Schedule warmup jobs for all active accounts
export async function scheduleWarmupJobs(): Promise<{ scheduled: number }> {
  const accounts = await db.warmupAccount.findMany({
    where: { status: "warming" },
  });

  let scheduled = 0;

  for (const account of accounts) {
    // Check if there's already a pending job for this account
    const existingJob = await db.scheduledJob.findFirst({
      where: {
        type: "warmup",
        status: "pending",
        payload: { contains: account.id },
      },
    });

    if (!existingJob) {
      // Schedule job for random time in next hour
      const scheduledFor = new Date();
      scheduledFor.setMinutes(scheduledFor.getMinutes() + Math.floor(Math.random() * 60));

      await db.scheduledJob.create({
        data: {
          type: "warmup",
          status: "pending",
          scheduledFor,
          payload: JSON.stringify({ accountId: account.id }),
        },
      });

      scheduled++;
    }
  }

  return { scheduled };
}

// Run warmup for all accounts (called by cron)
export async function runAllWarmups(): Promise<{
  total: number;
  succeeded: number;
  failed: number;
  results: WarmupResult[];
}> {
  const accounts = await db.warmupAccount.findMany({
    where: { status: { in: ["warming", "healthy"] } },
  });

  const results: WarmupResult[] = [];
  let succeeded = 0;
  let failed = 0;

  for (const account of accounts) {
    const result = await runWarmupForAccount(account.id);
    results.push(result);

    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }
  }

  return {
    total: accounts.length,
    succeeded,
    failed,
    results,
  };
}
