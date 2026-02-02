"use client";

import { useState } from "react";

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
}

interface ConversationThreadProps {
  action: Action;
  leadName: string;
  onReply?: () => void;
  onMarkHandled?: (outcome: string) => void;
}

export function ConversationThread({ action, leadName, onReply, onMarkHandled }: ConversationThreadProps) {
  const [expanded, setExpanded] = useState(true);

  // Combine outbound (original email) and inbound (replies) messages
  const allMessages = [
    // Original sent email
    ...(action.sentAt
      ? [
          {
            id: `action-${action.id}`,
            direction: "outbound" as const,
            subject: action.subject,
            body: action.body,
            senderName: "You",
            timestamp: new Date(action.sentAt),
          },
        ]
      : []),
    // Replies
    ...action.emailMessages.map((msg) => ({
      id: msg.id,
      direction: msg.direction,
      subject: msg.subject,
      body: msg.body,
      senderName: msg.senderName || leadName,
      timestamp: new Date(msg.receivedAt || msg.createdAt),
    })),
  ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const hasReplies = action.emailMessages.some((m) => m.direction === "inbound");
  const latestReply = action.emailMessages
    .filter((m) => m.direction === "inbound")
    .sort((a, b) => new Date(b.receivedAt || b.createdAt).getTime() - new Date(a.receivedAt || a.createdAt).getTime())[0];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            hasReplies ? "bg-teal-100" : "bg-slate-100"
          }`}>
            <svg
              className={`w-5 h-5 ${hasReplies ? "text-teal-600" : "text-slate-500"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900">
                {action.subject || "No subject"}
              </span>
              {hasReplies && (
                <span className="px-2 py-0.5 text-xs font-medium bg-teal-100 text-teal-700 rounded-full">
                  Replied
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">
              {allMessages.length} message{allMessages.length !== 1 ? "s" : ""} ·
              Last activity {formatTimeAgo(allMessages[allMessages.length - 1]?.timestamp)}
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Thread */}
      {expanded && (
        <div className="border-t border-slate-100">
          <div className="divide-y divide-slate-100">
            {allMessages.map((msg, index) => (
              <div
                key={msg.id}
                className={`px-5 py-4 ${
                  msg.direction === "inbound" ? "bg-teal-50/30" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      msg.direction === "inbound"
                        ? "bg-teal-100 text-teal-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {msg.direction === "inbound" ? (
                      msg.senderName?.charAt(0).toUpperCase() || "?"
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {msg.direction === "inbound" ? msg.senderName : "You"}
                        </span>
                        {msg.direction === "inbound" && index === allMessages.length - 1 && (
                          <span className="px-1.5 py-0.5 text-xs bg-teal-500 text-white rounded">
                            NEW
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {formatDateTime(msg.timestamp)}
                      </span>
                    </div>
                    {msg.subject && index > 0 && (
                      <p className="text-sm text-slate-600 mb-1">
                        Re: {msg.subject.replace(/^Re:\s*/i, "")}
                      </p>
                    )}
                    <div className="text-sm text-slate-700 whitespace-pre-wrap">
                      {msg.body}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          {hasReplies && !action.feedback && (
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100">
              <p className="text-sm text-slate-600 mb-3">What happened next?</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onMarkHandled?.("meeting_booked")}
                  className="px-3 py-1.5 text-sm font-medium bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition-colors"
                >
                  Meeting Booked
                </button>
                <button
                  onClick={() => onMarkHandled?.("follow_up")}
                  className="px-3 py-1.5 text-sm font-medium bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
                >
                  Follow-up Needed
                </button>
                <button
                  onClick={() => onMarkHandled?.("not_interested")}
                  className="px-3 py-1.5 text-sm font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  Not Interested
                </button>
                {onReply && (
                  <button
                    onClick={onReply}
                    className="px-3 py-1.5 text-sm font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Reply
                  </button>
                )}
              </div>
            </div>
          )}

          {action.feedback && (
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  action.feedback.outcome === "meeting_booked"
                    ? "bg-teal-100 text-teal-700"
                    : action.feedback.outcome === "follow_up"
                    ? "bg-amber-100 text-amber-700"
                    : action.feedback.outcome === "not_interested"
                    ? "bg-red-100 text-red-700"
                    : "bg-slate-100 text-slate-600"
                }`}>
                  {formatOutcome(action.feedback.outcome)}
                </span>
                {action.feedback.notes && (
                  <span className="text-sm text-slate-500">{action.feedback.notes}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(date?: Date): string {
  if (!date) return "never";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function formatDateTime(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " " +
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatOutcome(outcome: string): string {
  const labels: Record<string, string> = {
    meeting_booked: "Meeting Booked",
    follow_up: "Follow-up Needed",
    not_interested: "Not Interested",
    no_reply: "No Reply",
    converted: "Converted",
  };
  return labels[outcome] || outcome;
}
