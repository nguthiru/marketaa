import { db } from "./db";
import { headers } from "next/headers";

export type AuditAction =
  | "login"
  | "logout"
  | "register"
  | "password_change"
  | "password_reset"
  | "email_verified"
  | "profile_update"
  | "account_delete"
  | "create"
  | "update"
  | "delete"
  | "invite_sent"
  | "invite_accepted"
  | "invite_cancelled"
  | "member_removed"
  | "member_role_updated"
  | "subscription_created"
  | "subscription_updated"
  | "subscription_cancelled"
  | "subscription_checkout"
  | "payment_success"
  | "payment_failed";

export type EntityType =
  | "user"
  | "project"
  | "lead"
  | "template"
  | "sequence"
  | "integration"
  | "team_member"
  | "subscription"
  | "invoice";

interface AuditLogParams {
  userId?: string | null;
  action: AuditAction;
  resourceType: EntityType;
  resourceId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(params: AuditLogParams) {
  try {
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    await db.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.resourceType,
        entityId: params.resourceId,
        oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
        newValue: params.newValue ? JSON.stringify(params.newValue) : null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // Don't throw - audit logging should not break the main flow
    console.error("Failed to create audit log:", error);
  }
}

// Helper to sanitize sensitive data before logging
export function sanitizeForAudit(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ["password", "passwordHash", "token", "secret", "accessToken", "refreshToken", "credentials"];
  const sanitized = { ...data };

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
      sanitized[key] = "[REDACTED]";
    }
  }

  return sanitized;
}
