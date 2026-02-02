"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

interface IntegrationCardProps {
  provider: string;
  name: string;
  description: string;
  icon: string;
  connections: {
    type: string;
    status: string;
    name?: string;
    lastSyncAt?: Date | null;
    errorMessage?: string | null;
  }[];
  onConnect?: () => void;
  onSync?: () => Promise<void>;
  onDisconnect?: () => void;
}

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  google: (
    <svg className="w-8 h-8" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  ),
  microsoft: (
    <svg className="w-8 h-8" viewBox="0 0 24 24">
      <path fill="#F25022" d="M1 1h10v10H1z"/>
      <path fill="#00A4EF" d="M1 13h10v10H1z"/>
      <path fill="#7FBA00" d="M13 1h10v10H13z"/>
      <path fill="#FFB900" d="M13 13h10v10H13z"/>
    </svg>
  ),
  hubspot: (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#FF7A59">
      <path d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.984 2.21 2.21 0 00-4.42 0c0 .87.503 1.615 1.23 1.974v2.852a5.566 5.566 0 00-2.894 1.061l-7.7-5.988a2.63 2.63 0 00.103-.726 2.592 2.592 0 10-2.591 2.593c.473 0 .913-.13 1.296-.35l7.57 5.886a5.558 5.558 0 00-.118 1.142 5.6 5.6 0 005.598 5.598 5.6 5.6 0 005.597-5.598 5.598 5.598 0 00-5.598-5.598c-.447 0-.878.054-1.298.155z"/>
    </svg>
  ),
  salesforce: (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#00A1E0">
      <path d="M10.006 5.415a4.195 4.195 0 013.045-1.306c1.56 0 2.954.864 3.68 2.143a5.057 5.057 0 011.903-.376 5.073 5.073 0 015.072 5.072 5.07 5.07 0 01-5.072 5.072h-.96a3.793 3.793 0 01-3.265 1.87 3.79 3.79 0 01-2.384-.845 4.158 4.158 0 01-3.402 1.773 4.159 4.159 0 01-3.774-2.414A4.042 4.042 0 010 12.553a4.046 4.046 0 014.046-4.046c.293 0 .582.031.862.091a4.63 4.63 0 015.098-3.183z"/>
    </svg>
  ),
};

export function IntegrationCard({
  provider,
  name,
  description,
  icon,
  connections,
  onConnect,
  onSync,
  onDisconnect,
}: IntegrationCardProps) {
  const [syncing, setSyncing] = useState(false);
  const isConnected = connections.some((c) => c.status === "connected");
  const hasError = connections.some((c) => c.status === "error");
  const lastSync = connections.find((c) => c.lastSyncAt)?.lastSyncAt;
  const connectedName = connections.find((c) => c.status === "connected")?.name;

  const handleSync = async () => {
    if (!onSync) return;
    setSyncing(true);
    try {
      await onSync();
    } finally {
      setSyncing(false);
    }
  };

  const formatLastSync = (date: Date | string | null | undefined) => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return d.toLocaleDateString();
  };

  const getStatusBadge = () => {
    if (isConnected) {
      return (
        <span className="text-xs px-2 py-1 bg-teal-100 text-teal-700 rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>
          Connected
        </span>
      );
    }
    if (hasError) {
      return (
        <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
          Error
        </span>
      );
    }
    return (
      <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
        Not Connected
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          {PROVIDER_ICONS[icon] || (
            <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-900">{name}</h3>
            {getStatusBadge()}
          </div>
          <p className="text-sm text-slate-600 mb-3">{description}</p>

          {/* Connection details */}
          {isConnected && (
            <div className="flex items-center gap-3 mb-3 text-sm">
              {connectedName && (
                <span className="text-slate-700 font-medium">
                  {connectedName}
                </span>
              )}
              {lastSync && (
                <span className="text-slate-500">
                  Last synced: {formatLastSync(lastSync)}
                </span>
              )}
              {connections.find((c) => c.errorMessage)?.errorMessage && (
                <span className="text-red-500 text-xs">
                  {connections.find((c) => c.errorMessage)?.errorMessage}
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {!isConnected && onConnect && (
              <Button
                variant="default"
                size="sm"
                onClick={onConnect}
              >
                Connect
              </Button>
            )}
            {isConnected && onSync && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
              >
                {syncing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin mr-1" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Sync Now
                  </>
                )}
              </Button>
            )}
            {isConnected && onDisconnect && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDisconnect}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Disconnect
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
