"use client";

interface ScoreBadgeProps {
  score: number;
  trend?: "rising" | "stable" | "falling";
  size?: "sm" | "md" | "lg";
  showTrend?: boolean;
}

export function ScoreBadge({
  score,
  trend = "stable",
  size = "md",
  showTrend = true,
}: ScoreBadgeProps) {
  const getScoreColor = () => {
    if (score >= 80) return "bg-teal-500";
    if (score >= 60) return "bg-teal-400";
    if (score >= 40) return "bg-amber-400";
    if (score >= 20) return "bg-orange-400";
    return "bg-red-400";
  };

  const getTrendIcon = () => {
    switch (trend) {
      case "rising":
        return (
          <svg className="w-3 h-3 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        );
      case "falling":
        return (
          <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        );
      default:
        return null;
    }
  };

  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base",
  };

  return (
    <div className="flex items-center gap-1">
      <div
        className={`${sizeClasses[size]} ${getScoreColor()} rounded-full flex items-center justify-center text-white font-bold`}
        title={`Lead score: ${score}/100`}
      >
        {score}
      </div>
      {showTrend && trend !== "stable" && getTrendIcon()}
    </div>
  );
}
