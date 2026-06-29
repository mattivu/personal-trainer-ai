"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/components/ui/cn";

type LogoutButtonProps = {
  className?: string;
  label?: string;
};

export function LogoutButton({
  className,
  label = "Esci",
}: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("LOGOUT_FAILED");
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setError("Impossibile completare il logout. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className={cn("app-secondary-button", className, loading && "opacity-60")}
        aria-label={loading ? "Uscita in corso" : label}
      >
        {loading ? "Uscita..." : label}
      </button>
      {error ? <p className="text-sm text-[#ff8c8c]">{error}</p> : null}
    </div>
  );
}
