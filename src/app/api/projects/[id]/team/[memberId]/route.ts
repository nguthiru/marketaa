import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

// DELETE /api/projects/[id]/team/[memberId] - Remove team member
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, memberId } = await params;

    // Verify user is admin/owner
    const membership = await db.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: session.user.id,
        },
      },
    });

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only admins can remove members" },
        { status: 403 }
      );
    }

    // Get member to remove
    const memberToRemove = await db.projectMember.findUnique({
      where: { id: memberId },
      include: { user: { select: { email: true } } },
    });

    if (!memberToRemove || memberToRemove.projectId !== projectId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Cannot remove owner
    if (memberToRemove.role === "owner") {
      return NextResponse.json(
        { error: "Cannot remove project owner" },
        { status: 400 }
      );
    }

    await db.projectMember.delete({
      where: { id: memberId },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "member_removed",
      resourceType: "team_member",
      resourceId: memberId,
      metadata: { projectId, removedUserId: memberToRemove.userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove team member:", error);
    return NextResponse.json(
      { error: "Failed to remove team member" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id]/team/[memberId] - Update member role
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, memberId } = await params;
    const body = await req.json();
    const { role } = body;

    if (!role || !["member", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Verify user is admin/owner
    const membership = await db.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: session.user.id,
        },
      },
    });

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only admins can update roles" },
        { status: 403 }
      );
    }

    // Get member to update
    const memberToUpdate = await db.projectMember.findUnique({
      where: { id: memberId },
    });

    if (!memberToUpdate || memberToUpdate.projectId !== projectId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Cannot change owner role
    if (memberToUpdate.role === "owner") {
      return NextResponse.json(
        { error: "Cannot change owner role" },
        { status: 400 }
      );
    }

    const updated = await db.projectMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "member_role_updated",
      resourceType: "team_member",
      resourceId: memberId,
      metadata: { projectId, newRole: role },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update team member:", error);
    return NextResponse.json(
      { error: "Failed to update team member" },
      { status: 500 }
    );
  }
}
