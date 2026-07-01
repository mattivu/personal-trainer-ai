"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthField, AuthInput, AuthShell } from "@/components/auth/auth-shell";
import { PasswordInput } from "@/components/auth/password-input";

type RegisterResponse = {
  ok: boolean;
  message: string;
  user?: {
    id: number;
    name: string | null;
    email: string;
    onboardingStatus: string;
  };
};

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Le password non coincidono.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = (await response.json()) as RegisterResponse;

      if (data.ok) {
        router.push("/onboarding");
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
      title="Crea il tuo account"
      subtitle="Inizia a costruire il tuo programma personalizzato."
      footerPrompt="Hai gia un account?"
      footerHref="/login"
      footerLabel="Accedi"
      error={error}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="Nome">
          <AuthInput
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Mario Rossi"
            autoComplete="name"
            required
            minLength={2}
          />
        </AuthField>

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
            placeholder="Minimo 8 caratteri"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </AuthField>

        <AuthField label="Conferma password">
          <PasswordInput
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Ripeti la password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </AuthField>

        <button
          type="submit"
          disabled={loading}
          className="app-primary-button w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creazione account..." : "Crea account"}
        </button>
      </form>
    </AuthShell>
  );
}
