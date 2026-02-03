"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { EmailThread } from "@/components/email-thread";
import { AddReplyModal } from "@/components/add-reply-modal";
import { CRMSyncStatus } from "@/components/crm/sync-status";
import { LogoIcon } from "@/components/logo";
import { PageTip } from "@/components/onboarding/page-tip";
import Link from "next/link";

interface LeadContext {
  id: string;
  key: string;
  value: string;
  source: string;
  confidence: string;
  dismissed: boolean;
}

interface ActionFeedback {
  id: string;
  outcome: string;
  notes: string | null;
  createdAt: string;
}

interface EmailMessage {
  id: string;
  direction: string;
  subject: string | null;
  body: string;
  senderName: string | null;
  receivedAt: string | null;
  resendId: string | null;
  createdAt: string;
}

interface Action {
  id: string;
  type: string;
  status: string;
  subject: string | null;
  body: string;
  reasoning: string | null;
  createdAt: string;
  sentAt: string | null;
  resendId: string | null;
  fromEmail: string | null;
  toEmail: string | null;
  feedback: ActionFeedback | null;
  plan: { name: string; goal: string };
  emailMessages: EmailMessage[];
}

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  organization: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  contextItems: LeadContext[];
  actions: Action[];
}

interface Project {
  id: string;
  name: string;
  plans: { id: string; name: string; goal: string }[];
}

interface Suggestion {
  action: string;
  reasoning: string;
  priority: "high" | "medium" | "low";
  timing: string;
}

const outcomeOptions = [
  { value: "no_reply", label: "No Reply", color: "text-slate-600 bg-slate-100" },
  { value: "replied", label: "Replied", color: "text-blue-600 bg-blue-50" },
  { value: "not_interested", label: "Not Interested", color: "text-red-600 bg-red-50" },
  { value: "follow_up", label: "Needs Follow-up", color: "text-amber-600 bg-amber-50" },
  { value: "meeting_booked", label: "Meeting Booked", color: "text-teal-600 bg-teal-50" },
  { value: "converted", label: "Converted", color: "text-purple-600 bg-purple-50" },
];

