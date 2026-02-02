"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { IntegrationCard } from "@/components/integrations/integration-card";

interface IntegrationStatus {
  provider: string;
  name: string;
  description: string;
  icon: string;
  types: string[];
  connections: {
    type: string;
    status: string;
    name?: string;
    lastSyncAt?: Date | null;
    errorMessage?: string | null;
  }[];
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch("/api/integrations");
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data);
      }
    } catch (error) {
      console.error("Failed to fetch integrations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (provider: string) => {
    window.location.href = `/api/integrations/${provider}/connect`;
  };

  const handleSync = async () => {
    const res = await fetch("/api/integrations/sync", {
      method: "POST",
    });

    if (res.ok) {
      const data = await res.json();
      if (data.repliesFound > 0) {
        alert(`Sync complete! Found ${data.repliesFound} new replies.`);
      } else {
        alert("Sync complete. No new replies found.");
      }
      await fetchIntegrations();
    } else {
      alert("Sync failed. Please try again.");
    }
  };

  const handleDisconnect = async (provider: string) => {
    if (!confirm("Are you sure you want to disconnect this integration?")) {
      return;
    }

    const res = await fetch(`/api/integrations/${provider}`, {
      method: "DELETE",
    });

    if (res.ok) {
      await fetchIntegrations();
    }
  };

  // Group integrations by category
  const emailIntegrations = integrations.filter((i) =>
    i.types.some((t) => t.startsWith("email_"))
  );
  const calendarIntegrations = integrations.filter((i) =>
    i.types.some((t) => t.startsWith("calendar_"))
  );
  const crmIntegrations = integrations.filter((i) =>
    i.types.some((t) => t.startsWith("crm_"))
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-4xl mx-auto px-4 py-8">
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
          <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
          <p className="text-slate-600 mt-1">
            Connect external services to sync data and automate workflows
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Email Providers */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email
              </h2>
              <div className="space-y-4">
                {emailIntegrations.map((integration) => (
                  <IntegrationCard
                    key={integration.provider}
                    provider={integration.provider}
                    name={integration.name}
                    description={integration.description}
                    icon={integration.icon}
                    connections={integration.connections}
                    onConnect={() => handleConnect(integration.provider)}
                    onSync={handleSync}
                    onDisconnect={() => handleDisconnect(integration.provider)}
                  />
                ))}
              </div>
            </section>

            {/* Calendar Providers */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Calendar
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Calendar integrations are automatically connected when you connect Email
              </p>
              <div className="space-y-4">
                {calendarIntegrations.map((integration) => (
                  <IntegrationCard
                    key={`calendar-${integration.provider}`}
                    provider={integration.provider}
                    name={`${integration.name} Calendar`}
                    description="Automatically create calendar events when meetings are booked"
                    icon={integration.icon}
                    connections={integration.connections.filter((c) =>
                      c.type.startsWith("calendar_")
                    )}
                    onConnect={() => handleConnect(integration.provider)}
                  />
                ))}
              </div>
            </section>

            {/* CRM Providers */}
            {crmIntegrations.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  CRM
                </h2>
                <div className="space-y-4">
                  {crmIntegrations.map((integration) => (
                    <IntegrationCard
                      key={integration.provider}
                      provider={integration.provider}
                      name={integration.name}
                      description={integration.description}
                      icon={integration.icon}
                      connections={integration.connections}
                      onConnect={() => handleConnect(integration.provider)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
