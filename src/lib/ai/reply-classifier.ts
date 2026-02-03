import OpenAI from "openai";
import { db } from "@/lib/db";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Reply classification types
 */
export type ReplyClassificationType =
  | "positive"
  | "negative"
  | "out_of_office"
  | "bounce"
  | "neutral"
  | "question";

/**
 * Classification result structure
 */
export interface ClassificationResult {
  classification: ReplyClassificationType;
  confidence: number;
  sentiment: number;
  isAutoReply: boolean;
  requiresResponse: boolean;
  nextActionSuggestion: string;
  keyPhrases: string[];
}

/**
 * Classify an email reply using AI
 */
export async function classifyReply(
  replyBody: string,
  replySubject: string,
  originalSubject?: string
): Promise<ClassificationResult> {
  const prompt = `Analyze this email reply and classify it.

${originalSubject ? `ORIGINAL EMAIL SUBJECT: ${originalSubject}` : ""}
REPLY SUBJECT: ${replySubject}
REPLY BODY:
${replyBody}

Classify this reply into ONE of these categories:
- positive: Interested, wants to learn more, agrees to meeting, asks for call
- negative: Not interested, asks to stop emails, unsubscribe request, explicitly declining
- out_of_office: Auto-reply indicating person is away, vacation, parental leave
- bounce: Delivery failure, invalid address, mailbox full, address not found
- neutral: Acknowledges receipt but no clear intent, generic thanks
- question: Asking for more information, clarifying questions about the offer

Also determine:
- Is this an auto-reply (out-of-office, vacation auto-responder)?
- Does this require a response from the sender?
- What should the sender do next?

Respond ONLY with valid JSON (no markdown):
{
  "classification": "positive|negative|out_of_office|bounce|neutral|question",
  "confidence": 0.0 to 1.0,
  "sentiment": -1.0 to 1.0 (negative to positive),
  "isAutoReply": true or false,
  "requiresResponse": true or false,
  "nextActionSuggestion": "Brief suggestion for next step",
  "keyPhrases": ["key", "phrases", "from", "email"]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 500,
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(content);

    // Validate and normalize the result
    return {
      classification: validateClassification(result.classification),
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      sentiment: Math.max(-1, Math.min(1, result.sentiment || 0)),
      isAutoReply: Boolean(result.isAutoReply),
      requiresResponse: Boolean(result.requiresResponse),
      nextActionSuggestion: result.nextActionSuggestion || "",
      keyPhrases: Array.isArray(result.keyPhrases)
        ? result.keyPhrases.slice(0, 10)
        : [],
    };
  } catch (error) {
    console.error("Error classifying reply:", error);

    // Return a default classification on error
    return {
      classification: "neutral",
      confidence: 0.3,
      sentiment: 0,
      isAutoReply: false,
      requiresResponse: true,
      nextActionSuggestion: "Review this reply manually",
      keyPhrases: [],
    };
  }
}

/**
 * Validate classification is one of the allowed types
 */
function validateClassification(classification: string): ReplyClassificationType {
  const validTypes: ReplyClassificationType[] = [
    "positive",
    "negative",
    "out_of_office",
    "bounce",
    "neutral",
    "question",
  ];

  if (validTypes.includes(classification as ReplyClassificationType)) {
    return classification as ReplyClassificationType;
  }

  return "neutral";
}

/**
 * Classify a reply and store the classification in the database
 */
export async function classifyAndStoreReply(
  emailMessageId: string
): Promise<ClassificationResult | null> {
  try {
    // Get the email message with its action
    const emailMessage = await db.emailMessage.findUnique({
      where: { id: emailMessageId },
      include: {
        action: true,
      },
    });

    if (!emailMessage || emailMessage.direction !== "inbound") {
      return null;
    }

    // Check if already classified
    const existingClassification = await db.replyClassification.findUnique({
      where: { emailMessageId },
    });

    if (existingClassification) {
      // Return existing classification
      return {
        classification:
          existingClassification.classification as ReplyClassificationType,
        confidence: existingClassification.confidence,
        sentiment: existingClassification.sentiment || 0,
        isAutoReply: existingClassification.isAutoReply,
        requiresResponse: existingClassification.requiresResponse,
        nextActionSuggestion:
          existingClassification.nextActionSuggestion || "",
        keyPhrases: existingClassification.keyPhrases
          ? JSON.parse(existingClassification.keyPhrases)
          : [],
      };
    }

    // Classify the reply
    const result = await classifyReply(
      emailMessage.body,
      emailMessage.subject || "",
      emailMessage.action.subject || undefined
    );

    // Store the classification
    await db.replyClassification.create({
      data: {
        emailMessageId,
        classification: result.classification,
        confidence: result.confidence,
        sentiment: result.sentiment,
        isAutoReply: result.isAutoReply,
        requiresResponse: result.requiresResponse,
        nextActionSuggestion: result.nextActionSuggestion,
        keyPhrases: JSON.stringify(result.keyPhrases),
      },
    });

    // Update lead status based on classification
    await updateLeadStatusFromClassification(
      emailMessage.action.leadId,
      result
    );

    return result;
  } catch (error) {
    console.error("Error classifying and storing reply:", error);
    return null;
  }
}

/**
 * Update lead status based on reply classification
 */
async function updateLeadStatusFromClassification(
  leadId: string,
  result: ClassificationResult
): Promise<void> {
  const statusMap: Record<ReplyClassificationType, string | null> = {
    positive: "responded",
    negative: "not_interested",
    question: "follow_up_needed",
    neutral: "responded",
    out_of_office: null, // Don't change status for OOO
    bounce: null, // Handle bounces separately
  };

  const newStatus = statusMap[result.classification];

  if (newStatus) {
    await db.lead.update({
      where: { id: leadId },
      data: {
        status: newStatus,
        lastReplyClassification: result.classification,
      },
    });
  } else if (result.classification !== "bounce") {
    // Just update the classification field without changing status
    await db.lead.update({
      where: { id: leadId },
      data: {
        lastReplyClassification: result.classification,
      },
    });
  }
}

/**
 * Reclassify a reply (manually triggered)
 */
export async function reclassifyReply(
  emailMessageId: string
): Promise<ClassificationResult | null> {
  // Delete existing classification
  try {
    await db.replyClassification.delete({
      where: { emailMessageId },
    });
  } catch {
    // Ignore if doesn't exist
  }

  // Reclassify
  return classifyAndStoreReply(emailMessageId);
}

/**
 * Get classification display info
 */
export function getClassificationDisplayInfo(
  classification: ReplyClassificationType
): {
  label: string;
  color: string;
  icon: string;
  description: string;
} {
  const info: Record<
    ReplyClassificationType,
    { label: string; color: string; icon: string; description: string }
  > = {
    positive: {
      label: "Interested",
      color: "green",
      icon: "👍",
      description: "Lead is interested and wants to learn more",
    },
    negative: {
      label: "Not Interested",
      color: "red",
      icon: "👎",
      description: "Lead declined or asked to stop contact",
    },
    out_of_office: {
      label: "Out of Office",
      color: "yellow",
      icon: "🏖️",
      description: "Auto-reply indicating person is away",
    },
    bounce: {
      label: "Bounced",
      color: "orange",
      icon: "⚠️",
      description: "Email delivery failed",
    },
    neutral: {
      label: "Neutral",
      color: "gray",
      icon: "😐",
      description: "No clear positive or negative signal",
    },
    question: {
      label: "Has Questions",
      color: "blue",
      icon: "❓",
      description: "Lead is asking for more information",
    },
  };

  return info[classification] || info.neutral;
}
