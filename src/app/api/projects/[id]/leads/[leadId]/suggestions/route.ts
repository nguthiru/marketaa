import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { suggestNextSteps } from "@/lib/ai/suggestions";

// GET /api/projects/[id]/leads/[leadId]/suggestions - Get AI suggestions
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id, leadId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify project access
  const project = await db.project.findFirst({
    where: {
      id,
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Verify lead belongs to project
  const lead = await db.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead || lead.projectId !== id) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  try {
    const suggestions = await suggestNextSteps(leadId);
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Suggestions error:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
