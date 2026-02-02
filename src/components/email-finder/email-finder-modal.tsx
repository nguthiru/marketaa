"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface EmailFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  initialCompany?: string;
  onEmailFound?: (email: string) => void;
}

interface EmailFinderResult {
  email: string | null;
  confidence: "high" | "medium" | "low";
  source: string;
  alternatives?: string[];
}

const CONFIDENCE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: "High Confidence", color: "text-teal-700", bg: "bg-teal-100" },
  medium: { label: "Medium Confidence", color: "text-amber-700", bg: "bg-amber-100" },
  low: { label: "Low Confidence", color: "text-slate-700", bg: "bg-slate-100" },
};

export function EmailFinderModal({
  isOpen,
  onClose,
  initialName = "",
  initialCompany = "",
  onEmailFound,
}: EmailFinderModalProps) {
  const [name, setName] = useState(initialName);
  const [company, setCompany] = useState(initialCompany);
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EmailFinderResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/email-finder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company, domain: domain || undefined }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to find email");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to find email");
    } finally {
      setLoading(false);
    }
  };

  const handleUseEmail = (email: string) => {
    onEmailFound?.(email);
    onClose();
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="font-semibold text-slate-900">Email Finder</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          {!result ? (
            <form onSubmit={handleSearch} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="e.g., John Smith"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Company <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="e.g., Acme Inc"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Domain <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="e.g., acme.com"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Adding the domain improves accuracy
                </p>
              </div>

              <Button
                type="submit"
                variant="default"
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Searching...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Find Email
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              {result.email ? (
                <>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-500">Found Email</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${CONFIDENCE_CONFIG[result.confidence].bg} ${CONFIDENCE_CONFIG[result.confidence].color}`}>
                        {CONFIDENCE_CONFIG[result.confidence].label}
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-slate-900">{result.email}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Source: {result.source.replace("_", " ")}
                    </p>
                  </div>

                  {result.alternatives && result.alternatives.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">Alternative patterns:</p>
                      <div className="space-y-1">
                        {result.alternatives.slice(0, 4).map((alt, i) => (
                          <button
                            key={i}
                            onClick={() => handleUseEmail(alt)}
                            className="w-full text-left px-3 py-2 text-sm text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            {alt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={handleReset}
                      className="flex-1"
                    >
                      Search Again
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => handleUseEmail(result.email!)}
                      className="flex-1"
                    >
                      Use This Email
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-slate-600 mb-1">No email found</p>
                  <p className="text-sm text-slate-500 mb-4">
                    Try adding the company domain for better results
                  </p>
                  <Button variant="secondary" onClick={handleReset}>
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
