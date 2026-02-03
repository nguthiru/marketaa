import { db } from "@/lib/db";
import crypto from "crypto";

/**
 * Generate a unique unsubscribe token for an email action
 */
export async function generateUnsubscribeToken(
  actionId: string,
  email: string
): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year expiry

  await db.unsubscribeToken.create({
    data: {
      token,
      email: email.toLowerCase().trim(),
      actionId,
      expiresAt,
    },
  });

  return token;
}

/**
 * Validate an unsubscribe token
 */
export async function validateUnsubscribeToken(token: string): Promise<{
  valid: boolean;
  reason?: string;
  record?: {
    id: string;
    email: string;
    actionId: string;
    action: {
      id: string;
      leadId: string;
      lead: {
        id: string;
        name: string;
        projectId: string;
      };
    };
  };
}> {
  const record = await db.unsubscribeToken.findUnique({
    where: { token },
    include: {
      action: {
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              projectId: true,
            },
          },
        },
      },
    },
  });

  if (!record) {
    return { valid: false, reason: "Invalid token" };
  }

  if (record.used) {
    return { valid: false, reason: "Already unsubscribed" };
  }

  if (record.expiresAt < new Date()) {
    return { valid: false, reason: "Token expired" };
  }

  return {
    valid: true,
    record: {
      id: record.id,
      email: record.email,
      actionId: record.actionId,
      action: record.action,
    },
  };
}

/**
 * Mark an unsubscribe token as used
 */
export async function markTokenUsed(tokenId: string): Promise<void> {
  await db.unsubscribeToken.update({
    where: { id: tokenId },
    data: {
      used: true,
      usedAt: new Date(),
    },
  });
}

/**
 * Get or create an unsubscribe token for an action
 * Returns existing valid token if one exists
 */
export async function getOrCreateUnsubscribeToken(
  actionId: string,
  email: string
): Promise<string> {
  // Check for existing valid token
  const existing = await db.unsubscribeToken.findFirst({
    where: {
      actionId,
      email: email.toLowerCase().trim(),
      used: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (existing) {
    return existing.token;
  }

  // Create new token
  return generateUnsubscribeToken(actionId, email);
}
