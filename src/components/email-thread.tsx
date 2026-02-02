"use client";

import { useState } from "react";

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

interface EmailThreadProps {
  messages: EmailMessage[];
  actionSentAt: string | null;
  leadName: string;
  onAddReply: () => void;
}

export function EmailThread({
  messages,
  actionSentAt,
  leadName,
  onAddReply,
}: EmailThreadProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set(messages.length > 0 ? [messages[messages.length - 1].id] : [])
  );

  const toggleExpand = (id: string) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (!actionSentAt && messages.length === 0) {
    return (
      <div className="text-sm text-slate-500 italic py-2">
        Email not sent yet. Send the email to start tracking the conversation.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-700">Email Thread</h4>
        {actionSentAt && (
          <button
            onClick={onAddReply}
            className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
            Add Reply
          </button>
        )}
      </div>

      <div className="space-y-2">
        {messages.map((msg) => {
          const isOutbound = msg.direction === "outbound";
          const isExpanded = expandedMessages.has(msg.id);
          const timestamp = msg.receivedAt || msg.createdAt;

          return (
            <div
              key={msg.id}
              className={`rounded-lg border ${
                isOutbound
                  ? "border-teal-200 bg-teal-50/50"
                  : "border-slate-200 bg-slate-50/50"
              }`}
            >
              <button
                onClick={() => toggleExpand(msg.id)}
                className="w-full px-3 py-2 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  {isOutbound ? (
                    <svg
                      className="w-4 h-4 text-teal-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4 text-slate-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                      />
                    </svg>
                  )}
                  <span className="text-sm font-medium text-slate-900">
                    {isOutbound ? "You" : msg.senderName || leadName}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(timestamp).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 border-t border-slate-200/50">
                  {msg.subject && (
                    <p className="text-xs font-medium text-slate-600 mt-2 mb-1">
                      Subject: {msg.subject}
                    </p>
                  )}
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed mt-2">
                    {msg.body}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {messages.length === 0 && actionSentAt && (
        <p className="text-sm text-slate-500 italic">
          No replies yet. Click "Add Reply" when you receive a response.
        </p>
      )}
    </div>
  );
}
