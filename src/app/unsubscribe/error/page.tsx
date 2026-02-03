"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  const getMessage = () => {
    switch (reason) {
      case "invalid":
        return "This unsubscribe link is invalid or malformed.";
      case "expired":
        return "This unsubscribe link has expired.";
      case "Already unsubscribed":
        return "You have already unsubscribed from this mailing list.";
      default:
        return "Something went wrong while processing your unsubscribe request.";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">Unsubscribe Failed</h1>

        <p className="mt-4 text-gray-600">{getMessage()}</p>

        <p className="mt-6 text-sm text-gray-500">
          If you continue to receive unwanted emails, please contact us directly
          and we&apos;ll remove you from our mailing list.
        </p>

        <button
          onClick={() => window.close()}
          className="mt-6 py-2 px-6 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          Close this page
        </button>
      </div>
    </div>
  );
}

export default function UnsubscribeErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
