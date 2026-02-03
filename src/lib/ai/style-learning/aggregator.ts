import { db } from "@/lib/db";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Aggregate edit patterns into a user's writing style profile
 */
export async function aggregateUserStyle(userId: string): Promise<void> {
  // Get recent edit patterns
  const patterns = await db.editPattern.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50, // Use last 50 edits
  });

  if (patterns.length < 5) {
    // Not enough data to create a meaningful profile
    return;
  }

  // Aggregate data
  const allAddedPhrases: string[] = [];
  const allRemovedPhrases: string[] = [];
  let totalLengthChange = 0;
  const toneChanges: Record<string, number> = {};

  for (const pattern of patterns) {
    if (pattern.addedPhrases) {
      allAddedPhrases.push(...JSON.parse(pattern.addedPhrases));
    }
    if (pattern.removedPhrases) {
      allRemovedPhrases.push(...JSON.parse(pattern.removedPhrases));
    }
    totalLengthChange += pattern.lengthChange || 0;
    if (pattern.toneChange) {
      toneChanges[pattern.toneChange] = (toneChanges[pattern.toneChange] || 0) + 1;
    }
  }

  // Find most common phrases
  const preferredPhrases = findMostCommon(allAddedPhrases, 10);
  const avoidedPhrases = findMostCommon(allRemovedPhrases, 10);
  const avgLengthChange = Math.round(totalLengthChange / patterns.length);

  // Determine dominant tone preference
  const dominantTone = Object.entries(toneChanges)
    .sort(([, a], [, b]) => b - a)[0]?.[0];

  // Calculate style metrics
  const formality = calculateFormality(toneChanges);
  const directness = calculateDirectness(toneChanges, avgLengthChange);

  // Generate style prompt addition
  const stylePromptAddition = await generateStylePrompt({
    preferredPhrases,
    avoidedPhrases,
    avgLengthChange,
    dominantTone,
    formality,
    directness,
  });

  // Update or create user writing style
  await db.userWritingStyle.upsert({
    where: { userId },
    create: {
      userId,
      preferredTone: mapToneToPreference(dominantTone),
      averageEmailLength: avgLengthChange > 0 ? undefined : undefined, // We track change, not absolute
      preferredPhrases: JSON.stringify(preferredPhrases),
      avoidedPhrases: JSON.stringify(avoidedPhrases),
      formality,
      directness,
      editSamplesCount: patterns.length,
      lastAnalyzedAt: new Date(),
      stylePromptAddition,
    },
    update: {
      preferredTone: mapToneToPreference(dominantTone),
      preferredPhrases: JSON.stringify(preferredPhrases),
      avoidedPhrases: JSON.stringify(avoidedPhrases),
      formality,
      directness,
      editSamplesCount: patterns.length,
      lastAnalyzedAt: new Date(),
      stylePromptAddition,
    },
  });
}

/**
 * Find most common items in an array
 */
function findMostCommon(items: string[], limit: number): string[] {
  const counts: Record<string, number> = {};

  for (const item of items) {
    const normalized = item.toLowerCase().trim();
    if (normalized.length > 3) {
      counts[normalized] = (counts[normalized] || 0) + 1;
    }
  }

  return Object.entries(counts)
    .filter(([, count]) => count >= 2) // Only items appearing at least twice
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([phrase]) => phrase);
}

/**
 * Calculate formality score (0-1)
 */
function calculateFormality(toneChanges: Record<string, number>): number {
  const formalCount = (toneChanges["more_formal"] || 0);
  const casualCount = (toneChanges["less_formal"] || 0);
  const total = formalCount + casualCount;

  if (total === 0) return 0.5;

  return formalCount / total;
}

/**
 * Calculate directness score (0-1)
 */
function calculateDirectness(
  toneChanges: Record<string, number>,
  avgLengthChange: number
): number {
  const directCount = (toneChanges["more_direct"] || 0);
  const indirectCount = (toneChanges["less_direct"] || 0);
  const total = directCount + indirectCount;

  let baseScore = 0.5;
  if (total > 0) {
    baseScore = directCount / total;
  }

  // Adjust based on length preference (shorter = more direct)
  if (avgLengthChange < -10) {
    baseScore = Math.min(1, baseScore + 0.2);
  } else if (avgLengthChange > 10) {
    baseScore = Math.max(0, baseScore - 0.1);
  }

  return baseScore;
}

