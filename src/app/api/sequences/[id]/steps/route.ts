import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/sequences/[id]/steps - Add a step
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
    // Verify access
    const sequence = await db.sequence.findFirst({
      where: { id: sequenceId },
      include: {
        project: {
          select: { ownerId: true, members: { select: { userId: true } } },
        },
        steps: { orderBy: { order: "desc" }, take: 1 },
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

    const body = await req.json();
    const { type, subject, body: stepBody, templateId, delayDays, delayHours, condition } = body;

    if (!type) {
      return NextResponse.json({ error: "Step type is required" }, { status: 400 });
    }

    // Calculate next order
    const nextOrder = sequence.steps.length > 0 ? sequence.steps[0].order + 1 : 1;

    const step = await db.sequenceStep.create({
      data: {
        sequenceId,
        order: nextOrder,
        type,
        subject: subject?.trim() || null,
        body: stepBody?.trim() || null,
        templateId: templateId || null,
        delayDays: delayDays || null,
        delayHours: delayHours || null,
        condition: condition ? JSON.stringify(condition) : null,
      },
    });

    return NextResponse.json(step);
  } catch (error) {
    console.error("Failed to create step:", error);
    return NextResponse.json(
      { error: "Failed to create step" },
      { status: 500 }
    );
  }
}

// PATCH /api/sequences/[id]/steps - Update a step
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sequenceId } = await params;

  try {
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

    const body = await req.json();
    const { stepId, type, subject, body: stepBody, templateId, delayDays, delayHours, condition, order } = body;

    if (!stepId) {
      return NextResponse.json({ error: "Step ID is required" }, { status: 400 });
    }

    const step = await db.sequenceStep.update({
      where: { id: stepId },
      data: {
        ...(type !== undefined && { type }),
        ...(subject !== undefined && { subject: subject?.trim() || null }),
        ...(stepBody !== undefined && { body: stepBody?.trim() || null }),
        ...(templateId !== undefined && { templateId: templateId || null }),
        ...(delayDays !== undefined && { delayDays }),
        ...(delayHours !== undefined && { delayHours }),
        ...(condition !== undefined && { condition: condition ? JSON.stringify(condition) : null }),
        ...(order !== undefined && { order }),
      },
    });

    return NextResponse.json(step);
  } catch (error) {
    console.error("Failed to update step:", error);
    return NextResponse.json(
      { error: "Failed to update step" },
      { status: 500 }
    );
  }
}

// DELETE /api/sequences/[id]/steps - Delete a step
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
    const stepId = searchParams.get("stepId");

    if (!stepId) {
      return NextResponse.json({ error: "Step ID is required" }, { status: 400 });
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

    await db.sequenceStep.delete({ where: { id: stepId } });

    return NextResponse.json({ message: "Step deleted" });
  } catch (error) {
    console.error("Failed to delete step:", error);
    return NextResponse.json(
      { error: "Failed to delete step" },
      { status: 500 }
    );
  }
}
