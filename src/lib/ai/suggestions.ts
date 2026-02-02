import OpenAI from "openai";
import { db } from "@/lib/db";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ActionWithFeedback {
  id: string;
  type: string;
  status: string;
  subject: string | null;
  body: string;
  createdAt: Date;
  plan: {
    name: string;
    goal: string;
    tone: string;
  };
  feedback: {
    outcome: string;
    notes: string | null;
    createdAt: Date;
  } | null;
}

interface LeadWithHistory {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  organization: string | null;
  status: string;
  notes: string | null;
  contextItems: {
    key: string;
    value: string;
    confidence: string;
  }[];
  actions: ActionWithFeedback[];
}

export interface NextStepSuggestion {
  action: string;
  reasoning: string;
  priority: "high" | "medium" | "low";
  timing: string;
  talkingPoints?: string[];
}

/**
 * Analyzes a lead's history and suggests next steps
 */
export async function suggestNextSteps(
  leadId: string
): Promise<NextStepSuggestion[]> {
  // Check if AI is configured
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your-openai-api-key") {
    return getDefaultSuggestions(leadId);
  }

  // Get lead with full history
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: {
      contextItems: {
        where: { dismissed: false },
        select: { key: true, value: true, confidence: true },
      },
      actions: {
        include: {
          plan: {
            select: { name: true, goal: true, tone: true },
          },
          feedback: {
            select: { outcome: true, notes: true, createdAt: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      project: {
        include: {
          context: {
            select: { key: true, value: true },
          },
        },
      },
    },
  });

  if (!lead) {
    return [];
  }

  try {
    const suggestions = await generateSuggestions(lead as LeadWithHistory & { project: { context: { key: string; value: string }[] } });
    return suggestions;
  } catch (error) {
    console.error("AI suggestion error:", error);
    return getDefaultSuggestions(leadId);
  }
}

async function generateSuggestions(
  lead: LeadWithHistory & { project: { context: { key: string; value: string }[] } }
): Promise<NextStepSuggestion[]> {
  const actionsHistory = lead.actions.map((a) => ({
    date: a.createdAt.toISOString().split("T")[0],
    type: a.type,
    plan: a.plan.name,
    goal: a.plan.goal,
    outcome: a.feedback?.outcome || "pending",
    notes: a.feedback?.notes,
  }));

  const contextSummary = lead.contextItems
    .map((c) => `- ${c.key}: ${c.value} (${c.confidence})`)
    .join("\n");

  const projectContext = lead.project.context
    .map((c) => `- ${c.key}: ${c.value}`)
    .join("\n");

  const prompt = `You are an outreach strategist analyzing a lead's interaction history to suggest next steps.

LEAD PROFILE:
Name: ${lead.name}
Role: ${lead.role || "Unknown"}
Organization: ${lead.organization || "Unknown"}
Current Status: ${lead.status}
Notes: ${lead.notes || "None"}

LEAD CONTEXT:
${contextSummary || "No context gathered yet"}

PROJECT CONTEXT:
${projectContext || "No project context defined"}

INTERACTION HISTORY (most recent first):
${actionsHistory.length > 0
  ? actionsHistory.map((a) =>
      `- ${a.date}: ${a.type} (${a.plan}, goal: ${a.goal}) → Outcome: ${a.outcome}${a.notes ? ` - "${a.notes}"` : ""}`
    ).join("\n")
  : "No previous interactions"
}

Based on this information, suggest 1-3 strategic next steps. Consider:
1. What has worked or not worked in the past
2. The appropriate timing for follow-up
3. How to personalize based on their role and organization
4. What approach might resonate given their context

Respond in JSON format:
{
  "suggestions": [
    {
      "action": "Brief action description (e.g., 'Send follow-up email', 'Schedule a call', 'Share relevant case study')",
      "reasoning": "Why this action makes sense given the history",
      "priority": "high|medium|low",
      "timing": "When to take this action (e.g., 'Within 2 days', 'Next week', 'After their Q2 planning')",
      "talkingPoints": ["Key point 1", "Key point 2"] // Optional, for calls
    }
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_tokens: 1000,
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return [];

  try {
    const parsed = JSON.parse(content);
    return (parsed.suggestions || []).map((s: NextStepSuggestion) => ({
      action: s.action,
      reasoning: s.reasoning,
      priority: s.priority || "medium",
      timing: s.timing || "When appropriate",
      talkingPoints: s.talkingPoints,
    }));
  } catch {
    console.error("Failed to parse AI suggestions:", content);
    return [];
  }
}

/**
 * Provides default suggestions when AI is not available
 */
async function getDefaultSuggestions(leadId: string): Promise<NextStepSuggestion[]> {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: {
      actions: {
        include: { feedback: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!lead) return [];

  const lastAction = lead.actions[0];
  const lastOutcome = lastAction?.feedback?.outcome;

  // Generate contextual default suggestions based on status and last outcome
  if (!lastAction) {
    return [{
      action: "Send initial outreach email",
      reasoning: "No previous contact has been made with this lead",
      priority: "high",
      timing: "As soon as possible",
    }];
  }

  switch (lastOutcome) {
    case "no_reply":
      return [{
        action: "Send a follow-up email",
        reasoning: "Previous outreach received no response - a gentle follow-up may help",
        priority: "medium",
        timing: "3-5 business days after last contact",
      }, {
        action: "Try a different channel",
        reasoning: "Email may not be the best way to reach this person",
        priority: "low",
        timing: "If follow-up doesn't work",
      }];

    case "follow_up":
      return [{
        action: "Schedule the follow-up as discussed",
        reasoning: "Lead indicated interest in continuing the conversation",
        priority: "high",
        timing: "Within the timeframe discussed",
      }];

    case "not_interested":
      return [{
        action: "Note for future re-engagement",
        reasoning: "Not interested now doesn't mean not interested later",
        priority: "low",
        timing: "In 3-6 months, or when circumstances change",
      }];

    case "meeting_booked":
      return [{
        action: "Prepare meeting materials",
        reasoning: "Meeting is scheduled - ensure you're well prepared",
        priority: "high",
        timing: "Before the meeting",
      }, {
        action: "Send calendar invite with agenda",
        reasoning: "Confirm the meeting and set expectations",
        priority: "high",
        timing: "Immediately",
      }];

    default:
      return [{
        action: "Review and follow up on pending action",
        reasoning: "There's an action without recorded outcome",
        priority: "medium",
        timing: "When appropriate",
      }];
  }
}

/**
 * Analyzes outcomes across a project to identify patterns
 */
export async function analyzeProjectPatterns(projectId: string): Promise<{
  totalActions: number;
  outcomes: Record<string, number>;
  successRate: number;
  insights: string[];
}> {
  const actions = await db.action.findMany({
    where: {
      lead: { projectId },
    },
    include: {
      feedback: true,
      plan: true,
    },
  });

  const outcomes: Record<string, number> = {
    no_reply: 0,
    follow_up: 0,
    not_interested: 0,
    meeting_booked: 0,
    pending: 0,
  };

  actions.forEach((action) => {
    const outcome = action.feedback?.outcome || "pending";
    outcomes[outcome] = (outcomes[outcome] || 0) + 1;
  });

  const totalWithFeedback = actions.filter((a) => a.feedback).length;
  const successful = outcomes.meeting_booked + outcomes.follow_up;
  const successRate = totalWithFeedback > 0 ? (successful / totalWithFeedback) * 100 : 0;

  const insights: string[] = [];

  if (outcomes.no_reply > outcomes.meeting_booked * 2) {
    insights.push("High no-reply rate - consider adjusting your subject lines or timing");
  }

  if (outcomes.meeting_booked > 0) {
    insights.push(`${outcomes.meeting_booked} meetings booked - review what worked in those outreach messages`);
  }

  if (outcomes.pending > actions.length * 0.3) {
    insights.push("Many actions pending feedback - remember to record outcomes for better insights");
  }

  return {
    totalActions: actions.length,
    outcomes,
    successRate: Math.round(successRate),
    insights,
  };
}
