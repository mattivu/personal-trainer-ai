"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path
        d="m4.75 10.75 6.28-5.23a1.5 1.5 0 0 1 1.92 0l6.3 5.23a1.5 1.5 0 0 1 .54 1.16v6.09A1.75 1.75 0 0 1 18.04 19.75H5.96A1.75 1.75 0 0 1 4.2 18V11.9c0-.45.2-.88.55-1.15Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.25 19.75v-4.1c0-.69.56-1.25 1.25-1.25h3c.69 0 1.25.56 1.25 1.25v4.1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProgramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path
        d="M8 5.75h8m-8 0a1.75 1.75 0 0 0-1.75 1.75v10.75c0 .97.78 1.75 1.75 1.75h8c.97 0 1.75-.78 1.75-1.75V7.5A1.75 1.75 0 0 0 16 5.75m-8 0c0 .97.78 1.75 1.75 1.75h4.5c.97 0 1.75-.78 1.75-1.75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.75 11.5h6.5M8.75 15.25h6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CoachIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path
        d="M7 6.25h10A2.75 2.75 0 0 1 19.75 9v5A2.75 2.75 0 0 1 17 16.75h-5.2l-3.87 2.9c-.45.34-1.08.02-1.08-.54v-2.36H7A2.75 2.75 0 0 1 4.25 14V9A2.75 2.75 0 0 1 7 6.25Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.75 11.5h6.5M8.75 8.9h4.25"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NutritionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path
        d="M18.7 6.3c-5.58.1-9.3 2.93-9.3 7.3 0 2.61 1.98 4.9 4.77 4.9 4.36 0 7.03-3.72 7.13-9.2a2.8 2.8 0 0 0-2.57-3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10.4 17.45c1.6-2.38 3.92-4.56 7.3-6.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path
        d="M6.5 8.75H3.75v-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.65 12a7.35 7.35 0 1 0 2.13-5.17L3.75 9.86"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 8.55v3.95l2.72 1.66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: DashboardIcon,
    featured: false,
    isActive: (pathname: string) => pathname === "/dashboard",
  },
  {
    href: "/program",
    label: "Programma",
    icon: ProgramIcon,
    featured: false,
    isActive: (pathname: string) =>
      pathname === "/program" || pathname.startsWith("/workouts/"),
  },
  {
    href: "/coach",
    label: "Coach",
    icon: CoachIcon,
    featured: true,
    isActive: (pathname: string) => pathname.startsWith("/coach"),
  },
  {
    href: "/nutrition",
    label: "Nutrizione",
    icon: NutritionIcon,
    featured: false,
    isActive: (pathname: string) =>
      pathname.startsWith("/nutrition") || pathname.startsWith("/body-weight"),
  },
  {
    href: "/workout-history",
    label: "Storico",
    icon: HistoryIcon,
    featured: false,
    isActive: (pathname: string) =>
      pathname.startsWith("/workout-history") ||
      pathname.startsWith("/weekly-review") ||
      pathname.startsWith("/block-review"),
  },
] as const;

export function AppBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigazione principale app"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-2 pb-[calc(8px+env(safe-area-inset-bottom,0px))]"
    >
      <div className="app-shell-nav pointer-events-auto mx-auto rounded-[24px] border border-white/8 bg-[rgba(10,13,13,0.82)] px-2 py-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.34)] backdrop-blur-[18px]">
        <div className="grid grid-cols-5 gap-0.5">
          {navItems.map((item) => {
            const active = item.isActive(pathname);
            const Icon = item.icon;
            const featured = item.featured === true;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[56px] flex-col items-center justify-center rounded-[18px] px-1 py-1.5 text-center text-[10px] font-semibold transition-colors duration-200 ${
                  active
                    ? "text-[var(--app-primary)]"
                    : "text-[rgba(247,249,250,0.72)] hover:text-white/90"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={`relative flex h-8 w-8 items-center justify-center overflow-visible rounded-full transition-colors duration-200 ${
                    featured
                      ? "bg-transparent"
                      : active
                      ? "bg-[var(--app-primary-soft)] text-[var(--app-primary)]"
                      : "bg-transparent"
                  }`}
                  aria-hidden="true"
                >
                  {featured ? (
                    <span
                      className="app-coach-bubble absolute left-1/2 top-1/2"
                      data-active={active ? "true" : "false"}
                    />
                  ) : null}
                  <span
                    className={`relative z-[1] flex h-full w-full items-center justify-center ${
                      featured ? "text-[#0A0D0D]" : ""
                    }`}
                  >
                    <Icon />
                  </span>
                </span>
                <span className="mt-1 tracking-[0.01em]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
