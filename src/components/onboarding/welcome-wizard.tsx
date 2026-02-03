"use client";

import { useState } from "react";
import { useOnboardingContext } from "./onboarding-provider";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";

const slides = [
  {
    title: "Welcome to Marketaa",
    description:
      "Your AI-powered outreach platform for building meaningful business connections. Let's get you started!",
    icon: (
      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
        <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
    ),
  },
  {
    title: "Smart Email Sequences",
    description:
      "Create automated email sequences that adapt to your leads' responses. Set delays, conditions, and watch your outreach run on autopilot.",
    icon: (
      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
        <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
    ),
  },
  {
    title: "AI-Powered Emails",
    description:
      "Generate personalized emails that sound like you wrote them. Our AI learns your style and crafts messages that resonate with your leads.",
    icon: (
      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
        <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
    ),
  },
  {
    title: "Powerful Integrations",
    description:
      "Connect Gmail, HubSpot, Salesforce, Pipedrive, and more. Keep your CRM in sync and never miss a beat.",
    icon: (
      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
        <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </div>
    ),
  },
];

export function WelcomeWizard() {
  const { showWelcomeWizard, completeWelcomeWizard } = useOnboardingContext();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [askTour, setAskTour] = useState(false);

  const isLastSlide = currentSlide === slides.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      setAskTour(true);
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentSlide((prev) => Math.max(0, prev - 1));
  };

  const handleSkip = () => {
    setAskTour(true);
  };

  const handleFinish = (startTour: boolean) => {
    completeWelcomeWizard(startTour);
  };

  if (!showWelcomeWizard) return null;

  const slide = slides[currentSlide];

  return (
    <Dialog open={showWelcomeWizard} onOpenChange={() => {}}>
      <DialogContent className="bg-white sm:max-w-md" showCloseButton={false}>
        <VisuallyHidden>
          <DialogTitle>Welcome to Marketaa</DialogTitle>
        </VisuallyHidden>
        {!askTour ? (
          <>
            {/* Slide Content */}
            <div className="text-center py-6">
              {slide.icon}
              <h2 className="text-xl font-semibold text-slate-900 mb-3">
                {slide.title}
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed px-4">
                {slide.description}
              </p>
            </div>

            {/* Progress Dots */}
            <div className="flex justify-center gap-2 mb-6">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlide
                      ? "bg-pink-500 w-6"
                      : "bg-slate-200 hover:bg-slate-300"
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleSkip}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Skip
              </button>

              <div className="flex gap-2">
                {currentSlide > 0 && (
                  <Button variant="secondary" onClick={handlePrev}>
                    Back
                  </Button>
                )}
                <Button onClick={handleNext}>
                  {isLastSlide ? "Get Started" : "Next"}
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Tour Prompt */
          <div className="text-center py-6">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center">
              <svg className="w-10 h-10 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>

            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              Take a Quick Tour?
            </h2>
            <p className="text-slate-600 text-sm mb-8 px-4">
              Let us show you around the dashboard. It only takes 30 seconds!
            </p>

            <div className="flex flex-col gap-3">
              <Button onClick={() => handleFinish(true)} className="w-full">
                Yes, Show Me Around
              </Button>
              <button
                onClick={() => handleFinish(false)}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Maybe Later
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
