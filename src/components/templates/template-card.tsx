"use client";

import Link from "next/link";

interface TemplateVariant {
  id: string;
  name: string;
  sendCount: number;
  replyCount: number;
}

interface TemplateCardProps {
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
  project?: { name: string } | null;
  onDelete?: () => void;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  introduction: { label: "Introduction", color: "bg-blue-100 text-blue-700" },
  follow_up: { label: "Follow Up", color: "bg-amber-100 text-amber-700" },
  meeting_request: { label: "Meeting Request", color: "bg-purple-100 text-purple-700" },
  custom: { label: "Custom", color: "bg-slate-100 text-slate-700" },
};

export function TemplateCard({
  id,
  name,
  subject,
  body,
  category,
  isShared,
  sendCount,
  replyCount,
  meetingCount,
  variants,
  createdBy,
  project,
  onDelete,
}: TemplateCardProps) {
  const replyRate = sendCount > 0 ? Math.round((replyCount / sendCount) * 100) : 0;
  const categoryConfig = category ? CATEGORY_LABELS[category] : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-teal-300 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/templates/${id}`} className="font-semibold text-slate-900 hover:text-teal-600 truncate">
              {name}
            </Link>
            {categoryConfig && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${categoryConfig.color}`}>
                {categoryConfig.label}
              </span>
            )}
            {isShared && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                Shared
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 truncate">{subject}</p>
        </div>

        {onDelete && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onDelete();
            }}
            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Preview */}
      <div className="mb-4 p-3 bg-slate-50 rounded-lg">
        <p className="text-sm text-slate-600 line-clamp-2">{body}</p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-slate-600">{sendCount} sent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          <span className={replyRate > 20 ? "text-teal-600 font-medium" : "text-slate-600"}>
            {replyRate}% reply
          </span>
        </div>
        {meetingCount > 0 && (
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-teal-600 font-medium">{meetingCount} meetings</span>
          </div>
        )}
        {variants.length > 0 && (
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
              {variants.length + 1} variants
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>by {createdBy.name || createdBy.email}</span>
        {project && <span>{project.name}</span>}
      </div>
    </div>
  );
}
