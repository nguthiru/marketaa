import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/sequences/[id]/enroll - Enroll leads in a sequence
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sequenceId } = await params;

  try {
    // Verify access and get sequence
    const sequence = await db.sequence.findFirst({
      where: { id: sequenceId },
      include: {
        project: {
          select: { ownerId: true, members: { select: { userId: true } } },
        },
        steps: { orderBy: { order: "asc" }, take: 1 },
      },
    });

    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    }

    const hasAccess =
      sequence.project.ownerId === session.user.id ||
      sequence.project.members.some((m) => m.userId === session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (sequence.status !== "active") {
      return NextResponse.json(
        { error: "Sequence must be active to enroll leads" },
        { status: 400 }
      );
    }

    if (sequence.steps.length === 0) {
      return NextResponse.json(
        { error: "Sequence must have at least one step" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { leadIds } = body as { leadIds: string[] };

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: "Lead IDs are required" },
        { status: 400 }
      );
    }

    // Check which leads are already enrolled
    const existingEnrollments = await db.sequenceEnrollment.findMany({
      where: {
        sequenceId,
        leadId: { in: leadIds },
      },
      select: { leadId: true },
    });

    const alreadyEnrolled = new Set(existingEnrollments.map((e) => e.leadId));
    const toEnroll = leadIds.filter((id) => !alreadyEnrolled.has(id));

    if (toEnroll.length === 0) {
      return NextResponse.json({
        message: "All leads are already enrolled",
        enrolled: 0,
        skipped: leadIds.length,
      });
    }

    // Calculate next step time based on first step
    const firstStep = sequence.steps[0];
    let nextStepAt = new Date();

    if (firstStep.type === "wait") {
      if (firstStep.delayDays) {
        nextStepAt.setDate(nextStepAt.getDate() + firstStep.delayDays);
      }
      if (firstStep.delayHours) {
        nextStepAt.setHours(nextStepAt.getHours() + firstStep.delayHours);
      }
    }

    // Enroll leads
    const enrollments = await db.sequenceEnrollment.createMany({
      data: toEnroll.map((leadId) => ({
        sequenceId,
        leadId,
        currentStep: 1,
        nextStepAt,
      })),
    });

    // Create scheduled jobs for processing
    const jobs = await db.scheduledJob.createMany({
      data: toEnroll.map((leadId) => ({
        type: "sequence_step",
        scheduledFor: nextStepAt,
        payload: JSON.stringify({ sequenceId, leadId }),
      })),
    });

    return NextResponse.json({
      message: `Enrolled ${enrollments.count} leads`,
      enrolled: enrollments.count,
      skipped: alreadyEnrolled.size,
    });
  } catch (error) {
    console.error("Failed to enroll leads:", error);
    return NextResponse.json(
      { error: "Failed to enroll leads" },
      { status: 500 }
    );
  }
}

// DELETE /api/sequences/[id]/enroll - Unenroll leads from a sequence
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sequenceId } = await params;

  try {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get("leadId");

    if (!leadId) {
      return NextResponse.json(
        { error: "Lead ID is required" },
        { status: 400 }
      );
    }

    // Verify access
    const sequence = await db.sequence.findFirst({
      where: { id: sequenceId },
      include: {
        project: {
          select: { ownerId: true, members: { select: { userId: true } } },
        },
      },
    });

    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    }

    const hasAccess =
      sequence.project.ownerId === session.user.id ||
      sequence.project.members.some((m) => m.userId === session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update enrollment to exited
    await db.sequenceEnrollment.updateMany({
      where: { sequenceId, leadId },
      data: {
        status: "exited",
      },
    });

    return NextResponse.json({ message: "Lead unenrolled" });
  } catch (error) {
    console.error("Failed to unenroll lead:", error);
    return NextResponse.json(
      { error: "Failed to unenroll lead" },
      { status: 500 }
    );
  }
}
