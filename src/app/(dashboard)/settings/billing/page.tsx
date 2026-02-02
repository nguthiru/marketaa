"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Subscription {
  id: string;
  status: string;
  plan: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface Invoice {
  id: string;
  paystackRef: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface Plan {
  name: string;
  code: string;
  amount: number;
  interval: string;
  features: string[];
}

const PLANS: Plan[] = [
  {
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
  {
    name: "Starter",
    code: "starter",
    amount: 2500000,
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
  {
    name: "Professional",
    code: "pro",
    amount: 7500000,
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
  {
    name: "Enterprise",
    code: "enterprise",
    amount: 25000000,
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
];

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const [subRes, invoicesRes] = await Promise.all([
        fetch("/api/billing/subscription"),
        fetch("/api/billing/invoices"),
      ]);

      if (subRes.ok) {
        const data = await subRes.json();
        setSubscription(data);
      }

      if (invoicesRes.ok) {
        const data = await invoicesRes.json();
        setInvoices(data);
      }
    } catch (error) {
      console.error("Failed to fetch billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planCode: string) => {
    setUpgrading(planCode);

    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planCode }),
      });

      if (res.ok) {
        const data = await res.json();
        // Redirect to Paystack checkout
        window.location.href = data.authorization_url;
      } else {
        const data = await res.json();
        alert(data.error || "Failed to start upgrade");
      }
    } catch (error) {
      alert("Failed to start upgrade");
    } finally {
      setUpgrading(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? You'll lose access to premium features at the end of your billing period.")) {
      return;
    }

    setCancelling(true);

    try {
      const res = await fetch("/api/billing/subscription", {
        method: "DELETE",
      });

      if (res.ok) {
        fetchBillingData();
      } else {
        alert("Failed to cancel subscription");
      }
    } catch (error) {
      alert("Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  };

  const formatAmount = (amountInKobo: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amountInKobo / 100);
  };

  const currentPlan = PLANS.find((p) => p.code === subscription?.plan) || PLANS[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/settings"
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Settings
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Billing & Subscription</h1>
          <p className="text-slate-600 mt-1">Manage your subscription and billing information</p>
        </div>

        {/* Current Plan */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Current Plan</h2>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {currentPlan.name}
                {currentPlan.amount > 0 && (
                  <span className="text-lg font-normal text-slate-500 ml-2">
                    {formatAmount(currentPlan.amount)}/month
                  </span>
                )}
              </p>
              {subscription?.status === "active" && subscription.currentPeriodEnd && (
                <p className="text-sm text-slate-500 mt-1">
                  {subscription.cancelAtPeriodEnd
                    ? `Cancels on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                    : `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
                </p>
              )}
            </div>
            {subscription?.status === "active" && currentPlan.code !== "free" && !subscription.cancelAtPeriodEnd && (
              <Button
                variant="secondary"
                onClick={handleCancel}
                loading={cancelling}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                Cancel Subscription
              </Button>
            )}
          </div>

          {/* Plan Features */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-sm font-medium text-slate-700 mb-2">Plan includes:</p>
            <ul className="grid grid-cols-2 gap-2">
              {currentPlan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                  <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Available Plans */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Available Plans</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan) => {
              const isCurrent = plan.code === currentPlan.code;
              const isUpgrade = PLANS.indexOf(plan) > PLANS.indexOf(currentPlan);

              return (
                <div
                  key={plan.code}
                  className={`bg-white rounded-xl border p-5 ${
                    isCurrent ? "border-teal-500 ring-2 ring-teal-100" : "border-slate-200"
                  }`}
                >
                  {isCurrent && (
                    <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full">
                      Current Plan
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-slate-900 mt-2">{plan.name}</h3>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {plan.amount === 0 ? "Free" : formatAmount(plan.amount)}
                    {plan.amount > 0 && (
                      <span className="text-sm font-normal text-slate-500">/mo</span>
                    )}
                  </p>

                  <ul className="mt-4 space-y-2">
                    {plan.features.slice(0, 4).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <svg className="w-4 h-4 text-teal-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                    {plan.features.length > 4 && (
                      <li className="text-sm text-slate-500">
                        +{plan.features.length - 4} more features
                      </li>
                    )}
                  </ul>

                  <div className="mt-4">
                    {isCurrent ? (
                      <Button variant="secondary" disabled className="w-full">
                        Current Plan
                      </Button>
                    ) : isUpgrade ? (
                      <Button
                        variant="default"
                        onClick={() => handleUpgrade(plan.code)}
                        loading={upgrading === plan.code}
                        className="w-full"
                      >
                        Upgrade
                      </Button>
                    ) : (
                      <Button variant="secondary" disabled className="w-full">
                        Downgrade
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Invoice History */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Invoice History</h2>
          </div>
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No invoices yet
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-5 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-5 py-3">Description</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-5 py-3">Amount</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-900">
                      {invoice.description || "Subscription payment"}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-900">
                      {formatAmount(invoice.amount)}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        invoice.status === "paid"
                          ? "bg-teal-100 text-teal-700"
                          : invoice.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
