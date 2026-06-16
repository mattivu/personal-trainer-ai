"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
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
      className="rounded-xl border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-100 hover:border-neutral-400 disabled:opacity-50"
    >
      {loading ? "Uscita..." : "Logout"}
    </button>
  );
}
