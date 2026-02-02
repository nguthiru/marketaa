"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Feedback {
  outcome: string;
  notes: string | null;
  createdAt: string;
}

interface Plan {
  name: string;
  goal: string;
}

interface Action {
  id: string;
  type: string;
  status: string;
  subject: string | null;
  body: string;
  createdAt: string;
  plan: Plan;
  feedback: Feedback | null;
}

interface Suggestion {
  action: string;
  reasoning: string;
  priority: "high" | "medium" | "low";
  timing: string;
  talkingPoints?: string[];
}

interface LeadTimelineProps {
  leadId: string;
  projectId: string;
  onTakeAction: () => void;
}

const outcomeLabels: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  no_reply: {
    label: "No Reply",
    color: "text-stone-600",
    bg: "bg-stone-100",
    icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
  },
  follow_up: {
    label: "Follow-up Needed",
    color: "text-amber-700",
    bg: "bg-amber-100",
    icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  not_interested: {
    label: "Not Interested",
    color: "text-red-600",
    bg: "bg-red-100",
    icon: "M6 18L18 6M6 6l12 12",
  },
  meeting_booked: {
    label: "Meeting Booked",
    color: "text-teal-700",
    bg: "bg-teal-100",
    icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
};

const priorityColors: Record<string, string> = {
  high: "border-red-200 bg-red-50",
  medium: "border-amber-200 bg-amber-50",
  low: "border-stone-200 bg-stone-50",
};

export function LeadTimeline({ leadId, projectId, onTakeAction }: LeadTimelineProps) {
  const [actions, setActions] = useState<Action[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [leadId, projectId]);

  const fetchData = async () => {
    setLoading(true);
    setLoadingSuggestions(true);

    // Fetch actions
    try {
      const actionsRes = await fetch(`/api/projects/${projectId}/leads/${leadId}/actions`);
      if (actionsRes.ok) {
        const data = await actionsRes.json();
        setActions(data);
      }
    } catch (error) {
      console.error("Failed to fetch actions:", error);
    } finally {
      setLoading(false);
    }

    // Fetch suggestions (separately so it doesn't block)
    try {
      const suggestionsRes = await fetch(`/api/projects/${projectId}/leads/${leadId}/suggestions`);
      if (suggestionsRes.ok) {
        const data = await suggestionsRes.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-6">
      {/* AI Suggestions */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
          </svg>
          Suggested Next Steps
        </h3>

        {loadingSuggestions ? (
          <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)] py-4">
            <div className="w-4 h-4 rounded-full border-2 border-amber-200 border-t-amber-500 animate-spin" />
            Analyzing history...
          </div>
        ) : suggestions.length === 0 ? (
          <div className="bg-[var(--bg-secondary)] rounded-lg p-4 text-sm text-[var(--text-secondary)]">
            No suggestions yet. Add more context or record action outcomes to get personalized recommendations.
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className={`border rounded-lg p-4 ${priorityColors[suggestion.priority]} animate-slide-up`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="font-medium text-[var(--text-primary)]">
                    {suggestion.action}
                  </h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    suggestion.priority === "high"
                      ? "bg-red-200 text-red-800"
                      : suggestion.priority === "medium"
                      ? "bg-amber-200 text-amber-800"
                      : "bg-stone-200 text-stone-700"
                  }`}>
                    {suggestion.priority}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-2">
                  {suggestion.reasoning}
                </p>
                <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {suggestion.timing}
                  </span>
                </div>
                {suggestion.talkingPoints && suggestion.talkingPoints.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-current/10">
                    <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Talking Points:</p>
                    <ul className="text-xs text-[var(--text-secondary)] space-y-1">
                      {suggestion.talkingPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-[var(--text-tertiary)]">•</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}

            <Button variant="default" className="w-full" onClick={onTakeAction}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Take Action
            </Button>
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
          Activity History
        </h3>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)] py-4">
            <div className="w-4 h-4 rounded-full border-2 border-stone-200 border-t-stone-400 animate-spin" />
            Loading...
          </div>
        ) : actions.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">No outreach yet</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={onTakeAction}>
              Start outreach
            </Button>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-6 bottom-6 w-px bg-[var(--border-default)]" />

            <div className="space-y-4">
              {actions.map((action) => {
                const outcome = action.feedback?.outcome
                  ? outcomeLabels[action.feedback.outcome]
                  : null;
                const isExpanded = expandedAction === action.id;

                return (
                  <div key={action.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-2 top-2 w-4 h-4 rounded-full border-2 border-[var(--bg-primary)] ${
                        outcome
                          ? outcome.bg
                          : action.status === "ready"
                          ? "bg-blue-100"
                          : "bg-stone-100"
                      }`}
                    >
                      {outcome && (
                        <svg className={`w-full h-full p-0.5 ${outcome.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={outcome.icon} />
                        </svg>
                      )}
                    </div>

                    {/* Content */}
                    <Card
                      className="cursor-pointer"
                      onClick={() => setExpandedAction(isExpanded ? null : action.id)}
                    >
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-[var(--text-primary)]">
                                {action.plan.name}
                              </span>
                              {outcome && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${outcome.bg} ${outcome.color}`}>
                                  {outcome.label}
                                </span>
                              )}
                              {!outcome && action.status === "ready" && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                  Awaiting outcome
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[var(--text-tertiary)]">
                              {formatDate(action.createdAt)} · {action.type}
                            </p>
                          </div>
                          <svg
                            className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>

                        {/* Expanded content */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] animate-slide-up">
                            {action.subject && (
                              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
                                {action.subject}
                              </p>
                            )}
                            <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap line-clamp-4">
                              {action.body}
                            </p>
                            {action.feedback?.notes && (
                              <div className="mt-2 p-2 bg-[var(--bg-secondary)] rounded text-xs text-[var(--text-secondary)]">
                                <span className="font-medium">Notes:</span> {action.feedback.notes}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
