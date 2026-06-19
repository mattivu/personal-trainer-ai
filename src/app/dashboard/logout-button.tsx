"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LogoutButtonProps = {
  initial?: string;
};

export function LogoutButton({ initial = "U" }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(150deg,#1f2426,#14181a)] text-[15px] font-bold text-[var(--app-primary)] shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition hover:border-white/15 disabled:opacity-50"
      aria-label={loading ? "Uscita in corso" : "Logout"}
    >
      {loading ? "..." : initial.slice(0, 1).toUpperCase()}
    </button>
  );
}
