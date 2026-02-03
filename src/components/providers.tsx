"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <OnboardingProvider>{children}</OnboardingProvider>
    </SessionProvider>
  );
}
