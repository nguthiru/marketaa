import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendTeamInviteEmail } from "@/lib/auth-utils";

// POST /api/projects/[id]/team/invites/[inviteId]/resend - Resend invite email
export async function POST(
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
        { error: "Only admins can resend invites" },
        { status: 403 }
      );
    }

    const invite = await db.teamInvite.findUnique({
      where: { id: inviteId },
      include: {
        project: { select: { name: true } },
      },
    });

    if (!invite || invite.projectId !== projectId) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.status !== "pending") {
      return NextResponse.json(
        { error: "Invite is no longer pending" },
        { status: 400 }
      );
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invite has expired" },
        { status: 400 }
      );
    }

    // Resend email
    const inviterName = session.user.name || session.user.email || "A team member";
    await sendTeamInviteEmail(
      invite.email,
      inviterName,
      invite.project.name,
      invite.token
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to resend invite:", error);
    return NextResponse.json(
      { error: "Failed to resend invite" },
      { status: 500 }
    );
  }
}
