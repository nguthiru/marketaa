import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

// DELETE /api/projects/[id]/team/invites/[inviteId] - Cancel invite
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, inviteId } = await params;

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
        { error: "Only admins can cancel invites" },
        { status: 403 }
      );
    }

    const invite = await db.teamInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite || invite.projectId !== projectId) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    await db.teamInvite.update({
      where: { id: inviteId },
      data: { status: "cancelled" },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "invite_cancelled",
      resourceType: "team_member",
      resourceId: inviteId,
      metadata: { projectId, email: invite.email },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to cancel invite:", error);
    return NextResponse.json(
      { error: "Failed to cancel invite" },
      { status: 500 }
    );
  }
}
