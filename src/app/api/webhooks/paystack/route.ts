import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature, PLANS } from "@/lib/paystack";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

// POST /api/webhooks/paystack - Handle Paystack webhooks
export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
    const signature = req.headers.get("x-paystack-signature") || "";

    // Verify webhook signature
    if (!verifyWebhookSignature(payload, signature)) {
      console.error("Invalid Paystack webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(payload);
    const { event: eventType, data } = event;

    console.log("Paystack webhook:", eventType, data.reference);

    switch (eventType) {
      case "charge.success":
        await handleChargeSuccess(data);
        break;
      case "subscription.create":
        await handleSubscriptionCreate(data);
        break;
      case "subscription.disable":
        await handleSubscriptionDisable(data);
        break;
      case "subscription.not_renew":
        await handleSubscriptionNotRenew(data);
        break;
      case "invoice.create":
        await handleInvoiceCreate(data);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(data);
        break;
      default:
        console.log("Unhandled Paystack event:", eventType);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paystack webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleChargeSuccess(data: {
  reference: string;
  amount: number;
  currency: string;
  customer: { email: string; customer_code: string };
  metadata?: { userId?: string; plan?: string; type?: string };
  plan?: { plan_code: string };
  authorization?: { authorization_code: string };
}) {
  const { reference, amount, currency, customer, metadata, plan, authorization } = data;

  // Find user by email or metadata
  const user = await db.user.findFirst({
    where: metadata?.userId
      ? { id: metadata.userId }
      : { email: customer.email },
  });

  if (!user) {
    console.error("User not found for charge:", customer.email);
    return;
  }

  // Create invoice record
  await db.invoice.create({
    data: {
      userId: user.id,
      paystackRef: reference,
      amount,
      currency,
      status: "paid",
      description: metadata?.plan
        ? `${PLANS[metadata.plan]?.name || metadata.plan} subscription`
        : "Payment",
      paidAt: new Date(),
    },
  });

  // If this is a subscription payment, update subscription
  if (metadata?.type === "subscription" && metadata?.plan && plan) {
    const existingSub = await db.subscription.findUnique({
      where: { userId: user.id },
    });

    const nextPeriodEnd = new Date();
    nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

    if (existingSub) {
      await db.subscription.update({
        where: { id: existingSub.id },
        data: {
          status: "active",
          plan: metadata.plan,
          paystackCustomerId: customer.customer_code,
          currentPeriodEnd: nextPeriodEnd,
          cancelAtPeriodEnd: false,
        },
      });
    } else {
      await db.subscription.create({
        data: {
          userId: user.id,
          status: "active",
          plan: metadata.plan,
          paystackCustomerId: customer.customer_code,
          currentPeriodEnd: nextPeriodEnd,
        },
      });
    }

    await createNotification({
      userId: user.id,
      type: "payment_success",
      title: "Subscription Activated",
      message: `Your ${PLANS[metadata.plan]?.name} plan is now active!`,
    });
  }

  await createAuditLog({
    userId: user.id,
    action: "payment_success",
    resourceType: "invoice",
    metadata: { reference, amount, plan: metadata?.plan },
  });
}

async function handleSubscriptionCreate(data: {
  subscription_code: string;
  email_token: string;
  customer: { email: string; customer_code: string };
  plan: { plan_code: string; name: string };
  next_payment_date: string;
}) {
  const { subscription_code, email_token, customer, plan, next_payment_date } = data;

  const user = await db.user.findFirst({
    where: { email: customer.email },
  });

  if (!user) return;

  // Find plan key from plan code
  const planKey = Object.entries(PLANS).find(
    ([, p]) => p.code === plan.plan_code
  )?.[0] || "starter";

  await db.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      status: "active",
      plan: planKey,
      paystackCustomerId: customer.customer_code,
      paystackSubCode: subscription_code,
      paystackEmailToken: email_token,
      currentPeriodEnd: new Date(next_payment_date),
    },
    update: {
      status: "active",
      plan: planKey,
      paystackSubCode: subscription_code,
      paystackEmailToken: email_token,
      currentPeriodEnd: new Date(next_payment_date),
      cancelAtPeriodEnd: false,
    },
  });
}

async function handleSubscriptionDisable(data: {
  subscription_code: string;
  customer: { email: string };
}) {
  const subscription = await db.subscription.findFirst({
    where: { paystackSubCode: data.subscription_code },
  });

  if (subscription) {
    await db.subscription.update({
      where: { id: subscription.id },
      data: { status: "cancelled", cancelAtPeriodEnd: true },
    });

    await createNotification({
      userId: subscription.userId,
      type: "subscription_expiring",
      title: "Subscription Cancelled",
      message: "Your subscription has been cancelled. You'll retain access until the end of your billing period.",
    });
  }
}

async function handleSubscriptionNotRenew(data: {
  subscription_code: string;
  customer: { email: string };
}) {
  const subscription = await db.subscription.findFirst({
    where: { paystackSubCode: data.subscription_code },
  });

  if (subscription) {
    // Downgrade to free plan
    await db.subscription.update({
      where: { id: subscription.id },
      data: { status: "expired", plan: "free" },
    });

    await createNotification({
      userId: subscription.userId,
      type: "subscription_expiring",
      title: "Subscription Expired",
      message: "Your subscription has expired. You've been moved to the Free plan.",
    });
  }
}

async function handleInvoiceCreate(data: {
  reference: string;
  amount: number;
  currency: string;
  customer: { email: string };
  description?: string;
}) {
  const user = await db.user.findFirst({
    where: { email: data.customer.email },
  });

  if (!user) return;

  await db.invoice.upsert({
    where: { paystackRef: data.reference },
    create: {
      userId: user.id,
      paystackRef: data.reference,
      amount: data.amount,
      currency: data.currency,
      status: "pending",
      description: data.description || "Subscription renewal",
    },
    update: {
      status: "pending",
    },
  });
}

async function handleInvoicePaymentFailed(data: {
  reference: string;
  customer: { email: string };
}) {
  const invoice = await db.invoice.findFirst({
    where: { paystackRef: data.reference },
    include: { user: true },
  });

  if (invoice) {
    await db.invoice.update({
      where: { id: invoice.id },
      data: { status: "failed" },
    });

    await createNotification({
      userId: invoice.userId,
      type: "payment_failed",
      title: "Payment Failed",
      message: "Your subscription payment failed. Please update your payment method.",
    });
  }
}
