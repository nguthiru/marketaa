"use client";

import { useState, useEffect } from "react";

interface EmailConfig {
  id?: string;
  provider: "resend" | "smtp";
  fromEmail: string;
  fromName: string;
  replyTo: string;
  resendApiKey: string;
  smtpHost: string;
  smtpPort: string;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  isVerified: boolean;
  lastTestedAt: string | null;
}

export function EmailSendingConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [config, setConfig] = useState<EmailConfig>({
    provider: "resend",
    fromEmail: "",
    fromName: "",
    replyTo: "",
    resendApiKey: "",
    smtpHost: "",
    smtpPort: "587",
    smtpSecure: true,
    smtpUser: "",
    smtpPassword: "",
    isVerified: false,
    lastTestedAt: null,
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/settings/email-config");
      const data = await res.json();
      if (data.config) {
        setConfig({
          ...config,
          ...data.config,
          smtpPort: data.config.smtpPort?.toString() || "587",
        });
        setIsExpanded(true);
      }
    } catch (error) {
      console.error("Failed to fetch email config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/email-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: "Configuration saved" });
        fetchConfig();
      } else {
        setTestResult({ success: false, message: data.error || "Failed to save" });
      }
    } catch {
      setTestResult({ success: false, message: "Failed to save configuration" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) {
      setTestResult({ success: false, message: "Enter a test email address" });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/email-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: data.message });
        fetchConfig();
      } else {
        setTestResult({ success: false, message: data.error || "Test failed" });
      }
    } catch {
      setTestResult({ success: false, message: "Failed to send test email" });
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Remove email configuration? Projects using account settings will need their own configuration.")) {
      return;
    }
    try {
      await fetch("/api/settings/email-config", { method: "DELETE" });
      setConfig({
        provider: "resend",
        fromEmail: "",
        fromName: "",
        replyTo: "",
        resendApiKey: "",
        smtpHost: "",
        smtpPort: "587",
        smtpSecure: true,
        smtpUser: "",
        smtpPassword: "",
        isVerified: false,
        lastTestedAt: null,
      });
      setIsExpanded(false);
      setTestResult(null);
    } catch {
      setTestResult({ success: false, message: "Failed to remove configuration" });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!isExpanded) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-slate-900">No email sending configured</h3>
            <p className="text-sm text-slate-500 mt-1">
              Set up Resend or SMTP to send emails from your account
            </p>
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600"
          >
            Configure
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      {/* Status Badge */}
      {config.id && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {config.isVerified ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-medium">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Not Verified
              </span>
            )}
            <span className="text-xs text-slate-400">
              {config.provider === "resend" ? "Resend API" : "SMTP"}
            </span>
          </div>
          <button
            onClick={handleDelete}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      )}

      {/* Provider Selection */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setConfig({ ...config, provider: "resend" })}
          className={`flex-1 p-3 rounded-lg border-2 text-left transition-colors ${
            config.provider === "resend"
              ? "border-teal-500 bg-teal-50"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <p className="font-medium text-slate-900">Resend</p>
          <p className="text-xs text-slate-500 mt-0.5">API-based email service</p>
        </button>
        <button
          type="button"
          onClick={() => setConfig({ ...config, provider: "smtp" })}
          className={`flex-1 p-3 rounded-lg border-2 text-left transition-colors ${
            config.provider === "smtp"
              ? "border-teal-500 bg-teal-50"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <p className="font-medium text-slate-900">SMTP</p>
          <p className="text-xs text-slate-500 mt-0.5">Custom mail server</p>
        </button>
      </div>

      {/* Common Fields */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From Email</label>
            <input
              type="email"
              value={config.fromEmail}
              onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="hello@yourdomain.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From Name</label>
            <input
              type="text"
              value={config.fromName}
              onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Your Name"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Reply-To (optional)</label>
          <input
            type="email"
            value={config.replyTo}
            onChange={(e) => setConfig({ ...config, replyTo: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="replies@yourdomain.com"
          />
        </div>
      </div>

      {/* Resend Config */}
      {config.provider === "resend" && (
        <div className="p-4 bg-slate-50 rounded-lg space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Resend API Key</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={config.resendApiKey}
                onChange={(e) => setConfig({ ...config, resendApiKey: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="re_xxxxxxxxx"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Get your API key from{" "}
              <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">
                resend.com
              </a>
            </p>
          </div>
        </div>
      )}

      {/* SMTP Config */}
      {config.provider === "smtp" && (
        <div className="p-4 bg-slate-50 rounded-lg space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Host</label>
              <input
                type="text"
                value={config.smtpHost}
                onChange={(e) => setConfig({ ...config, smtpHost: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Port</label>
              <input
                type="text"
                value={config.smtpPort}
                onChange={(e) => setConfig({ ...config, smtpPort: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="587"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input
                type="text"
                value={config.smtpUser}
                onChange={(e) => setConfig({ ...config, smtpUser: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={config.smtpPassword}
                  onChange={(e) => setConfig({ ...config, smtpPassword: e.target.value })}
                  className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="App password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={config.smtpSecure}
              onChange={(e) => setConfig({ ...config, smtpSecure: e.target.checked })}
              className="rounded border-slate-300 text-teal-500 focus:ring-teal-500"
            />
            Use TLS/SSL (recommended)
          </label>
        </div>
      )}

      {/* Result Message */}
      {testResult && (
        <div
          className={`mb-6 p-3 rounded-lg text-sm ${
            testResult.success
              ? "bg-teal-50 text-teal-700 border border-teal-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {testResult.message}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Configuration"}
        </button>

        <div className="flex-1" />

        <input
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder="Test email address"
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-48"
        />
        <button
          onClick={handleTest}
          disabled={testing || !testEmail}
          className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          {testing ? "Sending..." : "Send Test"}
        </button>
      </div>
    </div>
  );
}
