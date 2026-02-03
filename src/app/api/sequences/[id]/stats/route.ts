import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check access to sequence
  const sequence = await db.sequence.findFirst({
    where: {
      id,
      project: {
        OR: [
          { ownerId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
    },
    include: {
      enrollments: {
        select: {
          status: true,
          leadId: true,
        },
      },
      steps: {
        where: { type: "email" },
        select: { id: true },
      },
    },
  });

  if (!sequence) {
    return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
  }

  // Calculate enrollment stats
  const totalEnrolled = sequence.enrollments.length;
  const active = sequence.enrollments.filter((e) => e.status === "active").length;
  const completed = sequence.enrollments.filter((e) => e.status === "completed").length;
  const paused = sequence.enrollments.filter((e) => e.status === "paused").length;
  const exited = sequence.enrollments.filter((e) => e.status === "exited").length;

  // Get lead IDs for this sequence
  const leadIds = sequence.enrollments.map((e) => e.leadId);

  // Calculate email stats - get actions created from this sequence's email steps
  const emailStepIds = sequence.steps.map((s) => s.id);

  // Get all actions for leads in this sequence
  const actions = await db.action.findMany({
    where: {
      leadId: { in: leadIds },
      type: "email",
      status: "sent",
    },
    select: {
      id: true,
      openCount: true,
      leadId: true,
    },
  });

  // Get replies for these leads
  const replies = await db.emailMessage.count({
    where: {
      direction: "inbound",
      action: {
        leadId: { in: leadIds },
      },
    },
  });

  const emailsSent = actions.length;
  const emailsOpened = actions.filter((a) => a.openCount > 0).length;
  const openRate = emailsSent > 0 ? Math.round((emailsOpened / emailsSent) * 100) : 0;
  const replyRate = emailsSent > 0 ? Math.round((replies / emailsSent) * 100) : 0;

  return NextResponse.json({
    totalEnrolled,
    active,
    completed,
    paused,
    exited,
    emailsSent,
    openRate,
    replyRate,
  });
}
