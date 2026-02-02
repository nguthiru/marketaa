import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { DEFAULT_PLAN_LIMITS } from "@/lib/plan-limits";

// GET /api/admin/plans - List all plans
export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    let plans = await db.planConfig.findMany({
      orderBy: { displayOrder: "asc" },
    });

    // If no plans in DB, seed with defaults
    if (plans.length === 0) {
      const defaultPlans = Object.entries(DEFAULT_PLAN_LIMITS).map(([code, config], index) => ({
        code,
        name: config.name,
        monthlyPrice: code === "free" ? 0 : code === "starter" ? 2500000 : code === "pro" ? 7500000 : 25000000,
        yearlyPrice: code === "free" ? 0 : code === "starter" ? 25000000 : code === "pro" ? 75000000 : 250000000,
        currency: "NGN",
        maxProjects: config.maxProjects,
        maxLeadsPerProject: config.maxLeadsPerProject,
        maxLeadsTotal: config.maxLeadsTotal,
        maxEmailsPerMonth: config.maxEmailsPerMonth,
        maxTeamMembers: config.maxTeamMembers,
        maxTemplates: config.maxTemplates,
        maxSequences: config.maxSequences,
        hasEmailSequences: config.hasEmailSequences,
        hasABTesting: config.hasABTesting,
        hasAdvancedAnalytics: config.hasAdvancedAnalytics,
        hasCrmIntegrations: config.hasCrmIntegrations,
        hasEmailWarmup: config.hasEmailWarmup,
        hasApiAccess: config.hasApiAccess,
        hasWhiteLabel: config.hasWhiteLabel,
        hasPrioritySupport: config.hasPrioritySupport,
        hasDedicatedManager: config.hasDedicatedManager,
        displayOrder: index,
        isPopular: code === "pro",
        isActive: true,
      }));

      await db.planConfig.createMany({
        data: defaultPlans,
      });

      plans = await db.planConfig.findMany({
        orderBy: { displayOrder: "asc" },
      });
    }

    return NextResponse.json(plans);
  } catch (error) {
    console.error("Failed to fetch plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}

// POST /api/admin/plans - Create a new plan
export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();

    const plan = await db.planConfig.create({
      data: {
        code: body.code,
        name: body.name,
        description: body.description,
        monthlyPrice: body.monthlyPrice || 0,
        yearlyPrice: body.yearlyPrice || 0,
        currency: body.currency || "NGN",
        maxProjects: body.maxProjects || 1,
        maxLeadsPerProject: body.maxLeadsPerProject || 100,
        maxLeadsTotal: body.maxLeadsTotal || 100,
        maxEmailsPerMonth: body.maxEmailsPerMonth || 50,
        maxTeamMembers: body.maxTeamMembers || 1,
        maxTemplates: body.maxTemplates || 5,
        maxSequences: body.maxSequences || 0,
        hasEmailSequences: body.hasEmailSequences || false,
        hasABTesting: body.hasABTesting || false,
        hasAdvancedAnalytics: body.hasAdvancedAnalytics || false,
        hasCrmIntegrations: body.hasCrmIntegrations || false,
        hasEmailWarmup: body.hasEmailWarmup || false,
        hasApiAccess: body.hasApiAccess || false,
        hasWhiteLabel: body.hasWhiteLabel || false,
        hasPrioritySupport: body.hasPrioritySupport || false,
        hasDedicatedManager: body.hasDedicatedManager || false,
        displayOrder: body.displayOrder || 0,
        isPopular: body.isPopular || false,
        isActive: body.isActive !== false,
        paystackPlanCode: body.paystackPlanCode,
        features: body.features ? JSON.stringify(body.features) : null,
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Failed to create plan:", error);
    return NextResponse.json(
      { error: "Failed to create plan" },
      { status: 500 }
    );
  }
}
