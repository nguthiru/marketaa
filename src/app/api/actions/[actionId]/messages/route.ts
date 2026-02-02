import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/actions/[actionId]/messages - Get all email messages in thread
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
      lead: { include: { project: true } },
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

  return NextResponse.json({ messages: action.emailMessages });
}

// POST /api/actions/[actionId]/messages - Add a pasted reply
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

  // Validate action has been sent
  if (!action.sentAt) {
    return NextResponse.json(
      { error: "Cannot add reply to an unsent email" },
      { status: 400 }
    );
  }

  try {
    const { body, senderName, receivedAt } = await request.json();

    if (!body || typeof body !== "string" || body.trim() === "") {
      return NextResponse.json(
        { error: "Reply body is required" },
        { status: 400 }
      );
    }

    // Create inbound email message
    const emailMessage = await db.emailMessage.create({
      data: {
        actionId: actionId,
        direction: "inbound",
        body: body.trim(),
        senderName: senderName || action.lead.name || null,
        receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
      },
    });

    // Auto-update lead status to "responded"
    if (action.lead.status !== "responded") {
      await db.lead.update({
        where: { id: action.lead.id },
        data: { status: "responded" },
      });
    }

    return NextResponse.json({ message: emailMessage });
  } catch (error) {
    console.error("Add reply error:", error);
    return NextResponse.json(
      { error: "Failed to add reply" },
      { status: 500 }
    );
  }
}
