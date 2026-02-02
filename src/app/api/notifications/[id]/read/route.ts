import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { markAsRead } from "@/lib/notifications";

// POST /api/notifications/[id]/read - Mark notification as read
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await markAsRead(id, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
    return NextResponse.json(
      { error: "Failed to mark as read" },
      { status: 500 }
    );
  }
}
