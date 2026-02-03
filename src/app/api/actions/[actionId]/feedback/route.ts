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
      feedback: true, // Include existing feedback to check for changes
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

    // Update template metrics if this action used a template
    // Only increment if this is a new feedback (not updating existing)
    const isNewFeedback = !action.feedback;
    const previousOutcome = action.feedback?.outcome;

    if (action.templateId && isNewFeedback) {
      // Track replies (any positive engagement counts as a reply)
      const replyOutcomes = ["replied", "follow_up", "meeting_booked", "converted"];
      if (replyOutcomes.includes(outcome)) {
        await db.emailTemplate.update({
          where: { id: action.templateId },
          data: { replyCount: { increment: 1 } },
        });

        if (action.variantId) {
          await db.templateVariant.update({
            where: { id: action.variantId },
            data: { replyCount: { increment: 1 } },
          });
        }
      }

      // Track meeting bookings
      if (outcome === "meeting_booked") {
        await db.emailTemplate.update({
          where: { id: action.templateId },
          data: { meetingCount: { increment: 1 } },
        });
      }
    } else if (action.templateId && previousOutcome !== outcome) {
      // Handle outcome changes - adjust counts accordingly
      const replyOutcomes = ["replied", "follow_up", "meeting_booked", "converted"];
      const wasReply = replyOutcomes.includes(previousOutcome || "");
      const isReply = replyOutcomes.includes(outcome);

      if (!wasReply && isReply) {
        // Changed from non-reply to reply
        await db.emailTemplate.update({
          where: { id: action.templateId },
          data: { replyCount: { increment: 1 } },
        });
        if (action.variantId) {
          await db.templateVariant.update({
            where: { id: action.variantId },
            data: { replyCount: { increment: 1 } },
          });
        }
      } else if (wasReply && !isReply) {
        // Changed from reply to non-reply
        await db.emailTemplate.update({
          where: { id: action.templateId },
          data: { replyCount: { decrement: 1 } },
        });
        if (action.variantId) {
          await db.templateVariant.update({
            where: { id: action.variantId },
            data: { replyCount: { decrement: 1 } },
          });
        }
      }

      // Handle meeting count changes
      if (previousOutcome !== "meeting_booked" && outcome === "meeting_booked") {
        await db.emailTemplate.update({
          where: { id: action.templateId },
          data: { meetingCount: { increment: 1 } },
        });
      } else if (previousOutcome === "meeting_booked" && outcome !== "meeting_booked") {
        await db.emailTemplate.update({
          where: { id: action.templateId },
          data: { meetingCount: { decrement: 1 } },
        });
      }
    }

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
