"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
interface LeadContext {
  id: string;
  key: string;
  value: string;
  source: string;
  confidence: "confirmed" | "likely" | "best_guess";
  dismissed: boolean;
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
  _count: { actions: number };
  hasReplies?: boolean;
  unreadReplies?: number;
}

interface Plan {
  id: string;
  name: string;
  goal: string;
  channels: string;
  tone: string;
}

interface ProjectContextItem {
  id: string;
  key: string;
  value: string;
  source: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  leads: Lead[];
  plans: Plan[];
  context: ProjectContextItem[];
  _count: { leads: number; plans: number };
}

interface Suggestion {
  action: string;
  reasoning: string;
  priority: "high" | "medium" | "low";
  timing: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  not_contacted: { label: "New", color: "text-slate-600", bg: "bg-slate-100" },
  contacted: { label: "Contacted", color: "text-blue-600", bg: "bg-blue-50" },
  responded: { label: "Responded", color: "text-teal-600", bg: "bg-teal-50" },
  follow_up_needed: { label: "Follow up", color: "text-amber-600", bg: "bg-amber-50" },
};

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) {
        router.push("/projects");
        return;
      }
      const data = await res.json();
      setProject(data);
    } catch (error) {
      console.error("Failed to fetch project:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = project?.leads.filter(lead => {
    if (statusFilter !== "all" && lead.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.name.toLowerCase().includes(query) ||
      lead.email?.toLowerCase().includes(query) ||
      lead.organization?.toLowerCase().includes(query)
    );
  }) || [];

  if (loading || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-teal-200 border-t-teal-500 animate-spin" />
          <p className="text-sm text-slate-500">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Top Navigation */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 sticky top-0 z-10">
        <Link href="/projects" className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
          <span className="text-white font-bold text-sm">M</span>
        </Link>

        <nav className="flex items-center ml-6 gap-1">
          <Link href="/projects" className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100">
            Projects
          </Link>
          <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
          <span className="px-3 py-1.5 text-sm font-medium text-slate-900">
            {project.name}
          </span>
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100"
          >
            Configure
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{project.name}</h1>
            {project.description && (
              <p className="text-slate-500 mt-1">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/sequences?projectId=${id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sequences
            </Link>
            <Link
              href={`/projects/${id}/import`}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import CSV
            </Link>
            <button
              onClick={() => setShowAddLead(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Lead
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
            {["all", "not_contacted", "contacted", "responded"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {status === "all" ? "All" : status === "not_contacted" ? "New" : status === "contacted" ? "Contacted" : "Responded"}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <span className="text-sm text-slate-500">{filteredLeads.length} leads</span>
        </div>

        {/* Leads Table */}
        {filteredLeads.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <p className="text-slate-600 mb-4">No leads yet</p>
            <button
              onClick={() => setShowAddLead(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600"
            >
              Add your first lead
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Role</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Organization</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Actions</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((lead) => {
                  const status = statusConfig[lead.status] || statusConfig.not_contacted;
                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/projects/${id}/leads/${lead.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center text-xs font-semibold text-teal-700">
                              {lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            {lead.hasReplies && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-teal-500 rounded-full flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-900 text-sm">{lead.name}</p>
                              {lead.unreadReplies && lead.unreadReplies > 0 && (
                                <span className="px-1.5 py-0.5 text-xs font-medium bg-teal-100 text-teal-700 rounded">
                                  {lead.unreadReplies} new
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">{lead.email || "No email"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{lead.role || "—"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{lead.organization || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${status.color} ${status.bg}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{lead._count.actions}</td>
                      <td className="px-4 py-3">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Add Lead Modal */}
      {showAddLead && (
        <AddLeadModal
          projectId={project.id}
          onClose={() => setShowAddLead(false)}
          onSuccess={(newLead) => {
            router.push(`/projects/${id}/leads/${newLead.id}`);
          }}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          project={project}
          onClose={() => setShowSettings(false)}
          onUpdate={fetchProject}
        />
      )}
    </div>
  );
}

// ============================================
// ADD LEAD MODAL
// ============================================

function AddLeadModal({
  projectId,
  onClose,
  onSuccess,
}: {
  projectId: string;
  onClose: () => void;
  onSuccess: (lead: Lead) => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    organization: "",
    notes: "",
  });
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const lead = await res.json();
        onSuccess(lead);
      }
    } catch (error) {
      console.error("Failed to add lead:", error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Add Lead</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Jane Doe"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="jane@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="+1 555 0123"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Budget Analyst"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Organization</label>
              <input
                type="text"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Dept of Finance"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              placeholder="Any context to help personalize outreach..."
              rows={3}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 disabled:opacity-50"
            >
              {creating ? "Adding..." : "Add Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// SETTINGS MODAL
// ============================================

function SettingsModal({
  project,
  onClose,
  onUpdate,
}: {
  project: Project;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"general" | "plans" | "context">("general");
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [saving, setSaving] = useState(false);

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: "", goal: "", tone: "neutral" });
  const [creatingPlan, setCreatingPlan] = useState(false);

  const [showContextForm, setShowContextForm] = useState(false);
  const [newContext, setNewContext] = useState({ key: "", value: "" });
  const [creatingContext, setCreatingContext] = useState(false);

  const handleSaveGeneral = async () => {
    setSaving(true);
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      onUpdate();
    } catch (error) {
      console.error("Failed to update:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingPlan(true);
    try {
      await fetch(`/api/projects/${project.id}/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newPlan, channels: '["email"]' }),
      });
      setShowPlanForm(false);
      setNewPlan({ name: "", goal: "", tone: "" });
      onUpdate();
    } catch (error) {
      console.error("Failed to create plan:", error);
    } finally {
      setCreatingPlan(false);
    }
  };

  const handleCreateContext = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingContext(true);
    try {
      await fetch(`/api/projects/${project.id}/context`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContext),
      });
      setShowContextForm(false);
      setNewContext({ key: "", value: "" });
      onUpdate();
    } catch (error) {
      console.error("Failed to create context:", error);
    } finally {
      setCreatingContext(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this project and all its data?")) return;
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    router.push("/projects");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Configure Project</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-slate-200 px-5">
          {(["general", "plans", "context"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? "border-teal-500 text-teal-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "general" && (
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                />
              </div>
              <button
                onClick={handleSaveGeneral}
                disabled={saving}
                className="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <div className="pt-6 mt-6 border-t border-slate-200">
                <h3 className="text-sm font-medium text-red-600 mb-2">Danger Zone</h3>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100"
                >
                  Delete Project
                </button>
              </div>
            </div>
          )}

          {activeTab === "plans" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">Plans define how AI generates outreach.</p>
                <button
                  onClick={() => setShowPlanForm(true)}
                  className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600"
                >
                  Add Plan
                </button>
              </div>

              {showPlanForm && (
                <form onSubmit={handleCreatePlan} className="p-4 bg-slate-50 rounded-lg space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Plan Name</label>
                    <input
                      type="text"
                      value={newPlan.name}
                      onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g., Initial Outreach"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Goal</label>
                    <input
                      type="text"
                      value={newPlan.goal}
                      onChange={(e) => setNewPlan({ ...newPlan, goal: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g., Book a demo, Get feedback, Schedule follow-up"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tone</label>
                    <input
                      type="text"
                      value={newPlan.tone}
                      onChange={(e) => setNewPlan({ ...newPlan, tone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g., Professional, Friendly, Formal"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowPlanForm(false)} className="px-3 py-1.5 text-slate-600 text-sm hover:bg-slate-100 rounded-lg">
                      Cancel
                    </button>
                    <button type="submit" disabled={creatingPlan} className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 disabled:opacity-50">
                      {creatingPlan ? "Creating..." : "Create"}
                    </button>
                  </div>
                </form>
              )}

              {project.plans.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No plans yet.</p>
              ) : (
                <div className="space-y-2">
                  {project.plans.map((plan) => (
                    <div key={plan.id} className="p-3 bg-slate-50 rounded-lg">
                      <p className="font-medium text-slate-900 text-sm">{plan.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {plan.goal.replace(/_/g, " ")} · {plan.tone}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "context" && (
            <div className="space-y-4">
              {/* Compact Add Form */}
              {showContextForm ? (
                <form onSubmit={handleCreateContext} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex gap-2 mb-2">
                    <select
                      value={newContext.key}
                      onChange={(e) => setNewContext({ ...newContext, key: e.target.value })}
                      className="flex-1 px-2 py-1.5 border border-slate-200 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select key...</option>
                      <option value="company_name">company_name</option>
                      <option value="what_we_do">what_we_do</option>
                      <option value="sender_name">sender_name</option>
                      <option value="case_study">case_study</option>
                      <option value="unique_feature">unique_feature</option>
                      <option value="target_audience">target_audience</option>
                    </select>
                    <input
                      type="text"
                      value={newContext.key}
                      onChange={(e) => setNewContext({ ...newContext, key: e.target.value })}
                      className="flex-1 px-2 py-1.5 border border-slate-200 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Or custom key"
                    />
                  </div>
                  <textarea
                    value={newContext.value}
                    onChange={(e) => setNewContext({ ...newContext, value: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary resize-none mb-2"
                    placeholder="Value..."
                    rows={2}
                    required
                  />
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowContextForm(false)} className="px-2 py-1 text-slate-500 text-sm hover:text-slate-700">
                      Cancel
                    </button>
                    <button type="submit" disabled={creatingContext || !newContext.key} className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                      {creatingContext ? "..." : "Add"}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowContextForm(true)}
                  className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-sm text-slate-500 hover:border-primary hover:text-primary transition-colors"
                >
                  + Add context
                </button>
              )}

              {/* Context Table */}
              {project.context.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">
                  <p>No context yet</p>
                  <p className="text-xs mt-1">Add company_name, what_we_do, sender_name for better emails</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-slate-600 w-1/3">Key</th>
                        <th className="text-left px-3 py-2 font-medium text-slate-600">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {project.context.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono text-xs text-slate-700">{item.key}</td>
                          <td className="px-3 py-2 text-slate-600 truncate max-w-[200px]" title={item.value}>
                            {item.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
