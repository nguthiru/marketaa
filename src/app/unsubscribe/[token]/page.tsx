"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function UnsubscribeConfirmPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // Validate token on mount
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      // We don't have a separate validation endpoint, so we'll check on submit
      // For now, just show the form
      setValidating(false);
    } catch {
      setError("Unable to validate unsubscribe request");
      setValidating(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/unsubscribe/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        router.push("/unsubscribe/success");
      } else {
        const data = await res.json();
        if (data.error === "Already unsubscribed") {
          router.push("/unsubscribe/success");
        } else {
          setError(data.error || "Failed to unsubscribe");
        }
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Validating request...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Unsubscribe</h1>
          <p className="mt-2 text-gray-600">
            Are you sure you want to unsubscribe from our emails?
          </p>
          {email && (
            <p className="mt-1 text-sm text-gray-500">
              Email: <span className="font-medium">{email}</span>
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleUnsubscribe}
            disabled={loading}
            className="w-full py-3 px-4 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </span>
            ) : (
              "Yes, unsubscribe me"
            )}
          </button>

          <button
            onClick={() => window.close()}
            className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>

        <p className="mt-6 text-xs text-center text-gray-500">
          You can always resubscribe by contacting us directly.
        </p>
      </div>
    </div>
  );
}
