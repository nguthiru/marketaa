import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { cancelSubscription } from "@/lib/paystack";
import { createAuditLog } from "@/lib/audit";

// GET /api/billing/subscription - Get current subscription
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await db.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!subscription) {
      // Return free plan info if no subscription
      return NextResponse.json({
        id: null,
        status: "active",
        plan: "free",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      });
    }

    return NextResponse.json({
      id: subscription.id,
      status: subscription.status,
      plan: subscription.plan,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    });
  } catch (error) {
    console.error("Failed to fetch subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}

// DELETE /api/billing/subscription - Cancel subscription
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await db.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "No active subscription" },
        { status: 400 }
      );
    }

    if (subscription.paystackSubCode && subscription.paystackEmailToken) {
      // Cancel subscription in Paystack
      try {
        await cancelSubscription(
          subscription.paystackSubCode,
          subscription.paystackEmailToken
        );
      } catch (paystackError) {
        console.error("Paystack cancellation error:", paystackError);
        // Continue with local update even if Paystack fails
      }
    }

    // Update local subscription to cancel at period end
    await db.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: true },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "subscription_cancelled",
      resourceType: "subscription",
      resourceId: subscription.id,
      metadata: { plan: subscription.plan },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to cancel subscription:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
