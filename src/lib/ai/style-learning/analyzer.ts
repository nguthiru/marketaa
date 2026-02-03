import OpenAI from "openai";
import { db } from "@/lib/db";
import {
  findAddedPhrases,
  findRemovedPhrases,
  wordCountDifference,
} from "./diff";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Edit analysis result
 */
export interface EditAnalysis {
  editType: "addition" | "removal" | "replacement" | "restructure";
  addedPhrases: string[];
  removedPhrases: string[];
  toneChange: "more_formal" | "less_formal" | "more_direct" | "less_direct" | "neutral";
  lengthChange: number;
  insights: string;
}

/**
 * Analyze the changes between original AI-generated text and user-edited text
 */
export async function analyzeEdit(
  originalText: string,
  editedText: string
): Promise<EditAnalysis> {
  // Quick analysis using diff utilities
  const addedPhrases = findAddedPhrases(originalText, editedText);
  const removedPhrases = findRemovedPhrases(originalText, editedText);
  const lengthChange = wordCountDifference(originalText, editedText);

  // Determine edit type based on changes
  let editType: EditAnalysis["editType"] = "replacement";
  if (lengthChange > 20) {
    editType = "addition";
  } else if (lengthChange < -20) {
    editType = "removal";
  } else if (addedPhrases.length === 0 && removedPhrases.length === 0) {
    editType = "restructure";
  }

  // Use AI for deeper analysis
  const prompt = `Analyze the changes between these two versions of a cold email.

ORIGINAL (AI-generated):
${originalText}

EDITED (User-modified):
${editedText}

Analyze what the user changed and why. Focus on:
1. How did the tone change? (more_formal, less_formal, more_direct, less_direct, neutral)
2. What does this tell us about the user's writing preferences?

Respond ONLY with valid JSON:
{
  "toneChange": "more_formal|less_formal|more_direct|less_direct|neutral",
  "insights": "One sentence about user's writing preferences"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 200,
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    const result = content ? JSON.parse(content) : {};

    return {
      editType,
      addedPhrases,
      removedPhrases,
      toneChange: result.toneChange || "neutral",
      lengthChange,
      insights: result.insights || "",
    };
  } catch (error) {
    console.error("Error analyzing edit:", error);

    // Return basic analysis without AI insights
    return {
      editType,
      addedPhrases,
      removedPhrases,
      toneChange: "neutral",
      lengthChange,
      insights: "",
    };
  }
}

/**
 * Record an edit pattern in the database
 */
export async function recordEditPattern(
  userId: string,
  actionId: string,
  originalText: string,
  editedText: string
): Promise<void> {
  // Skip if texts are essentially the same
  const trimmedOriginal = originalText.trim();
  const trimmedEdited = editedText.trim();

  if (trimmedOriginal === trimmedEdited) {
    return;
  }

  // Skip very minor changes (less than 10 character difference)
  if (Math.abs(trimmedOriginal.length - trimmedEdited.length) < 10) {
    const normalizedOriginal = trimmedOriginal.toLowerCase().replace(/\s+/g, " ");
    const normalizedEdited = trimmedEdited.toLowerCase().replace(/\s+/g, " ");
    if (normalizedOriginal === normalizedEdited) {
      return;
    }
  }

  // Analyze the edit
  const analysis = await analyzeEdit(trimmedOriginal, trimmedEdited);

  // Store the edit pattern
  await db.editPattern.create({
    data: {
      userId,
      actionId,
      originalText: trimmedOriginal,
      editedText: trimmedEdited,
      editType: analysis.editType,
      addedPhrases: JSON.stringify(analysis.addedPhrases),
      removedPhrases: JSON.stringify(analysis.removedPhrases),
      toneChange: analysis.toneChange,
      lengthChange: analysis.lengthChange,
    },
  });

  // Check if we should trigger style aggregation
  const patternCount = await db.editPattern.count({ where: { userId } });

  // Aggregate after every 5 edits
  if (patternCount >= 5 && patternCount % 5 === 0) {
    // Import dynamically to avoid circular dependency
    const { aggregateUserStyle } = await import("./aggregator");
    await aggregateUserStyle(userId);
  }
}

/**
 * Get recent edit patterns for a user
 */
export async function getRecentEditPatterns(
  userId: string,
  limit: number = 20
): Promise<
  Array<{
    id: string;
    editType: string;
    toneChange: string | null;
    lengthChange: number | null;
    addedPhrases: string[];
    removedPhrases: string[];
    createdAt: Date;
  }>
> {
  const patterns = await db.editPattern.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      editType: true,
      toneChange: true,
      lengthChange: true,
      addedPhrases: true,
      removedPhrases: true,
      createdAt: true,
    },
  });

  return patterns.map((p) => ({
    ...p,
    addedPhrases: p.addedPhrases ? JSON.parse(p.addedPhrases) : [],
    removedPhrases: p.removedPhrases ? JSON.parse(p.removedPhrases) : [],
  }));
}
