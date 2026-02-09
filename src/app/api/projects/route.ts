import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkProjectLimit, incrementUsage } from "@/lib/plan-limits";

// GET /api/projects - List all projects for the current user
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await db.project.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      _count: {
        select: { leads: true, plans: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(projects);
}

// POST /api/projects - Create a new project
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, description } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    // Check project limit
    const limitCheck = await checkProjectLimit(session.user.id);
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

    const project = await db.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        ownerId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: "admin",
          },
        },
      },
      include: {
        _count: {
          select: { leads: true, plans: true },
        },
      },
    });

    // Increment usage counter
    await incrementUsage(session.user.id, "project");

    return NextResponse.json(project);
  } catch (error) {
    console.error("Create project error:", error);
    if (error instanceof Error && error.message.includes("User not found")) {
      return NextResponse.json(
        { error: "User not found. Please sign out and sign in again." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
