import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/projects/[id]/leads/[leadId]/conversations - Get all email conversations for a lead
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, leadId } = await params;

  try {
    // Verify project access
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

    // Get lead with actions and messages
    const lead = await db.lead.findFirst({
      where: { id: leadId, projectId },
      include: {
        actions: {
          where: {
            type: "email",
            status: { in: ["sent", "ready"] },
          },
          include: {
            emailMessages: {
              orderBy: { createdAt: "asc" },
            },
            feedback: true,
            plan: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Calculate stats
    const totalEmails = lead.actions.filter((a) => a.sentAt).length;
    const totalReplies = lead.actions.reduce(
      (sum, a) => sum + a.emailMessages.filter((m) => m.direction === "inbound").length,
      0
    );
    const hasUnreadReplies = lead.actions.some((a) =>
      a.emailMessages.some((m) => m.direction === "inbound" && !a.feedback)
    );

    return NextResponse.json({
      lead: {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        organization: lead.organization,
        status: lead.status,
      },
      conversations: lead.actions,
      stats: {
        totalEmails,
        totalReplies,
        hasUnreadReplies,
      },
    });
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}
