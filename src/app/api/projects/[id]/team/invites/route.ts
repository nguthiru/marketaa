import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { sendTeamInviteEmail, generateToken } from "@/lib/auth-utils";

// GET /api/projects/[id]/team/invites - Get pending invites
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Verify user has access to this project
    const membership = await db.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const invites = await db.teamInvite.findMany({
      where: {
        projectId,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invites);
  } catch (error) {
    console.error("Failed to fetch invites:", error);
    return NextResponse.json(
      { error: "Failed to fetch invites" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/team/invites - Create invite
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await req.json();
    const { email, role } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

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
        { error: "Only admins can invite members" },
        { status: 403 }
      );
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user is already a member
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      const existingMembership = await db.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: existingUser.id,
          },
        },
      });

      if (existingMembership) {
        return NextResponse.json(
          { error: "User is already a team member" },
          { status: 400 }
        );
      }
    }

    // Check for existing pending invite
    const existingInvite = await db.teamInvite.findFirst({
      where: {
        projectId,
        email: normalizedEmail,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: "An invite is already pending for this email" },
        { status: 400 }
      );
    }

    // Create invite
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await db.teamInvite.create({
      data: {
        projectId,
        email: normalizedEmail,
        role: role || "member",
        token,
        invitedById: session.user.id,
        expiresAt,
      },
    });

    // Send invite email
    const inviterName = session.user.name || session.user.email || "A team member";
    try {
      await sendTeamInviteEmail(normalizedEmail, inviterName, project.name, token);
    } catch (emailError) {
      console.error("Failed to send invite email:", emailError);
      // Continue - invite is created, user can share link manually
    }

    await createAuditLog({
      userId: session.user.id,
      action: "invite_sent",
      resourceType: "team_member",
      resourceId: invite.id,
      metadata: { projectId, invitedEmail: normalizedEmail, role },
    });

    return NextResponse.json(invite);
  } catch (error) {
    console.error("Failed to create invite:", error);
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }
}
