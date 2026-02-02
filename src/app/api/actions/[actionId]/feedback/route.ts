import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/actions/[actionId]/feedback - Record feedback for an action
export async function POST(
  request: Request,
  { params }: { params: Promise<{ actionId: string }> }
) {
  const session = await getServerSession(authOptions);
  const { actionId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const action = await db.action.findUnique({
    where: { id: actionId },
    include: {
      lead: { include: { project: true } },
    },
  });

  if (!action) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  // Verify access
  const hasAccess =
    action.lead.project.ownerId === session.user.id ||
    (await db.projectMember.findFirst({
      where: {
        projectId: action.lead.project.id,
        userId: session.user.id,
      },
    }));

  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { outcome, notes } = await request.json();

    if (!outcome) {
      return NextResponse.json(
        { error: "Outcome is required" },
        { status: 400 }
      );
    }

    // Upsert feedback (update if exists, create if not)
    const feedback = await db.actionFeedback.upsert({
      where: { actionId },
      update: {
        outcome,
        notes: notes || null,
      },
      create: {
        actionId,
        outcome,
        notes: notes || null,
      },
    });

    // Update action status based on feedback
    let newStatus = action.status;
    if (outcome === "meeting_booked") {
      newStatus = "completed";
    } else if (outcome === "follow_up") {
      // Update lead status
      await db.lead.update({
        where: { id: action.leadId },
        data: { status: "follow_up_needed" },
      });
    } else if (outcome === "no_reply" || outcome === "not_interested") {
      newStatus = "completed";
    }

    await db.action.update({
      where: { id: actionId },
      data: { status: newStatus },
    });

    return NextResponse.json(feedback);
  } catch (error) {
    console.error("Record feedback error:", error);
    return NextResponse.json(
      { error: "Failed to record feedback" },
      { status: 500 }
    );
  }
}

// DELETE /api/actions/[actionId]/feedback - Remove feedback
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ actionId: string }> }
) {
  const session = await getServerSession(authOptions);
  const { actionId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db.actionFeedback.delete({
    where: { actionId },
  });

  return NextResponse.json({ success: true });
}
