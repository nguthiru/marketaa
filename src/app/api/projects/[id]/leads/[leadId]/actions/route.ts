import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, leadId } = await params;

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

  const lead = await db.lead.findFirst({
    where: { id: leadId, projectId },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  try {
    const { planId, type, subject, body, reasoning } = await req.json();

    const action = await db.action.create({
      data: {
        leadId,
        planId,
        type: type || "email",
        subject: subject || null,
        body,
        reasoning: reasoning || null,
        status: "draft",
      },
      include: {
        plan: true,
        feedback: true,
      },
    });

    // Update lead status to contacted if it was not_contacted
    if (lead.status === "not_contacted") {
      await db.lead.update({
        where: { id: leadId },
        data: { status: "contacted" },
      });
    }

    return NextResponse.json(action);
  } catch (error) {
    console.error("Create action error:", error);
    return NextResponse.json({ error: "Failed to create action" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, leadId } = await params;

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

  const actions = await db.action.findMany({
    where: { leadId },
    include: {
      plan: true,
      feedback: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(actions);
}
