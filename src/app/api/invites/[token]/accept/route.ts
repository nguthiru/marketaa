import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

// POST /api/invites/[token]/accept - Accept invite
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Please sign in to accept this invitation" }, { status: 401 });
    }

    const { token } = await params;

    const invite = await db.teamInvite.findUnique({
      where: { token },
      include: {
        project: { select: { id: true, name: true } },
        invitedBy: { select: { id: true, name: true } },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (invite.status !== "pending") {
      return NextResponse.json(
        { error: "This invitation has already been used" },
        { status: 400 }
      );
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 }
      );
    }

    // Verify the email matches (case insensitive)
    const userEmail = session.user.email?.toLowerCase();
    if (userEmail !== invite.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invitation was sent to a different email address" },
        { status: 403 }
      );
    }

    // Check if already a member
    const existingMembership = await db.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: invite.projectId,
          userId: session.user.id,
        },
      },
    });

    if (existingMembership) {
      // Already a member, just mark invite as accepted
      await db.teamInvite.update({
        where: { id: invite.id },
        data: { status: "accepted" },
      });

      return NextResponse.json({ projectId: invite.projectId });
    }

    // Create membership and update invite
    await db.$transaction([
      db.projectMember.create({
        data: {
          projectId: invite.projectId,
          userId: session.user.id,
          role: invite.role,
        },
      }),
      db.teamInvite.update({
        where: { id: invite.id },
        data: { status: "accepted" },
      }),
    ]);

    // Notify the inviter
    await createNotification({
      userId: invite.invitedById,
      type: "team_member_joined",
      title: "Invitation Accepted",
      message: `${session.user.name || session.user.email} has joined ${invite.project.name}`,
      link: `/projects/${invite.projectId}`,
    });

    await createAuditLog({
      userId: session.user.id,
      action: "invite_accepted",
      resourceType: "team_member",
      resourceId: invite.id,
      metadata: { projectId: invite.projectId, role: invite.role },
    });

    return NextResponse.json({ projectId: invite.projectId });
  } catch (error) {
    console.error("Failed to accept invite:", error);
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
