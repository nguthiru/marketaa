import { db } from "./db";

export type NotificationType =
  | "team_invite"
  | "team_member_joined"
  | "lead_reply"
  | "sequence_complete"
  | "billing"
  | "payment_success"
  | "payment_failed"
  | "subscription_expiring"
  | "welcome"
  | "feature_announcement"
  | "system";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(params: CreateNotificationParams) {
  return db.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    },
  });
}

export async function getUnreadNotifications(userId: string, limit: number = 10) {
  return db.notification.findMany({
    where: {
      userId,
      read: false,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getNotifications(userId: string, limit: number = 50, offset: number = 0) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

export async function markAsRead(notificationId: string, userId: string) {
  return db.notification.updateMany({
    where: {
      id: notificationId,
      userId,
    },
    data: {
      read: true,
      readAt: new Date(),
    },
  });
}

export async function markAllAsRead(userId: string) {
  return db.notification.updateMany({
    where: {
      userId,
      read: false,
    },
    data: {
      read: true,
      readAt: new Date(),
    },
  });
}

export async function getUnreadCount(userId: string) {
  return db.notification.count({
    where: {
      userId,
      read: false,
    },
  });
}
