import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { enrichLeadContext } from "@/lib/ai/enrichment";
import { checkLeadLimit, incrementUsage } from "@/lib/plan-limits";

// Helper to check project access
async function checkProjectAccess(projectId: string, userId: string) {
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
  });
  return project;
}

// GET /api/projects/[id]/leads - List leads in a project
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await checkProjectAccess(id, session.user.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const leads = await db.lead.findMany({
    where: { projectId: id },
    include: {
      contextItems: {
        where: { dismissed: false },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { actions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(leads);
}

// POST /api/projects/[id]/leads - Create a new lead
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await checkProjectAccess(id, session.user.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const { name, email, phone, role, organization, notes } =
      await request.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Lead name is required" },
        { status: 400 }
      );
    }

    // Check lead limit
    const limitCheck = await checkLeadLimit(session.user.id, id);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: limitCheck.message,
          limitReached: true,
          current: limitCheck.current,
          limit: limitCheck.limit,
        },
        { status: 403 }
      );
    }

    // Create the lead
    const lead = await db.lead.create({
      data: {
        projectId: id,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        role: role?.trim() || null,
        organization: organization?.trim() || null,
        notes: notes?.trim() || null,
      },
      include: {
        contextItems: true,
        _count: { select: { actions: true } },
      },
    });

    // Increment usage counter
    await incrementUsage(session.user.id, "lead");

    // Trigger async context enrichment (non-blocking)
    enrichLeadContext(lead.id, project).catch((err) => {
      console.error("Context enrichment failed:", err);
    });

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Create lead error:", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}
