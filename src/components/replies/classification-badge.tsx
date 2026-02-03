"use client";

import { cn } from "@/lib/utils";
import {
  ThumbsUp,
  ThumbsDown,
  Clock,
  AlertTriangle,
  Minus,
  HelpCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ClassificationType =
  | "positive"
  | "negative"
  | "out_of_office"
  | "bounce"
  | "neutral"
  | "question";

interface ClassificationBadgeProps {
  classification: ClassificationType;
  confidence?: number;
  showConfidence?: boolean;
  size?: "sm" | "md" | "lg";
  tooltip?: string;
}

const classificationConfig: Record<
  ClassificationType,
  {
    label: string;
    icon: typeof ThumbsUp;
    className: string;
    bgClassName: string;
  }
> = {
  positive: {
    label: "Interested",
    icon: ThumbsUp,
    className: "text-green-700",
    bgClassName: "bg-green-100",
  },
  negative: {
    label: "Not Interested",
    icon: ThumbsDown,
    className: "text-red-700",
    bgClassName: "bg-red-100",
  },
  out_of_office: {
    label: "Out of Office",
    icon: Clock,
    className: "text-amber-700",
    bgClassName: "bg-amber-100",
  },
  bounce: {
    label: "Bounced",
    icon: AlertTriangle,
    className: "text-orange-700",
    bgClassName: "bg-orange-100",
  },
  neutral: {
    label: "Neutral",
    icon: Minus,
    className: "text-gray-700",
    bgClassName: "bg-gray-100",
  },
  question: {
    label: "Has Questions",
    icon: HelpCircle,
    className: "text-blue-700",
    bgClassName: "bg-blue-100",
  },
};

export function ClassificationBadge({
  classification,
  confidence,
  showConfidence = false,
  size = "md",
  tooltip,
}: ClassificationBadgeProps) {
  const config = classificationConfig[classification] || classificationConfig.neutral;
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5 gap-1",
    md: "text-sm px-2 py-1 gap-1.5",
    lg: "text-base px-3 py-1.5 gap-2",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  const badge = (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        config.className,
        config.bgClassName,
        sizeClasses[size]
      )}
    >
      <Icon className={iconSizes[size]} />
      <span>{config.label}</span>
      {showConfidence && confidence !== undefined && (
        <span className="opacity-70">({Math.round(confidence * 100)}%)</span>
      )}
    </span>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}

/**
 * Compact badge for list views
 */
export function ClassificationDot({
  classification,
}: {
  classification: ClassificationType;
}) {
  const config = classificationConfig[classification] || classificationConfig.neutral;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center justify-center w-5 h-5 rounded-full",
              config.bgClassName,
              config.className
            )}
          >
            <config.icon className="h-3 w-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Full classification details component
 */
export function ClassificationDetails({
  classification,
  confidence,
  sentiment,
  isAutoReply,
  requiresResponse,
  nextActionSuggestion,
  keyPhrases,
}: {
  classification: ClassificationType;
  confidence: number;
  sentiment?: number;
  isAutoReply?: boolean;
  requiresResponse?: boolean;
  nextActionSuggestion?: string;
  keyPhrases?: string[];
}) {
  const config = classificationConfig[classification] || classificationConfig.neutral;

  return (
    <div className="space-y-3 p-3 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <ClassificationBadge
          classification={classification}
          confidence={confidence}
          showConfidence
        />
        {isAutoReply && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            Auto-reply
          </span>
        )}
      </div>

      {sentiment !== undefined && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Sentiment:</span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all",
                sentiment > 0.2
                  ? "bg-green-500"
                  : sentiment < -0.2
                  ? "bg-red-500"
                  : "bg-gray-400"
              )}
              style={{
                width: `${Math.abs(sentiment) * 50 + 50}%`,
                marginLeft: sentiment < 0 ? `${50 - Math.abs(sentiment) * 50}%` : "50%",
              }}
            />
          </div>
          <span className="text-xs">
            {sentiment > 0.2
              ? "Positive"
              : sentiment < -0.2
              ? "Negative"
              : "Neutral"}
          </span>
        </div>
      )}

      {requiresResponse !== undefined && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Needs response:</span>
          <span className={requiresResponse ? "text-amber-600" : "text-muted-foreground"}>
            {requiresResponse ? "Yes" : "No"}
          </span>
        </div>
      )}

      {nextActionSuggestion && (
        <div className="text-sm">
          <span className="text-muted-foreground">Suggested action:</span>
          <p className="mt-1 text-foreground">{nextActionSuggestion}</p>
        </div>
      )}

      {keyPhrases && keyPhrases.length > 0 && (
        <div className="text-sm">
          <span className="text-muted-foreground">Key phrases:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {keyPhrases.map((phrase, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs"
              >
                {phrase}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
