"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface WarmupAccount {
  id: string;
  email: string;
  status: string;
  reputation: number;
  dailyLimit: number;
  sentToday: number;
  receivedToday: number;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  warming: { label: "Warming Up", color: "text-amber-600", bg: "bg-amber-100" },
  healthy: { label: "Healthy", color: "text-teal-600", bg: "bg-teal-100" },
  paused: { label: "Paused", color: "text-slate-600", bg: "bg-slate-100" },
  at_risk: { label: "At Risk", color: "text-red-600", bg: "bg-red-100" },
};

export default function WarmupPage() {
  const [accounts, setAccounts] = useState<WarmupAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/warmup");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error("Failed to fetch warmup accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const getReputationColor = (reputation: number) => {
    if (reputation >= 80) return "text-teal-600";
    if (reputation >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const getReputationBg = (reputation: number) => {
    if (reputation >= 80) return "bg-teal-500";
    if (reputation >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Email Warmup</h1>
            <p className="text-slate-600 mt-1">
              Build sender reputation to improve email deliverability
            </p>
          </div>
          <Button variant="default" onClick={() => setShowAdd(true)}>
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Account
          </Button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-900">How Email Warmup Works</p>
              <p className="text-sm text-blue-700 mt-1">
                We gradually increase your sending volume and engage with warmup networks to build
                your sender reputation. This helps your emails land in the inbox instead of spam.
              </p>
            </div>
          </div>
        </div>

        {/* Accounts List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">No warmup accounts</h3>
            <p className="text-slate-500 mb-4">
              Connect an email account to start warming it up
            </p>
            <Button variant="default" onClick={() => setShowAdd(true)}>
              Add Your First Account
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => {
              const status = STATUS_CONFIG[account.status] || STATUS_CONFIG.warming;

              return (
                <div
                  key={account.id}
                  className="bg-white rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900">{account.email}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                      </div>

                      {/* Reputation Gauge */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-slate-500">Reputation Score</span>
                          <span className={`font-semibold ${getReputationColor(account.reputation)}`}>
                            {account.reputation}/100
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getReputationBg(account.reputation)} rounded-full transition-all`}
                            style={{ width: `${account.reputation}%` }}
                          />
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-2xl font-bold text-slate-900">{account.dailyLimit}</p>
                          <p className="text-xs text-slate-500">Daily Limit</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-2xl font-bold text-teal-600">{account.sentToday || 0}</p>
                          <p className="text-xs text-slate-500">Sent Today</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">{account.receivedToday || 0}</p>
                          <p className="text-xs text-slate-500">Received Today</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                    {account.status === "warming" ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {/* TODO: pause warmup */}}
                      >
                        Pause
                      </Button>
                    ) : account.status === "paused" ? (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {/* TODO: resume warmup */}}
                      >
                        Resume
                      </Button>
                    ) : null}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {/* TODO: view details */}}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Account Modal */}
        {showAdd && (
          <AddWarmupModal
            onClose={() => setShowAdd(false)}
            onAdded={() => {
              setShowAdd(false);
              fetchAccounts();
            }}
          />
        )}
      </div>
    </div>
  );
}

function AddWarmupModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [emailProvider, setEmailProvider] = useState<"gmail" | "outlook" | null>(null);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Add Warmup Account</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm text-slate-600 mb-4">
            Connect an email account to start the warmup process. Make sure you've configured
            the integration in{" "}
            <Link href="/settings/integrations" className="text-teal-600 hover:underline">
              Settings
            </Link>{" "}
            first.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => window.location.href = "/api/integrations/google/connect"}
              className="w-full flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:border-teal-300 hover:bg-teal-50 transition-colors"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <div className="text-left">
                <p className="font-medium text-slate-900">Gmail</p>
                <p className="text-xs text-slate-500">Connect with Google account</p>
              </div>
            </button>

            <button
              onClick={() => window.location.href = "/api/integrations/microsoft/connect"}
              className="w-full flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:border-teal-300 hover:bg-teal-50 transition-colors"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#F25022" d="M1 1h10v10H1z"/>
                <path fill="#00A4EF" d="M1 13h10v10H1z"/>
                <path fill="#7FBA00" d="M13 1h10v10H13z"/>
                <path fill="#FFB900" d="M13 13h10v10H13z"/>
              </svg>
              <div className="text-left">
                <p className="font-medium text-slate-900">Outlook</p>
                <p className="text-xs text-slate-500">Connect with Microsoft account</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
