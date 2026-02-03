import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateAction } from "@/lib/ai/enrichment";
import { checkEmailGenerationLimit, incrementUsage } from "@/lib/plan-limits";

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

  // Check email generation limit
  const limitCheck = await checkEmailGenerationLimit(session.user.id);
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

  try {
    const { planId } = await req.json();

    // Pass userId to apply learned writing style
    const result = await generateAction(leadId, planId, session.user.id);

    if (!result) {
      return NextResponse.json(
        { error: "Failed to generate action. Check OpenAI API key." },
        { status: 500 }
      );
    }

    // Increment usage counter
    await incrementUsage(session.user.id, "emailGenerated");

    return NextResponse.json(result);
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
