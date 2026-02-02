"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface InviteDetails {
  projectName: string;
  inviterName: string;
  role: string;
  email: string;
}

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const token = searchParams.get("token");

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");

  // For new user registration
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (token) {
      fetchInviteDetails();
    } else {
      setError("Invalid invitation link");
      setLoading(false);
    }
  }, [token]);

  const fetchInviteDetails = async () => {
    try {
      const res = await fetch(`/api/invites/${token}`);
      if (res.ok) {
        const data = await res.json();
        setInvite(data);
      } else {
        const data = await res.json();
        setError(data.error || "Invalid or expired invitation");
      }
    } catch {
      setError("Failed to load invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    setError("");

    try {
      const res = await fetch(`/api/invites/${token}/accept`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/projects/${data.projectId}`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to accept invitation");
      }
    } catch {
      setError("Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  };

  const handleRegisterAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setRegistering(false);
      return;
    }

    try {
      // Register user
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: invite?.email,
          password,
        }),
      });

      if (!registerRes.ok) {
        const data = await registerRes.json();
        setError(data.error || "Failed to create account");
        setRegistering(false);
        return;
      }

      // Sign in
      const signInResult = await signIn("credentials", {
        email: invite?.email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError("Failed to sign in");
        setRegistering(false);
        return;
      }

      // Accept invite
      const acceptRes = await fetch(`/api/invites/${token}/accept`, {
        method: "POST",
      });

      if (acceptRes.ok) {
        const data = await acceptRes.json();
        router.push(`/projects/${data.projectId}`);
      } else {
        router.push("/projects");
      }
    } catch {
      setError("Something went wrong");
      setRegistering(false);
    }
  };

  if (loading || sessionStatus === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Invalid Invitation</h1>
            <p className="text-slate-600 mb-6">{error}</p>
            <Link href="/login" className="text-teal-600 hover:underline">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // User is logged in - show accept button
  if (session && invite) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">You&apos;re Invited!</h1>
            <p className="text-slate-600 mb-4">
              <strong>{invite.inviterName}</strong> has invited you to join{" "}
              <strong>{invite.projectName}</strong> as a <strong>{invite.role}</strong>.
            </p>

            {error && (
              <p className="text-sm text-red-600 mb-4">{error}</p>
            )}

            <Button
              variant="default"
              onClick={handleAccept}
              disabled={accepting}
              className="w-full"
            >
              {accepting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Accepting...
                </>
              ) : (
                "Accept Invitation"
              )}
            </Button>

            <p className="text-sm text-slate-500 mt-4">
              Signed in as {session.user?.email}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // User is not logged in - show registration/login options
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">You&apos;re Invited!</h1>
            <p className="text-slate-600">
              <strong>{invite?.inviterName}</strong> has invited you to join{" "}
              <strong>{invite?.projectName}</strong> as a <strong>{invite?.role}</strong>.
            </p>
          </div>

          <form onSubmit={handleRegisterAndAccept} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={invite?.email || ""}
                disabled
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Create Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <Button type="submit" variant="default" disabled={registering} className="w-full">
              {registering ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Account & Join"
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{" "}
              <Link href={`/login?callbackUrl=/invite?token=${token}`} className="text-teal-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    }>
      <InviteContent />
    </Suspense>
  );
}
