import { db } from "@/lib/db";

export type SuppressionReason = "unsubscribe" | "bounce" | "complaint" | "manual";
export type SuppressionSource = "one_click" | "link" | "manual" | "webhook";

/**
 * Check if an email is suppressed (either globally or for a specific project)
 */
export async function isEmailSuppressed(
  email: string,
  projectId?: string
): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();

  const suppression = await db.suppression.findFirst({
    where: {
      email: normalizedEmail,
      OR: [
        { projectId: null }, // Global suppression
        ...(projectId ? [{ projectId }] : []), // Project-specific
      ],
    },
  });

  return !!suppression;
}

/**
 * Get suppression details for an email
 */
export async function getSuppressionDetails(
  email: string,
  projectId?: string
): Promise<{
  email: string;
  reason: string;
  source: string;
  createdAt: Date;
  isGlobal: boolean;
} | null> {
  const normalizedEmail = email.toLowerCase().trim();

  const suppression = await db.suppression.findFirst({
    where: {
      email: normalizedEmail,
      OR: [
        { projectId: null },
        ...(projectId ? [{ projectId }] : []),
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!suppression) return null;

  return {
    email: suppression.email,
    reason: suppression.reason,
    source: suppression.source,
    createdAt: suppression.createdAt,
    isGlobal: suppression.projectId === null,
  };
}

/**
 * Add an email to the suppression list
 */
export async function addToSuppressionList(
  email: string,
  reason: SuppressionReason,
  source: SuppressionSource,
  projectId?: string | null,
  metadata?: {
    originalLeadId?: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<{ id: string; email: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  // Use upsert to handle duplicates gracefully
  // Cast projectId to satisfy Prisma's compound unique type expectations
  const normalizedProjectId = projectId ?? null;
  const suppression = await db.suppression.upsert({
    where: {
      email_projectId: {
        email: normalizedEmail,
        projectId: normalizedProjectId as string,
      },
    },
    create: {
      email: normalizedEmail,
      reason,
      source,
      projectId: normalizedProjectId,
      originalLeadId: metadata?.originalLeadId,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    },
    update: {
      reason,
      source,
      // Don't update originalLeadId if already set
    },
  });

  return { id: suppression.id, email: suppression.email };
}

/**
 * Remove an email from the suppression list
 */
export async function removeFromSuppressionList(
  email: string,
  projectId?: string | null
): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const normalizedProjectId = projectId ?? null;
    await db.suppression.delete({
      where: {
        email_projectId: {
          email: normalizedEmail,
          projectId: normalizedProjectId as string,
        },
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all suppressions for a project (or global)
 */
export async function getSuppressionList(
  projectId?: string | null,
  options?: {
    limit?: number;
    offset?: number;
    search?: string;
  }
): Promise<{
  suppressions: Array<{
    id: string;
    email: string;
    reason: string;
    source: string;
    createdAt: Date;
  }>;
  total: number;
}> {
  const where = {
    ...(projectId !== undefined ? { projectId: projectId || null } : {}),
    ...(options?.search
      ? {
          email: {
            contains: options.search.toLowerCase(),
          },
        }
      : {}),
  };

  const [suppressions, total] = await Promise.all([
    db.suppression.findMany({
      where,
      select: {
        id: true,
        email: true,
        reason: true,
        source: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    db.suppression.count({ where }),
  ]);

  return { suppressions, total };
}

/**
 * Bulk add emails to suppression list
 */
export async function bulkAddToSuppressionList(
  emails: string[],
  reason: SuppressionReason,
  source: SuppressionSource,
  projectId?: string | null
): Promise<{ added: number; skipped: number }> {
  let added = 0;
  let skipped = 0;
  const normalizedProjectId = projectId ?? null;

  for (const email of emails) {
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      skipped++;
      continue;
    }

    try {
      await db.suppression.upsert({
        where: {
          email_projectId: {
            email: normalizedEmail,
            projectId: normalizedProjectId as string,
          },
        },
        create: {
          email: normalizedEmail,
          reason,
          source,
          projectId: normalizedProjectId,
        },
        update: {},
      });
      added++;
    } catch {
      skipped++;
    }
  }

  return { added, skipped };
}
