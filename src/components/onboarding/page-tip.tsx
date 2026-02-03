"use client";

import { useState, useEffect } from "react";

interface PageTipProps {
  id: string; // Unique ID for localStorage
  title: string;
  description: string;
  tips: string[];
  icon?: React.ReactNode;
  accentColor?: "pink" | "blue" | "purple" | "green" | "amber";
  /** Show only the trigger button (collapsed by default) */
  collapsedByDefault?: boolean;
}

const colorClasses = {
  pink: {
    bg: "bg-pink-50",
    border: "border-pink-200",
    icon: "bg-pink-100 text-pink-600",
    title: "text-pink-900",
    text: "text-pink-700",
    bullet: "bg-pink-400",
    button: "text-pink-600 hover:text-pink-700 hover:bg-pink-100",
  },
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "bg-blue-100 text-blue-600",
    title: "text-blue-900",
    text: "text-blue-700",
    bullet: "bg-blue-400",
    button: "text-blue-600 hover:text-blue-700 hover:bg-blue-100",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    icon: "bg-purple-100 text-purple-600",
    title: "text-purple-900",
    text: "text-purple-700",
    bullet: "bg-purple-400",
    button: "text-purple-600 hover:text-purple-700 hover:bg-purple-100",
  },
  green: {
    bg: "bg-green-50",
    border: "border-green-200",
    icon: "bg-green-100 text-green-600",
    title: "text-green-900",
    text: "text-green-700",
    bullet: "bg-green-400",
    button: "text-green-600 hover:text-green-700 hover:bg-green-100",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: "bg-amber-100 text-amber-600",
    title: "text-amber-900",
    text: "text-amber-700",
    bullet: "bg-amber-400",
    button: "text-amber-600 hover:text-amber-700 hover:bg-amber-100",
  },
};

export function PageTip({
  id,
  title,
  description,
  tips,
  icon,
  accentColor = "pink",
  collapsedByDefault = false,
}: PageTipProps) {
  const [dismissed, setDismissed] = useState(true); // Start hidden to prevent flash
  const [mounted, setMounted] = useState(false);
  const [temporarilyShown, setTemporarilyShown] = useState(false);

  const storageKey = `marketaa_page_tip_${id}`;
  const colors = colorClasses[accentColor];

  useEffect(() => {
    setMounted(true);
    const isDismissed = localStorage.getItem(storageKey) === "true";
    setDismissed(isDismissed || collapsedByDefault);
  }, [storageKey, collapsedByDefault]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, "true");
    setDismissed(true);
    setTemporarilyShown(false);
  };

  const handleShowTip = () => {
    setTemporarilyShown(true);
  };

  // Don't render until mounted (to check localStorage)
  if (!mounted) {
    return null;
  }

  // Show trigger button when dismissed
  if (dismissed && !temporarilyShown) {
    return (
      <button
        onClick={handleShowTip}
        className={`${colors.icon} w-8 h-8 rounded-lg flex items-center justify-center mb-6 transition-all hover:scale-105 hover:shadow-md`}
        aria-label={`Show tip: ${title}`}
        title={title}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    );
  }

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-xl p-5 mb-6 animate-fade-in`}>
      <div className="flex gap-4">
        {icon && (
          <div className={`${colors.icon} w-10 h-10 rounded-lg flex items-center justify-center shrink-0`}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className={`font-semibold ${colors.title}`}>{title}</h3>
              <p className={`text-sm ${colors.text} mt-1`}>{description}</p>
            </div>
            <button
              onClick={handleDismiss}
              className={`${colors.button} p-1 rounded-lg transition-colors shrink-0`}
              aria-label="Dismiss tip"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {tips.length > 0 && (
            <ul className="mt-3 space-y-2">
              {tips.map((tip, index) => (
                <li key={index} className={`flex items-start gap-2 text-sm ${colors.text}`}>
                  <span className={`${colors.bullet} w-1.5 h-1.5 rounded-full mt-1.5 shrink-0`} />
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
