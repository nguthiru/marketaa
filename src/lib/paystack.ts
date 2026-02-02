const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || "";
const PAYSTACK_BASE_URL = "https://api.paystack.co";

export interface PaystackPlan {
  name: string;
  code: string;
  amount: number; // In kobo (NGN) or cents
  interval: "monthly" | "annually";
  features: string[];
}

export const PLANS: Record<string, PaystackPlan> = {
  free: {
    name: "Free",
    code: "free",
    amount: 0,
    interval: "monthly",
    features: [
      "1 Project",
      "100 Leads",
      "50 AI-generated emails/month",
      "Basic templates",
      "Email support",
    ],
  },
  starter: {
    name: "Starter",
    code: process.env.PAYSTACK_STARTER_PLAN_CODE || "PLN_starter",
    amount: 2500000, // ₦25,000/month in kobo
    interval: "monthly",
    features: [
      "5 Projects",
      "1,000 Leads",
      "500 AI-generated emails/month",
      "All templates",
      "Email sequences",
      "Basic analytics",
      "Priority support",
    ],
  },
  pro: {
    name: "Professional",
    code: process.env.PAYSTACK_PRO_PLAN_CODE || "PLN_pro",
    amount: 7500000, // ₦75,000/month in kobo
    interval: "monthly",
    features: [
      "Unlimited Projects",
      "10,000 Leads",
      "2,000 AI-generated emails/month",
      "All templates + A/B testing",
      "Advanced sequences",
      "Full analytics",
      "CRM integrations",
      "Email warmup",
      "API access",
      "Dedicated support",
    ],
  },
  enterprise: {
    name: "Enterprise",
    code: process.env.PAYSTACK_ENTERPRISE_PLAN_CODE || "PLN_enterprise",
    amount: 25000000, // ₦250,000/month in kobo
    interval: "monthly",
    features: [
      "Everything in Pro",
      "Unlimited Leads",
      "Unlimited AI emails",
      "Custom integrations",
      "White-label options",
      "Dedicated account manager",
      "SLA guarantee",
      "Custom training",
    ],
  },
};

// Make API request to Paystack
async function paystackRequest(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: Record<string, unknown>
) {
  const response = await fetch(`${PAYSTACK_BASE_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!data.status) {
    throw new Error(data.message || "Paystack API error");
  }

  return data;
}

// Initialize a transaction
export async function initializeTransaction(params: {
  email: string;
  amount: number; // In kobo
  reference?: string;
  callback_url?: string;
  metadata?: Record<string, unknown>;
  plan?: string; // For subscriptions
}) {
  const data = await paystackRequest("/transaction/initialize", "POST", {
    email: params.email,
    amount: params.amount,
    reference: params.reference,
    callback_url: params.callback_url,
    metadata: params.metadata,
    plan: params.plan,
  });

  return data.data as {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

// Verify a transaction
export async function verifyTransaction(reference: string) {
  const data = await paystackRequest(`/transaction/verify/${reference}`);

  return data.data as {
    id: number;
    status: string;
    reference: string;
    amount: number;
    customer: {
      id: number;
      email: string;
      customer_code: string;
    };
    authorization: {
      authorization_code: string;
      card_type: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      bank: string;
    };
    plan?: {
      plan_code: string;
      name: string;
    };
  };
}

// Create a customer
export async function createCustomer(params: {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}) {
  const data = await paystackRequest("/customer", "POST", params);

  return data.data as {
    id: number;
    customer_code: string;
    email: string;
  };
}

// Get customer
export async function getCustomer(emailOrCode: string) {
  const data = await paystackRequest(`/customer/${emailOrCode}`);
  return data.data;
}

// Create a subscription
export async function createSubscription(params: {
  customer: string; // Customer email or code
  plan: string; // Plan code
  authorization?: string; // Authorization code from previous transaction
  start_date?: string;
}) {
  const data = await paystackRequest("/subscription", "POST", params);

  return data.data as {
    subscription_code: string;
    email_token: string;
    status: string;
    next_payment_date: string;
  };
}

// Get subscription
export async function getSubscription(idOrCode: string) {
  const data = await paystackRequest(`/subscription/${idOrCode}`);
  return data.data;
}

// Disable subscription (cancel)
export async function cancelSubscription(subscriptionCode: string, emailToken: string) {
  const data = await paystackRequest("/subscription/disable", "POST", {
    code: subscriptionCode,
    token: emailToken,
  });
  return data;
}

// Enable subscription (reactivate)
export async function enableSubscription(subscriptionCode: string, emailToken: string) {
  const data = await paystackRequest("/subscription/enable", "POST", {
    code: subscriptionCode,
    token: emailToken,
  });
  return data;
}

// List transactions for a customer
export async function listTransactions(params?: {
  customer?: string;
  status?: string;
  from?: string;
  to?: string;
  perPage?: number;
  page?: number;
}) {
  const query = new URLSearchParams();
  if (params?.customer) query.set("customer", params.customer);
  if (params?.status) query.set("status", params.status);
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  if (params?.perPage) query.set("perPage", params.perPage.toString());
  if (params?.page) query.set("page", params.page.toString());

  const data = await paystackRequest(`/transaction?${query.toString()}`);
  return data.data;
}

// Get public key for frontend
export function getPublicKey() {
  return PAYSTACK_PUBLIC_KEY;
}

// Verify webhook signature
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const crypto = require("crypto");
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(payload)
    .digest("hex");
  return hash === signature;
}

// Format amount for display
export function formatAmount(amountInKobo: number, currency: string = "NGN"): string {
  const amount = amountInKobo / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
  }).format(amount);
}
