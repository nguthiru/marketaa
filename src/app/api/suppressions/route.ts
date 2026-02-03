import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getSuppressionList,
  addToSuppressionList,
  removeFromSuppressionList,
  bulkAddToSuppressionList,
} from "@/lib/unsubscribe/suppression";

/**
 * GET /api/suppressions - Get suppression list
 * Query params:
 * - projectId: optional, filter by project
 * - search: optional, search by email
 * - limit: optional, default 50
 * - offset: optional, default 0
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const search = searchParams.get("search") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const result = await getSuppressionList(projectId, {
      limit,
      offset,
      search,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching suppressions:", error);
    return NextResponse.json(
      { error: "Failed to fetch suppressions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/suppressions - Add email(s) to suppression list
 * Body:
 * - email: string (single email) OR
 * - emails: string[] (bulk add)
 * - projectId: optional
 * - reason: optional, default "manual"
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, emails, projectId, reason = "manual" } = body;

    // Validate reason
    const validReasons = ["unsubscribe", "bounce", "complaint", "manual"];
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: "Invalid reason" },
        { status: 400 }
      );
    }

    // Bulk add
    if (emails && Array.isArray(emails)) {
      const result = await bulkAddToSuppressionList(
        emails,
        reason,
        "manual",
        projectId
      );
      return NextResponse.json({
        success: true,
        added: result.added,
        skipped: result.skipped,
      });
    }

    // Single add
    if (email && typeof email === "string") {
      const result = await addToSuppressionList(
        email,
        reason,
        "manual",
        projectId
      );
      return NextResponse.json({
        success: true,
        suppression: result,
      });
    }

    return NextResponse.json(
      { error: "Email or emails required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error adding suppression:", error);
    return NextResponse.json(
      { error: "Failed to add suppression" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/suppressions - Remove email from suppression list
 * Query params:
 * - email: required
 * - projectId: optional
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const projectId = searchParams.get("projectId");

    if (!email) {
      return NextResponse.json(
        { error: "Email required" },
        { status: 400 }
      );
    }

    const removed = await removeFromSuppressionList(email, projectId);

    if (!removed) {
      return NextResponse.json(
        { error: "Suppression not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing suppression:", error);
    return NextResponse.json(
      { error: "Failed to remove suppression" },
      { status: 500 }
    );
  }
}
