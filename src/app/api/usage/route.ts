import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUsageOverview, syncUsageStats } from "@/lib/plan-limits";

// GET /api/usage - Get user's usage overview
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usage = await getUsageOverview(session.user.id);
    return NextResponse.json(usage);
  } catch (error) {
    console.error("Failed to fetch usage:", error);
    if (error instanceof Error && error.message.includes("User not found")) {
      return NextResponse.json(
        { error: "User not found. Please sign out and sign in again." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch usage" },
      { status: 500 }
    );
  }
}

// POST /api/usage/sync - Sync usage stats (admin or for corrections)
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await syncUsageStats(session.user.id);
    const usage = await getUsageOverview(session.user.id);
    return NextResponse.json(usage);
  } catch (error) {
    console.error("Failed to sync usage:", error);
    return NextResponse.json(
      { error: "Failed to sync usage" },
      { status: 500 }
    );
  }
}
