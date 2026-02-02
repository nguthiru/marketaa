import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/invites/[token] - Get invite details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invite = await db.teamInvite.findUnique({
      where: { token },
      include: {
        project: { select: { name: true } },
        invitedBy: { select: { name: true, email: true } },
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

    return NextResponse.json({
      projectName: invite.project.name,
      inviterName: invite.invitedBy.name || invite.invitedBy.email,
      role: invite.role,
      email: invite.email,
    });
  } catch (error) {
    console.error("Failed to fetch invite:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitation" },
      { status: 500 }
    );
  }
}
