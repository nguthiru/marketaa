import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, leadId } = await params;

  // Verify access
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const lead = await db.lead.findFirst({
    where: { id: leadId, projectId },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  try {
    const { key, value, source = "user", confidence = "confirmed" } = await req.json();

    const context = await db.leadContext.create({
      data: {
        leadId,
        key,
        value,
        source,
        confidence,
      },
    });

    return NextResponse.json(context);
  } catch (error) {
    console.error("Add context error:", error);
    return NextResponse.json({ error: "Failed to add context" }, { status: 500 });
  }
}
