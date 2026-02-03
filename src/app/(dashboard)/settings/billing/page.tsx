"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  key: string; // "free", "starter", "pro", "enterprise" - used for subscription
  amount: number;
  interval: string;
  features: string[];
  currency?: string;
}

interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currency, setCurrency] = useState<Currency>({ code: "USD", symbol: "$", name: "US Dollar" });
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [downgrading, setDowngrading] = useState<string | null>(null);
  const [downgradeModal, setDowngradeModal] = useState<{ open: boolean; planKey: string; planName: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    // Check for payment callback - Paystack appends reference param after redirect
    const reference = searchParams.get("reference") || searchParams.get("trxref");

    if (reference) {
      verifyPayment(reference);
    } else {
      fetchBillingData();
    }
  }, [searchParams]);

  const verifyPayment = async (reference: string) => {
    setVerifying(true);
    setLoading(true);

    try {
      const res = await fetch("/api/billing/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: `Successfully upgraded to ${data.planName}!` });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to verify payment" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to verify payment" });
    } finally {
      setVerifying(false);
      // Remove query params and refresh data
      router.replace("/settings/billing");
      fetchBillingData();
    }
  };

  const fetchBillingData = async () => {
    try {
      const [subRes, invoicesRes, plansRes] = await Promise.all([
        fetch("/api/billing/subscription"),
        fetch("/api/billing/invoices"),
        fetch("/api/billing/plans"),
      ]);

      if (subRes.ok) {
        const data = await subRes.json();
        setSubscription(data);
      }

      if (invoicesRes.ok) {
        const data = await invoicesRes.json();
        setInvoices(data);
      }

      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(data.plans);
        setCurrency(data.currency);
      }
    } catch (error) {
      console.error("Failed to fetch billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planKey: string) => {
    setUpgrading(planKey);

    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });

      if (res.ok) {
        const data = await res.json();
        // Redirect to Paystack checkout
        window.location.href = data.authorization_url;
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to start upgrade" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to start upgrade" });
    } finally {
      setUpgrading(null);
    }
  };

  const openDowngradeModal = (planKey: string, planName: string) => {
    setDowngradeModal({ open: true, planKey, planName });
  };

  const closeDowngradeModal = () => {
    setDowngradeModal(null);
  };

  const confirmDowngrade = async () => {
    if (!downgradeModal) return;

    const { planKey } = downgradeModal;
    setDowngrading(planKey);
    closeDowngradeModal();

    try {
      const res = await fetch("/api/billing/downgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: data.message });
        fetchBillingData();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to downgrade" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to downgrade" });
    } finally {
      setDowngrading(null);
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

  const formatAmount = (amount: number, planCurrency?: string) => {
    const currencyCode = planCurrency || currency.code;
    const value = amount / 100;

    // Use locale based on currency
    const locale = currencyCode === "NGN" ? "en-NG" : currencyCode === "KES" ? "en-KE" : "en-US";

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Find current plan - default to free if no subscription or plan not found
  const userPlanKey = subscription?.plan || "free";
  const currentPlan = plans.find((p) => p.key === userPlanKey) || plans.find((p) => p.key === "free") || plans[0];
  const currentPlanIndex = plans.findIndex((p) => p.key === currentPlan?.key);

  if (verifying) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-pink-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (loading || plans.length === 0 || !currentPlan) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Success/Error Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <p>{message.text}</p>
              <button
                onClick={() => setMessage(null)}
                className="text-current opacity-50 hover:opacity-100"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

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
                    {formatAmount(currentPlan.amount, currentPlan.currency)}/{currentPlan.interval === "annually" ? "year" : "month"}
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
            {subscription?.status === "active" && currentPlan.key !== "free" && !subscription.cancelAtPeriodEnd && (
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
                  <svg className="w-4 h-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            {plans.map((plan, index) => {
              const isCurrent = plan.key === currentPlan?.key;
              const isUpgrade = index > currentPlanIndex;

              return (
                <div
                  key={plan.code}
                  className={`bg-white rounded-xl border p-5 ${
                    isCurrent ? "border-pink-500 ring-2 ring-pink-100" : "border-slate-200"
                  }`}
                >
                  {isCurrent && (
                    <span className="text-xs px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full">
                      Current Plan
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-slate-900 mt-2">{plan.name}</h3>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {plan.amount === 0 ? "Free" : formatAmount(plan.amount, plan.currency)}
                    {plan.amount > 0 && (
                      <span className="text-sm font-normal text-slate-500">/{plan.interval === "annually" ? "yr" : "mo"}</span>
                    )}
                  </p>

                  <ul className="mt-4 space-y-2">
                    {plan.features.slice(0, 4).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <svg className="w-4 h-4 text-pink-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        onClick={() => handleUpgrade(plan.key)}
                        loading={upgrading === plan.key}
                        className="w-full"
                      >
                        Upgrade
                      </Button>
                    ) : currentPlan.key === "free" ? (
                      // Can't downgrade from free plan
                      <Button variant="secondary" disabled className="w-full">
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={() => openDowngradeModal(plan.key, plan.name)}
                        loading={downgrading === plan.key}
                        className="w-full text-amber-600 border-amber-200 hover:bg-amber-50"
                      >
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
                      {formatAmount(invoice.amount, invoice.currency)}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        invoice.status === "paid"
                          ? "bg-pink-100 text-pink-700"
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

      {/* Downgrade Confirmation Modal */}
      <Dialog open={downgradeModal?.open || false} onOpenChange={(open) => !open && closeDowngradeModal()}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-slate-900">
              Downgrade to {downgradeModal?.planName}?
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              {downgradeModal?.planKey === "free" ? (
                "You're about to downgrade to the Free plan."
              ) : (
                `You're about to downgrade to the ${downgradeModal?.planName} plan.`
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-amber-800 mb-2">What happens next:</h4>
              <ul className="space-y-2 text-sm text-amber-700">
                {subscription?.currentPeriodEnd ? (
                  <>
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        You'll keep your current plan until{" "}
                        <strong>{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      </svg>
                      <span>After that date, you'll be moved to {downgradeModal?.planName}</span>
                    </li>
                  </>
                ) : (
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Your plan will change immediately</span>
                  </li>
                )}
                {downgradeModal?.planKey === "free" && (
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>You'll lose access to premium features like sequences, CRM sync, and advanced analytics</span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={closeDowngradeModal}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={confirmDowngrade}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Confirm Downgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
