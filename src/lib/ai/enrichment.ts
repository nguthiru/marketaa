import OpenAI from "openai";
import { db } from "@/lib/db";
import { getUserWritingStyle } from "@/lib/ai/style-learning/aggregator";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ProjectInfo {
  id: string;
  name: string;
  description: string | null;
}

interface LeadInfo {
  name: string;
  email: string | null;
  role: string | null;
  organization: string | null;
}

interface ContextItem {
  key: string;
  value: string;
  confidence: "confirmed" | "likely" | "best_guess";
}

/**
 * Enriches a lead with AI-generated context based on available information.
 * This runs asynchronously after lead creation.
 */
export async function enrichLeadContext(
  leadId: string,
  project: ProjectInfo
): Promise<void> {
  // Skip if no API key configured
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your-openai-api-key") {
    console.log("Skipping enrichment - OpenAI API key not configured");
    return;
  }

  // Get lead details
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      organization: true,
    },
  });

  if (!lead) return;

  // Get project context for additional background
  const projectContext = await db.projectContext.findMany({
    where: { projectId: project.id },
    select: { key: true, value: true },
  });

  try {
    const contextItems = await generateLeadContext(lead, project, projectContext);

    // Store context items in database
    if (contextItems.length > 0) {
      await db.leadContext.createMany({
        data: contextItems.map((item) => ({
          leadId,
          key: item.key,
          value: item.value,
          source: "system",
          confidence: item.confidence,
        })),
      });
    }
  } catch (error) {
    console.error("AI enrichment error:", error);
    // Don't throw - enrichment failure shouldn't break lead creation
  }
}

async function generateLeadContext(
  lead: LeadInfo,
  project: ProjectInfo,
  projectContext: { key: string; value: string }[]
): Promise<ContextItem[]> {
  const projectContextStr = projectContext
    .map((c) => `${c.key}: ${c.value}`)
    .join("\n");

  const prompt = `You are a research assistant helping prepare for professional outreach. Based on the following information, generate relevant context that would help personalize communication with this person.

PROJECT CONTEXT:
Name: ${project.name}
Description: ${project.description || "Not specified"}
${projectContextStr ? `Additional context:\n${projectContextStr}` : ""}

LEAD INFORMATION:
Name: ${lead.name}
${lead.role ? `Role: ${lead.role}` : ""}
${lead.organization ? `Organization: ${lead.organization}` : ""}
${lead.email ? `Email: ${lead.email}` : ""}

Generate 2-4 context items that would help personalize outreach to this person. Each item should be:
- Relevant to the project's goals
- Based on reasonable inferences from the available information
- Useful for tailoring communication

For each item, indicate your confidence level:
- "confirmed" - This is factual based on the provided information
- "likely" - This is a reasonable inference with good probability
- "best_guess" - This is speculative but potentially useful

Respond in JSON format:
{
  "items": [
    { "key": "string (e.g., 'likely_priorities', 'org_context', 'communication_style')", "value": "string (the context)", "confidence": "confirmed|likely|best_guess" }
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
    return (parsed.items || []).map((item: ContextItem) => ({
      key: item.key,
      value: item.value,
      confidence: item.confidence || "likely",
    }));
  } catch {
    console.error("Failed to parse AI response:", content);
    return [];
  }
}

/**
 * Generates an action (email or call brief) for a lead based on their context and the plan.
 */
export async function generateAction(
  leadId: string,
  planId: string,
  userId?: string
): Promise<{
  subject?: string;
  body: string;
  reasoning: string;
} | null> {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your-openai-api-key") {
    return null;
  }

  // Get all relevant data
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: {
      contextItems: { where: { dismissed: false } },
      project: {
        include: {
          context: true,
        },
      },
    },
  });

  const plan = await db.plan.findUnique({
    where: { id: planId },
  });

  if (!lead || !plan) return null;

  // Get user's writing style if userId provided
  let styleInstruction = "";
  if (userId) {
    try {
      const style = await getUserWritingStyle(userId);
      if (style?.hasStyle && style.stylePromptAddition) {
        styleInstruction = `\n\nUSER'S WRITING STYLE PREFERENCES:\n${style.stylePromptAddition}`;
      }
    } catch (error) {
      console.error("Error fetching writing style:", error);
    }
  }

  const leadContext = lead.contextItems
    .map((c) => `[${c.confidence}] ${c.key}: ${c.value}`)
    .join("\n");

  const projectContext = lead.project.context
    .map((c) => `${c.key}: ${c.value}`)
    .join("\n");

  const channels = JSON.parse(plan.channels || "[]");
  const isEmail = channels.includes("email");

  const prompt = `You are an expert cold email writer. Generate ${isEmail ? "a cold email" : "a call brief"} that ACTUALLY GETS REPLIES.

SENDER INFO (from project context):
${lead.project.name}
${lead.project.description || ""}
${projectContext ? projectContext : "No company details provided - ask user to add company_name, what_we_do, case_study, and sender_name to project context."}

RECIPIENT:
Name: ${lead.name}
${lead.role ? `Role: ${lead.role}` : ""}
${lead.organization ? `Organization: ${lead.organization}` : ""}
${lead.notes ? `Notes: ${lead.notes}` : ""}
${leadContext ? `Research:\n${leadContext}` : ""}

GOAL: ${plan.goal}
TONE: ${plan.tone}

${
  isEmail
    ? `COLD EMAIL RULES (proven to work):
- MUST be under 90 words total
- 2-sentence paragraphs MAX (for scanning)
- NO links or attachments (triggers spam)
- Write like you talk - simple words, 3rd grade reading level
- Only ask ONE question
- No jargon, no buzzwords, no "I hope this finds you well"

USE ONE OF THESE PROVEN STRUCTURES:

STRUCTURE A (Intro email):
"Hi [name] - I saw you handle [their responsibility] so I figured you care about [their goal/pain point].

[Your company] helps [type of companies] [your unique value] which leads to [benefit].

Would you be open to a quick call [specific day]?"

STRUCTURE B (Feature + Case Study):
"Hi [name] - not sure if you've looked into [solving X problem] but thought you'd find this interesting.

We helped [similar client] [achieve specific result] by [what you did].

Would [their company] be interested in checking this out?"

Pick the structure that fits best. Keep it SHORT. Sound human.`
    : `CALL BRIEF:
- Quick intro: who you are, why calling
- One hook relevant to them
- One case study/proof point
- Simple ask for next step`
}${styleInstruction}

Respond with the email/brief. Be brief about your reasoning.

Respond in JSON:
{
  ${isEmail ? '"subject": "string",' : ""}
  "body": "string (the ${isEmail ? "email body" : "call brief"})",
  "reasoning": "string (explain which context items influenced your draft and why)"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 800,
      temperature: 0.6,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    return JSON.parse(content);
  } catch (error) {
    console.error("Action generation error:", error);
    return null;
  }
}
