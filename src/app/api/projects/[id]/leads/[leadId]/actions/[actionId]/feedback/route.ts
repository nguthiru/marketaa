import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string; actionId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, leadId, actionId } = await params;

  // Verify access
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

  const action = await db.action.findFirst({
    where: { id: actionId, leadId },
    include: { lead: true },
  });

  if (!action || action.lead.projectId !== projectId) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  try {
    const { outcome, notes } = await req.json();

    // Upsert feedback
    const feedback = await db.actionFeedback.upsert({
      where: { actionId },
      create: {
        actionId,
        outcome,
        notes: notes || null,
      },
      update: {
        outcome,
        notes: notes || null,
      },
    });

    // Update lead status based on outcome
    const statusMap: Record<string, string> = {
      replied: "responded",
      meeting_booked: "responded",
      converted: "responded",
      follow_up: "follow_up_needed",
      not_interested: "contacted",
      no_reply: "contacted",
    };

    if (statusMap[outcome]) {
      await db.lead.update({
        where: { id: leadId },
        data: { status: statusMap[outcome] },
      });
    }

    // Store outcome as context for AI to learn from
    const contextKey = `outcome_${new Date().toISOString().split("T")[0]}`;
    const contextValue = `Action "${action.subject || action.type}" resulted in: ${outcome}${notes ? `. Notes: ${notes}` : ""}`;

    await db.leadContext.create({
      data: {
        leadId,
        key: contextKey,
        value: contextValue,
        source: "system",
        confidence: "confirmed",
      },
    });

    return NextResponse.json(feedback);
  } catch (error) {
    console.error("Set feedback error:", error);
    return NextResponse.json({ error: "Failed to set feedback" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string; actionId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, leadId, actionId } = await params;

  // Verify access
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

  const action = await db.action.findFirst({
    where: { id: actionId, leadId },
    include: { lead: true, feedback: true },
  });

  if (!action || action.lead.projectId !== projectId) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  if (!action.feedback) {
    return NextResponse.json({ error: "No feedback to delete" }, { status: 404 });
  }

  try {
    await db.actionFeedback.delete({
      where: { actionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete feedback error:", error);
    return NextResponse.json({ error: "Failed to delete feedback" }, { status: 500 });
  }
}
