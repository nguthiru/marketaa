import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { tavily } from "@tavily/core";

// Initialize clients
const llm = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0.3,
  apiKey: process.env.OPENAI_API_KEY,
});

const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY || "" });

// ============================================
// TOOLS
// ============================================

const webSearchTool = tool(
  async ({ query, maxResults = 5 }) => {
    if (!process.env.TAVILY_API_KEY) {
      return "Web search unavailable - TAVILY_API_KEY not configured";
    }

    try {
      const response = await tavilyClient.search(query, {
        maxResults,
        searchDepth: "advanced",
        includeAnswer: true,
      });

      const results = response.results.map((r, i) =>
        `[${i + 1}] ${r.title}\n    URL: ${r.url}\n    ${r.content}`
      ).join("\n\n");

      return `Search results for "${query}":\n\n${response.answer ? `Summary: ${response.answer}\n\n` : ""}${results}`;
    } catch (error) {
      return `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },
  {
    name: "web_search",
    description: "Search the web for current information about a person, company, topic, or anything else. Use this to research leads, organizations, industry trends, recent news, etc.",
    schema: z.object({
      query: z.string().describe("The search query"),
      maxResults: z.number().optional().describe("Maximum number of results (default 5)"),
    }),
  }
);

const getWebPageTool = tool(
  async ({ url }) => {
    if (!process.env.TAVILY_API_KEY) {
      return "Web page extraction unavailable - TAVILY_API_KEY not configured";
    }

    try {
      const response = await tavilyClient.extract([url]);

      if (response.results.length === 0) {
        return "Could not extract content from this URL";
      }

      const content = response.results[0];
      return `Content from ${url}:\n\n${content.rawContent?.slice(0, 5000) || "No content extracted"}`;
    } catch (error) {
      return `Extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },
  {
    name: "get_web_page",
    description: "Extract and read the content of a specific web page. Use this when you have a URL and want to read its contents.",
    schema: z.object({
      url: z.string().describe("The URL to extract content from"),
    }),
  }
);

const analyzeCompanyTool = tool(
  async ({ companyName }) => {
    if (!process.env.TAVILY_API_KEY) {
      return "Company analysis unavailable - TAVILY_API_KEY not configured";
    }

    try {
      // Multiple searches to build comprehensive picture
      const [general, news, leadership] = await Promise.all([
        tavilyClient.search(`${companyName} company overview about`, { maxResults: 3 }),
        tavilyClient.search(`${companyName} recent news announcements`, { maxResults: 3 }),
        tavilyClient.search(`${companyName} leadership team executives`, { maxResults: 2 }),
      ]);

      return `Company Analysis: ${companyName}

OVERVIEW:
${general.answer || general.results.map(r => r.content).join("\n")}

RECENT NEWS:
${news.results.map(r => `- ${r.title}: ${r.content.slice(0, 200)}...`).join("\n")}

LEADERSHIP:
${leadership.results.map(r => r.content.slice(0, 300)).join("\n")}`;
    } catch (error) {
      return `Company analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },
  {
    name: "analyze_company",
    description: "Get comprehensive information about a company including overview, recent news, and leadership. Use this when researching an organization.",
    schema: z.object({
      companyName: z.string().describe("The name of the company to analyze"),
    }),
  }
);

const analyzePersonTool = tool(
  async ({ personName, organization }) => {
    if (!process.env.TAVILY_API_KEY) {
      return "Person analysis unavailable - TAVILY_API_KEY not configured";
    }

    try {
      const query = organization
        ? `${personName} ${organization} professional background`
        : `${personName} professional background linkedin`;

      const [professional, publications] = await Promise.all([
        tavilyClient.search(query, { maxResults: 4 }),
        tavilyClient.search(`${personName} ${organization || ""} articles publications talks`, { maxResults: 3 }),
      ]);

      return `Person Research: ${personName}${organization ? ` at ${organization}` : ""}

PROFESSIONAL BACKGROUND:
${professional.answer || professional.results.map(r => r.content).join("\n")}

PUBLICATIONS/TALKS/ARTICLES:
${publications.results.length > 0
  ? publications.results.map(r => `- ${r.title}`).join("\n")
  : "No publications found"}`;
    } catch (error) {
      return `Person research failed: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },
  {
    name: "analyze_person",
    description: "Research a specific person's professional background, publications, and public presence. Use this when you need to learn about an individual lead.",
    schema: z.object({
      personName: z.string().describe("The person's name"),
      organization: z.string().optional().describe("Their organization/company if known"),
    }),
  }
);

const tools = [webSearchTool, getWebPageTool, analyzeCompanyTool, analyzePersonTool];

// Bind tools to LLM
const llmWithTools = llm.bindTools(tools);

// ============================================
// AGENT EXECUTOR
// ============================================

interface AgentResult {
  output: string;
  toolCalls: { tool: string; input: Record<string, unknown>; output: string }[];
  reasoning: string;
}

export async function runResearchAgent(
  task: string,
  context?: string,
  maxIterations: number = 6
): Promise<AgentResult> {
  const systemPrompt = `You are an expert research assistant for a professional outreach platform. Your job is to thoroughly research leads, organizations, and relevant context to help craft personalized outreach.

${context ? `CONTEXT:\n${context}\n` : ""}

GUIDELINES:
1. Be thorough but efficient - gather what's needed, don't over-research
2. Focus on information that helps personalize professional outreach
3. Look for: recent news, initiatives, pain points, interests, background
4. Verify information across sources when possible
5. Note the confidence level of information (verified vs inferred)
6. Think about what would resonate with this person/organization

When you have gathered sufficient information, provide a comprehensive summary with:
- Key facts (verified)
- Likely priorities/interests (inferred)
- Potential conversation angles
- Any red flags or sensitivities to be aware of

If search/tools are unavailable, do your best with reasoning based on the available context.`;

  const messages: (SystemMessage | HumanMessage | AIMessage | ToolMessage)[] = [
    new SystemMessage(systemPrompt),
    new HumanMessage(task),
  ];

  const toolCalls: AgentResult["toolCalls"] = [];
  let iterations = 0;
  let finalOutput = "";

  while (iterations < maxIterations) {
    iterations++;

    try {
      const response = await llmWithTools.invoke(messages);

      // Check if there are tool calls
      if (response.tool_calls && response.tool_calls.length > 0) {
        messages.push(response);

        // Execute each tool call
        for (const toolCall of response.tool_calls) {
          try {
            let result: string = "";
            const args = toolCall.args as Record<string, unknown>;

            // Call the appropriate tool directly
            if (toolCall.name === "web_search") {
              result = await webSearchTool.invoke(args as { query: string; maxResults?: number });
            } else if (toolCall.name === "get_web_page") {
              result = await getWebPageTool.invoke(args as { url: string });
            } else if (toolCall.name === "analyze_company") {
              result = await analyzeCompanyTool.invoke(args as { companyName: string });
            } else if (toolCall.name === "analyze_person") {
              result = await analyzePersonTool.invoke(args as { personName: string; organization?: string });
            }

            toolCalls.push({
              tool: toolCall.name,
              input: args,
              output: result,
            });

            // Add tool result to messages
            messages.push(new ToolMessage({
              content: result || "No result returned",
              tool_call_id: toolCall.id!,
            }));
          } catch (error) {
            const errorMsg = `Tool error: ${error instanceof Error ? error.message : "Unknown error"}`;
            messages.push(new ToolMessage({
              content: errorMsg,
              tool_call_id: toolCall.id!,
            }));
          }
        }
      } else {
        // No more tool calls - agent is done
        finalOutput = typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);
        break;
      }
    } catch (error) {
      console.error("Agent iteration error:", error);
      finalOutput = `Research incomplete due to error: ${error instanceof Error ? error.message : "Unknown error"}`;
      break;
    }
  }

  if (!finalOutput && iterations >= maxIterations) {
    finalOutput = "Research stopped - maximum iterations reached. Please review partial results.";
  }

  return {
    output: finalOutput,
    toolCalls,
    reasoning: toolCalls.map(tc => `Used ${tc.tool}: ${JSON.stringify(tc.input)}`).join("\n"),
  };
}

// ============================================
// HIGH-LEVEL RESEARCH FUNCTIONS
// ============================================

export interface LeadResearch {
  summary: string;
  keyFacts: string[];
  likelyPriorities: string[];
  conversationAngles: string[];
  recentNews: string[];
  confidence: "high" | "medium" | "low";
  rawOutput: string;
}

export async function researchLead(
  name: string,
  email: string | null,
  role: string | null,
  organization: string | null,
  projectContext?: string
): Promise<LeadResearch> {
  const task = `Research this professional lead for outreach:

Name: ${name}
${email ? `Email: ${email}` : ""}
${role ? `Role: ${role}` : ""}
${organization ? `Organization: ${organization}` : ""}

${projectContext ? `PROJECT CONTEXT:\n${projectContext}` : ""}

Please research:
1. Their professional background and current role
2. Their organization's recent news, initiatives, and priorities
3. Any publications, talks, or thought leadership they've produced
4. Potential pain points or interests relevant to our outreach
5. Any mutual connections or common ground we might leverage

Provide actionable insights for personalizing outreach to this person.`;

  const result = await runResearchAgent(task);

  // Parse the output into structured format
  return parseLeadResearch(result.output, result.toolCalls.length > 0);
}

function parseLeadResearch(output: string, hadToolCalls: boolean): LeadResearch {
  // Extract sections from the output
  const keyFacts: string[] = [];
  const likelyPriorities: string[] = [];
  const conversationAngles: string[] = [];
  const recentNews: string[] = [];

  // Simple parsing - look for bullet points and categorize
  const lines = output.split("\n");
  let currentSection = "";

  for (const line of lines) {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();

    if (lower.includes("key fact") || lower.includes("verified") || lower.includes("background")) {
      currentSection = "facts";
    } else if (lower.includes("priorit") || lower.includes("interest") || lower.includes("focus")) {
      currentSection = "priorities";
    } else if (lower.includes("angle") || lower.includes("conversation") || lower.includes("approach")) {
      currentSection = "angles";
    } else if (lower.includes("news") || lower.includes("recent") || lower.includes("announcement")) {
      currentSection = "news";
    }

    if (trimmed.startsWith("-") || trimmed.startsWith("•") || trimmed.match(/^\d+\./)) {
      const content = trimmed.replace(/^[-•\d.]+\s*/, "");
      if (content.length > 10) {
        switch (currentSection) {
          case "facts": keyFacts.push(content); break;
          case "priorities": likelyPriorities.push(content); break;
          case "angles": conversationAngles.push(content); break;
          case "news": recentNews.push(content); break;
          default: keyFacts.push(content);
        }
      }
    }
  }

  return {
    summary: output.slice(0, 500) + (output.length > 500 ? "..." : ""),
    keyFacts: keyFacts.slice(0, 5),
    likelyPriorities: likelyPriorities.slice(0, 4),
    conversationAngles: conversationAngles.slice(0, 4),
    recentNews: recentNews.slice(0, 3),
    confidence: hadToolCalls ? "high" : "low",
    rawOutput: output,
  };
}

export async function researchCompany(
  companyName: string,
  projectContext?: string
): Promise<{
  summary: string;
  recentNews: string[];
  keyInitiatives: string[];
  leadership: string[];
  painPoints: string[];
  rawOutput: string;
}> {
  const task = `Research this organization for B2B outreach:

Organization: ${companyName}

${projectContext ? `PROJECT CONTEXT:\n${projectContext}` : ""}

Please research:
1. Company overview, size, and industry position
2. Recent news, announcements, and initiatives
3. Key leadership and decision makers
4. Current challenges or pain points they might be facing
5. Strategic priorities and recent investments

Focus on information that would help us craft relevant, timely outreach.`;

  const result = await runResearchAgent(task);

  return {
    summary: result.output.slice(0, 500),
    recentNews: [],
    keyInitiatives: [],
    leadership: [],
    painPoints: [],
    rawOutput: result.output,
  };
}
