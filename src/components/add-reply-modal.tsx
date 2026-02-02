"use client";

import { useState } from "react";

interface AddReplyModalProps {
  actionId: string;
  leadName: string;
  onClose: () => void;
  onReplyAdded: () => void;
}

export function AddReplyModal({
  actionId,
  leadName,
  onClose,
  onReplyAdded,
}: AddReplyModalProps) {
  const [body, setBody] = useState("");
  const [senderName, setSenderName] = useState(leadName);
  const [receivedAt, setReceivedAt] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      setError("Reply content is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/actions/${actionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body.trim(),
          senderName: senderName.trim() || null,
          receivedAt: receivedAt ? new Date(receivedAt).toISOString() : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add reply");
      }

      onReplyAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add reply");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Add Email Reply</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-slate-600">
            Paste the reply you received from <strong>{leadName}</strong> to
            keep track of the conversation.
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Reply Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Paste the email reply here..."
              rows={8}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Sender Name
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Who replied?"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Received At
              </label>
              <input
                type="datetime-local"
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !body.trim()}
              className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add Reply"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
