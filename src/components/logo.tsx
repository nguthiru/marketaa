import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: "w-6 h-6", text: "text-sm" },
  md: { icon: "w-8 h-8", text: "text-lg" },
  lg: { icon: "w-10 h-10", text: "text-xl" },
  xl: { icon: "w-12 h-12", text: "text-2xl" },
};

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const { icon, text } = sizes[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoIcon className={icon} />
      {showText && (
        <span className={cn("font-semibold", text)}>Marketaa</span>
      )}
    </div>
  );
}

export function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
      </defs>

      {/* Rounded square background */}
      <rect x="2" y="2" width="28" height="28" rx="6" fill="url(#logoGradient)" />

      {/* M shape */}
      <path
        d="M9 23V12l7 5.5 7-5.5v11"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Arrow pointing up */}
      <path
        d="M16 9l-2.5 2.5M16 9l2.5 2.5M16 9v4"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
