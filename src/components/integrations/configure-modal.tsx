"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ConfigureModalProps {
  provider: string;
  providerName: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: { clientId: string; clientSecret: string; redirectUri?: string }) => Promise<void>;
  existingRedirectUri?: string;
}

export function ConfigureModal({
  provider,
  providerName,
  isOpen,
  onClose,
  onSave,
  existingRedirectUri,
}: ConfigureModalProps) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [redirectUri, setRedirectUri] = useState(existingRedirectUri || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!clientId.trim() || !clientSecret.trim()) {
      setError("Client ID and Client Secret are required");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        redirectUri: redirectUri.trim() || undefined,
      });
      setClientId("");
      setClientSecret("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const getHelpText = () => {
    switch (provider) {
      case "google":
        return {
          title: "Google Cloud Console Setup",
          steps: [
            "Go to console.cloud.google.com",
            "Create a new project or select existing",
            "Enable Gmail API and Google Calendar API",
            "Go to Credentials → Create OAuth 2.0 Client ID",
            "Set Application type to 'Web application'",
            "Add the redirect URI below to Authorized redirect URIs",
          ],
        };
      case "microsoft":
        return {
          title: "Azure Portal Setup",
          steps: [
            "Go to portal.azure.com",
            "Navigate to Azure Active Directory → App registrations",
            "Create a new registration",
            "Add the redirect URI below as a Web redirect URI",
            "Go to Certificates & secrets → New client secret",
          ],
        };
      case "hubspot":
        return {
          title: "HubSpot Developer Portal Setup",
          steps: [
            "Go to developers.hubspot.com",
            "Create or select your app",
            "Go to Auth tab",
            "Copy Client ID and Client Secret",
            "Add the redirect URI below",
          ],
        };
      case "salesforce":
        return {
          title: "Salesforce Setup",
          steps: [
            "Go to Setup → Apps → App Manager",
            "Create a New Connected App",
            "Enable OAuth Settings",
            "Add the redirect URI below as Callback URL",
            "Select required OAuth scopes",
          ],
        };
      default:
        return { title: "Setup", steps: [] };
    }
  };

  const help = getHelpText();
  const defaultRedirectUri = `${typeof window !== "undefined" ? window.location.origin : ""}/api/integrations/${provider}/callback`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">
            Configure {providerName}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Help Section */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
          <h3 className="text-sm font-medium text-slate-700 mb-2">{help.title}</h3>
          <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
            {help.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Client ID
            </label>
            <Input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Enter your OAuth Client ID"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Client Secret
            </label>
            <Input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Enter your OAuth Client Secret"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Redirect URI
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={redirectUri || defaultRedirectUri}
                onChange={(e) => setRedirectUri(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50"
                readOnly
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(redirectUri || defaultRedirectUri);
                }}
                className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Add this URL to your OAuth app's redirect URIs
            </p>
          </div>

          <div className="flex gap-3 pt-2">
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
              loading={saving}
              className="flex-1"
            >
              Save Credentials
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
