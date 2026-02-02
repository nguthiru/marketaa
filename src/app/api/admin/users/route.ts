import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

// GET /api/admin/users - List all users
export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const plan = searchParams.get("plan") || "";

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { email: { contains: search } },
        { name: { contains: search } },
      ];
    }

    if (plan) {
      where.subscription = { plan };
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          subscription: {
            select: {
              plan: true,
              status: true,
              currentPeriodEnd: true,
            },
          },
          usageStats: {
            select: {
              projectCount: true,
              leadCount: true,
              emailsGeneratedThisMonth: true,
            },
          },
          _count: {
            select: {
              ownedProjects: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
