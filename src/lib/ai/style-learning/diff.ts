/**
 * Simple text diff utilities for comparing original and edited text
 */

/**
 * Simple word-level diff result
 */
export interface DiffResult {
  added: string[];
  removed: string[];
  unchanged: string[];
}

/**
 * Perform a simple word-level diff between two texts
 */
export function diffWords(original: string, edited: string): DiffResult {
  const originalWords = tokenize(original);
  const editedWords = tokenize(edited);

  const originalSet = new Set(originalWords);
  const editedSet = new Set(editedWords);

  const added: string[] = [];
  const removed: string[] = [];
  const unchanged: string[] = [];

  // Find added words (in edited but not in original)
  for (const word of editedWords) {
    if (!originalSet.has(word)) {
      added.push(word);
    }
  }

  // Find removed words (in original but not in edited)
  for (const word of originalWords) {
    if (!editedSet.has(word)) {
      removed.push(word);
    }
  }

  // Find unchanged words
  for (const word of originalWords) {
    if (editedSet.has(word)) {
      unchanged.push(word);
    }
  }

  return { added, removed, unchanged };
}

/**
 * Tokenize text into words, preserving some phrases
 */
function tokenize(text: string): string[] {
  // Normalize whitespace and convert to lowercase
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();

  // Split by spaces but keep common phrases together
  const words = normalized.split(/\s+/).filter((w) => w.length > 0);

  // Also extract common phrases (2-3 word combinations)
  const phrases: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`);
    if (i < words.length - 2) {
      phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
  }

  return [...words, ...phrases];
}

/**
 * Find common phrases that were added
 */
export function findAddedPhrases(original: string, edited: string): string[] {
  const originalLower = original.toLowerCase();
  const editedLower = edited.toLowerCase();

  // Common phrases to look for
  const commonPhrases = [
    "looking forward",
    "let me know",
    "happy to",
    "would love to",
    "quick question",
    "just following up",
    "wanted to reach out",
    "hope this helps",
    "feel free to",
    "at your convenience",
    "best regards",
    "kind regards",
    "thanks for",
    "thank you for",
    "appreciate your",
    "excited to",
    "curious about",
    "wondering if",
    "thought you might",
    "in case you",
  ];

  const added: string[] = [];

  for (const phrase of commonPhrases) {
    if (editedLower.includes(phrase) && !originalLower.includes(phrase)) {
      added.push(phrase);
    }
  }

  return added;
}

/**
 * Find common phrases that were removed
 */
export function findRemovedPhrases(original: string, edited: string): string[] {
  const originalLower = original.toLowerCase();
  const editedLower = edited.toLowerCase();

  // Common phrases to look for
  const commonPhrases = [
    "looking forward",
    "let me know",
    "happy to",
    "would love to",
    "quick question",
    "just following up",
    "wanted to reach out",
    "hope this helps",
    "feel free to",
    "at your convenience",
    "best regards",
    "kind regards",
    "thanks for",
    "thank you for",
    "appreciate your",
    "excited to",
    "curious about",
    "wondering if",
    "thought you might",
    "in case you",
    "i hope this email finds you well",
    "i hope you're doing well",
    "touching base",
    "circle back",
    "synergy",
    "leverage",
  ];

  const removed: string[] = [];

  for (const phrase of commonPhrases) {
    if (originalLower.includes(phrase) && !editedLower.includes(phrase)) {
      removed.push(phrase);
    }
  }

  return removed;
}

/**
 * Calculate the word count difference
 */
export function wordCountDifference(original: string, edited: string): number {
  const originalCount = original.split(/\s+/).filter((w) => w.length > 0).length;
  const editedCount = edited.split(/\s+/).filter((w) => w.length > 0).length;
  return editedCount - originalCount;
}

/**
 * Calculate similarity percentage between two texts
 */
export function calculateSimilarity(original: string, edited: string): number {
  const diff = diffWords(original, edited);
  const totalOriginal = original.split(/\s+/).filter((w) => w.length > 0).length;

  if (totalOriginal === 0) return 0;

  const unchangedCount = diff.unchanged.length;
  return Math.min(1, unchangedCount / totalOriginal);
}
