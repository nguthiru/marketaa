import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function checkProjectAccess(projectId: string, userId: string) {
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
  });
  return project;
}

// GET /api/projects/[id]/plans
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

  const plans = await db.plan.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(plans);
}

// POST /api/projects/[id]/plans
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
    const { name, goal, channels, tone, priorities } = await request.json();

    if (!name || !goal) {
      return NextResponse.json(
        { error: "Name and goal are required" },
        { status: 400 }
      );
    }

    const plan = await db.plan.create({
      data: {
        projectId: id,
        name: name.trim(),
        goal,
        channels: channels || '["email"]',
        tone: tone || "neutral",
        priorities: priorities ? JSON.stringify(priorities) : null,
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Create plan error:", error);
    return NextResponse.json(
      { error: "Failed to create plan" },
      { status: 500 }
    );
  }
}
