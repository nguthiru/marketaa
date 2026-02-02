import { NextRequest, NextResponse } from "next/server";
import { processScheduledJobs } from "@/lib/jobs/processor";
import { syncAllInboxes } from "@/lib/jobs/inbox-sync";

// POST /api/cron/process-jobs - Process scheduled jobs
// This endpoint should be called by a cron job every 5 minutes
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Process scheduled jobs
    const jobResult = await processScheduledJobs();

    // Run inbox sync for all users with connected email
    let inboxResult = { usersProcessed: 0, totalReplies: 0 };
    try {
      const inboxResults = await syncAllInboxes();
      inboxResult = {
        usersProcessed: inboxResults.length,
        totalReplies: inboxResults.reduce(
          (sum, r) => sum + r.results.reduce((s, res) => s + res.repliesFound, 0),
          0
        ),
      };
    } catch (error) {
      console.error("Inbox sync error:", error);
    }

    return NextResponse.json({
      success: true,
      jobs: jobResult,
      inboxSync: inboxResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support GET for easy testing
export async function GET(req: NextRequest) {
  return POST(req);
}
