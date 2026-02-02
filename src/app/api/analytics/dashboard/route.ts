import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/analytics/dashboard - Get dashboard metrics
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const period = searchParams.get("period") || "30"; // days

    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Build where clause
    const projectFilter = projectId
      ? { projectId }
      : {
          project: {
            OR: [
              { ownerId: session.user.id },
              { members: { some: { userId: session.user.id } } },
            ],
          },
        };

    // Get total leads
    const totalLeads = await db.lead.count({
      where: projectFilter,
    });

    // Get leads by status
    const leadsByStatus = await db.lead.groupBy({
      by: ["status"],
      where: projectFilter,
      _count: true,
    });

    // Get actions data
    const actions = await db.action.findMany({
      where: {
        lead: projectFilter,
        createdAt: { gte: startDate },
      },
      include: {
        feedback: true,
        emailMessages: true,
      },
    });

    const emailsSent = actions.filter((a) => a.status === "sent").length;
    const repliesReceived = actions.filter((a) =>
      a.emailMessages.some((m) => m.direction === "inbound")
    ).length;
    const meetingsBooked = actions.filter((a) =>
      a.feedback?.outcome === "meeting_booked"
    ).length;

    // Calculate rates
    const replyRate = emailsSent > 0 ? Math.round((repliesReceived / emailsSent) * 100) : 0;
    const meetingRate = emailsSent > 0 ? Math.round((meetingsBooked / emailsSent) * 100) : 0;

    // Get outcomes breakdown
    const outcomeBreakdown = await db.actionFeedback.groupBy({
      by: ["outcome"],
      where: {
        action: {
          lead: projectFilter,
          createdAt: { gte: startDate },
        },
      },
      _count: true,
    });

    // Get daily activity for chart
    const dailyActions = await db.action.groupBy({
      by: ["createdAt"],
      where: {
        lead: projectFilter,
        createdAt: { gte: startDate },
        status: "sent",
      },
      _count: true,
    });

    // Aggregate by date
    const activityByDate: Record<string, number> = {};
    dailyActions.forEach((item) => {
      const date = new Date(item.createdAt).toISOString().split("T")[0];
      activityByDate[date] = (activityByDate[date] || 0) + item._count;
    });

    // Get recent activity
    const recentActions = await db.action.findMany({
      where: {
        lead: projectFilter,
        status: "sent",
      },
      include: {
        lead: { select: { name: true, organization: true } },
        feedback: true,
      },
      orderBy: { sentAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      summary: {
        totalLeads,
        emailsSent,
        repliesReceived,
        meetingsBooked,
        replyRate,
        meetingRate,
      },
      leadsByStatus: leadsByStatus.reduce(
        (acc, item) => ({ ...acc, [item.status]: item._count }),
        {}
      ),
      outcomeBreakdown: outcomeBreakdown.reduce(
        (acc, item) => ({ ...acc, [item.outcome]: item._count }),
        {}
      ),
      activityByDate,
      recentActions: recentActions.map((a) => ({
        id: a.id,
        leadName: a.lead.name,
        organization: a.lead.organization,
        subject: a.subject,
        sentAt: a.sentAt,
        outcome: a.feedback?.outcome,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
