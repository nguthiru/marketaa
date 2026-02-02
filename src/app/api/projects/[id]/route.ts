import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Helper to check project access
async function checkProjectAccess(projectId: string, userId: string) {
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
  });
  return project;
}

// GET /api/projects/[id] - Get project details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await db.project.findFirst({
    where: {
      id,
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      leads: {
        include: {
          contextItems: true,
          _count: { select: { actions: true } },
          actions: {
            where: { status: "sent" },
            include: {
              emailMessages: {
                where: { direction: "inbound" },
                select: { id: true, createdAt: true },
              },
              feedback: { select: { id: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      plans: {
        orderBy: { createdAt: "desc" },
      },
      context: {
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: { leads: true, plans: true },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Process leads to add reply info
  const leadsWithReplies = project.leads.map((lead) => {
    const totalReplies = lead.actions.reduce(
      (sum, action) => sum + action.emailMessages.length,
      0
    );
    const unreadReplies = lead.actions.reduce(
      (sum, action) =>
        sum + (action.feedback ? 0 : action.emailMessages.length),
      0
    );

    // Remove the actions data to keep response clean
    const { actions, ...leadData } = lead;

    return {
      ...leadData,
      hasReplies: totalReplies > 0,
      unreadReplies,
    };
  });

  return NextResponse.json({
    ...project,
    leads: leadsWithReplies,
  });
}

// PATCH /api/projects/[id] - Update project
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await checkProjectAccess(id, session.user.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const { name, description } = await request.json();

    const updated = await db.project.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update project error:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Delete project
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only owner can delete
  const project = await db.project.findFirst({
    where: {
      id,
      ownerId: session.user.id,
    },
  });

  if (!project) {
    return NextResponse.json(
      { error: "Project not found or you don't have permission to delete it" },
      { status: 404 }
    );
  }

  await db.project.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
