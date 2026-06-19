"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M4 12.5 12 5l8 7.5v6a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path d="M9.5 20v-4.5h5V20" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function ProgramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M4 8.5h16M6.5 5h11A1.5 1.5 0 0 1 19 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5v-11A1.5 1.5 0 0 1 6.5 5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path d="M8 12h8M8 15.5h5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function CoachIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M5.5 6.5h13A1.5 1.5 0 0 1 20 8v7a1.5 1.5 0 0 1-1.5 1.5H11l-4.5 3v-3H5.5A1.5 1.5 0 0 1 4 15V8a1.5 1.5 0 0 1 1.5-1.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path d="M8.5 11.5h7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function NutritionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M8 5v6M12 5v6M16 5v6M8 11c0 4.2 1.5 6.6 4 8 2.5-1.4 4-3.8 4-8"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M19 8.5A7 7 0 1 0 21 13"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path d="M19 4v4.5h-4.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9v4l2.5 1.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: DashboardIcon,
    isActive: (pathname: string) => pathname === "/dashboard",
  },
  {
    href: "/program",
    label: "Programma",
    icon: ProgramIcon,
    isActive: (pathname: string) =>
      pathname === "/program" || pathname.startsWith("/workouts/"),
  },
  {
    href: "/coach",
    label: "Coach",
    icon: CoachIcon,
    isActive: (pathname: string) => pathname.startsWith("/coach"),
  },
  {
    href: "/nutrition",
    label: "Nutrizione",
    icon: NutritionIcon,
    isActive: (pathname: string) =>
      pathname.startsWith("/nutrition") || pathname.startsWith("/body-weight"),
  },
  {
    href: "/workout-history",
    label: "Storico",
    icon: HistoryIcon,
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
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(14px+env(safe-area-inset-bottom,0px))]"
    >
      <div className="pointer-events-auto mx-auto w-full max-w-[520px] rounded-[28px] border border-white/8 bg-[rgba(10,13,13,0.84)] p-2 shadow-[0_18px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl">
        <div className="grid grid-cols-5 gap-1">
        {navItems.map((item) => {
          const active = item.isActive(pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[64px] flex-col items-center justify-center rounded-[22px] px-2 py-2 text-center text-[11px] font-semibold tracking-[0.01em] transition ${
                active
                  ? "bg-[var(--app-primary-soft)] text-[var(--app-primary)]"
                  : "text-white/45 hover:bg-white/5 hover:text-white"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  active ? "bg-[var(--app-primary)] text-[var(--app-bg)]" : "bg-transparent"
                }`}
                aria-hidden="true"
              >
                <Icon />
              </span>
              <span className="mt-1">{item.label}</span>
            </Link>
          );
        })}
        </div>
      </div>
    </nav>
  );
}
