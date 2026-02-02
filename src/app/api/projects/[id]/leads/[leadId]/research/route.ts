import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { researchLead } from "@/lib/ai/agent";

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
    include: {
      context: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const lead = await db.lead.findFirst({
    where: { id: leadId, projectId },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Build project context string
  const projectContext = [
    `Project: ${project.name}`,
    project.description ? `Description: ${project.description}` : "",
    ...project.context.map(c => `${c.key}: ${c.value}`),
  ].filter(Boolean).join("\n");

  try {
    // Run the research agent
    const research = await researchLead(
      lead.name,
      lead.email,
      lead.role,
      lead.organization,
      projectContext
    );

    // Store research results as context items
    const contextItems = [];

    if (research.keyFacts.length > 0) {
      contextItems.push({
        leadId,
        key: "research_key_facts",
        value: research.keyFacts.join("\n"),
        source: "ai_research",
        confidence: research.confidence === "high" ? "confirmed" : "likely" as const,
      });
    }

    if (research.likelyPriorities.length > 0) {
      contextItems.push({
        leadId,
        key: "likely_priorities",
        value: research.likelyPriorities.join("\n"),
        source: "ai_research",
        confidence: "likely" as const,
      });
    }

    if (research.conversationAngles.length > 0) {
      contextItems.push({
        leadId,
        key: "conversation_angles",
        value: research.conversationAngles.join("\n"),
        source: "ai_research",
        confidence: "likely" as const,
      });
    }

    if (research.recentNews.length > 0) {
      contextItems.push({
        leadId,
        key: "recent_news",
        value: research.recentNews.join("\n"),
        source: "ai_research",
        confidence: "confirmed" as const,
      });
    }

    // Add summary
    contextItems.push({
      leadId,
      key: "research_summary",
      value: research.summary,
      source: "ai_research",
      confidence: research.confidence === "high" ? "confirmed" : "likely" as const,
    });

    // Clear old AI research and add new
    await db.leadContext.deleteMany({
      where: {
        leadId,
        source: "ai_research",
      },
    });

    if (contextItems.length > 0) {
      await db.leadContext.createMany({
        data: contextItems,
      });
    }

    // Fetch updated lead
    const updatedLead = await db.lead.findUnique({
      where: { id: leadId },
      include: {
        contextItems: true,
        _count: { select: { actions: true } },
      },
    });

    return NextResponse.json({
      lead: updatedLead,
      research: {
        summary: research.summary,
        keyFacts: research.keyFacts,
        likelyPriorities: research.likelyPriorities,
        conversationAngles: research.conversationAngles,
        recentNews: research.recentNews,
        confidence: research.confidence,
      },
    });
  } catch (error) {
    console.error("Research error:", error);
    return NextResponse.json(
      { error: "Research failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
