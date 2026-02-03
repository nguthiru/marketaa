"use client";

import { useState, useEffect, useCallback } from "react";

export interface OnboardingChecklist {
  emailVerified: boolean;
  gmailConnected: boolean;
  firstProjectCreated: boolean;
  firstLeadAdded: boolean;
  firstSequenceCreated: boolean;
  dismissedAt: string | null;
}

export interface OnboardingState {
  welcomeWizardCompleted: boolean;
  productTourCompleted: boolean;
  onboardingCompleted: boolean;
  checklist: OnboardingChecklist;
  progress: number;
}

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcomeWizard, setShowWelcomeWizard] = useState(false);
  const [showProductTour, setShowProductTour] = useState(false);

  const fetchOnboardingState = useCallback(async () => {
    try {
      const res = await fetch("/api/onboarding");
      if (res.ok) {
        const data = await res.json();
        setState(data);

        // Show welcome wizard if not completed
        if (!data.welcomeWizardCompleted) {
          setShowWelcomeWizard(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch onboarding state:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnboardingState();
  }, [fetchOnboardingState]);

  const completeWelcomeWizard = useCallback(async (startTour: boolean = false) => {
    try {
      await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ welcomeWizardCompleted: true }),
      });

      setState((prev) =>
        prev ? { ...prev, welcomeWizardCompleted: true } : prev
      );
      setShowWelcomeWizard(false);

      if (startTour) {
        // Small delay for smoother transition
        setTimeout(() => setShowProductTour(true), 300);
      }
    } catch (error) {
      console.error("Failed to complete welcome wizard:", error);
    }
  }, []);

  const startProductTour = useCallback(() => {
    setShowProductTour(true);
  }, []);

  const completeProductTour = useCallback(async () => {
    try {
      await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productTourCompleted: true }),
      });

      setState((prev) =>
        prev ? { ...prev, productTourCompleted: true } : prev
      );
      setShowProductTour(false);
    } catch (error) {
      console.error("Failed to complete product tour:", error);
    }
  }, []);

  const dismissChecklist = useCallback(async () => {
    try {
      await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissChecklist: true }),
      });

      setState((prev) =>
        prev
          ? {
              ...prev,
              checklist: {
                ...prev.checklist,
                dismissedAt: new Date().toISOString(),
              },
            }
          : prev
      );
    } catch (error) {
      console.error("Failed to dismiss checklist:", error);
    }
  }, []);

  const refreshChecklist = useCallback(async () => {
    await fetchOnboardingState();
  }, [fetchOnboardingState]);

  const replayWelcomeWizard = useCallback(() => {
    setShowWelcomeWizard(true);
  }, []);

  const replayProductTour = useCallback(() => {
    setShowProductTour(true);
  }, []);

  return {
    // State
    isLoading,
    state,
    checklist: state?.checklist ?? null,
    progress: state?.progress ?? 0,
    welcomeWizardCompleted: state?.welcomeWizardCompleted ?? false,
    productTourCompleted: state?.productTourCompleted ?? false,
    onboardingCompleted: state?.onboardingCompleted ?? false,

    // Visibility
    showWelcomeWizard,
    showProductTour,

    // Actions
    completeWelcomeWizard,
    startProductTour,
    completeProductTour,
    dismissChecklist,
    refreshChecklist,
    setShowProductTour,
    replayWelcomeWizard,
    replayProductTour,
  };
}
