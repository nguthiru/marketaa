import { db } from "@/lib/db";
import { executeSequenceStep } from "./sequence-executor";
import { processInboxSyncJob } from "./inbox-sync";

export interface ProcessResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

export async function processScheduledJobs(): Promise<ProcessResult> {
  const result: ProcessResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Get pending jobs that are due
    const pendingJobs = await db.scheduledJob.findMany({
      where: {
        status: "pending",
        scheduledFor: { lte: new Date() },
      },
      orderBy: { scheduledFor: "asc" },
      take: 50, // Process in batches
    });

    for (const job of pendingJobs) {
      result.processed++;

      try {
        // Mark as running
        await db.scheduledJob.update({
          where: { id: job.id },
          data: {
            status: "running",
            startedAt: new Date(),
          },
        });

        let jobResult: unknown;

        switch (job.type) {
          case "sequence_step":
            jobResult = await processSequenceStepJob(job.payload);
            break;
          case "inbox_sync":
            jobResult = await processInboxSyncJobWrapper(job.payload);
            break;
          case "warmup":
            jobResult = await processWarmupJob(job.payload);
            break;
          case "analytics":
            jobResult = await processAnalyticsJob(job.payload);
            break;
          default:
            throw new Error(`Unknown job type: ${job.type}`);
        }

        // Mark as completed
        await db.scheduledJob.update({
          where: { id: job.id },
          data: {
            status: "completed",
            completedAt: new Date(),
            result: JSON.stringify(jobResult),
          },
        });

        result.succeeded++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        result.errors.push(`Job ${job.id}: ${errorMessage}`);
        result.failed++;

        // Mark as failed or retry
        const retryCount = job.retryCount + 1;
        if (retryCount < 3) {
          // Retry with exponential backoff
          const nextRetry = new Date();
          nextRetry.setMinutes(nextRetry.getMinutes() + Math.pow(2, retryCount) * 5);

          await db.scheduledJob.update({
            where: { id: job.id },
            data: {
              status: "pending",
              retryCount,
              scheduledFor: nextRetry,
              errorMessage,
            },
          });
        } else {
          await db.scheduledJob.update({
            where: { id: job.id },
            data: {
              status: "failed",
              completedAt: new Date(),
              errorMessage,
            },
          });
        }
      }
    }
  } catch (error) {
    console.error("Job processor error:", error);
    result.errors.push(`Processor: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  return result;
}

async function processSequenceStepJob(payload: string | null): Promise<unknown> {
  if (!payload) throw new Error("No payload");

  const { sequenceId, leadId } = JSON.parse(payload) as {
    sequenceId: string;
    leadId: string;
  };

  return executeSequenceStep(sequenceId, leadId);
}

async function processInboxSyncJobWrapper(payload: string | null): Promise<unknown> {
  if (!payload) throw new Error("No payload");

  const { userId, provider } = JSON.parse(payload) as {
    userId: string;
    provider: string;
  };

  return processInboxSyncJob({ userId, provider });
}

async function processWarmupJob(payload: string | null): Promise<unknown> {
  if (!payload) throw new Error("No payload");

  const { accountId } = JSON.parse(payload) as { accountId: string };

  // Get warmup account
  const account = await db.warmupAccount.findUnique({
    where: { id: accountId },
  });

  if (!account || account.status !== "warming") {
    return { skipped: true, reason: "Account not active" };
  }

  // Record warmup activity (placeholder - actual warmup would send/receive emails)
  await db.warmupActivity.create({
    data: {
      type: "sent",
      accountId,
    },
  });

  // Update reputation (simplified - real implementation would be more complex)
  const newReputation = Math.min(100, account.reputation + 1);
  const newDailyLimit = Math.min(100, account.dailyLimit + 1);

  await db.warmupAccount.update({
    where: { id: accountId },
    data: {
      reputation: newReputation,
      dailyLimit: newDailyLimit,
      status: newReputation >= 80 ? "healthy" : "warming",
    },
  });

  return { reputation: newReputation, dailyLimit: newDailyLimit };
}

async function processAnalyticsJob(payload: string | null): Promise<unknown> {
  if (!payload) throw new Error("No payload");

  const { period, date, projectId, userId } = JSON.parse(payload) as {
    period: string;
    date: string;
    projectId?: string;
    userId?: string;
  };

  // Calculate metrics
  const dateObj = new Date(date);
  const startOfPeriod = new Date(dateObj);
  const endOfPeriod = new Date(dateObj);

  if (period === "daily") {
    startOfPeriod.setHours(0, 0, 0, 0);
    endOfPeriod.setHours(23, 59, 59, 999);
  } else if (period === "weekly") {
    startOfPeriod.setDate(startOfPeriod.getDate() - startOfPeriod.getDay());
    endOfPeriod.setDate(startOfPeriod.getDate() + 6);
  }

  const whereClause: Record<string, unknown> = {
    createdAt: {
      gte: startOfPeriod,
      lte: endOfPeriod,
    },
  };

  if (projectId) {
    whereClause.lead = { projectId };
  }

  // Aggregate metrics
  const emailsSent = await db.action.count({
    where: {
      ...whereClause,
      type: "email",
      sentAt: { not: null },
    },
  });

  const replies = await db.emailMessage.count({
    where: {
      ...whereClause,
      direction: "inbound",
    },
  });

  const meetings = await db.actionFeedback.count({
    where: {
      ...whereClause,
      outcome: "meeting_booked",
    },
  });

  const metrics = {
    emailsSent,
    replies,
    meetings,
    replyRate: emailsSent > 0 ? (replies / emailsSent) * 100 : 0,
    meetingRate: emailsSent > 0 ? (meetings / emailsSent) * 100 : 0,
  };

  // Store snapshot
  await db.analyticsSnapshot.upsert({
    where: {
      period_date_projectId_userId: {
        period,
        date: startOfPeriod,
        projectId: projectId || "",
        userId: userId || "",
      },
    },
    create: {
      period,
      date: startOfPeriod,
      projectId: projectId || null,
      userId: userId || null,
      metrics: JSON.stringify(metrics),
    },
    update: {
      metrics: JSON.stringify(metrics),
    },
  });

  return metrics;
}
