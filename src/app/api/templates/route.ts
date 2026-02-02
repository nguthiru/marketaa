import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/templates - List all templates
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const category = searchParams.get("category");

    const templates = await db.emailTemplate.findMany({
      where: {
        OR: [
          { createdById: session.user.id },
          { isShared: true },
          ...(projectId ? [{ projectId }] : []),
        ],
        ...(category && category !== "all" ? { category } : {}),
      },
      include: {
        variants: true,
        createdBy: {
          select: { name: true, email: true },
        },
        project: {
          select: { name: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

// POST /api/templates - Create a new template
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, subject, body: templateBody, category, isShared, projectId } = body;

    if (!name?.trim() || !subject?.trim() || !templateBody?.trim()) {
      return NextResponse.json(
        { error: "Name, subject, and body are required" },
        { status: 400 }
      );
    }

    // If projectId provided, verify access
    if (projectId) {
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
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }
    }

    const template = await db.emailTemplate.create({
      data: {
        name: name.trim(),
        subject: subject.trim(),
        body: templateBody.trim(),
        category: category || null,
        isShared: isShared || false,
        createdById: session.user.id,
        projectId: projectId || null,
      },
      include: {
        variants: true,
        createdBy: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Failed to create template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
