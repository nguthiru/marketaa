"use client";

import Link from "next/link";
import { useOnboardingContext } from "@/components/onboarding/onboarding-provider";

export default function SettingsPage() {
  const { replayWelcomeWizard, replayProductTour } = useOnboardingContext();

  const settingsSections = [
    {
      title: "Integrations",
      description: "Connect your CRM, email, and calendar accounts",
      href: "/settings/integrations",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
    },
    {
      title: "Account",
      description: "Manage your profile and preferences",
      href: "/settings/account",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      title: "Team",
      description: "Manage team members and permissions",
      href: "/settings/team",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      title: "Billing",
      description: "Manage your subscription and billing",
      href: "/settings/billing",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-600 mt-1">Manage your account and integrations</p>
        </div>

        {/* Settings Grid */}
        <div className="grid gap-4">
          {settingsSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="block bg-white rounded-xl border border-slate-200 p-5 transition-all hover:border-teal-300 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-teal-50 text-teal-600">
                  {section.icon}
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-slate-900">{section.title}</h2>
                  <p className="text-sm text-slate-600 mt-1">{section.description}</p>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Help & Tutorial Section */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Help & Tutorial</h2>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-pink-50 text-pink-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">Learn Marketaa</h3>
                <p className="text-sm text-slate-600 mt-1 mb-4">
                  Replay the tutorial to learn about Marketaa&apos;s features
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={replayWelcomeWizard}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-700 rounded-lg text-sm font-medium hover:bg-pink-100 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Watch Welcome Tour
                  </button>
                  <button
                    onClick={replayProductTour}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Start Product Tour
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
