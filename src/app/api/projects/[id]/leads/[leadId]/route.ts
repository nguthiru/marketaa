import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function checkProjectAccess(projectId: string, userId: string) {
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
  });
  return project;
}

// GET /api/projects/[id]/leads/[leadId] - Get lead details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id, leadId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await checkProjectAccess(id, session.user.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: {
      contextItems: { where: { dismissed: false } },
      actions: {
        include: {
          plan: true,
          feedback: true,
          emailMessages: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!lead || lead.projectId !== id) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json(lead);
}

// PATCH /api/projects/[id]/leads/[leadId] - Update lead
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id, leadId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await checkProjectAccess(id, session.user.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead || lead.projectId !== id) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  try {
    const { name, email, phone, role, organization, status, notes } =
      await request.json();

    const updated = await db.lead.update({
      where: { id: leadId },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(role !== undefined && { role: role || null }),
        ...(organization !== undefined && { organization: organization || null }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes: notes || null }),
      },
      include: {
        contextItems: { where: { dismissed: false } },
        _count: { select: { actions: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update lead error:", error);
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/leads/[leadId] - Delete lead
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id, leadId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await checkProjectAccess(id, session.user.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead || lead.projectId !== id) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  await db.lead.delete({ where: { id: leadId } });

  return NextResponse.json({ success: true });
}
