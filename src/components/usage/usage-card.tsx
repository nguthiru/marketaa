"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TrendingUpIcon } from "lucide-react";

interface LimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  limitLabel: string;
  percentUsed: number;
}

interface UsageData {
  plan: string;
  planName: string;
  projects: LimitResult;
  leads: LimitResult;
  emailsThisMonth: LimitResult;
  templates: LimitResult;
  sequences: LimitResult;
}

export function UsageCard() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const res = await fetch("/api/usage");
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      }
    } catch (error) {
      console.error("Failed to fetch usage:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-sidebar-accent/50 rounded-xl p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-sidebar-border rounded w-1/3"></div>
          <div className="h-2 bg-sidebar-border rounded"></div>
          <div className="h-2 bg-sidebar-border rounded"></div>
        </div>
      </div>
    );
  }

  if (!usage) return null;

  const renderProgressBar = (item: LimitResult, label: string) => {
    const isUnlimited = item.limitLabel === "unlimited";
    const isWarning = !isUnlimited && item.percentUsed >= 80;
    const isCritical = !isUnlimited && item.percentUsed >= 95;

    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-white">{label}</span>
          <span className={`font-medium ${isCritical ? "text-red-400" : isWarning ? "text-amber-400" : "text-white"}`}>
            {item.current} / {item.limitLabel}
          </span>
        </div>
        {!isUnlimited && (
          <div className="h-1.5 bg-sidebar-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isCritical ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-sidebar-primary"
                }`}
              style={{ width: `${Math.min(100, item.percentUsed)}%` }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-sidebar-accent/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="font-semibold text-white text-sm">Usage</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${usage.plan === "enterprise"
            ? "bg-purple-500/30 text-purple-200"
            : usage.plan === "pro"
              ? "bg-blue-500/30 text-blue-200"
              : usage.plan === "starter"
                ? "bg-sidebar-primary/30 text-sidebar-primary"
                : "bg-sidebar-border text-white"
          }`}>
          {usage.planName}
        </span>
      </div>

      <div className="space-y-3">
        {renderProgressBar(usage.projects, "Projects")}
        {renderProgressBar(usage.leads, "Leads")}
        {renderProgressBar(usage.emailsThisMonth, "Emails")}
      </div>

      {usage.plan !== "enterprise" && (
        <Link
          href="/settings/billing"
          className="flex items-center justify-center gap-2 mt-4 w-full py-2 px-3 text-sm font-medium text-sidebar-primary-foreground bg-sidebar-primary hover:bg-sidebar-primary/90 rounded-lg transition-colors"
        >
          <TrendingUpIcon className="w-4 h-4" />
          Upgrade Plan
        </Link>
      )}
    </div>
  );
}

export function UsageBar({ type }: { type: "projects" | "leads" | "emails" }) {
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    fetch("/api/usage")
      .then((res) => res.json())
      .then(setUsage)
      .catch(console.error);
  }, []);

  if (!usage) return null;

  const item = type === "projects" ? usage.projects : type === "leads" ? usage.leads : usage.emailsThisMonth;
  const isUnlimited = item.limitLabel === "unlimited";

  if (isUnlimited) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>
        {item.current}/{item.limit}
      </span>
      <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${item.percentUsed >= 95 ? "bg-destructive" : item.percentUsed >= 80 ? "bg-amber-500" : "bg-primary"
            }`}
          style={{ width: `${Math.min(100, item.percentUsed)}%` }}
        />
      </div>
    </div>
  );
}
