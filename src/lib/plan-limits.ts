import { db } from "./db";

// Default plan limits (used when PlanConfig not found in DB)
export const DEFAULT_PLAN_LIMITS = {
  free: {
    code: "free",
    name: "Free",
    maxProjects: 1,
    maxLeadsPerProject: 100,
    maxLeadsTotal: 100,
    maxEmailsPerMonth: 50,
    maxTeamMembers: 1,
    maxTemplates: 5,
    maxSequences: 0,
    hasEmailSequences: false,
    hasABTesting: false,
    hasAdvancedAnalytics: false,
    hasCrmIntegrations: false,
    hasEmailWarmup: false,
    hasApiAccess: false,
    hasWhiteLabel: false,
    hasPrioritySupport: false,
    hasDedicatedManager: false,
  },
  starter: {
    code: "starter",
    name: "Starter",
    maxProjects: 5,
    maxLeadsPerProject: 1000,
    maxLeadsTotal: 1000,
    maxEmailsPerMonth: 500,
    maxTeamMembers: 3,
    maxTemplates: 20,
    maxSequences: 5,
    hasEmailSequences: true,
    hasABTesting: false,
    hasAdvancedAnalytics: false,
    hasCrmIntegrations: false,
    hasEmailWarmup: false,
    hasApiAccess: false,
    hasWhiteLabel: false,
    hasPrioritySupport: true,
    hasDedicatedManager: false,
  },
  pro: {
    code: "pro",
    name: "Professional",
    maxProjects: -1, // unlimited
    maxLeadsPerProject: 10000,
    maxLeadsTotal: 10000,
    maxEmailsPerMonth: 2000,
    maxTeamMembers: 10,
    maxTemplates: -1, // unlimited
    maxSequences: -1, // unlimited
    hasEmailSequences: true,
    hasABTesting: true,
    hasAdvancedAnalytics: true,
    hasCrmIntegrations: true,
    hasEmailWarmup: true,
    hasApiAccess: true,
    hasWhiteLabel: false,
    hasPrioritySupport: true,
    hasDedicatedManager: false,
  },
  enterprise: {
    code: "enterprise",
    name: "Enterprise",
    maxProjects: -1, // unlimited
    maxLeadsPerProject: -1, // unlimited
    maxLeadsTotal: -1, // unlimited
    maxEmailsPerMonth: -1, // unlimited
    maxTeamMembers: -1, // unlimited
    maxTemplates: -1, // unlimited
    maxSequences: -1, // unlimited
    hasEmailSequences: true,
    hasABTesting: true,
    hasAdvancedAnalytics: true,
    hasCrmIntegrations: true,
    hasEmailWarmup: true,
    hasApiAccess: true,
    hasWhiteLabel: true,
    hasPrioritySupport: true,
    hasDedicatedManager: true,
  },
};

export type PlanCode = keyof typeof DEFAULT_PLAN_LIMITS;
export type PlanLimits = typeof DEFAULT_PLAN_LIMITS[PlanCode];

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  limitLabel: string; // "unlimited" or number
  percentUsed: number;
  message?: string;
}

export interface UsageOverview {
  plan: string;
  planName: string;
  projects: LimitCheckResult;
  leads: LimitCheckResult;
  emailsThisMonth: LimitCheckResult;
  templates: LimitCheckResult;
  sequences: LimitCheckResult;
  teamMembers: LimitCheckResult;
  features: {
    emailSequences: boolean;
    abTesting: boolean;
    advancedAnalytics: boolean;
    crmIntegrations: boolean;
    emailWarmup: boolean;
    apiAccess: boolean;
    whiteLabel: boolean;
    prioritySupport: boolean;
    dedicatedManager: boolean;
  };
}

// Get plan limits from DB or fallback to defaults
export async function getPlanLimits(planCode: string): Promise<PlanLimits> {
  // Try to get from database first
  const dbPlan = await db.planConfig.findUnique({
    where: { code: planCode },
  });

  if (dbPlan) {
    return {
      code: dbPlan.code,
      name: dbPlan.name,
      maxProjects: dbPlan.maxProjects,
      maxLeadsPerProject: dbPlan.maxLeadsPerProject,
      maxLeadsTotal: dbPlan.maxLeadsTotal,
      maxEmailsPerMonth: dbPlan.maxEmailsPerMonth,
      maxTeamMembers: dbPlan.maxTeamMembers,
      maxTemplates: dbPlan.maxTemplates,
      maxSequences: dbPlan.maxSequences,
      hasEmailSequences: dbPlan.hasEmailSequences,
      hasABTesting: dbPlan.hasABTesting,
      hasAdvancedAnalytics: dbPlan.hasAdvancedAnalytics,
      hasCrmIntegrations: dbPlan.hasCrmIntegrations,
      hasEmailWarmup: dbPlan.hasEmailWarmup,
      hasApiAccess: dbPlan.hasApiAccess,
      hasWhiteLabel: dbPlan.hasWhiteLabel,
      hasPrioritySupport: dbPlan.hasPrioritySupport,
      hasDedicatedManager: dbPlan.hasDedicatedManager,
    };
  }

  // Fallback to defaults
  return DEFAULT_PLAN_LIMITS[planCode as PlanCode] || DEFAULT_PLAN_LIMITS.free;
}

