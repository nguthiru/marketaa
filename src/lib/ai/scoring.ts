import { db } from "@/lib/db";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ScoreBreakdown {
  engagement: number;  // 0-30 based on email activity
  fit: number;         // 0-25 based on role/org match
  behavior: number;    // 0-25 based on response patterns
  recency: number;     // 0-20 based on last activity
}

export interface LeadScoreResult {
  score: number;
  trend: "rising" | "stable" | "falling";
  breakdown: ScoreBreakdown;
  aiSummary: string;
}

export async function calculateLeadScore(leadId: string): Promise<LeadScoreResult> {
  // Get lead with all related data
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: {
      actions: {
        include: {
          feedback: true,
          emailMessages: true,
        },
        orderBy: { createdAt: "desc" },
      },
      contextItems: {
        where: { dismissed: false },
      },
      project: {
        include: {
          context: true,
        },
      },
      score: true,
    },
  });

  if (!lead) {
    throw new Error("Lead not found");
  }

  // Calculate engagement score (0-30)
  let engagement = 0;
  const totalActions = lead.actions.length;
  const sentEmails = lead.actions.filter((a) => a.status === "sent").length;
  const replies = lead.actions.filter((a) =>
    a.emailMessages.some((m) => m.direction === "inbound")
  ).length;
  const meetings = lead.actions.filter((a) =>
    a.feedback?.outcome === "meeting_booked"
  ).length;

  if (sentEmails > 0) engagement += 5;
  if (replies > 0) engagement += 10;
  if (meetings > 0) engagement += 15;
  engagement = Math.min(engagement, 30);

  // Calculate fit score (0-25)
  let fit = 10; // Base score
  if (lead.role) fit += 5;
  if (lead.organization) fit += 5;
  if (lead.email) fit += 5;
  fit = Math.min(fit, 25);

  // Calculate behavior score (0-25)
  let behavior = 10; // Base score
  const positiveOutcomes = lead.actions.filter((a) =>
    ["replied", "meeting_booked", "converted"].includes(a.feedback?.outcome || "")
  ).length;
  const negativeOutcomes = lead.actions.filter((a) =>
    ["not_interested"].includes(a.feedback?.outcome || "")
  ).length;

  behavior += positiveOutcomes * 5;
  behavior -= negativeOutcomes * 5;
  behavior = Math.max(0, Math.min(behavior, 25));

  // Calculate recency score (0-20)
  let recency = 20; // Start at max
  const lastActivity = lead.actions[0]?.updatedAt || lead.updatedAt;
  const daysSinceActivity = Math.floor(
    (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceActivity > 30) recency = 5;
  else if (daysSinceActivity > 14) recency = 10;
  else if (daysSinceActivity > 7) recency = 15;
  // else recency stays at 20

  const breakdown: ScoreBreakdown = {
    engagement,
    fit,
    behavior,
    recency,
  };

  const score = engagement + fit + behavior + recency;

  // Determine trend
  let trend: "rising" | "stable" | "falling" = "stable";
  if (lead.score) {
    const previousScore = lead.score.score;
    if (score > previousScore + 5) trend = "rising";
    else if (score < previousScore - 5) trend = "falling";
  }

  // Generate AI summary
  let aiSummary = "";
  if (process.env.OPENAI_API_KEY) {
    try {
      const context = lead.contextItems.map((c) => `${c.key}: ${c.value}`).join("\n");
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Generate a 1-2 sentence summary of this lead's engagement and priority level. Be concise.",
          },
          {
            role: "user",
            content: `Lead: ${lead.name}
Role: ${lead.role || "Unknown"}
Company: ${lead.organization || "Unknown"}
Score: ${score}/100
Engagement: ${engagement}/30, Fit: ${fit}/25, Behavior: ${behavior}/25, Recency: ${recency}/20
Emails sent: ${sentEmails}, Replies: ${replies}, Meetings: ${meetings}
Context: ${context.slice(0, 500)}`,
          },
        ],
        temperature: 0.5,
        max_tokens: 100,
      });

      aiSummary = response.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("AI summary failed:", error);
      aiSummary = generateDefaultSummary(score, breakdown);
    }
  } else {
    aiSummary = generateDefaultSummary(score, breakdown);
  }

  // Save score to database
  await db.leadScore.upsert({
    where: { leadId },
    create: {
      leadId,
      score,
      trend,
      breakdown: JSON.stringify(breakdown),
      aiSummary,
      lastAnalyzedAt: new Date(),
    },
    update: {
      score,
      trend,
      breakdown: JSON.stringify(breakdown),
      aiSummary,
      lastAnalyzedAt: new Date(),
    },
  });

  return { score, trend, breakdown, aiSummary };
}

function generateDefaultSummary(score: number, breakdown: ScoreBreakdown): string {
  if (score >= 80) {
    return "High-priority lead with strong engagement. Ready for immediate follow-up.";
  } else if (score >= 60) {
    return "Promising lead with good potential. Continue nurturing with targeted outreach.";
  } else if (score >= 40) {
    return "Moderate engagement. Consider refreshing approach or re-engaging.";
  } else {
    return "Low engagement score. May need different approach or qualification review.";
  }
}

export async function getLeadScore(leadId: string): Promise<LeadScoreResult | null> {
  const score = await db.leadScore.findUnique({
    where: { leadId },
  });

  if (!score) return null;

  return {
    score: score.score,
    trend: score.trend as "rising" | "stable" | "falling",
    breakdown: JSON.parse(score.breakdown || "{}") as ScoreBreakdown,
    aiSummary: score.aiSummary || "",
  };
}
