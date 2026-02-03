import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  classifyAndStoreReply,
  reclassifyReply,
  getClassificationDisplayInfo,
} from "@/lib/ai/reply-classifier";

/**
 * GET /api/emails/[messageId]/classify - Get classification for a message
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageId } = await params;

    // Get message with classification
    const message = await db.emailMessage.findUnique({
      where: { id: messageId },
      include: {
        classification: true,
        action: {
          include: {
            lead: {
              include: {
                project: true,
              },
            },
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Verify access
    const hasAccess =
      message.action.lead.project.ownerId === session.user.id ||
      (await db.projectMember.findFirst({
        where: {
          projectId: message.action.lead.projectId,
          userId: session.user.id,
        },
      }));

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!message.classification) {
      return NextResponse.json({
        hasClassification: false,
        message: "No classification available",
      });
    }

    const displayInfo = getClassificationDisplayInfo(
      message.classification.classification as any
    );

    return NextResponse.json({
      hasClassification: true,
      classification: {
        type: message.classification.classification,
        confidence: message.classification.confidence,
        sentiment: message.classification.sentiment,
        isAutoReply: message.classification.isAutoReply,
        requiresResponse: message.classification.requiresResponse,
        nextActionSuggestion: message.classification.nextActionSuggestion,
        keyPhrases: message.classification.keyPhrases
          ? JSON.parse(message.classification.keyPhrases)
          : [],
        createdAt: message.classification.createdAt,
      },
      displayInfo,
    });
  } catch (error) {
    console.error("Error fetching classification:", error);
    return NextResponse.json(
      { error: "Failed to fetch classification" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/emails/[messageId]/classify - Classify or reclassify a message
 * Body:
 * - force: boolean (optional) - Force reclassification even if already classified
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageId } = await params;
    let force = false;

    try {
      const body = await request.json();
      force = body.force === true;
    } catch {
      // No body or invalid JSON
    }

    // Get message
    const message = await db.emailMessage.findUnique({
      where: { id: messageId },
      include: {
        action: {
          include: {
            lead: {
              include: {
                project: true,
              },
            },
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Verify access
    const hasAccess =
      message.action.lead.project.ownerId === session.user.id ||
      (await db.projectMember.findFirst({
        where: {
          projectId: message.action.lead.projectId,
          userId: session.user.id,
        },
      }));

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only classify inbound messages
    if (message.direction !== "inbound") {
      return NextResponse.json(
        { error: "Can only classify inbound messages" },
        { status: 400 }
      );
    }

    // Classify or reclassify
    const result = force
      ? await reclassifyReply(messageId)
      : await classifyAndStoreReply(messageId);

    if (!result) {
      return NextResponse.json(
        { error: "Failed to classify message" },
        { status: 500 }
      );
    }

    const displayInfo = getClassificationDisplayInfo(result.classification);

    return NextResponse.json({
      success: true,
      classification: {
        type: result.classification,
        confidence: result.confidence,
        sentiment: result.sentiment,
        isAutoReply: result.isAutoReply,
        requiresResponse: result.requiresResponse,
        nextActionSuggestion: result.nextActionSuggestion,
        keyPhrases: result.keyPhrases,
      },
      displayInfo,
    });
  } catch (error) {
    console.error("Error classifying message:", error);
    return NextResponse.json(
      { error: "Failed to classify message" },
      { status: 500 }
    );
  }
}
