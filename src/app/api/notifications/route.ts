import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/notifications - Get user notifications
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "true";
  const limit = parseInt(searchParams.get("limit") || "20");

  try {
    const notifications = await db.notification.findMany({
      where: {
        userId: session.user.id,
        ...(unreadOnly && { read: false }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const unreadCount = await db.notification.count({
      where: {
        userId: session.user.id,
        read: false,
      },
    });

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { ids, markAllRead } = body;

    if (markAllRead) {
      await db.notification.updateMany({
        where: {
          userId: session.user.id,
          read: false,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });
    } else if (ids && Array.isArray(ids)) {
      await db.notification.updateMany({
        where: {
          userId: session.user.id,
          id: { in: ids },
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update notifications:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
