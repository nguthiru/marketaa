"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { Logo } from "@/components/logo";

interface User {
  name?: string | null;
  email?: string | null;
}

const navItems = [
  {
    label: "Projects",
    href: "/projects",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
      </svg>
    ),
  },
];

export function DashboardNav({ user }: { user: User }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] flex items-center justify-between px-4 z-50">
        <Link href="/projects">
          <Logo size="sm" className="text-[var(--text-primary)]" />
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-[var(--bg-ink)]/50 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0 w-64 bg-[var(--bg-elevated)] border-r border-[var(--border-subtle)] z-50
          flex flex-col
          transition-transform duration-300 ease-out
          lg:translate-x-0
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo area */}
        <div className="h-16 flex items-center px-5 border-b border-[var(--border-subtle)]">
          <Link href="/projects" className="flex items-center gap-3 group">
            <Logo size="md" className="text-[var(--text-primary)]" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Workspace
          </p>
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${
                    isActive
                      ? "bg-[var(--accent-soft)] text-[var(--accent-primary)] shadow-sm"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                  }
                `}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* AI status indicator */}
        <div className="px-4 py-3 mx-3 mb-3 rounded-lg bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-100">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span className="text-xs font-medium text-sky-800">AI Ready</span>
          </div>
          <p className="text-[10px] text-sky-600/80 mt-1">
            Context enrichment active
          </p>
        </div>

        {/* User section */}
        <div className="p-3 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-sm font-semibold text-slate-600">
              {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                {user.name || "User"}
              </p>
              <p className="text-xs text-[var(--text-tertiary)] truncate">
                {user.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full mt-2 flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Spacer for mobile */}
      <div className="lg:hidden h-14" />
    </>
  );
}