/**
 * Map tone change to preference label
 */
function mapToneToPreference(tone?: string): string {
  const mapping: Record<string, string> = {
    more_formal: "formal",
    less_formal: "casual",
    more_direct: "direct",
    less_direct: "diplomatic",
  };
  return mapping[tone || ""] || "professional";
}

/**
 * Generate a style-aware prompt addition using AI
 */
async function generateStylePrompt(data: {
  preferredPhrases: string[];
  avoidedPhrases: string[];
  avgLengthChange: number;
  dominantTone?: string;
  formality: number;
  directness: number;
}): Promise<string> {
  // If we don't have enough data, generate a minimal prompt
  if (data.preferredPhrases.length === 0 && data.avoidedPhrases.length === 0) {
    const toneInstruction =
      data.formality > 0.6
        ? "Use a more formal tone."
        : data.formality < 0.4
        ? "Use a casual, friendly tone."
        : "";

    const lengthInstruction =
      data.avgLengthChange < -10
        ? "Keep emails concise and to the point."
        : data.avgLengthChange > 10
        ? "Provide more detail and context."
        : "";

    return [toneInstruction, lengthInstruction].filter(Boolean).join(" ");
  }

  const prompt = `Based on this user's email editing patterns, create a concise 2-3 sentence instruction to add to an AI email generation prompt. Be specific.

User preferences observed:
- Phrases they like to add: ${data.preferredPhrases.join(", ") || "none detected"}
- Phrases they tend to remove: ${data.avoidedPhrases.join(", ") || "none detected"}
- Length preference: ${data.avgLengthChange > 5 ? "prefers longer emails" : data.avgLengthChange < -5 ? "prefers shorter emails" : "no strong preference"}
- Formality: ${data.formality > 0.6 ? "formal" : data.formality < 0.4 ? "casual" : "balanced"}
- Directness: ${data.directness > 0.6 ? "very direct" : data.directness < 0.4 ? "diplomatic" : "balanced"}

Write a concise instruction that captures their writing style preferences. Focus on actionable guidance.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      temperature: 0.5,
    });

    return completion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Error generating style prompt:", error);

    // Fall back to a simple prompt
    const parts: string[] = [];

    if (data.avoidedPhrases.length > 0) {
      parts.push(`Avoid using: "${data.avoidedPhrases.slice(0, 3).join('", "')}".`);
    }

    if (data.preferredPhrases.length > 0) {
      parts.push(
        `Consider using phrases like: "${data.preferredPhrases.slice(0, 3).join('", "')}".`
      );
    }

    if (data.avgLengthChange < -10) {
      parts.push("Keep emails brief and focused.");
    }

    return parts.join(" ");
  }
}

/**
 * Get user's writing style
 */
export async function getUserWritingStyle(userId: string): Promise<{
  hasStyle: boolean;
  preferredTone?: string;
  preferredPhrases?: string[];
  avoidedPhrases?: string[];
  formality?: number;
  directness?: number;
  editSamplesCount?: number;
  stylePromptAddition?: string;
  lastAnalyzedAt?: Date;
} | null> {
  const style = await db.userWritingStyle.findUnique({
    where: { userId },
  });

  if (!style) {
    return { hasStyle: false };
  }

  return {
    hasStyle: true,
    preferredTone: style.preferredTone || undefined,
    preferredPhrases: style.preferredPhrases
      ? JSON.parse(style.preferredPhrases)
      : [],
    avoidedPhrases: style.avoidedPhrases
      ? JSON.parse(style.avoidedPhrases)
      : [],
    formality: style.formality || undefined,
    directness: style.directness || undefined,
    editSamplesCount: style.editSamplesCount,
    stylePromptAddition: style.stylePromptAddition || undefined,
    lastAnalyzedAt: style.lastAnalyzedAt || undefined,
  };
}