// Get user's current plan
export async function getUserPlan(userId: string): Promise<string> {
  const subscription = await db.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true },
  });

  // Only return active subscription plan
  if (subscription?.status === "active") {
    return subscription.plan;
  }

  return "free";
}

// Get or create usage stats for a user
export async function getOrCreateUsageStats(userId: string) {
  let stats = await db.usageStats.findUnique({
    where: { userId },
  });

  if (!stats) {
    // Count existing resources
    const [projectCount, leadCount, templateCount, sequenceCount] = await Promise.all([
      db.project.count({ where: { ownerId: userId } }),
      db.lead.count({ where: { project: { ownerId: userId } } }),
      db.emailTemplate.count({ where: { createdById: userId } }),
      db.sequence.count({ where: { project: { ownerId: userId } } }),
    ]);

    stats = await db.usageStats.create({
      data: {
        userId,
        projectCount,
        leadCount,
        templateCount,
        sequenceCount,
        emailsGeneratedThisMonth: 0,
        emailsSentThisMonth: 0,
      },
    });
  }

  // Check if we need to reset monthly counters
  const now = new Date();
  const lastReset = new Date(stats.lastResetAt);
  const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceReset >= 30) {
    stats = await db.usageStats.update({
      where: { id: stats.id },
      data: {
        emailsGeneratedThisMonth: 0,
        emailsSentThisMonth: 0,
        lastResetAt: now,
        currentPeriodStart: now,
      },
    });
  }

  return stats;
}

// Check a specific limit
function checkLimit(current: number, limit: number, resourceName: string): LimitCheckResult {
  const isUnlimited = limit === -1;
  const allowed = isUnlimited || current < limit;
  const percentUsed = isUnlimited ? 0 : Math.min(100, Math.round((current / limit) * 100));

  return {
    allowed,
    current,
    limit,
    limitLabel: isUnlimited ? "unlimited" : limit.toString(),
    percentUsed,
    message: allowed ? undefined : `You've reached your ${resourceName} limit. Please upgrade your plan.`,
  };
}

// Check if user can create a project
export async function checkProjectLimit(userId: string): Promise<LimitCheckResult> {
  const [plan, stats] = await Promise.all([
    getUserPlan(userId),
    getOrCreateUsageStats(userId),
  ]);

  const limits = await getPlanLimits(plan);
  return checkLimit(stats.projectCount, limits.maxProjects, "project");
}

// Check if user can add a lead
export async function checkLeadLimit(userId: string, projectId?: string): Promise<LimitCheckResult> {
  const [plan, stats] = await Promise.all([
    getUserPlan(userId),
    getOrCreateUsageStats(userId),
  ]);

  const limits = await getPlanLimits(plan);

  // Check total leads limit
  const totalCheck = checkLimit(stats.leadCount, limits.maxLeadsTotal, "lead");
  if (!totalCheck.allowed) return totalCheck;

  // If projectId provided, also check per-project limit
  if (projectId && limits.maxLeadsPerProject !== -1) {
    const projectLeadCount = await db.lead.count({
      where: { projectId },
    });

    const projectCheck = checkLimit(projectLeadCount, limits.maxLeadsPerProject, "lead per project");
    if (!projectCheck.allowed) return projectCheck;
  }

  return totalCheck;
}

// Check if user can generate an email
export async function checkEmailGenerationLimit(userId: string): Promise<LimitCheckResult> {
  const [plan, stats] = await Promise.all([
    getUserPlan(userId),
    getOrCreateUsageStats(userId),
  ]);

  const limits = await getPlanLimits(plan);
  return checkLimit(stats.emailsGeneratedThisMonth, limits.maxEmailsPerMonth, "email generation");
}

// Check if user can create a template
export async function checkTemplateLimit(userId: string): Promise<LimitCheckResult> {
  const [plan, stats] = await Promise.all([
    getUserPlan(userId),
    getOrCreateUsageStats(userId),
  ]);

  const limits = await getPlanLimits(plan);
  return checkLimit(stats.templateCount, limits.maxTemplates, "template");
}

