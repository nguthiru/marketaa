"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface TemplateVariant {
  id: string;
  name: string;
  subject: string;
  body: string;
  sendCount: number;
  replyCount: number;
  meetingCount: number;
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
  project: { id: string; name: string } | null;
}

export default function TemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"original" | string>("original");

  // Editable fields
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isShared, setIsShared] = useState(false);

  useEffect(() => {
    fetchTemplate();
  }, [id]);

  const fetchTemplate = async () => {
    try {
      const res = await fetch(`/api/templates/${id}`);
      if (!res.ok) {
        router.push("/templates");
        return;
      }
      const data = await res.json();
      setTemplate(data);
      setName(data.name);
      setSubject(data.subject);
      setBody(data.body);
      setIsShared(data.isShared);
    } catch (error) {
      console.error("Failed to fetch template:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeTab === "original") {
        // Save main template
        const res = await fetch(`/api/templates/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, subject, body, isShared }),
        });

        if (res.ok) {
          const updated = await res.json();
          setTemplate(updated);
        }
      } else {
        // Save variant
        const res = await fetch(`/api/templates/${id}/variants`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variantId: activeTab, subject, body }),
        });

        if (res.ok) {
          await fetchTemplate();
        }
      }
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddVariant = async () => {
    try {
      const res = await fetch(`/api/templates/${id}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: template?.subject || "",
          body: template?.body || "",
        }),
      });

      if (res.ok) {
        await fetchTemplate();
        const variant = await res.json();
        setActiveTab(variant.id);
        setSubject(variant.subject);
        setBody(variant.body);
      }
    } catch (error) {
      console.error("Failed to add variant:", error);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm("Delete this variant?")) return;

    try {
      await fetch(`/api/templates/${id}/variants?variantId=${variantId}`, {
        method: "DELETE",
      });

      setActiveTab("original");
      if (template) {
        setSubject(template.subject);
        setBody(template.body);
      }
      await fetchTemplate();
    } catch (error) {
      console.error("Failed to delete variant:", error);
    }
  };

  const handleTabChange = (tab: "original" | string) => {
    setActiveTab(tab);

    if (tab === "original" && template) {
      setSubject(template.subject);
      setBody(template.body);
    } else if (template) {
      const variant = template.variants.find((v) => v.id === tab);
      if (variant) {
        setSubject(variant.subject);
        setBody(variant.body);
      }
    }
  };

  if (loading || !template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const activeVariant = activeTab !== "original" ? template.variants.find((v) => v.id === activeTab) : null;
  const currentSendCount = activeVariant?.sendCount ?? template.sendCount;
  const currentReplyCount = activeVariant?.replyCount ?? template.replyCount;
  const replyRate = currentSendCount > 0 ? Math.round((currentReplyCount / currentSendCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/templates"
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Templates
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-2xl font-bold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0 w-full"
              placeholder="Template name"
            />
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
              <span>{currentSendCount} sent</span>
              <span>{replyRate}% reply rate</span>
              <span>{template.meetingCount} meetings</span>
            </div>
          </div>
          <Button variant="default" onClick={handleSave} loading={saving}>
            Save Changes
          </Button>
        </div>

        {/* Variant Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-2">
          <button
            onClick={() => handleTabChange("original")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === "original"
                ? "bg-white border border-b-0 border-slate-200 text-teal-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Original
            {template.sendCount > 0 && (
              <span className="ml-2 text-xs text-slate-400">
                ({Math.round((template.replyCount / template.sendCount) * 100)}%)
              </span>
            )}
          </button>

          {template.variants.map((variant) => (
            <div key={variant.id} className="relative">
              <button
                onClick={() => handleTabChange(variant.id)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === variant.id
                    ? "bg-white border border-b-0 border-slate-200 text-purple-600"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Variant {variant.name}
                {variant.sendCount > 0 && (
                  <span className="ml-2 text-xs text-slate-400">
                    ({Math.round((variant.replyCount / variant.sendCount) * 100)}%)
                  </span>
                )}
              </button>
              {activeTab === variant.id && (
                <button
                  onClick={() => handleDeleteVariant(variant.id)}
                  className="absolute -right-1 -top-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
              )}
            </div>
          ))}

          <button
            onClick={handleAddVariant}
            className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Variant
          </button>
        </div>

        {/* Editor */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          {/* A/B Test Info */}
          {template.variants.length > 0 && (
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2 text-purple-700 font-medium mb-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                A/B Testing Active
              </div>
              <p className="text-sm text-purple-600">
                {template.variants.length + 1} variants will be randomly selected when using this template.
                Track which performs best based on reply rates.
              </p>
            </div>
          )}

          {/* Subject Line */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
              placeholder="Email subject line"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 resize-none font-mono text-sm"
              placeholder="Write your email template..."
            />
            <p className="text-xs text-slate-500 mt-2">
              Available variables: {"{{name}}"}, {"{{email}}"}, {"{{company}}"}, {"{{role}}"}, {"{{notes}}"}
            </p>
          </div>

          {/* Settings */}
          {activeTab === "original" && (
            <div className="pt-4 border-t border-slate-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                  className="w-4 h-4 text-teal-500 border-slate-300 rounded focus:ring-teal-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-700">Share with team</span>
                  <p className="text-xs text-slate-500">
                    Allow other team members to use this template
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">Preview</h3>
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="font-medium text-slate-900 mb-2">
              {subject.replace(/\{\{(\w+)\}\}/g, (_, key) => `[${key}]`)}
            </p>
            <div className="text-sm text-slate-600 whitespace-pre-wrap">
              {body.replace(/\{\{(\w+)\}\}/g, (_, key) => `[${key}]`)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
