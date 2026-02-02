"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface UserDetails {
  id: string;
  email: string;
  name: string | null;
  role: string;
  emailVerified: boolean;
  timezone: string;
  createdAt: string;
  subscription: {
    plan: string;
    status: string;
    currentPeriodEnd: string | null;
  } | null;
  usageStats: {
    projectCount: number;
    leadCount: number;
    templateCount: number;
    sequenceCount: number;
    emailsGeneratedThisMonth: number;
    emailsSentThisMonth: number;
  } | null;
  ownedProjects: Array<{
    id: string;
    name: string;
    _count: { leads: number };
  }>;
  invoices: Array<{
    id: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
  }>;
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ role: "", emailVerified: false, plan: "" });

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setEditData({
          role: data.role,
          emailVerified: data.emailVerified,
          plan: data.subscription?.plan || "free",
        });
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });

      if (res.ok) {
        fetchUser();
        setEditMode(false);
      }
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  const formatAmount = (amountInKobo: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amountInKobo / 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">User not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/users"
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Users
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{user.name || "No name"}</h1>
              <p className="text-slate-600">{user.email}</p>
            </div>
            <Button
              variant={editMode ? "secondary" : "default"}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? "Cancel" : "Edit User"}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Details Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4">User Details</h2>
              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                    <select
                      value={editData.role}
                      onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Subscription Plan</label>
                    <select
                      value={editData.plan}
                      onChange={(e) => setEditData({ ...editData, plan: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="free">Free</option>
                      <option value="starter">Starter</option>
                      <option value="pro">Professional</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editData.emailVerified}
                      onChange={(e) => setEditData({ ...editData, emailVerified: e.target.checked })}
                      className="rounded border-slate-300 text-teal-500 focus:ring-teal-500"
                    />
                    <span className="text-sm">Email Verified</span>
                  </label>
                  <Button variant="default" onClick={handleSave} loading={saving}>
                    Save Changes
                  </Button>
                </div>
              ) : (
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-slate-500">Role</dt>
                    <dd className="font-medium text-slate-900">{user.role}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Email Verified</dt>
                    <dd className="font-medium text-slate-900">{user.emailVerified ? "Yes" : "No"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Timezone</dt>
                    <dd className="font-medium text-slate-900">{user.timezone}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Joined</dt>
                    <dd className="font-medium text-slate-900">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              )}
            </div>

            {/* Usage Stats */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Usage Statistics</h2>
              {user.usageStats ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-bold text-slate-900">{user.usageStats.projectCount}</p>
                    <p className="text-sm text-slate-500">Projects</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-bold text-slate-900">{user.usageStats.leadCount}</p>
                    <p className="text-sm text-slate-500">Leads</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-bold text-slate-900">{user.usageStats.emailsGeneratedThisMonth}</p>
                    <p className="text-sm text-slate-500">Emails (this month)</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-bold text-slate-900">{user.usageStats.templateCount}</p>
                    <p className="text-sm text-slate-500">Templates</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-bold text-slate-900">{user.usageStats.sequenceCount}</p>
                    <p className="text-sm text-slate-500">Sequences</p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500">No usage data</p>
              )}
            </div>

            {/* Projects */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Projects ({user.ownedProjects.length})</h2>
              {user.ownedProjects.length === 0 ? (
                <p className="text-slate-500">No projects</p>
              ) : (
                <div className="space-y-2">
                  {user.ownedProjects.map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-900">{project.name}</span>
                      <span className="text-sm text-slate-500">{project._count.leads} leads</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Subscription */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Subscription</h2>
              <div className="text-center">
                <span className={`text-lg font-bold px-4 py-2 rounded-full ${
                  user.subscription?.plan === "enterprise"
                    ? "bg-purple-100 text-purple-700"
                    : user.subscription?.plan === "pro"
                    ? "bg-blue-100 text-blue-700"
                    : user.subscription?.plan === "starter"
                    ? "bg-teal-100 text-teal-700"
                    : "bg-slate-100 text-slate-700"
                }`}>
                  {user.subscription?.plan || "Free"}
                </span>
                {user.subscription?.status && user.subscription.status !== "active" && (
                  <p className="text-sm text-amber-600 mt-2">{user.subscription.status}</p>
                )}
                {user.subscription?.currentPeriodEnd && (
                  <p className="text-sm text-slate-500 mt-2">
                    Renews {new Date(user.subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {/* Recent Invoices */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Recent Invoices</h2>
              {user.invoices.length === 0 ? (
                <p className="text-sm text-slate-500">No invoices</p>
              ) : (
                <div className="space-y-2">
                  {user.invoices.slice(0, 5).map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">
                        {new Date(invoice.createdAt).toLocaleDateString()}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        invoice.status === "paid"
                          ? "bg-teal-100 text-teal-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {formatAmount(invoice.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Recent Activity</h2>
              {user.auditLogs.length === 0 ? (
                <p className="text-sm text-slate-500">No activity</p>
              ) : (
                <div className="space-y-2">
                  {user.auditLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="text-sm">
                      <p className="text-slate-900">{log.action}</p>
                      <p className="text-xs text-slate-500">
                        {log.entityType} - {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
