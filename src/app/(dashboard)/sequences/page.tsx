"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageTip } from "@/components/onboarding/page-tip";

interface SequenceStep {
  id: string;
  order: number;
  type: string;
  subject: string | null;
  delayDays: number | null;
  delayHours: number | null;
}

interface Project {
  id: string;
  name: string;
}

interface Sequence {
  id: string;
  name: string;
  description: string | null;
  status: string;
  triggerType: string;
  project: Project;
  steps: SequenceStep[];
  _count: { enrollments: number };
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-slate-600", bg: "bg-slate-100" },
  active: { label: "Active", color: "text-teal-600", bg: "bg-teal-100" },
  paused: { label: "Paused", color: "text-amber-600", bg: "bg-amber-100" },
  completed: { label: "Completed", color: "text-blue-600", bg: "bg-blue-100" },
};

export default function SequencesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterProjectId = searchParams.get("projectId");

  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>(filterProjectId || "all");

  useEffect(() => {
    fetchSequences();
  }, []);

  useEffect(() => {
    if (filterProjectId) {
      setSelectedProjectFilter(filterProjectId);
    }
  }, [filterProjectId]);

  const fetchSequences = async () => {
    try {
      const res = await fetch("/api/sequences");
      if (res.ok) {
        const data = await res.json();
        setSequences(data.sequences || []);
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error("Failed to fetch sequences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (name: string, description: string, projectId: string) => {
    try {
      const res = await fetch("/api/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, name, description }),
      });

      if (res.ok) {
        const sequence = await res.json();
        router.push(`/sequences/${sequence.id}`);
      }
    } catch (error) {
      console.error("Failed to create sequence:", error);
    }
  };

  const filteredSequences = selectedProjectFilter === "all"
    ? sequences
    : sequences.filter((s) => s.project.id === selectedProjectFilter);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">No Projects Yet</h2>
          <p className="text-slate-500 mb-4">
            Create a project first, then you can build sequences for it
          </p>
          <Link href="/projects">
            <Button variant="default">Go to Projects</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Sequences</h1>
            <p className="text-slate-600 mt-1">
              Automate multi-step email campaigns with time delays
            </p>
          </div>
          <Button variant="default" onClick={() => setShowCreate(true)}>
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Sequence
          </Button>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Project:</label>
            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="all">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            {selectedProjectFilter !== "all" && (
              <button
                onClick={() => setSelectedProjectFilter("all")}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>

        <PageTip
          id="sequences"
          title="Automate Your Outreach"
          description="Sequences let you send automated follow-up emails over time. Set it up once and let Marketaa handle the rest."
          tips={[
            "Create multi-step email sequences with custom delays",
            "Sequences pause automatically when a lead replies",
            "Use templates or AI to generate email content",
            "Track open rates, replies, and conversions",
          ]}
          accentColor="purple"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
        />

        {/* Sequences List */}
        {filteredSequences.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">
              {selectedProjectFilter === "all" ? "No sequences yet" : "No sequences in this project"}
            </h3>
            <p className="text-slate-500 mb-4">
              Create automated email sequences to nurture your leads
            </p>
            <Button variant="default" onClick={() => setShowCreate(true)}>
              Create Your First Sequence
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSequences.map((sequence) => {
              const status = STATUS_CONFIG[sequence.status] || STATUS_CONFIG.draft;

              return (
                <Link
                  key={sequence.id}
                  href={`/sequences/${sequence.id}`}
                  className="block bg-white rounded-xl border border-slate-200 p-5 hover:border-teal-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">{sequence.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                      </div>

                      {/* Project Badge */}
                      <div className="mb-2">
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {sequence.project.name}
                        </span>
                      </div>

                      {sequence.description && (
                        <p className="text-sm text-slate-500 mb-3">{sequence.description}</p>
                      )}

                      {/* Steps Preview */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {sequence.steps.slice(0, 5).map((step) => (
                          <div
                            key={step.id}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                              step.type === "email"
                                ? "bg-blue-50 text-blue-700"
                                : step.type === "wait"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-50 text-slate-700"
                            }`}
                          >
                            {step.type === "email" && (
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            )}
                            {step.type === "wait" && (
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                            <span>
                              {step.type === "email"
                                ? "Email"
                                : step.type === "wait"
                                ? `${step.delayDays || 0}d ${step.delayHours || 0}h`
                                : step.type}
                            </span>
                          </div>
                        ))}
                        {sequence.steps.length > 5 && (
                          <span className="text-xs text-slate-500">
                            +{sequence.steps.length - 5} more
                          </span>
                        )}
                        {sequence.steps.length === 0 && (
                          <span className="text-xs text-slate-400 italic">No steps yet</span>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>{sequence.steps.length} steps</span>
                        <span>{sequence._count.enrollments} enrolled</span>
                      </div>
                    </div>

                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Create Modal */}
        {showCreate && (
          <CreateSequenceModal
            projects={projects}
            defaultProjectId={selectedProjectFilter !== "all" ? selectedProjectFilter : projects[0]?.id}
            onClose={() => setShowCreate(false)}
            onCreate={handleCreate}
          />
        )}
      </div>
    </div>
  );
}

function CreateSequenceModal({
  projects,
  defaultProjectId,
  onClose,
  onCreate,
}: {
  projects: Project[];
  defaultProjectId?: string;
  onClose: () => void;
  onCreate: (name: string, description: string, projectId: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId || projects[0]?.id || "");
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !projectId) return;

    setCreating(true);
    await onCreate(name.trim(), description.trim(), projectId);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Create Sequence</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Project
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Sequence Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Welcome Series"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this sequence for?"
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="default" loading={creating} className="flex-1">
              Create Sequence
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