// Check if user can create a sequence
export async function checkSequenceLimit(userId: string): Promise<LimitCheckResult> {
  const [plan, stats] = await Promise.all([
    getUserPlan(userId),
    getOrCreateUsageStats(userId),
  ]);

  const limits = await getPlanLimits(plan);

  if (!limits.hasEmailSequences) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      limitLabel: "0",
      percentUsed: 100,
      message: "Email sequences are not available on your plan. Please upgrade.",
    };
  }

  return checkLimit(stats.sequenceCount, limits.maxSequences, "sequence");
}

// Check if user has access to a feature
export async function checkFeatureAccess(userId: string, feature: keyof PlanLimits): Promise<boolean> {
  const plan = await getUserPlan(userId);
  const limits = await getPlanLimits(plan);

  const value = limits[feature];
  return typeof value === "boolean" ? value : true;
}

// Increment usage counters
export async function incrementUsage(
  userId: string,
  type: "project" | "lead" | "template" | "sequence" | "emailGenerated" | "emailSent",
  amount: number = 1
) {
  const stats = await getOrCreateUsageStats(userId);

  const updateData: Record<string, { increment: number }> = {};

  switch (type) {
    case "project":
      updateData.projectCount = { increment: amount };
      break;
    case "lead":
      updateData.leadCount = { increment: amount };
      break;
    case "template":
      updateData.templateCount = { increment: amount };
      break;
    case "sequence":
      updateData.sequenceCount = { increment: amount };
      break;
    case "emailGenerated":
      updateData.emailsGeneratedThisMonth = { increment: amount };
      break;
    case "emailSent":
      updateData.emailsSentThisMonth = { increment: amount };
      break;
  }

  return db.usageStats.update({
    where: { id: stats.id },
    data: updateData,
  });
}

// Decrement usage counters (for deletions)
export async function decrementUsage(
  userId: string,
  type: "project" | "lead" | "template" | "sequence",
  amount: number = 1
) {
  const stats = await getOrCreateUsageStats(userId);

  const updateData: Record<string, { decrement: number }> = {};

  switch (type) {
    case "project":
      updateData.projectCount = { decrement: Math.min(amount, stats.projectCount) };
      break;
    case "lead":
      updateData.leadCount = { decrement: Math.min(amount, stats.leadCount) };
      break;
    case "template":
      updateData.templateCount = { decrement: Math.min(amount, stats.templateCount) };
      break;
    case "sequence":
      updateData.sequenceCount = { decrement: Math.min(amount, stats.sequenceCount) };
      break;
  }

  return db.usageStats.update({
    where: { id: stats.id },
    data: updateData,
  });
}

// Get full usage overview for a user
export async function getUsageOverview(userId: string): Promise<UsageOverview> {
  const [plan, stats, teamMemberCount] = await Promise.all([
    getUserPlan(userId),
    getOrCreateUsageStats(userId),
    db.projectMember.count({
      where: {
        project: { ownerId: userId },
      },
    }),
  ]);

  const limits = await getPlanLimits(plan);

  return {
    plan,
    planName: limits.name,
    projects: checkLimit(stats.projectCount, limits.maxProjects, "project"),
    leads: checkLimit(stats.leadCount, limits.maxLeadsTotal, "lead"),
    emailsThisMonth: checkLimit(stats.emailsGeneratedThisMonth, limits.maxEmailsPerMonth, "email"),
    templates: checkLimit(stats.templateCount, limits.maxTemplates, "template"),
    sequences: checkLimit(stats.sequenceCount, limits.maxSequences, "sequence"),
    teamMembers: checkLimit(teamMemberCount, limits.maxTeamMembers, "team member"),
    features: {
      emailSequences: limits.hasEmailSequences,
      abTesting: limits.hasABTesting,
      advancedAnalytics: limits.hasAdvancedAnalytics,
      crmIntegrations: limits.hasCrmIntegrations,
      emailWarmup: limits.hasEmailWarmup,
      apiAccess: limits.hasApiAccess,
      whiteLabel: limits.hasWhiteLabel,
      prioritySupport: limits.hasPrioritySupport,
      dedicatedManager: limits.hasDedicatedManager,
    },
  };
}

// Sync usage stats with actual database counts (for corrections)
export async function syncUsageStats(userId: string) {
  const [projectCount, leadCount, templateCount, sequenceCount] = await Promise.all([
    db.project.count({ where: { ownerId: userId } }),
    db.lead.count({ where: { project: { ownerId: userId } } }),
    db.emailTemplate.count({ where: { createdById: userId } }),
    db.sequence.count({ where: { project: { ownerId: userId } } }),
  ]);

  return db.usageStats.upsert({
    where: { userId },
    create: {
      userId,
      projectCount,
      leadCount,
      templateCount,
      sequenceCount,
    },
    update: {
      projectCount,
      leadCount,
      templateCount,
      sequenceCount,
    },
  });
}