const statusOptions = [
  { value: "not_contacted", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "responded", label: "Responded" },
  { value: "follow_up_needed", label: "Follow-up Needed" },
];

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string; leadId: string }>;
}) {
  const { id: projectId, leadId } = use(params);
  const router = useRouter();

  const [lead, setLead] = useState<Lead | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [researching, setResearching] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [showAddContext, setShowAddContext] = useState(false);
  const [newContext, setNewContext] = useState({ key: "", value: "" });
  const [savingContext, setSavingContext] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [showEnrollSequence, setShowEnrollSequence] = useState(false);
  const [selectedContext, setSelectedContext] = useState<LeadContext | null>(null);

  useEffect(() => {
    fetchLead();
    fetchProject();
  }, [projectId, leadId]);

  useEffect(() => {
    if (lead) {
      setNotes(lead.notes || "");
    }
  }, [lead?.id]);

  const fetchLead = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/leads/${leadId}`);
      if (!res.ok) {
        router.push(`/projects/${projectId}`);
        return;
      }
      const data = await res.json();
      setLead(data);
    } catch (error) {
      console.error("Failed to fetch lead:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProject = async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) {
      const data = await res.json();
      setProject(data);
    }
  };

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/leads/${leadId}/suggestions`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const runResearch = async () => {
    setResearching(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/leads/${leadId}/research`, {
        method: "POST",
      });
      if (res.ok) {
        fetchLead();
      }
    } catch (error) {
      console.error("Research failed:", error);
    } finally {
      setResearching(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      await fetch(`/api/projects/${projectId}/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchLead();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      await fetch(`/api/projects/${projectId}/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      fetchLead();
      setEditingNotes(false);
    } catch (error) {
      console.error("Failed to save notes:", error);
    } finally {
      setSavingNotes(false);
    }
  };

  const addContext = async () => {
    if (!newContext.key || !newContext.value) return;
    setSavingContext(true);
    try {
      await fetch(`/api/projects/${projectId}/leads/${leadId}/context`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newContext, source: "user", confidence: "confirmed" }),
      });
      setNewContext({ key: "", value: "" });
      setShowAddContext(false);
      fetchLead();
    } catch (error) {
      console.error("Failed to add context:", error);
    } finally {
      setSavingContext(false);
    }
  };

  const setOutcome = async (actionId: string, outcome: string, notes?: string) => {
    try {
      await fetch(`/api/projects/${projectId}/leads/${leadId}/actions/${actionId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, notes }),
      });
      fetchLead();
      // Clear suggestions so user can refresh them with new data
      setSuggestions([]);
    } catch (error) {
      console.error("Failed to set outcome:", error);
    }
  };

  const deleteOutcome = async (actionId: string) => {
    try {
      await fetch(`/api/projects/${projectId}/leads/${leadId}/actions/${actionId}/feedback`, {
        method: "DELETE",
      });
      fetchLead();
      setSuggestions([]);
    } catch (error) {
      console.error("Failed to delete outcome:", error);
    }
  };

  if (loading || !lead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="w-8 h-8 rounded-full border-2 border-teal-200 border-t-teal-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 sticky top-0 z-10">
        <Link href="/projects">
          <LogoIcon className="w-8 h-8" />
        </Link>
        <nav className="flex items-center ml-4 gap-1 text-sm">
          <Link href="/projects" className="text-slate-500 hover:text-slate-700">Projects</Link>
          <span className="text-slate-300 mx-1">/</span>
          <Link href={`/projects/${projectId}`} className="text-slate-500 hover:text-slate-700">{project?.name || "..."}</Link>
          <span className="text-slate-300 mx-1">/</span>
          <span className="text-slate-900 font-medium">{lead.name}</span>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Lead Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center text-xl font-semibold text-teal-700">
                {lead.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">{lead.name}</h1>
                <p className="text-slate-500">
                  {[lead.role, lead.organization].filter(Boolean).join(" at ") || "No details"}
                </p>
                <div className="flex items-center gap-3 mt-2 text-sm">
                  {lead.email && <span className="text-slate-600">{lead.email}</span>}
                  {lead.phone && <span className="text-slate-600">{lead.phone}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={lead.status}
                onChange={(e) => updateStatus(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white"
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={runResearch}
                disabled={researching}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 disabled:opacity-50"
              >
                {researching ? (
                  <div className="w-4 h-4 rounded-full border-2 border-teal-300 border-t-teal-600 animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                )}
                {researching ? "Researching..." : "Research"}
              </button>
            </div>
          </div>
        </div>

        {/* Onboarding Tip */}
        <PageTip
          id={`lead-${leadId}`}
          title="Engage with Your Lead"
          description="This is your workspace for managing outreach to this specific lead."
          tips={[
            "Click 'Research' to gather AI insights about this lead",
            "Use 'Compose Outreach' to generate personalized messages",
            "Add context like pain points or interests to improve AI suggestions",
            "Record outcomes on sent emails to help AI learn what works",
          ]}
          accentColor="green"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
        />

        <div className="grid grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="col-span-2 space-y-6">
            {/* AI Suggestions */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-teal-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  <h2 className="font-semibold text-slate-900">AI Recommendations</h2>
                </div>
                <button
                  onClick={fetchSuggestions}
                  disabled={loadingSuggestions}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 disabled:opacity-50"
                >
                  {loadingSuggestions ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-teal-300 border-t-teal-600 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Get Suggestions
                    </>
                  )}
                </button>
              </div>

              {suggestions.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Click "Get Suggestions" to get AI recommendations based on this lead's history.
                </p>
              ) : (
                <div className="space-y-3">
                  {suggestions.map((s, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-lg border-l-4 ${
                        s.priority === "high" ? "bg-red-50 border-l-red-400" :
                        s.priority === "medium" ? "bg-amber-50 border-l-amber-400" :
                        "bg-slate-50 border-l-slate-300"
                      }`}
                    >
                      <p className="font-medium text-slate-900">{s.action}</p>
                      <p className="text-sm text-slate-600 mt-1">{s.reasoning}</p>
                      <p className="text-xs text-slate-400 mt-2">{s.timing}</p>
                    </div>
                  ))}
                </div>
              )}

              {project && project.plans.length > 0 && (
                <button
                  onClick={() => setShowComposer(true)}
                  className="mt-4 w-full py-2 text-sm font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100"
                >
                  + Compose New Outreach
                </button>
              )}
            </div>

            {/* Actions & Outcomes */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900 mb-4">Actions & Outcomes</h2>

              {lead.actions.length === 0 ? (
                <p className="text-sm text-slate-500">No outreach actions yet.</p>
              ) : (
                <div className="space-y-4">
                  {lead.actions.map((action) => (
                    <ActionCard
                      key={action.id}
                      action={action}
                      leadName={lead.name}
                      leadEmail={lead.email}
                      onSetOutcome={(outcome, notes) => setOutcome(action.id, outcome, notes)}
                      onDeleteOutcome={() => deleteOutcome(action.id)}
                      onRefresh={fetchLead}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-900">Notes</h2>
                {!editingNotes && (
                  <button
                    onClick={() => setEditingNotes(true)}
                    className="text-sm text-teal-600 hover:text-teal-700"
                  >
                    Edit
                  </button>
                )}
              </div>

              {editingNotes ? (
                <div className="space-y-3">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                    rows={4}
                    placeholder="Add notes about this lead..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingNotes(false); setNotes(lead.notes || ""); }}
                      className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveNotes}
                      disabled={savingNotes}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-600 disabled:opacity-50"
                    >
                      {savingNotes ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                  {lead.notes || "No notes yet."}
                </p>
              )}
            </div>
          </div>

          {/* Sidebar - Context */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-900 text-sm">Context</h2>
                <button
                  onClick={() => setShowAddContext(true)}
                  className="text-xs text-primary hover:text-primary/80"
                >
                  + Add
                </button>
              </div>

              {showAddContext && (
                <div className="mb-3 p-2 bg-slate-50 rounded-lg space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newContext.key}
                      onChange={(e) => setNewContext({ ...newContext, key: e.target.value })}
                      placeholder="Key"
                      className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      onClick={() => { setShowAddContext(false); setNewContext({ key: "", value: "" }); }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <textarea
                    value={newContext.value}
                    onChange={(e) => setNewContext({ ...newContext, value: e.target.value })}
                    placeholder="Value..."
                    rows={2}
                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={addContext}
                    disabled={savingContext || !newContext.key || !newContext.value}
                    className="w-full px-2 py-1 text-xs font-medium text-white bg-primary rounded hover:bg-primary/90 disabled:opacity-50"
                  >
                    {savingContext ? "..." : "Add"}
                  </button>
                </div>
              )}

              {lead.contextItems.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">
                  No context yet
                </p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {lead.contextItems.filter(c => !c.dismissed).map((ctx) => (
                    <button
                      key={ctx.id}
                      onClick={() => setSelectedContext(ctx)}
                      className="w-full group flex items-start gap-2 p-1.5 rounded hover:bg-slate-50 text-xs text-left transition-colors"
                    >
                      <span className="font-medium text-slate-600 min-w-[80px] truncate">
                        {ctx.key.replace(/_/g, " ")}
                      </span>
                      <span className="flex-1 text-slate-500 truncate">
                        {ctx.value}
                      </span>
                      <span className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1 ${
                        ctx.source === "user" ? "bg-blue-400" :
                        ctx.confidence === "confirmed" ? "bg-teal-400" :
                        "bg-slate-300"
                      }`} />
                    </button>
                  ))}
                </div>
              )}

              {/* Context Detail Popup */}
              {selectedContext && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedContext(null)}>
                  <div className="absolute inset-0 bg-black/20" />
                  <div
                    className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-4 animate-scale-in"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {selectedContext.key.replace(/_/g, " ")}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          selectedContext.source === "user" ? "bg-blue-100 text-blue-700" :
                          selectedContext.confidence === "confirmed" ? "bg-teal-100 text-teal-700" :
                          selectedContext.confidence === "likely" ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {selectedContext.source === "user" ? "manual" : selectedContext.confidence}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedContext(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed mb-3">
                      {selectedContext.value}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100">
                      <span>Source: {selectedContext.source}</span>
                      <span>Confidence: {selectedContext.confidence}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sequences */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900">Sequences</h2>
                <button
                  onClick={() => setShowEnrollSequence(true)}
                  className="text-sm text-teal-600 hover:text-teal-700"
                >
                  + Enroll
                </button>
              </div>
              <p className="text-sm text-slate-500">
                Enroll this lead in an automated email sequence.
              </p>
            </div>

            {/* CRM Sync */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <CRMSyncStatus leadId={leadId} />
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900 mb-4">Activity</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Actions</span>
                  <span className="font-medium text-slate-900">{lead.actions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">With Outcomes</span>
                  <span className="font-medium text-slate-900">
                    {lead.actions.filter(a => a.feedback).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Context Items</span>
                  <span className="font-medium text-slate-900">{lead.contextItems.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Composer Modal */}
      {showComposer && project && (
        <ComposerModal
          lead={lead}
          projectId={projectId}
          plans={project.plans}
          onClose={() => setShowComposer(false)}
          onCreated={() => { fetchLead(); setShowComposer(false); }}
        />
      )}

      {/* Enroll Sequence Modal */}
      {showEnrollSequence && (
        <EnrollSequenceModal
          projectId={projectId}
          leadId={leadId}
          leadName={lead.name}
          onClose={() => setShowEnrollSequence(false)}
          onEnrolled={() => { setShowEnrollSequence(false); }}
        />
      )}
    </div>
  );
}

// Action Card Component
function ActionCard({
  action,
  leadName,
  leadEmail,
  onSetOutcome,
  onDeleteOutcome,
  onRefresh,
}: {
  action: Action;
  leadName: string;
  leadEmail: string | null;
  onSetOutcome: (outcome: string, notes?: string) => void;
  onDeleteOutcome: () => void;
  onRefresh: () => void;
}) {
  const [showOutcomeForm, setShowOutcomeForm] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState(action.feedback?.outcome || "");
  const [outcomeNotes, setOutcomeNotes] = useState(action.feedback?.notes || "");
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sending, setSending] = useState(false);
  const [showAddReply, setShowAddReply] = useState(false);
  const [sendError, setSendError] = useState("");

  const handleSendEmail = async () => {
    if (!leadEmail) {
      setSendError("Lead does not have an email address");
      return;
    }
    setSending(true);
    setSendError("");
    try {
      const res = await fetch(`/api/actions/${action.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send email");
      }
      onRefresh();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleReplyAdded = () => {
    setShowAddReply(false);
    onRefresh();
  };

  const handleSaveOutcome = () => {
    if (selectedOutcome) {
      onSetOutcome(selectedOutcome, outcomeNotes);
      setShowOutcomeForm(false);
    }
  };

  const handleEditOutcome = () => {
    setSelectedOutcome(action.feedback?.outcome || "");
    setOutcomeNotes(action.feedback?.notes || "");
    setShowOutcomeForm(true);
  };

  const handleDeleteOutcome = async () => {
    setDeleting(true);
    await onDeleteOutcome();
    setDeleting(false);
  };

  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
              {action.type}
            </span>
            <span className="text-xs text-slate-400">
              {new Date(action.createdAt).toLocaleDateString()}
            </span>
            <span className="text-xs text-slate-400">via {action.plan.name}</span>
          </div>
          {action.subject && (
            <p className="font-medium text-slate-900 text-sm">{action.subject}</p>
          )}
        </div>

        {action.feedback ? (
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-1 rounded ${
              outcomeOptions.find(o => o.value === action.feedback?.outcome)?.color || "bg-slate-100"
            }`}>
              {outcomeOptions.find(o => o.value === action.feedback?.outcome)?.label || action.feedback.outcome}
            </span>
            <button
              onClick={handleEditOutcome}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
              title="Edit outcome"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={handleDeleteOutcome}
              disabled={deleting}
              className="p-1 text-slate-400 hover:text-red-500 rounded disabled:opacity-50"
              title="Delete outcome"
            >
              {deleting ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 border-t-slate-500 animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowOutcomeForm(true)}
            className="text-xs font-medium text-teal-600 hover:text-teal-700"
          >
            + Set Outcome
          </button>
        )}
      </div>

      {/* Send button for ready emails */}
      {action.type === "email" && !action.sentAt && action.status === "ready" && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          {sendError && (
            <p className="text-xs text-red-600 mb-2">{sendError}</p>
          )}
          <button
            onClick={handleSendEmail}
            disabled={sending || !leadEmail}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-600 disabled:opacity-50"
          >
            {sending ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send Email
              </>
            )}
          </button>
          {!leadEmail && (
            <p className="text-xs text-amber-600 mt-1">Lead has no email address</p>
          )}
        </div>
      )}

      {/* Sent status indicator */}
      {action.sentAt && (
        <div className="mt-2 flex items-center gap-1 text-xs text-teal-600">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
          Sent {new Date(action.sentAt).toLocaleString()}
        </div>
      )}

      {/* Expandable content */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-slate-400 hover:text-slate-600 mt-2"
      >
        {expanded ? "Hide details" : "Show details"}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-4">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Draft Content</p>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{action.body}</p>
          </div>
          {action.reasoning && (
            <p className="text-xs text-slate-400 italic">AI reasoning: {action.reasoning}</p>
          )}

          {/* Email Thread */}
          {action.type === "email" && (
            <EmailThread
              messages={action.emailMessages || []}
              actionSentAt={action.sentAt}
              leadName={leadName}
              onAddReply={() => setShowAddReply(true)}
            />
          )}
        </div>
      )}

      {/* Add Reply Modal */}
      {showAddReply && (
        <AddReplyModal
          actionId={action.id}
          leadName={leadName}
          onClose={() => setShowAddReply(false)}
          onReplyAdded={handleReplyAdded}
        />
      )}

      {/* Outcome form */}
      {showOutcomeForm && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
          <div className="flex flex-wrap gap-2">
            {outcomeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSelectedOutcome(opt.value)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  selectedOutcome === opt.value
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <textarea
            value={outcomeNotes}
            onChange={(e) => setOutcomeNotes(e.target.value)}
            placeholder="Notes on what happened..."
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowOutcomeForm(false)}
              className="px-3 py-1.5 text-xs text-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveOutcome}
              disabled={!selectedOutcome}
              className="px-3 py-1.5 text-xs font-medium text-white bg-teal-500 rounded-lg disabled:opacity-50"
            >
              {action.feedback ? "Update Outcome" : "Save Outcome"}
            </button>
          </div>
        </div>
      )}

      {/* Show outcome notes if exists */}
      {action.feedback?.notes && !showOutcomeForm && (
        <p className="text-xs text-slate-500 mt-2 italic">"{action.feedback.notes}"</p>
      )}
    </div>
  );
}

// Simple Composer Modal
function ComposerModal({
  lead,
  projectId,
  plans,
  onClose,
  onCreated,
}: {
  lead: Lead;
  projectId: string;
  plans: { id: string; name: string; goal: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [selectedPlan, setSelectedPlan] = useState(plans[0]?.id || "");
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<{ subject?: string; body: string; reasoning?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const generateDraft = async () => {
    if (!selectedPlan) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/leads/${lead.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan }),
      });
      if (res.ok) {
        const data = await res.json();
        setDraft(data);
      }
    } catch (error) {
      console.error("Generation failed:", error);
    } finally {
      setGenerating(false);
    }
  };

  const saveDraft = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await fetch(`/api/projects/${projectId}/leads/${lead.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan,
          type: "email",
          subject: draft.subject,
          body: draft.body,
          reasoning: draft.reasoning,
        }),
      });
      onCreated();
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Compose Outreach</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Plan</label>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              {plans.map(plan => (
                <option key={plan.id} value={plan.id}>{plan.name} - {plan.goal}</option>
              ))}
            </select>
          </div>

          {!draft ? (
            <button
              onClick={generateDraft}
              disabled={generating || !selectedPlan}
              className="w-full py-3 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate Draft"}
            </button>
          ) : (
            <>
              {draft.subject && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={draft.subject}
                    onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Body</label>
                <textarea
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
                />
              </div>
              {draft.reasoning && (
                <p className="text-xs text-slate-500 italic">AI: {draft.reasoning}</p>
              )}
            </>
          )}
        </div>

        {draft && (
          <div className="px-5 py-4 border-t border-slate-200 flex gap-3">
            <button
              onClick={() => setDraft(null)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
            >
              Regenerate
            </button>
            <button
              onClick={saveDraft}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Action"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Enroll in Sequence Modal
function EnrollSequenceModal({
  projectId,
  leadId,
  leadName,
  onClose,
  onEnrolled,
}: {
  projectId: string;
  leadId: string;
  leadName: string;
  onClose: () => void;
  onEnrolled: () => void;
}) {
  const [sequences, setSequences] = useState<{ id: string; name: string; status: string; _count: { steps: number } }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSequence, setSelectedSequence] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSequences();
  }, []);

  const fetchSequences = async () => {
    try {
      const res = await fetch(`/api/sequences?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        // Only show active sequences with at least one step
        const activeSequences = (data.sequences || []).filter(
          (s: { status: string; _count: { steps: number } }) =>
            s.status === "active" && s._count?.steps > 0
        );
        setSequences(activeSequences);
        if (activeSequences.length > 0) {
          setSelectedSequence(activeSequences[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch sequences:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!selectedSequence) return;
    setEnrolling(true);
    setError("");

    try {
      const res = await fetch(`/api/sequences/${selectedSequence}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to enroll");
      }

      onEnrolled();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enroll");
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Enroll in Sequence</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
            </div>
          ) : sequences.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-slate-600 mb-2">No active sequences available</p>
              <p className="text-sm text-slate-500">
                Create and activate a sequence first, then you can enroll leads.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Enroll <strong>{leadName}</strong> in an automated email sequence:
              </p>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Select Sequence
                </label>
                <select
                  value={selectedSequence}
                  onChange={(e) => setSelectedSequence(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                >
                  {sequences.map((seq) => (
                    <option key={seq.id} value={seq.id}>
                      {seq.name} ({seq._count?.steps || 0} steps)
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEnroll}
                  disabled={enrolling || !selectedSequence}
                  className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 disabled:opacity-50"
                >
                  {enrolling ? "Enrolling..." : "Enroll"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
