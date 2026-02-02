import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/templates/[id]/variants - Add a variant
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: templateId } = await params;

  try {
    // Verify ownership
    const template = await db.emailTemplate.findFirst({
      where: {
        id: templateId,
        createdById: session.user.id,
      },
      include: { variants: true },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found or you don't have permission" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, subject, body: variantBody } = body;

    // Auto-generate name if not provided
    const variantName = name || String.fromCharCode(65 + template.variants.length); // A, B, C...

    if (!subject?.trim() || !variantBody?.trim()) {
      return NextResponse.json(
        { error: "Subject and body are required" },
        { status: 400 }
      );
    }

    const variant = await db.templateVariant.create({
      data: {
        name: variantName,
        subject: subject.trim(),
        body: variantBody.trim(),
        templateId,
      },
    });

    return NextResponse.json(variant);
  } catch (error) {
    console.error("Failed to create variant:", error);
    return NextResponse.json(
      { error: "Failed to create variant" },
      { status: 500 }
    );
  }
}

// PATCH /api/templates/[id]/variants - Update a variant
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: templateId } = await params;

  try {
    // Verify ownership
    const template = await db.emailTemplate.findFirst({
      where: {
        id: templateId,
        createdById: session.user.id,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found or you don't have permission" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { variantId, name, subject, body: variantBody } = body;

    if (!variantId) {
      return NextResponse.json(
        { error: "Variant ID is required" },
        { status: 400 }
      );
    }

    const variant = await db.templateVariant.update({
      where: { id: variantId },
      data: {
        ...(name !== undefined && { name }),
        ...(subject !== undefined && { subject: subject.trim() }),
        ...(variantBody !== undefined && { body: variantBody.trim() }),
      },
    });

    return NextResponse.json(variant);
  } catch (error) {
    console.error("Failed to update variant:", error);
    return NextResponse.json(
      { error: "Failed to update variant" },
      { status: 500 }
    );
  }
}

// DELETE /api/templates/[id]/variants - Delete a variant
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: templateId } = await params;

  try {
    const { searchParams } = new URL(req.url);
    const variantId = searchParams.get("variantId");

    if (!variantId) {
      return NextResponse.json(
        { error: "Variant ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const template = await db.emailTemplate.findFirst({
      where: {
        id: templateId,
        createdById: session.user.id,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found or you don't have permission" },
        { status: 404 }
      );
    }

    await db.templateVariant.delete({
      where: { id: variantId },
    });

    return NextResponse.json({ message: "Variant deleted" });
  } catch (error) {
    console.error("Failed to delete variant:", error);
    return NextResponse.json(
      { error: "Failed to delete variant" },
      { status: 500 }
    );
  }
}
