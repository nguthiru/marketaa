"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface DashboardData {
  summary: {
    totalLeads: number;
    emailsSent: number;
    repliesReceived: number;
    meetingsBooked: number;
    replyRate: number;
    meetingRate: number;
  };
  leadsByStatus: Record<string, number>;
  outcomeBreakdown: Record<string, number>;
  activityByDate: Record<string, number>;
  recentActions: {
    id: string;
    leadName: string;
    organization: string | null;
    subject: string | null;
    sentAt: string | null;
    outcome: string | null;
  }[];
}

const OUTCOME_LABELS: Record<string, { label: string; color: string }> = {
  no_reply: { label: "No Reply", color: "bg-slate-100 text-slate-700" },
  replied: { label: "Replied", color: "bg-blue-100 text-blue-700" },
  follow_up: { label: "Follow Up", color: "bg-amber-100 text-amber-700" },
  not_interested: { label: "Not Interested", color: "bg-red-100 text-red-700" },
  meeting_booked: { label: "Meeting Booked", color: "bg-teal-100 text-teal-700" },
  converted: { label: "Converted", color: "bg-purple-100 text-purple-700" },
};

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    fetchAnalytics();
  }, [projectId, period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (projectId) params.set("projectId", projectId);

      const res = await fetch(`/api/analytics/dashboard?${params}`);
      if (res.ok) {
        const data = await res.json();
        setData(data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
            <p className="text-slate-600 mt-1">
              Track your outreach performance and engagement
            </p>
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-2">
            {[
              { value: "7", label: "7 days" },
              { value: "30", label: "30 days" },
              { value: "90", label: "90 days" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriod(option.value)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  period === option.value
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <MetricCard
                title="Total Leads"
                value={data.summary.totalLeads}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
              />
              <MetricCard
                title="Emails Sent"
                value={data.summary.emailsSent}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />
              <MetricCard
                title="Reply Rate"
                value={`${data.summary.replyRate}%`}
                subtitle={`${data.summary.repliesReceived} replies`}
                highlight={data.summary.replyRate >= 20}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                }
              />
              <MetricCard
                title="Meetings Booked"
                value={data.summary.meetingsBooked}
                subtitle={`${data.summary.meetingRate}% rate`}
                highlight
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Outcomes Breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Outcomes</h3>
                <div className="space-y-3">
                  {Object.entries(data.outcomeBreakdown).map(([outcome, count]) => {
                    const config = OUTCOME_LABELS[outcome] || { label: outcome, color: "bg-slate-100 text-slate-700" };
                    const total = Object.values(data.outcomeBreakdown).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

                    return (
                      <div key={outcome} className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${config.color}`}>
                          {config.label}
                        </span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${config.color.replace("text-", "bg-").replace("-700", "-500").replace("-100", "-500")}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-600 w-16 text-right">
                          {count} ({percentage}%)
                        </span>
                      </div>
                    );
                  })}
                  {Object.keys(data.outcomeBreakdown).length === 0 && (
                    <p className="text-sm text-slate-500">No outcomes recorded yet</p>
                  )}
                </div>
              </div>

              {/* Lead Status Distribution */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Lead Status</h3>
                <div className="space-y-3">
                  {Object.entries(data.leadsByStatus).map(([status, count]) => {
                    const labels: Record<string, string> = {
                      not_contacted: "New",
                      contacted: "Contacted",
                      responded: "Responded",
                      follow_up_needed: "Follow Up Needed",
                    };
                    const total = data.summary.totalLeads;
                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

                    return (
                      <div key={status} className="flex items-center gap-3">
                        <span className="text-sm text-slate-700 w-32">
                          {labels[status] || status}
                        </span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-600 w-16 text-right">
                          {count} ({percentage}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Recent Activity</h3>
              {data.recentActions.length === 0 ? (
                <p className="text-sm text-slate-500">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {data.recentActions.map((action) => (
                    <div
                      key={action.id}
                      className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{action.leadName}</p>
                        <p className="text-sm text-slate-500">
                          {action.subject || "No subject"} • {action.organization || "No company"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {action.outcome && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            OUTCOME_LABELS[action.outcome]?.color || "bg-slate-100 text-slate-700"
                          }`}>
                            {OUTCOME_LABELS[action.outcome]?.label || action.outcome}
                          </span>
                        )}
                        {action.sentAt && (
                          <span className="text-xs text-slate-400">
                            {new Date(action.sentAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  highlight,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border p-5 ${
      highlight ? "border-teal-200 bg-teal-50/50" : "border-slate-200"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`p-2 rounded-lg ${highlight ? "bg-teal-100 text-teal-600" : "bg-slate-100 text-slate-500"}`}>
          {icon}
        </span>
      </div>
      <p className={`text-2xl font-bold ${highlight ? "text-teal-600" : "text-slate-900"}`}>
        {value}
      </p>
      <p className="text-sm text-slate-500">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}
