"use client";

import { useEffect, useRef } from "react";
import { driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { useOnboardingContext } from "./onboarding-provider";

const tourSteps: DriveStep[] = [
  {
    element: '[data-tour="projects"]',
    popover: {
      title: "Your Projects",
      description:
        "Organize your outreach campaigns into projects. Each project contains leads, email plans, and sequences.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="sequences"]',
    popover: {
      title: "Email Sequences",
      description:
        "Build automated follow-up sequences that pause when leads reply. Set delays and conditions for smart outreach.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="templates"]',
    popover: {
      title: "Email Templates",
      description:
        "Create reusable email templates. Track performance and A/B test different versions to optimize your outreach.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="settings"]',
    popover: {
      title: "Settings & Integrations",
      description:
        "Connect your email accounts, CRMs, and customize your preferences. This is where you'll set up Gmail.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="usage"]',
    popover: {
      title: "Usage Dashboard",
      description:
        "Track your plan limits for projects, leads, and AI-generated emails. Upgrade anytime as you grow.",
      side: "right",
      align: "start",
    },
  },
];

export function ProductTour() {
  const { showProductTour, completeProductTour, setShowProductTour } = useOnboardingContext();
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  useEffect(() => {
    if (showProductTour) {
      // Small delay to ensure DOM elements are ready
      const timeout = setTimeout(() => {
        driverRef.current = driver({
          showProgress: true,
          steps: tourSteps,
          nextBtnText: "Next",
          prevBtnText: "Back",
          doneBtnText: "Done",
          progressText: "{{current}} of {{total}}",
          popoverClass: "marketaa-tour-popover",
          onDestroyed: () => {
            completeProductTour();
          },
          onCloseClick: () => {
            driverRef.current?.destroy();
            setShowProductTour(false);
          },
        });

        driverRef.current.drive();
      }, 100);

      return () => {
        clearTimeout(timeout);
        driverRef.current?.destroy();
      };
    }
  }, [showProductTour, completeProductTour, setShowProductTour]);

  return null; // driver.js handles its own rendering
}
