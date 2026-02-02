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

// GET /api/projects/[id]/context
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

  const context = await db.projectContext.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(context);
}

// POST /api/projects/[id]/context
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
    const { key, value } = await request.json();

    if (!key || !value) {
      return NextResponse.json(
        { error: "Key and value are required" },
        { status: 400 }
      );
    }

    const context = await db.projectContext.create({
      data: {
        projectId: id,
        key: key.trim().toLowerCase().replace(/\s+/g, "_"),
        value: value.trim(),
        source: "user",
      },
    });

    return NextResponse.json(context);
  } catch (error) {
    console.error("Create context error:", error);
    return NextResponse.json(
      { error: "Failed to create context" },
      { status: 500 }
    );
  }
}
