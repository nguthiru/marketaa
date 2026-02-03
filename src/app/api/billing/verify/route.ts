import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyTransaction, PLANS } from "@/lib/paystack";
import { createAuditLog } from "@/lib/audit";

// POST /api/billing/verify - Verify a transaction and update subscription
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reference } = await req.json();

    if (!reference) {
      return NextResponse.json({ error: "Reference required" }, { status: 400 });
    }

    // Verify transaction with Paystack
    const transaction = await verifyTransaction(reference);

    if (transaction.status !== "success") {
      return NextResponse.json(
        { error: "Transaction not successful", status: transaction.status },
        { status: 400 }
      );
    }

    // Extract plan from metadata
    const metadata = transaction.metadata as { plan?: string; type?: string } | undefined;
    const planKey = metadata?.plan as string | undefined;

    if (!planKey || !PLANS[planKey]) {
      return NextResponse.json(
        { error: "Invalid plan in transaction" },
        { status: 400 }
      );
    }

    // Calculate next period end
    const nextPeriodEnd = new Date();
    nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

    // Update or create subscription
    const existingSub = await db.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (existingSub) {
      await db.subscription.update({
        where: { id: existingSub.id },
        data: {
          status: "active",
          plan: planKey,
          paystackCustomerId: transaction.customer.customer_code,
          currentPeriodStart: new Date(),
          currentPeriodEnd: nextPeriodEnd,
          cancelAtPeriodEnd: false,
        },
      });
    } else {
      await db.subscription.create({
        data: {
          userId: session.user.id,
          status: "active",
          plan: planKey,
          paystackCustomerId: transaction.customer.customer_code,
          currentPeriodStart: new Date(),
          currentPeriodEnd: nextPeriodEnd,
        },
      });
    }

    // Create invoice if it doesn't exist
    const existingInvoice = await db.invoice.findUnique({
      where: { paystackRef: reference },
    });

    if (!existingInvoice) {
      await db.invoice.create({
        data: {
          userId: session.user.id,
          paystackRef: reference,
          amount: transaction.amount,
          currency: transaction.currency || "KES",
          status: "paid",
          description: `${PLANS[planKey]?.name} subscription`,
          paidAt: new Date(),
        },
      });
    }

    await createAuditLog({
      userId: session.user.id,
      action: "subscription_created",
      resourceType: "subscription",
      metadata: { reference, plan: planKey },
    });

    return NextResponse.json({
      success: true,
      plan: planKey,
      planName: PLANS[planKey]?.name,
    });
  } catch (error) {
    console.error("Failed to verify transaction:", error);
    return NextResponse.json(
      { error: "Failed to verify transaction" },
      { status: 500 }
    );
  }
}
