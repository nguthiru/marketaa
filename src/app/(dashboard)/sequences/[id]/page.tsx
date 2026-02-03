"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface SequenceStep {
  id: string;
  order: number;
  type: string;
  subject: string | null;
  body: string | null;
  templateId: string | null;
  delayDays: number | null;
  delayHours: number | null;
  condition: string | null;
}

interface Enrollment {
  id: string;
  status: string;
  currentStep: number;
  enrolledAt: string;
  lead: {
    id: string;
    name: string;
    email: string | null;
    organization: string | null;
  };
}

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface SequenceStats {
  totalEnrolled: number;
  active: number;
  completed: number;
  paused: number;
  exited: number;
  emailsSent: number;
  openRate: number;
  replyRate: number;
}

interface Sequence {
  id: string;
  name: string;
  description: string | null;
  status: string;
  triggerType: string;
  steps: SequenceStep[];
  enrollments: Enrollment[];
  project: { id: string; name: string };
  _count: { enrollments: number };
}

export default function SequenceBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"builder" | "enrollments" | "analytics">("builder");
  const [showAddStep, setShowAddStep] = useState(false);
  const [stats, setStats] = useState<SequenceStats | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    fetchSequence();
    fetchTemplates();
  }, [id]);

  const fetchSequence = async () => {
    try {
      const res = await fetch(`/api/sequences/${id}`);
      if (!res.ok) {
        router.push("/sequences");
        return;
      }
      const data = await res.json();
      setSequence(data);
      // Fetch stats after we have the sequence
      fetchStats();
    } catch (error) {
      console.error("Failed to fetch sequence:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/sequences/${id}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/sequences/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSequence((prev) => prev ? { ...prev, status: updated.status } : null);
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddStep = async (stepData: Partial<SequenceStep>) => {
    try {
      const res = await fetch(`/api/sequences/${id}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stepData),
      });

      if (res.ok) {
        await fetchSequence();
        setShowAddStep(false);
      }
    } catch (error) {
      console.error("Failed to add step:", error);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm("Delete this step?")) return;

    try {
      await fetch(`/api/sequences/${id}/steps?stepId=${stepId}`, {
        method: "DELETE",
      });
      await fetchSequence();
    } catch (error) {
      console.error("Failed to delete step:", error);
    }
  };

  const handleUnenroll = async (leadId: string) => {
    if (!confirm("Remove this lead from the sequence?")) return;

    try {
      await fetch(`/api/sequences/${id}/enroll?leadId=${leadId}`, {
        method: "DELETE",
      });
      await fetchSequence();
      fetchStats();
    } catch (error) {
      console.error("Failed to unenroll lead:", error);
    }
  };

  if (loading || !sequence) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const canActivate = sequence.steps.length > 0 && sequence.steps.some((s) => s.type === "email");

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href={`/sequences?projectId=${sequence.project.id}`}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Sequences
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{sequence.name}</h1>
            {sequence.description && (
              <p className="text-slate-500 mt-1">{sequence.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-xs px-2 py-1 rounded-full ${
                sequence.status === "active"
                  ? "bg-teal-100 text-teal-700"
                  : sequence.status === "paused"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-600"
              }`}>
                {sequence.status.charAt(0).toUpperCase() + sequence.status.slice(1)}
              </span>
              <span className="text-sm text-slate-500">
                {sequence._count.enrollments} enrolled
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {sequence.status === "draft" && canActivate && (
              <Button
                variant="default"
                onClick={() => handleUpdateStatus("active")}
                loading={saving}
              >
                Activate
              </Button>
            )}
            {sequence.status === "active" && (
              <Button
                variant="secondary"
                onClick={() => handleUpdateStatus("paused")}
                loading={saving}
              >
                Pause
              </Button>
            )}
            {sequence.status === "paused" && (
              <Button
                variant="default"
                onClick={() => handleUpdateStatus("active")}
                loading={saving}
              >
                Resume
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab("builder")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "builder"
                ? "border-teal-500 text-teal-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Sequence Builder
          </button>
          <button
            onClick={() => setActiveTab("enrollments")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "enrollments"
                ? "border-teal-500 text-teal-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Enrollments ({sequence._count.enrollments})
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "analytics"
                ? "border-teal-500 text-teal-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Analytics
          </button>
        </div>

        {/* Content */}
        {activeTab === "builder" && (
          <div className="space-y-4">
            {/* Steps */}
            {sequence.steps.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">Add your first step</h3>
                <p className="text-slate-500 mb-4">
                  Build your sequence with emails, delays, and conditions
                </p>
                <Button variant="default" onClick={() => setShowAddStep(true)}>
                  Add Step
                </Button>
              </div>
            ) : (
              <>
                {sequence.steps.map((step, index) => (
                  <div key={step.id} className="relative">
                    {/* Connector line */}
                    {index < sequence.steps.length - 1 && (
                      <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-slate-200 -mb-4"></div>
                    )}

                    <StepCard
                      step={step}
                      stepNumber={index + 1}
                      onDelete={() => handleDeleteStep(step.id)}
                    />
                  </div>
                ))}

                <button
                  onClick={() => setShowAddStep(true)}
                  className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-teal-400 hover:text-teal-600 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Step
                </button>
              </>
            )}
          </div>
        )}

        {activeTab === "enrollments" && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {sequence.enrollments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500">No leads enrolled yet</p>
                <p className="text-sm text-slate-400 mt-1">
                  Enroll leads from the project page
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Lead
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Current Step
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Enrolled
                    </th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sequence.enrollments.map((enrollment) => (
                    <tr key={enrollment.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{enrollment.lead.name}</p>
                          <p className="text-xs text-slate-500">{enrollment.lead.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          enrollment.status === "active"
                            ? "bg-teal-100 text-teal-700"
                            : enrollment.status === "completed"
                            ? "bg-blue-100 text-blue-700"
                            : enrollment.status === "paused"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {enrollment.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        Step {enrollment.currentStep} of {sequence.steps.length}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {new Date(enrollment.enrolledAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {enrollment.status !== "exited" && enrollment.status !== "completed" && (
                          <button
                            onClick={() => handleUnenroll(enrollment.lead.id)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                            title="Remove from sequence"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Total Enrolled</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.totalEnrolled || 0}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Active</p>
                <p className="text-2xl font-bold text-teal-600">{stats?.active || 0}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Completed</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.completed || 0}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Paused (replied)</p>
                <p className="text-2xl font-bold text-amber-600">{stats?.paused || 0}</p>
              </div>
            </div>

            {/* Email Stats */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Email Performance</h3>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-slate-500">Emails Sent</p>
                  <p className="text-xl font-bold text-slate-900">{stats?.emailsSent || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Open Rate</p>
                  <p className="text-xl font-bold text-slate-900">{stats?.openRate || 0}%</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Reply Rate</p>
                  <p className="text-xl font-bold text-slate-900">{stats?.replyRate || 0}%</p>
                </div>
              </div>
            </div>

            {/* Funnel */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Enrollment Funnel</h3>
              <div className="space-y-3">
                <FunnelBar label="Enrolled" value={stats?.totalEnrolled || 0} max={stats?.totalEnrolled || 1} color="bg-slate-400" />
                <FunnelBar label="Active" value={stats?.active || 0} max={stats?.totalEnrolled || 1} color="bg-teal-500" />
                <FunnelBar label="Replied (Paused)" value={stats?.paused || 0} max={stats?.totalEnrolled || 1} color="bg-amber-500" />
                <FunnelBar label="Completed" value={stats?.completed || 0} max={stats?.totalEnrolled || 1} color="bg-blue-500" />
              </div>
            </div>
          </div>
        )}

        {/* Add Step Modal */}
        {showAddStep && (
          <AddStepModal
            onClose={() => setShowAddStep(false)}
            onAdd={handleAddStep}
            templates={templates}
          />
        )}
      </div>
    </div>
  );
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-slate-600 w-32">{label}</span>
      <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-sm font-medium text-slate-900 w-12 text-right">{value}</span>
    </div>
  );
}

function StepCard({
  step,
  stepNumber,
  onDelete,
}: {
  step: SequenceStep;
  stepNumber: number;
  onDelete: () => void;
}) {
  const getStepIcon = () => {
    switch (step.type) {
      case "email":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case "wait":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "condition":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
    }
  };

  const getStepColor = () => {
    switch (step.type) {
      case "email":
        return "bg-blue-500";
      case "wait":
        return "bg-amber-500";
      case "condition":
        return "bg-purple-500";
      default:
        return "bg-slate-500";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 pl-16 relative">
      {/* Step Number */}
      <div className={`absolute left-4 top-4 w-8 h-8 rounded-full flex items-center justify-center text-white ${getStepColor()}`}>
        {getStepIcon()}
      </div>

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-500">Step {stepNumber}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              step.type === "email"
                ? "bg-blue-100 text-blue-700"
                : step.type === "wait"
                ? "bg-amber-100 text-amber-700"
                : "bg-purple-100 text-purple-700"
            }`}>
              {step.type.charAt(0).toUpperCase() + step.type.slice(1)}
            </span>
          </div>

          {step.type === "email" && (
            <div>
              <p className="font-medium text-slate-900">
                {step.subject || "No subject"}
              </p>
              {step.body && (
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                  {step.body}
                </p>
              )}
            </div>
          )}

          {step.type === "wait" && (
            <p className="font-medium text-slate-900">
              Wait {step.delayDays || 0} days, {step.delayHours || 0} hours
            </p>
          )}

          {step.type === "condition" && (
            <div>
              <p className="font-medium text-slate-900">Check condition</p>
              {step.condition && (
                <p className="text-sm text-slate-500 mt-1">
                  {(() => {
                    try {
                      const cond = JSON.parse(step.condition);
                      return `If ${cond.field} ${cond.operator.replace("_", " ")} "${cond.value}"`;
                    } catch {
                      return "Invalid condition";
                    }
                  })()}
                </p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={onDelete}
          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function AddStepModal({
  onClose,
  onAdd,
  templates,
}: {
  onClose: () => void;
  onAdd: (step: Partial<SequenceStep>) => void;
  templates: Template[];
}) {
  const [type, setType] = useState<"email" | "wait" | "condition">("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [delayDays, setDelayDays] = useState(1);
  const [delayHours, setDelayHours] = useState(0);
  const [conditionField, setConditionField] = useState("status");
  const [conditionOperator, setConditionOperator] = useState("equals");
  const [conditionValue, setConditionValue] = useState("");
  const [adding, setAdding] = useState(false);

  const handleTemplateSelect = (id: string) => {
    setTemplateId(id);
    if (id) {
      const template = templates.find((t) => t.id === id);
      if (template) {
        setSubject(template.subject);
        setBody(template.body);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);

    if (type === "email") {
      await onAdd({ type, subject, body, templateId: templateId || null });
    } else if (type === "wait") {
      await onAdd({ type, delayDays, delayHours });
    } else if (type === "condition") {
      await onAdd({
        type,
        condition: JSON.stringify({ field: conditionField, operator: conditionOperator, value: conditionValue }),
      });
    }

    setAdding(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="font-semibold text-slate-900">Add Step</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Step Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Step Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType("email")}
                className={`py-3 px-2 rounded-lg border-2 transition-colors ${
                  type === "email"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <svg className="w-5 h-5 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-medium">Email</span>
              </button>
              <button
                type="button"
                onClick={() => setType("wait")}
                className={`py-3 px-2 rounded-lg border-2 transition-colors ${
                  type === "wait"
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <svg className="w-5 h-5 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-medium">Wait</span>
              </button>
              <button
                type="button"
                onClick={() => setType("condition")}
                className={`py-3 px-2 rounded-lg border-2 transition-colors ${
                  type === "condition"
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <svg className="w-5 h-5 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-medium">Condition</span>
              </button>
            </div>
          </div>

          {/* Email Fields */}
          {type === "email" && (
            <>
              {templates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Use Template (optional)
                  </label>
                  <select
                    value={templateId}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Write custom email</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject line"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Body
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Use {{name}}, {{email}}, {{company}}, {{role}} for personalization"
                  rows={5}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 resize-none"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">
                  Variables: {"{{name}}"}, {"{{email}}"}, {"{{company}}"}, {"{{role}}"}
                </p>
              </div>
            </>
          )}

          {/* Wait Fields */}
          {type === "wait" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Days
                </label>
                <input
                  type="number"
                  value={delayDays}
                  onChange={(e) => setDelayDays(parseInt(e.target.value) || 0)}
                  min={0}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Hours
                </label>
                <input
                  type="number"
                  value={delayHours}
                  onChange={(e) => setDelayHours(parseInt(e.target.value) || 0)}
                  min={0}
                  max={23}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          )}

          {/* Condition Fields */}
          {type === "condition" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Continue sequence only if condition is met. Lead will be exited if condition fails.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Field
                </label>
                <select
                  value={conditionField}
                  onChange={(e) => setConditionField(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                >
                  <option value="status">Lead Status</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Operator
                </label>
                <select
                  value={conditionOperator}
                  onChange={(e) => setConditionOperator(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                >
                  <option value="equals">Equals</option>
                  <option value="not_equals">Not Equals</option>
                  <option value="contains">Contains</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Value
                </label>
                {conditionField === "status" ? (
                  <select
                    value={conditionValue}
                    onChange={(e) => setConditionValue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                    required
                  >
                    <option value="">Select status...</option>
                    <option value="not_contacted">Not Contacted</option>
                    <option value="contacted">Contacted</option>
                    <option value="responded">Responded</option>
                    <option value="follow_up_needed">Follow Up Needed</option>
                    <option value="not_interested">Not Interested</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={conditionValue}
                    onChange={(e) => setConditionValue(e.target.value)}
                    placeholder="Value to compare"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                    required
                  />
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="default" loading={adding} className="flex-1">
              Add Step
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
