import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

// GET /api/admin/users/[userId] - Get user details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { userId } = await params;

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
        usageStats: true,
        invoices: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        ownedProjects: {
          select: {
            id: true,
            name: true,
            _count: { select: { leads: true } },
          },
        },
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Remove sensitive fields
    const { passwordHash, twoFactorSecret, ...safeUser } = user;

    return NextResponse.json(safeUser);
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/[userId] - Update user
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { userId } = await params;
    const body = await req.json();
    const { role, emailVerified, plan } = body;

    const updateData: Record<string, unknown> = {};

    if (role !== undefined && ["user", "admin"].includes(role)) {
      updateData.role = role;
    }

    if (emailVerified !== undefined) {
      updateData.emailVerified = Boolean(emailVerified);
    }

    const user = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
      },
    });

    // Update subscription if plan is provided
    if (plan) {
      await db.subscription.upsert({
        where: { userId },
        create: {
          userId,
          plan,
          status: "active",
        },
        update: {
          plan,
          status: "active",
        },
      });
    }

    await createAuditLog({
      userId: admin.user.id,
      action: "update",
      resourceType: "user",
      resourceId: userId,
      metadata: { updatedFields: Object.keys(body) },
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

// DELETE /api/admin/users/[userId] - Delete user
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { userId } = await params;

    // Don't allow deleting yourself
    if (userId === admin.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    await createAuditLog({
      userId: admin.user.id,
      action: "delete",
      resourceType: "user",
      resourceId: userId,
    });

    await db.user.delete({
      where: { id: userId },
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
