import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLANS, cancelSubscription } from "@/lib/paystack";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

// POST /api/billing/downgrade - Schedule a downgrade to a lower plan
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan: targetPlan } = await req.json();

    if (!targetPlan || !PLANS[targetPlan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Get current subscription
    const subscription = await db.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "No active subscription" },
        { status: 400 }
      );
    }

    // Define plan hierarchy for validation
    const planHierarchy = ["free", "starter", "pro", "enterprise"];
    const currentPlanIndex = planHierarchy.indexOf(subscription.plan);
    const targetPlanIndex = planHierarchy.indexOf(targetPlan);

    if (targetPlanIndex >= currentPlanIndex) {
      return NextResponse.json(
        { error: "Target plan must be lower than current plan" },
        { status: 400 }
      );
    }

    // If downgrading to free, cancel the Paystack subscription
    if (targetPlan === "free") {
      if (subscription.paystackSubCode && subscription.paystackEmailToken) {
        try {
          await cancelSubscription(
            subscription.paystackSubCode,
            subscription.paystackEmailToken
          );
        } catch (error) {
          console.error("Failed to cancel Paystack subscription:", error);
          // Continue anyway - we'll update locally
        }
      }

      // Update subscription to downgrade at period end
      await db.subscription.update({
        where: { id: subscription.id },
        data: {
          cancelAtPeriodEnd: true,
          // Store the target plan for when the period ends
          // We'll use metadata or a new field for this
        },
      });

      // If no billing period end, downgrade immediately
      if (!subscription.currentPeriodEnd || new Date(subscription.currentPeriodEnd) <= new Date()) {
        await db.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "active",
            plan: "free",
            cancelAtPeriodEnd: false,
            paystackSubCode: null,
            paystackEmailToken: null,
          },
        });

        await createNotification({
          userId: session.user.id,
          type: "billing",
          title: "Plan Changed",
          message: "You've been moved to the Free plan.",
        });

        await createAuditLog({
          userId: session.user.id,
          action: "subscription_cancelled",
          resourceType: "subscription",
          metadata: { fromPlan: subscription.plan, toPlan: "free", immediate: true },
        });

        return NextResponse.json({
          success: true,
          immediate: true,
          message: "You've been moved to the Free plan.",
        });
      }

      await createNotification({
        userId: session.user.id,
        type: "billing",
        title: "Downgrade Scheduled",
        message: `Your plan will change to Free on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}.`,
      });

      await createAuditLog({
        userId: session.user.id,
        action: "subscription_cancelled",
        resourceType: "subscription",
        metadata: { fromPlan: subscription.plan, toPlan: "free", scheduledFor: subscription.currentPeriodEnd },
      });

      return NextResponse.json({
        success: true,
        immediate: false,
        effectiveDate: subscription.currentPeriodEnd,
        message: `Your plan will change to Free on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}.`,
      });
    }

    // For downgrades to paid plans (e.g., Pro -> Starter), we need to handle differently
    // This would require creating a new subscription on Paystack at period end
    // For now, we'll schedule it and handle via webhook/cron

    await db.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
      },
    });

    await createNotification({
      userId: session.user.id,
      type: "billing",
      title: "Downgrade Scheduled",
      message: `Your plan will change to ${PLANS[targetPlan]?.name} on ${new Date(subscription.currentPeriodEnd!).toLocaleDateString()}.`,
    });

    await createAuditLog({
      userId: session.user.id,
      action: "subscription_updated",
      resourceType: "subscription",
      metadata: { fromPlan: subscription.plan, toPlan: targetPlan, scheduledFor: subscription.currentPeriodEnd },
    });

    return NextResponse.json({
      success: true,
      immediate: false,
      effectiveDate: subscription.currentPeriodEnd,
      targetPlan,
      message: `Your plan will change to ${PLANS[targetPlan]?.name} at the end of your billing period.`,
    });
  } catch (error) {
    console.error("Failed to process downgrade:", error);
    return NextResponse.json(
      { error: "Failed to process downgrade" },
      { status: 500 }
    );
  }
}
