"use client";

import { Eye, MousePointerClick } from "lucide-react";

interface TrackingStatsProps {
  openCount: number;
  clickCount: number;
  firstOpenedAt?: string | null;
  lastOpenedAt?: string | null;
  compact?: boolean;
}

export function TrackingStats({
  openCount,
  clickCount,
  firstOpenedAt,
  lastOpenedAt,
  compact = false,
}: TrackingStatsProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" />
          {openCount}
        </span>
        <span className="flex items-center gap-1">
          <MousePointerClick className="h-3.5 w-3.5" />
          {clickCount}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600">
            <Eye className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">{openCount}</p>
            <p className="text-xs text-muted-foreground">Opens</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600">
            <MousePointerClick className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">{clickCount}</p>
            <p className="text-xs text-muted-foreground">Clicks</p>
          </div>
        </div>
      </div>

      {firstOpenedAt && (
        <p className="text-xs text-muted-foreground">
          First opened: {formatDate(firstOpenedAt)}
          {lastOpenedAt && lastOpenedAt !== firstOpenedAt && (
            <> &middot; Last: {formatDate(lastOpenedAt)}</>
          )}
        </p>
      )}
    </div>
  );
}

/**
 * Badge showing open/click status for list views
 */
export function TrackingBadge({
  openCount,
  clickCount,
}: {
  openCount: number;
  clickCount: number;
}) {
  if (openCount === 0 && clickCount === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs">
        Not opened
      </span>
    );
  }

  if (openCount > 0 && clickCount === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs">
        <Eye className="h-3 w-3" />
        Opened {openCount > 1 && `(${openCount})`}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">
      <MousePointerClick className="h-3 w-3" />
      Clicked {clickCount > 1 && `(${clickCount})`}
    </span>
  );
}
