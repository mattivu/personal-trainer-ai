"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "🏠",
    isActive: (pathname: string) => pathname === "/dashboard",
  },
  {
    href: "/program",
    label: "Programma",
    icon: "🏋️",
    isActive: (pathname: string) =>
      pathname === "/program" || pathname.startsWith("/workouts/"),
  },
  {
    href: "/onboarding",
    label: "Obiettivo",
    icon: "🎯",
    isActive: (pathname: string) => pathname.startsWith("/onboarding"),
  },
] as const;

export function AppBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigazione principale app"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur"
    >
      <div className="mx-auto grid w-full max-w-4xl grid-cols-3 gap-2 px-4 py-3">
        {navItems.map((item) => {
          const active = item.isActive(pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-14 flex-col items-center justify-center rounded-xl px-3 py-2 text-center text-xs font-medium transition ${
                active
                  ? "bg-white text-neutral-950"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span className="text-base leading-none" aria-hidden="true">
                {item.icon}
              </span>
              <span className="mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
