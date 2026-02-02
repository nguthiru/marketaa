"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

interface Plan {
  id: string;
  name: string;
  goal: string;
  tone: string;
}

interface Feedback {
  id: string;
  outcome: string;
  notes: string | null;
}

interface Action {
  id: string;
  type: string;
  status: string;
  subject: string | null;
  body: string;
  reasoning: string | null;
  userEdited: boolean;
  createdAt: string;
  plan: Plan;
  feedback: Feedback | null;
}

interface Lead {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  organization: string | null;
}

interface ActionComposerProps {
  lead: Lead;
  projectId: string;
  plans: Plan[];
  onClose: () => void;
  onActionCreated?: () => void;
}

const outcomeOptions = [
  { value: "no_reply", label: "No Reply", icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636", color: "text-stone-600 bg-stone-100" },
  { value: "follow_up", label: "Follow-up Needed", icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-amber-700 bg-amber-100" },
  { value: "not_interested", label: "Not Interested", icon: "M6 18L18 6M6 6l12 12", color: "text-red-600 bg-red-100" },
  { value: "meeting_booked", label: "Meeting Booked!", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-teal-700 bg-teal-100" },
];

export function ActionComposer({
  lead,
  projectId,
  plans,
  onClose,
  onActionCreated,
}: ActionComposerProps) {
  const [step, setStep] = useState<"select" | "generating" | "review" | "feedback">("select");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [existingActions, setExistingActions] = useState<Action[]>([]);
  const [loadingActions, setLoadingActions] = useState(true);

  // Load existing actions for this lead
  useEffect(() => {
    fetchActions();
  }, [lead.id]);

  const fetchActions = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/leads/${lead.id}/actions`);
      if (res.ok) {
        const data = await res.json();
        setExistingActions(data);
      }
    } catch (error) {
      console.error("Failed to fetch actions:", error);
    } finally {
      setLoadingActions(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedPlan) return;

    setStep("generating");

    try {
      const res = await fetch(`/api/projects/${projectId}/leads/${lead.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          type: "email",
        }),
      });

      if (res.ok) {
        const newAction = await res.json();
        setAction(newAction);
        setEditedSubject(newAction.subject || "");
        setEditedBody(newAction.body);
        setStep("review");
        fetchActions();
      }
    } catch (error) {
      console.error("Failed to generate action:", error);
      setStep("select");
    }
  };

  const handleSave = async () => {
    if (!action) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/actions/${action.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: editedSubject,
          body: editedBody,
          status: "ready",
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setAction(updated);
        onActionCreated?.();
      }
    } catch (error) {
      console.error("Failed to save action:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    const content = action?.type === "email"
      ? `Subject: ${editedSubject}\n\n${editedBody}`
      : editedBody;

    await navigator.clipboard.writeText(content);
  };

  const handleRecordFeedback = async (outcome: string, notes?: string) => {
    if (!action) return;

    try {
      await fetch(`/api/actions/${action.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, notes }),
      });

      fetchActions();
      onActionCreated?.();
      setStep("select");
      setAction(null);
      setSelectedPlan(null);
    } catch (error) {
      console.error("Failed to record feedback:", error);
    }
  };

  const parseReasoning = (reasoning: string | null) => {
    if (!reasoning) return null;
    try {
      return JSON.parse(reasoning);
    } catch {
      return { explanation: reasoning };
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--bg-ink)]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center text-sm font-semibold text-stone-600">
              {lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="font-medium text-[var(--text-primary)]">{lead.name}</h2>
              <p className="text-sm text-[var(--text-tertiary)]">
                {[lead.role, lead.organization].filter(Boolean).join(" at ") || "No details"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step: Select Plan */}
          {step === "select" && (
            <div className="space-y-6">
              {/* Previous actions */}
              {!loadingActions && existingActions.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
                    Previous Outreach
                  </h3>
                  <div className="space-y-2">
                    {existingActions.slice(0, 3).map((act) => (
                      <div
                        key={act.id}
                        className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            act.feedback?.outcome === "meeting_booked"
                              ? "bg-teal-100"
                              : act.feedback?.outcome === "follow_up"
                              ? "bg-amber-100"
                              : "bg-stone-100"
                          }`}>
                            <svg className={`w-4 h-4 ${
                              act.feedback?.outcome === "meeting_booked"
                                ? "text-teal-600"
                                : act.feedback?.outcome === "follow_up"
                                ? "text-amber-600"
                                : "text-stone-500"
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {act.plan.name}
                            </p>
                            <p className="text-xs text-[var(--text-tertiary)]">
                              {act.feedback
                                ? outcomeOptions.find(o => o.value === act.feedback?.outcome)?.label
                                : act.status === "ready" ? "Ready to send" : "Draft"
                              }
                            </p>
                          </div>
                        </div>
                        {!act.feedback && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAction(act);
                              setEditedSubject(act.subject || "");
                              setEditedBody(act.body);
                              setStep("feedback");
                            }}
                          >
                            Record outcome
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Select plan */}
              <div>
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
                  {existingActions.length > 0 ? "New Outreach" : "Select a Plan"}
                </h3>
                {plans.length === 0 ? (
                  <div className="text-center py-8 bg-[var(--bg-secondary)] rounded-lg">
                    <p className="text-[var(--text-tertiary)] mb-2">No plans available</p>
                    <p className="text-sm text-[var(--text-tertiary)]">
                      Create a plan in the Plans tab first
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {plans.map((plan) => (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan)}
                        className={`
                          w-full text-left p-4 rounded-lg border-2 transition-all
                          ${selectedPlan?.id === plan.id
                            ? "border-[var(--accent-ai)] bg-amber-50/50"
                            : "border-[var(--border-default)] hover:border-[var(--text-tertiary)] bg-[var(--bg-elevated)]"
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-[var(--text-primary)]">
                              {plan.name}
                            </h4>
                            <p className="text-sm text-[var(--text-tertiary)]">
                              {plan.goal.replace(/_/g, " ")} · {plan.tone}
                            </p>
                          </div>
                          {selectedPlan?.id === plan.id && (
                            <div className="w-6 h-6 rounded-full bg-[var(--accent-ai)] flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step: Generating */}
          {step === "generating" && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-amber-600 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-editorial text-[var(--text-primary)] mb-2">
                Crafting your message...
              </h3>
              <p className="text-[var(--text-secondary)] text-center max-w-sm">
                AI is analyzing context and generating a personalized {selectedPlan?.goal.replace(/_/g, " ")} message
              </p>
            </div>
          )}

          {/* Step: Review & Edit */}
          {step === "review" && action && (
            <div className="space-y-6">
              {/* Reasoning toggle */}
              {action.reasoning && (
                <div>
                  <button
                    onClick={() => setShowReasoning(!showReasoning)}
                    className="flex items-center gap-2 text-sm text-amber-700 hover:text-amber-800"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    {showReasoning ? "Hide" : "Show"} AI reasoning
                    <svg className={`w-4 h-4 transition-transform ${showReasoning ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showReasoning && (
                    <div className="mt-3 p-4 bg-amber-50/50 border border-amber-200/50 rounded-lg text-sm text-amber-800 animate-slide-up">
                      {parseReasoning(action.reasoning)?.explanation || parseReasoning(action.reasoning)?.note || "No reasoning available"}
                    </div>
                  )}
                </div>
              )}

              {/* Subject (for emails) */}
              {action.type === "email" && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-[var(--bg-elevated)] border-2 border-transparent ring-1 ring-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ai)]"
                  />
                </div>
              )}

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  {action.type === "email" ? "Email Body" : "Call Brief"}
                </label>
                <Textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  rows={12}
                  className="w-full"
                />
              </div>

              {/* Copy indicator */}
              <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                Edit freely - your changes are saved
              </div>
            </div>
          )}

          {/* Step: Feedback */}
          {step === "feedback" && action && (
            <FeedbackStep
              action={action}
              onRecordFeedback={handleRecordFeedback}
              onBack={() => setStep("review")}
            />
          )}
        </div>

        {/* Footer */}
        {(step === "select" || step === "review") && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50">
            {step === "select" ? (
              <>
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="default"
                  disabled={!selectedPlan}
                  onClick={handleGenerate}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  Generate Draft
                </Button>
              </>
            ) : (
              <>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setStep("select")}>
                    Back
                  </Button>
                  <Button variant="secondary" onClick={handleCopy}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                    Copy
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={handleSave} loading={saving}>
                    Save Draft
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => {
                      handleSave();
                      setStep("feedback");
                    }}
                  >
                    Mark as Sent
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

// ============================================
// FEEDBACK STEP COMPONENT
// ============================================

function FeedbackStep({
  action,
  onRecordFeedback,
  onBack,
}: {
  action: Action;
  onRecordFeedback: (outcome: string, notes?: string) => void;
  onBack: () => void;
}) {
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedOutcome) return;
    setSubmitting(true);
    await onRecordFeedback(selectedOutcome, notes || undefined);
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-editorial text-[var(--text-primary)] mb-2">
          How did it go?
        </h3>
        <p className="text-[var(--text-secondary)]">
          Recording outcomes helps AI improve future suggestions
        </p>
      </div>

      {/* Outcome selection */}
      <div className="grid grid-cols-2 gap-3">
        {outcomeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setSelectedOutcome(option.value)}
            className={`
              p-4 rounded-lg border-2 transition-all text-left
              ${selectedOutcome === option.value
                ? "border-[var(--accent-ai)] bg-amber-50/50"
                : "border-[var(--border-default)] hover:border-[var(--text-tertiary)]"
              }
            `}
          >
            <div className={`w-10 h-10 rounded-lg ${option.color} flex items-center justify-center mb-3`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={option.icon} />
              </svg>
            </div>
            <p className="font-medium text-[var(--text-primary)]">{option.label}</p>
          </button>
        ))}
      </div>

      {/* Notes field - shows after selecting outcome */}
      {selectedOutcome && (
        <div className="animate-slide-up space-y-3">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--text-secondary)]">
              What happened? (optional but helpful)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                selectedOutcome === "meeting_booked"
                  ? "e.g., Scheduled for next Tuesday, interested in pricing..."
                  : selectedOutcome === "follow_up"
                  ? "e.g., Asked to check back in 2 weeks after budget review..."
                  : selectedOutcome === "not_interested"
                  ? "e.g., Already has a solution, wrong timing..."
                  : "e.g., No response after 5 days..."
              }
              rows={3}
              className="w-full px-4 py-3 rounded-lg bg-[var(--bg-elevated)] border-2 border-transparent ring-1 ring-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ai)] resize-none"
            />
            <p className="text-xs text-[var(--text-tertiary)]">
              These notes help AI understand what works and suggest better next steps
            </p>
          </div>

          <Button
            variant="default"
            className="w-full"
            onClick={handleSubmit}
            loading={submitting}
          >
            Record Outcome
          </Button>
        </div>
      )}

      <Button variant="ghost" className="w-full" onClick={onBack}>
        Back to draft
      </Button>
    </div>
  );
}
