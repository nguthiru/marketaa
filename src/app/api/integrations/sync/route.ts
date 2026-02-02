import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { triggerInboxSync } from "@/lib/jobs/inbox-sync";

// POST /api/integrations/sync - Trigger manual inbox sync
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = await triggerInboxSync(session.user.id);

    const totalReplies = results.reduce((sum, r) => sum + r.repliesFound, 0);
    const totalChecked = results.reduce((sum, r) => sum + r.messagesChecked, 0);
    const errors = results.flatMap((r) => r.errors);

    return NextResponse.json({
      success: true,
      messagesChecked: totalChecked,
      repliesFound: totalReplies,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Inbox sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync inbox" },
      { status: 500 }
    );
  }
}
