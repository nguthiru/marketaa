"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TemplateCard } from "@/components/templates/template-card";

interface TemplateVariant {
  id: string;
  name: string;
  sendCount: number;
  replyCount: number;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string | null;
  isShared: boolean;
  sendCount: number;
  replyCount: number;
  meetingCount: number;
  variants: TemplateVariant[];
  createdBy: { name: string | null; email: string };
  project: { name: string } | null;
}

const CATEGORIES = [
  { value: "all", label: "All Templates" },
  { value: "introduction", label: "Introduction" },
  { value: "follow_up", label: "Follow Up" },
  { value: "meeting_request", label: "Meeting Request" },
  { value: "custom", label: "Custom" },
];

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [category]);

  const fetchTemplates = async () => {
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);

      const res = await fetch(`/api/templates?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Templates</h1>
            <p className="text-slate-600 mt-1">
              Save and reuse your best-performing email templates
            </p>
          </div>
          <Button variant="default" onClick={() => setShowCreate(true)}>
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Template
          </Button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                category === cat.value
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">No templates yet</h3>
            <p className="text-slate-500 mb-4">
              Create your first template to speed up your outreach
            </p>
            <Button variant="default" onClick={() => setShowCreate(true)}>
              Create Template
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                {...template}
                onDelete={() => handleDelete(template.id)}
              />
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreate && (
          <CreateTemplateModal
            onClose={() => setShowCreate(false)}
            onSuccess={(template) => {
              setTemplates((prev) => [template, ...prev]);
              setShowCreate(false);
              router.push(`/templates/${template.id}`);
            }}
          />
        )}
      </div>
    </div>
  );
}

function CreateTemplateModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (template: Template) => void;
}) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("custom");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !subject.trim() || !body.trim()) {
      setError("All fields are required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, subject, body, category }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create template");
      }

      const template = await res.json();
      onSuccess(template);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Create Template</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Template Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Cold Outreach - Tech Companies"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
            >
              <option value="introduction">Introduction</option>
              <option value="follow_up">Follow Up</option>
              <option value="meeting_request">Meeting Request</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Quick question about {{company}}"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email Body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi {{name}},&#10;&#10;..."
              rows={6}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 resize-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              Use {"{{name}}"}, {"{{company}}"}, {"{{role}}"} as placeholders
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="default" loading={saving} className="flex-1">
              Create Template
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
