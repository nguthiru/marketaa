import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

// GET /api/admin/plans/[planId] - Get plan details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { planId } = await params;

    const plan = await db.planConfig.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Get subscriber count
    const subscriberCount = await db.subscription.count({
      where: { plan: plan.code, status: "active" },
    });

    return NextResponse.json({ ...plan, subscriberCount });
  } catch (error) {
    console.error("Failed to fetch plan:", error);
    return NextResponse.json(
      { error: "Failed to fetch plan" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/plans/[planId] - Update plan
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { planId } = await params;
    const body = await req.json();

    // Don't allow changing the code of existing plans (breaks subscriptions)
    delete body.code;

    if (body.features && Array.isArray(body.features)) {
      body.features = JSON.stringify(body.features);
    }

    const plan = await db.planConfig.update({
      where: { id: planId },
      data: body,
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Failed to update plan:", error);
    return NextResponse.json(
      { error: "Failed to update plan" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/plans/[planId] - Delete plan
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { planId } = await params;

    const plan = await db.planConfig.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Check if any users are on this plan
    const subscriberCount = await db.subscription.count({
      where: { plan: plan.code },
    });

    if (subscriberCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete plan with ${subscriberCount} active subscribers` },
        { status: 400 }
      );
    }

    await db.planConfig.delete({
      where: { id: planId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete plan:", error);
    return NextResponse.json(
      { error: "Failed to delete plan" },
      { status: 500 }
    );
  }
}
