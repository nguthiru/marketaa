import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

// GET /api/user/me - Get current user profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        timezone: true,
        role: true,
        createdAt: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PATCH /api/user/me - Update user profile
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, timezone } = body;

    const updateData: { name?: string; timezone?: string } = {};
    if (name !== undefined) updateData.name = name;
    if (timezone !== undefined) updateData.timezone = timezone;

    const user = await db.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        timezone: true,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "profile_update",
      resourceType: "user",
      resourceId: session.user.id,
      metadata: { fields: Object.keys(updateData) },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/user/me - Delete user account
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await createAuditLog({
      userId: session.user.id,
      action: "account_delete",
      resourceType: "user",
      resourceId: session.user.id,
    });

    // Delete user (cascade will handle related data)
    await db.user.delete({
      where: { id: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
