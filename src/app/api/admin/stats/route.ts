import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

// GET /api/admin/stats - Get admin dashboard stats
export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersThisMonth,
      newUsersThisWeek,
      totalProjects,
      totalLeads,
      activeSubscriptions,
      subscriptionsByPlan,
      recentInvoices,
      monthlyRevenue,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      db.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      db.project.count(),
      db.lead.count(),
      db.subscription.count({ where: { status: "active" } }),
      db.subscription.groupBy({
        by: ["plan"],
        where: { status: "active" },
        _count: true,
      }),
      db.invoice.findMany({
        where: { status: "paid", createdAt: { gte: thirtyDaysAgo } },
        select: { amount: true, currency: true },
      }),
      db.invoice.aggregate({
        where: { status: "paid", createdAt: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
      }),
    ]);

    // Format subscription breakdown
    const planBreakdown = subscriptionsByPlan.reduce((acc, item) => {
      acc[item.plan] = item._count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      users: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth,
        newThisWeek: newUsersThisWeek,
      },
      content: {
        projects: totalProjects,
        leads: totalLeads,
      },
      subscriptions: {
        active: activeSubscriptions,
        byPlan: planBreakdown,
      },
      revenue: {
        thisMonth: monthlyRevenue._sum.amount || 0,
        invoiceCount: recentInvoices.length,
      },
    });
  } catch (error) {
    console.error("Failed to fetch admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
