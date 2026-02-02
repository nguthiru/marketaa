"use client";

import { useState, useEffect } from "react";
import { ConversationThread } from "./conversation-thread";

interface EmailMessage {
  id: string;
  direction: "outbound" | "inbound";
  subject: string | null;
  body: string;
  senderName: string | null;
  receivedAt: string | null;
  createdAt: string;
}

interface Action {
  id: string;
  type: string;
  status: string;
  subject: string | null;
  body: string;
  sentAt: string | null;
  toEmail: string | null;
  fromEmail: string | null;
  emailMessages: EmailMessage[];
  feedback: {
    outcome: string;
    notes: string | null;
  } | null;
  plan: {
    id: string;
    name: string;
  };
}

interface Lead {
  id: string;
  name: string;
  email: string | null;
  organization: string | null;
  status: string;
}

interface LeadConversationModalProps {
  projectId: string;
  leadId: string;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: () => void;
}

export function LeadConversationModal({
  projectId,
  leadId,
  isOpen,
  onClose,
  onStatusChange,
}: LeadConversationModalProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [conversations, setConversations] = useState<Action[]>([]);
  const [stats, setStats] = useState({ totalEmails: 0, totalReplies: 0, hasUnreadReplies: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && leadId) {
      fetchConversations();
    }
  }, [isOpen, leadId]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/leads/${leadId}/conversations`);
      if (res.ok) {
        const data = await res.json();
        setLead(data.lead);
        setConversations(data.conversations);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkHandled = async (actionId: string, outcome: string) => {
    try {
      await fetch(`/api/actions/${actionId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome }),
      });
      fetchConversations();
      onStatusChange?.();
    } catch (error) {
      console.error("Failed to record feedback:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-50 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-40 mb-1"></div>
                <div className="h-4 bg-slate-200 rounded w-32"></div>
              </div>
            ) : lead ? (
              <>
                <h2 className="text-lg font-semibold text-slate-900">{lead.name}</h2>
                <p className="text-sm text-slate-500">
                  {lead.email || "No email"} {lead.organization && `· ${lead.organization}`}
                </p>
              </>
            ) : (
              <p className="text-slate-500">Lead not found</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats */}
        {!loading && lead && (
          <div className="bg-white px-6 py-3 border-b border-slate-200 flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span className="text-slate-600">{stats.totalEmails} sent</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
              <span className="text-slate-600">{stats.totalReplies} replies</span>
            </div>
            {stats.hasUnreadReplies && (
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                Needs attention
              </span>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h3 className="font-medium text-slate-900 mb-1">No conversations yet</h3>
              <p className="text-sm text-slate-500">
                Send an email to this lead to start a conversation
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {conversations.map((action) => (
                <ConversationThread
                  key={action.id}
                  action={action}
                  leadName={lead?.name || "Unknown"}
                  onMarkHandled={(outcome) => handleMarkHandled(action.id, outcome)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
