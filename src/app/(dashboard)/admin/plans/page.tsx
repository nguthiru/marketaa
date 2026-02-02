"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Plan {
  id: string;
  code: string;
  name: string;
  monthlyPrice: number;
  maxProjects: number;
  maxLeadsTotal: number;
  maxEmailsPerMonth: number;
  maxTeamMembers: number;
  hasEmailSequences: boolean;
  hasABTesting: boolean;
  hasAdvancedAnalytics: boolean;
  isActive: boolean;
  isPopular: boolean;
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/admin/plans");
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (error) {
      console.error("Failed to fetch plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amountInKobo: number) => {
    if (amountInKobo === 0) return "Free";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amountInKobo / 100);
  };

  const formatLimit = (limit: number) => {
    return limit === -1 ? "Unlimited" : limit.toString();
  };

  const handleSave = async () => {
    if (!editingPlan) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/plans/${editingPlan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPlan),
      });

      if (res.ok) {
        setEditingPlan(null);
        fetchPlans();
      }
    } catch (error) {
      console.error("Failed to save plan:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin"
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Admin Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Plans & Pricing</h1>
          <p className="text-slate-600 mt-1">Configure subscription plans, limits, and features</p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-xl border p-5 ${
                plan.isPopular ? "border-teal-500 ring-2 ring-teal-100" : "border-slate-200"
              }`}
            >
              {plan.isPopular && (
                <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full">
                  Popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-slate-900 mt-2">{plan.name}</h3>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {formatAmount(plan.monthlyPrice)}
                {plan.monthlyPrice > 0 && <span className="text-sm font-normal text-slate-500">/mo</span>}
              </p>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Projects</span>
                  <span className="font-medium">{formatLimit(plan.maxProjects)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Leads</span>
                  <span className="font-medium">{formatLimit(plan.maxLeadsTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Emails/month</span>
                  <span className="font-medium">{formatLimit(plan.maxEmailsPerMonth)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Team members</span>
                  <span className="font-medium">{formatLimit(plan.maxTeamMembers)}</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1">
                {plan.hasEmailSequences && (
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Sequences</span>
                )}
                {plan.hasABTesting && (
                  <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">A/B Testing</span>
                )}
                {plan.hasAdvancedAnalytics && (
                  <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">Analytics</span>
                )}
              </div>

              <button
                onClick={() => setEditingPlan(plan)}
                className="w-full mt-4 px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50"
              >
                Edit Plan
              </button>
            </div>
          ))}
        </div>

        {/* Edit Modal */}
        {editingPlan && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <h2 className="font-semibold text-slate-900">Edit {editingPlan.name} Plan</h2>
                <button onClick={() => setEditingPlan(null)} className="p-1 text-slate-400 hover:text-slate-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Price (kobo)</label>
                  <input
                    type="number"
                    value={editingPlan.monthlyPrice}
                    onChange={(e) => setEditingPlan({ ...editingPlan, monthlyPrice: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Current: {formatAmount(editingPlan.monthlyPrice)}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Projects (-1 = unlimited)</label>
                    <input
                      type="number"
                      value={editingPlan.maxProjects}
                      onChange={(e) => setEditingPlan({ ...editingPlan, maxProjects: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Leads Total</label>
                    <input
                      type="number"
                      value={editingPlan.maxLeadsTotal}
                      onChange={(e) => setEditingPlan({ ...editingPlan, maxLeadsTotal: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Emails/Month</label>
                    <input
                      type="number"
                      value={editingPlan.maxEmailsPerMonth}
                      onChange={(e) => setEditingPlan({ ...editingPlan, maxEmailsPerMonth: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Team Members</label>
                    <input
                      type="number"
                      value={editingPlan.maxTeamMembers}
                      onChange={(e) => setEditingPlan({ ...editingPlan, maxTeamMembers: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Features</label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingPlan.hasEmailSequences}
                      onChange={(e) => setEditingPlan({ ...editingPlan, hasEmailSequences: e.target.checked })}
                      className="rounded border-slate-300 text-teal-500 focus:ring-teal-500"
                    />
                    <span className="text-sm">Email Sequences</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingPlan.hasABTesting}
                      onChange={(e) => setEditingPlan({ ...editingPlan, hasABTesting: e.target.checked })}
                      className="rounded border-slate-300 text-teal-500 focus:ring-teal-500"
                    />
                    <span className="text-sm">A/B Testing</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingPlan.hasAdvancedAnalytics}
                      onChange={(e) => setEditingPlan({ ...editingPlan, hasAdvancedAnalytics: e.target.checked })}
                      className="rounded border-slate-300 text-teal-500 focus:ring-teal-500"
                    />
                    <span className="text-sm">Advanced Analytics</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="secondary" onClick={() => setEditingPlan(null)} className="flex-1">
                    Cancel
                  </Button>
                  <Button variant="default" onClick={handleSave} loading={saving} className="flex-1">
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
