import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/sequences/[id] - Get a specific sequence
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const sequence = await db.sequence.findFirst({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            members: { select: { userId: true } },
          },
        },
        steps: {
          orderBy: { order: "asc" },
        },
        enrollments: {
          include: {
            lead: {
              select: { id: true, name: true, email: true, organization: true },
            },
          },
          orderBy: { enrolledAt: "desc" },
          take: 50,
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });

    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    }

    // Check access
    const hasAccess =
      sequence.project.ownerId === session.user.id ||
      sequence.project.members.some((m) => m.userId === session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(sequence);
  } catch (error) {
    console.error("Failed to fetch sequence:", error);
    return NextResponse.json(
      { error: "Failed to fetch sequence" },
      { status: 500 }
    );
  }
}

// PATCH /api/sequences/[id] - Update a sequence
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Verify access
    const existing = await db.sequence.findFirst({
      where: { id },
      include: {
        project: {
          select: { ownerId: true, members: { select: { userId: true } } },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    }

    const hasAccess =
      existing.project.ownerId === session.user.id ||
      existing.project.members.some((m) => m.userId === session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, status, triggerType, triggerConfig } = body;

    const sequence = await db.sequence.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(status !== undefined && { status }),
        ...(triggerType !== undefined && { triggerType }),
        ...(triggerConfig !== undefined && { triggerConfig: JSON.stringify(triggerConfig) }),
      },
      include: {
        steps: { orderBy: { order: "asc" } },
        _count: { select: { enrollments: true } },
      },
    });

    return NextResponse.json(sequence);
  } catch (error) {
    console.error("Failed to update sequence:", error);
    return NextResponse.json(
      { error: "Failed to update sequence" },
      { status: 500 }
    );
  }
}

// DELETE /api/sequences/[id] - Delete a sequence
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Verify access
    const existing = await db.sequence.findFirst({
      where: { id },
      include: {
        project: {
          select: { ownerId: true, members: { select: { userId: true } } },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    }

    const hasAccess =
      existing.project.ownerId === session.user.id ||
      existing.project.members.some((m) => m.userId === session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await db.sequence.delete({ where: { id } });

    return NextResponse.json({ message: "Sequence deleted" });
  } catch (error) {
    console.error("Failed to delete sequence:", error);
    return NextResponse.json(
      { error: "Failed to delete sequence" },
      { status: 500 }
    );
  }
}
