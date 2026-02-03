"use client";

export default function UnsubscribeSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">
          Successfully Unsubscribed
        </h1>

        <p className="mt-4 text-gray-600">
          You have been successfully unsubscribed and will no longer receive
          emails from us.
        </p>

        <p className="mt-6 text-sm text-gray-500">
          Changed your mind? Contact us to resubscribe.
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
