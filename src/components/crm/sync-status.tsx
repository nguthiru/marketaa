"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RefreshCw, Check, X, Clock, Loader2 } from "lucide-react";

interface CRMSyncStatusProps {
  leadId: string;
}

interface SyncStatus {
  hubspot: { synced: boolean; lastSyncedAt?: string };
  salesforce: { synced: boolean; lastSyncedAt?: string };
  pipedrive: { synced: boolean; lastSyncedAt?: string };
}

const CRM_LABELS: Record<string, string> = {
  hubspot: "HubSpot",
  salesforce: "Salesforce",
  pipedrive: "Pipedrive",
};

const CRM_COLORS: Record<string, string> = {
  hubspot: "bg-orange-100 text-orange-800 border-orange-200",
  salesforce: "bg-blue-100 text-blue-800 border-blue-200",
  pipedrive: "bg-green-100 text-green-800 border-green-200",
};

export function CRMSyncStatus({ leadId }: CRMSyncStatusProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [connectedCRMs, setConnectedCRMs] = useState<string[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, [leadId]);

  async function fetchStatus() {
    try {
      const [syncRes, connectedRes] = await Promise.all([
        fetch(`/api/crm/sync?leadId=${leadId}`),
        fetch("/api/crm/sync"),
      ]);

      if (syncRes.ok) {
        const data = await syncRes.json();
        setStatus(data);
      }

      if (connectedRes.ok) {
        const data = await connectedRes.json();
        setConnectedCRMs(data.connectedCRMs || []);
      }
    } catch (error) {
      console.error("Failed to fetch CRM status:", error);
    } finally {
      setLoading(false);
    }
  }

  async function syncToCRM(provider: string) {
    setSyncing(provider);
    try {
      const res = await fetch("/api/crm/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, provider }),
      });

      if (res.ok) {
        await fetchStatus();
      }
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setSyncing(null);
    }
  }

  async function syncToAll() {
    setSyncing("all");
    try {
      const res = await fetch("/api/crm/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });

      if (res.ok) {
        await fetchStatus();
      }
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setSyncing(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading CRM status...
      </div>
    );
  }

  if (connectedCRMs.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No CRM connected.{" "}
        <a href="/settings/integrations" className="text-primary hover:underline">
          Connect a CRM
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">CRM Sync</span>
        {connectedCRMs.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={syncToAll}
            disabled={syncing !== null}
          >
            {syncing === "all" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Sync All
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {connectedCRMs.map((provider) => {
          const providerStatus = status?.[provider as keyof SyncStatus];
          const isSynced = providerStatus?.synced;
          const lastSynced = providerStatus?.lastSyncedAt
            ? new Date(providerStatus.lastSyncedAt)
            : null;

          return (
            <TooltipProvider key={provider}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className={`${CRM_COLORS[provider]} cursor-default`}
                    >
                      {isSynced ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <Clock className="h-3 w-3 mr-1" />
                      )}
                      {CRM_LABELS[provider]}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => syncToCRM(provider)}
                      disabled={syncing !== null}
                    >
                      {syncing === provider ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {isSynced ? (
                    <p>
                      Synced {lastSynced ? `on ${lastSynced.toLocaleDateString()}` : ""}
                    </p>
                  ) : (
                    <p>Not synced to {CRM_LABELS[provider]}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}
