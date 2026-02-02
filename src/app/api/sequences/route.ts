import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/sequences - List all sequences
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    // Get all projects user has access to
    const userProjects = await db.project.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
      select: { id: true, name: true },
    });

    const projectIds = userProjects.map((p) => p.id);

    // If specific project requested, verify access
    if (projectId && !projectIds.includes(projectId)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const sequences = await db.sequence.findMany({
      where: {
        projectId: projectId ? projectId : { in: projectIds },
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
        steps: {
          orderBy: { order: "asc" },
        },
        _count: {
          select: { enrollments: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      sequences,
      projects: userProjects,
    });
  } catch (error) {
    console.error("Failed to fetch sequences:", error);
    return NextResponse.json(
      { error: "Failed to fetch sequences" },
      { status: 500 }
    );
  }
}

// POST /api/sequences - Create a new sequence
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { projectId, name, description, triggerType } = body;

    if (!projectId || !name?.trim()) {
      return NextResponse.json(
        { error: "Project ID and name are required" },
        { status: 400 }
      );
    }

    // Check project access
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

    const sequence = await db.sequence.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        triggerType: triggerType || "manual",
        projectId,
      },
      include: {
        steps: true,
        _count: {
          select: { enrollments: true },
        },
      },
    });

    return NextResponse.json(sequence);
  } catch (error) {
    console.error("Failed to create sequence:", error);
    return NextResponse.json(
      { error: "Failed to create sequence" },
      { status: 500 }
    );
  }
}
