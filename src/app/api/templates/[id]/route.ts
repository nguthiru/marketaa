import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/templates/[id] - Get a specific template
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
    const template = await db.emailTemplate.findFirst({
      where: {
        id,
        OR: [
          { createdById: session.user.id },
          { isShared: true },
        ],
      },
      include: {
        variants: true,
        createdBy: {
          select: { name: true, email: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Failed to fetch template:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

// PATCH /api/templates/[id] - Update a template
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
    // Verify ownership
    const existing = await db.emailTemplate.findFirst({
      where: {
        id,
        createdById: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Template not found or you don't have permission" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, subject, body: templateBody, category, isShared } = body;

    const template = await db.emailTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(subject !== undefined && { subject: subject.trim() }),
        ...(templateBody !== undefined && { body: templateBody.trim() }),
        ...(category !== undefined && { category }),
        ...(isShared !== undefined && { isShared }),
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
    console.error("Failed to update template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

// DELETE /api/templates/[id] - Delete a template
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
    // Verify ownership
    const existing = await db.emailTemplate.findFirst({
      where: {
        id,
        createdById: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Template not found or you don't have permission" },
        { status: 404 }
      );
    }

    await db.emailTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Template deleted" });
  } catch (error) {
    console.error("Failed to delete template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
