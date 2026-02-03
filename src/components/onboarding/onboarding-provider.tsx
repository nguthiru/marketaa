"use client";

import { createContext, useContext, ReactNode } from "react";
import { useOnboarding, OnboardingChecklist } from "./use-onboarding";

interface OnboardingContextValue {
  // State
  isLoading: boolean;
  checklist: OnboardingChecklist | null;
  progress: number;
  welcomeWizardCompleted: boolean;
  productTourCompleted: boolean;
  onboardingCompleted: boolean;

  // Visibility
  showWelcomeWizard: boolean;
  showProductTour: boolean;

  // Actions
  completeWelcomeWizard: (startTour?: boolean) => Promise<void>;
  startProductTour: () => void;
  completeProductTour: () => Promise<void>;
  dismissChecklist: () => Promise<void>;
  refreshChecklist: () => Promise<void>;
  setShowProductTour: (show: boolean) => void;
  replayWelcomeWizard: () => void;
  replayProductTour: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const onboarding = useOnboarding();

  return (
    <OnboardingContext.Provider value={onboarding}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingContext() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboardingContext must be used within OnboardingProvider");
  }
  return context;
}
