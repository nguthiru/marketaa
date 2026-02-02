import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/actions/[actionId] - Get action details
export async function GET(
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
      lead: {
        include: {
          project: true,
          contextItems: { where: { dismissed: false } },
        },
      },
      plan: true,
      feedback: true,
      emailMessages: { orderBy: { createdAt: "asc" } },
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

  return NextResponse.json(action);
}

// PATCH /api/actions/[actionId] - Update action (edit content, change status)
export async function PATCH(
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
    const { subject, body, status } = await request.json();

    const updated = await db.action.update({
      where: { id: actionId },
      data: {
        ...(subject !== undefined && { subject }),
        ...(body !== undefined && { body, userEdited: true }),
        ...(status && { status }),
      },
      include: {
        plan: true,
        feedback: true,
        emailMessages: { orderBy: { createdAt: "asc" } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update action error:", error);
    return NextResponse.json(
      { error: "Failed to update action" },
      { status: 500 }
    );
  }
}

// DELETE /api/actions/[actionId] - Delete action
export async function DELETE(
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

  await db.action.delete({ where: { id: actionId } });

  return NextResponse.json({ success: true });
}
