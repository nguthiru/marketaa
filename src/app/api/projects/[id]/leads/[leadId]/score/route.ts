import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateLeadScore, getLeadScore } from "@/lib/ai/scoring";

// GET /api/projects/[id]/leads/[leadId]/score - Get lead score
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, leadId } = await params;

  try {
    // Check project access
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Verify lead belongs to project
    const lead = await db.lead.findFirst({
      where: { id: leadId, projectId },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const score = await getLeadScore(leadId);

    if (!score) {
      return NextResponse.json({ message: "No score calculated yet" }, { status: 404 });
    }

    return NextResponse.json(score);
  } catch (error) {
    console.error("Failed to get lead score:", error);
    return NextResponse.json(
      { error: "Failed to get score" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/leads/[leadId]/score - Calculate/refresh lead score
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, leadId } = await params;

  try {
    // Check project access
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Verify lead belongs to project
    const lead = await db.lead.findFirst({
      where: { id: leadId, projectId },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const score = await calculateLeadScore(leadId);

    return NextResponse.json(score);
  } catch (error) {
    console.error("Failed to calculate lead score:", error);
    return NextResponse.json(
      { error: "Failed to calculate score" },
      { status: 500 }
    );
  }
}
