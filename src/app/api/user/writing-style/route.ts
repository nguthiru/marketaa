import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserWritingStyle, aggregateUserStyle } from "@/lib/ai/style-learning/aggregator";
import { getRecentEditPatterns } from "@/lib/ai/style-learning/analyzer";
import { db } from "@/lib/db";

/**
 * GET /api/user/writing-style - Get user's writing style profile
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const style = await getUserWritingStyle(session.user.id);
    const recentPatterns = await getRecentEditPatterns(session.user.id, 10);

    return NextResponse.json({
      ...style,
      recentPatterns,
    });
  } catch (error) {
    console.error("Error fetching writing style:", error);
    return NextResponse.json(
      { error: "Failed to fetch writing style" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/writing-style - Trigger style analysis
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if we have enough edit patterns
    const patternCount = await db.editPattern.count({
      where: { userId: session.user.id },
    });

    if (patternCount < 5) {
      return NextResponse.json({
        success: false,
        message: `Need at least 5 edited emails to analyze style. Currently have ${patternCount}.`,
      });
    }

    // Trigger aggregation
    await aggregateUserStyle(session.user.id);

    // Get updated style
    const style = await getUserWritingStyle(session.user.id);

    return NextResponse.json({
      success: true,
      ...style,
    });
  } catch (error) {
    console.error("Error analyzing writing style:", error);
    return NextResponse.json(
      { error: "Failed to analyze writing style" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/writing-style - Reset writing style
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete writing style
    await db.userWritingStyle.deleteMany({
      where: { userId: session.user.id },
    });

    // Optionally delete edit patterns too
    const { searchParams } = new URL(request.url);
    const deletePatterns = searchParams.get("deletePatterns") === "true";

    if (deletePatterns) {
      await db.editPattern.deleteMany({
        where: { userId: session.user.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resetting writing style:", error);
    return NextResponse.json(
      { error: "Failed to reset writing style" },
      { status: 500 }
    );
  }
}
