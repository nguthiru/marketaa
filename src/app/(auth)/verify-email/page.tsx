"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link");
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        setStatus("success");
        setMessage("Your email has been verified successfully!");
      } else {
        const data = await res.json();
        setStatus("error");
        setMessage(data.error || "Verification failed");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          {status === "loading" && (
            <>
              <div className="w-12 h-12 mx-auto mb-4">
                <div className="w-12 h-12 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-2">Verifying...</h1>
              <p className="text-slate-600">Please wait while we verify your email.</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-2">Email Verified!</h1>
              <p className="text-slate-600 mb-6">{message}</p>
              <Link
                href="/projects"
                className="inline-block bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 transition-colors"
              >
                Go to Dashboard
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-2">Verification Failed</h1>
              <p className="text-slate-600 mb-6">{message}</p>
              <Link
                href="/login"
                className="text-teal-600 hover:underline"
              >
                Go to Login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
