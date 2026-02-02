"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId?: string;
  leadName?: string;
  leadEmail?: string;
  onEventCreated?: (event: CalendarEventResult) => void;
}

interface CalendarEventResult {
  id: string;
  link?: string;
  meetingLink?: string;
}

export function CalendarEventModal({
  isOpen,
  onClose,
  leadId,
  leadName,
  leadEmail,
  onEventCreated,
}: CalendarEventModalProps) {
  const [title, setTitle] = useState(leadName ? `Meeting with ${leadName}` : "");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("10:30");
  const [includeAttendee, setIncludeAttendee] = useState(!!leadEmail);
  const [includeMeetLink, setIncludeMeetLink] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const startDateTime = new Date(`${date}T${startTime}:00`);
      const endDateTime = new Date(`${date}T${endTime}:00`);

      if (endDateTime <= startDateTime) {
        setError("End time must be after start time");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
          attendees: includeAttendee && leadEmail ? [leadEmail] : undefined,
          meetingLink: includeMeetLink,
          leadId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create event");
      }

      const event = await response.json();
      onEventCreated?.(event);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Schedule Meeting</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Meeting Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="e.g., Discovery Call"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              placeholder="Meeting agenda..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            {leadEmail && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAttendee}
                  onChange={(e) => setIncludeAttendee(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-slate-700">
                  Invite {leadName || leadEmail}
                </span>
              </label>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeMeetLink}
                onChange={(e) => setIncludeMeetLink(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-slate-700">
                Add video meeting link (Google Meet / Teams)
              </span>
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Schedule
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
