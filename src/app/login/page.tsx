"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthField, AuthInput, AuthShell } from "@/components/auth/auth-shell";
import { PasswordInput } from "@/components/auth/password-input";

type LoginResponse = {
  ok: boolean;
  message: string;
  user?: {
    id: number;
    name: string | null;
    email: string;
    onboardingStatus: string;
  };
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = (await response.json()) as LoginResponse;

      if (data.ok && data.user) {
        router.push(
          data.user.onboardingStatus === "completed"
            ? "/dashboard"
            : "/onboarding"
        );
        router.refresh();
        return;
      }

      setError(data.message);
    } catch {
      setError("Errore di connessione. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Accedi"
      subtitle="Riprendi il tuo percorso di allenamento."
      footerPrompt="Non hai un account?"
      footerHref="/register"
      footerLabel="Registrati"
      error={error}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="Email">
          <AuthInput
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nome@email.it"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
          />
        </AuthField>

        <AuthField label="Password">
          <PasswordInput
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="La tua password"
            autoComplete="current-password"
            required
          />
        </AuthField>

        <button
          type="submit"
          disabled={loading}
          className="app-primary-button w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Accesso in corso..." : "Accedi"}
        </button>
      </form>
    </AuthShell>
  );
}
