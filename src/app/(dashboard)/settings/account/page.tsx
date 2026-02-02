"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  name: string | null;
  email: string;
  emailVerified: boolean;
  timezone: string;
  createdAt: string;
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");

  // Resend verification
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/user/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setName(data.name || "");
        setEmail(data.email);
        setTimezone(data.timezone || "UTC");
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage("");

    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, timezone }),
      });

      if (res.ok) {
        setProfileMessage("Profile updated successfully");
        fetchUser();
      } else {
        const data = await res.json();
        setProfileMessage(data.error || "Failed to update profile");
      }
    } catch (error) {
      setProfileMessage("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage("");

    if (newPassword !== confirmPassword) {
      setPasswordMessage("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage("Password must be at least 8 characters");
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        setPasswordMessage("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await res.json();
        setPasswordMessage(data.error || "Failed to change password");
      }
    } catch (error) {
      setPasswordMessage("Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleResendVerification = async () => {
    setSendingVerification(true);
    setVerificationMessage("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });

      if (res.ok) {
        setVerificationMessage("Verification email sent!");
      } else {
        setVerificationMessage("Failed to send verification email");
      }
    } catch (error) {
      setVerificationMessage("Failed to send verification email");
    } finally {
      setSendingVerification(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }

    if (!confirm("This will permanently delete all your projects, leads, and data. Type DELETE to confirm.")) {
      return;
    }

    try {
      const res = await fetch("/api/user/me", {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/login");
      }
    } catch (error) {
      console.error("Failed to delete account:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const timezones = [
    "UTC",
    "Africa/Lagos",
    "Africa/Nairobi",
    "Africa/Johannesburg",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Asia/Dubai",
    "Asia/Singapore",
    "Asia/Tokyo",
    "Australia/Sydney",
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/settings"
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Settings
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
          <p className="text-slate-600 mt-1">Manage your profile and account preferences</p>
        </div>

        {/* Email Verification Banner */}
        {user && !user.emailVerified && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="font-medium text-amber-800">Verify your email address</p>
                <p className="text-sm text-amber-700 mt-1">
                  Please verify your email to access all features.
                </p>
                {verificationMessage && (
                  <p className="text-sm text-amber-600 mt-2">{verificationMessage}</p>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResendVerification}
                loading={sendingVerification}
              >
                Resend Email
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Profile</h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Contact support to change your email address
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                >
                  {timezones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              {profileMessage && (
                <p className={`text-sm ${profileMessage.includes("success") ? "text-teal-600" : "text-red-600"}`}>
                  {profileMessage}
                </p>
              )}

              <Button type="submit" variant="default" loading={savingProfile}>
                Save Changes
              </Button>
            </form>
          </div>

          {/* Password Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                  minLength={8}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                  minLength={8}
                  required
                />
              </div>

              {passwordMessage && (
                <p className={`text-sm ${passwordMessage.includes("success") ? "text-teal-600" : "text-red-600"}`}>
                  {passwordMessage}
                </p>
              )}

              <Button type="submit" variant="default" loading={savingPassword}>
                Change Password
              </Button>
            </form>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-xl border border-red-200 p-6">
            <h2 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h2>
            <p className="text-sm text-slate-600 mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <Button
              variant="secondary"
              onClick={handleDeleteAccount}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              Delete Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
