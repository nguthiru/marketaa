import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { initializeTransaction, PLANS } from "@/lib/paystack";
import { createAuditLog } from "@/lib/audit";
import crypto from "crypto";

// POST /api/billing/subscribe - Start subscription checkout
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { plan } = body;

    if (!plan || !PLANS[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const selectedPlan = PLANS[plan];

    if (selectedPlan.amount === 0) {
      return NextResponse.json(
        { error: "Cannot subscribe to free plan via checkout" },
        { status: 400 }
      );
    }

    // Check if user already has this plan
    const existingSub = await db.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (existingSub && existingSub.plan === plan && existingSub.status === "active") {
      return NextResponse.json(
        { error: "Already subscribed to this plan" },
        { status: 400 }
      );
    }

    // Generate unique reference
    const reference = `sub_${session.user.id}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    // Initialize Paystack transaction
    const transaction = await initializeTransaction({
      email: session.user.email,
      amount: selectedPlan.amount,
      reference,
      plan: selectedPlan.code,
      callback_url: `${process.env.NEXTAUTH_URL}/settings/billing?success=true`,
      metadata: {
        userId: session.user.id,
        plan: plan,
        type: "subscription",
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "subscription_checkout",
      resourceType: "subscription",
      metadata: { plan, reference },
    });

    return NextResponse.json({
      authorization_url: transaction.authorization_url,
      reference: transaction.reference,
    });
  } catch (error) {
    console.error("Failed to start subscription:", error);
    return NextResponse.json(
      { error: "Failed to start subscription checkout" },
      { status: 500 }
    );
  }
}
