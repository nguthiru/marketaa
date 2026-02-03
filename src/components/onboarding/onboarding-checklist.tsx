"use client";

import { useState } from "react";
import Link from "next/link";
import { useOnboardingContext } from "./onboarding-provider";

interface ChecklistItem {
  key: string;
  label: string;
  link: string;
  completed: boolean;
}

export function OnboardingChecklist() {
  const { checklist, progress, dismissChecklist, isLoading, onboardingCompleted } = useOnboardingContext();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Don't show if loading, dismissed, or fully completed
  if (isLoading || !checklist || checklist.dismissedAt || onboardingCompleted) {
    return null;
  }

  const items: ChecklistItem[] = [
    {
      key: "emailVerified",
      label: "Verify your email",
      link: "/settings/account",
      completed: checklist.emailVerified,
    },
    {
      key: "gmailConnected",
      label: "Connect Gmail",
      link: "/settings/integrations",
      completed: checklist.gmailConnected,
    },
    {
      key: "firstProjectCreated",
      label: "Create first project",
      link: "/projects",
      completed: checklist.firstProjectCreated,
    },
    {
      key: "firstLeadAdded",
      label: "Add your first lead",
      link: "/projects",
      completed: checklist.firstLeadAdded,
    },
    {
      key: "firstSequenceCreated",
      label: "Create a sequence",
      link: "/sequences",
      completed: checklist.firstSequenceCreated,
    },
  ];

  const completedCount = items.filter((item) => item.completed).length;

  return (
    <div className="bg-sidebar-accent/50 rounded-xl p-4">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🚀</span>
          <span className="text-sm font-semibold text-sidebar-foreground">
            Get Started
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-sidebar-foreground/70">
            {completedCount}/{items.length}
          </span>
          <svg
            className={`w-4 h-4 text-sidebar-foreground/50 transition-transform ${
              isCollapsed ? "" : "rotate-180"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {!isCollapsed && (
        <>
          {/* Checklist Items */}
          <div className="mt-4 space-y-2">
            {items.map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.completed ? (
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-sidebar-foreground/30" />
                  )}
                  <span
                    className={`text-sm ${
                      item.completed
                        ? "text-sidebar-foreground/50 line-through"
                        : "text-sidebar-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
                {!item.completed && (
                  <Link
                    href={item.link}
                    className="text-sidebar-primary hover:text-sidebar-primary/80 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="h-2 bg-sidebar-foreground/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-sidebar-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-sidebar-foreground/50">{progress}% complete</span>
              <button
                onClick={dismissChecklist}
                className="text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground/70"
              >
                Dismiss
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
