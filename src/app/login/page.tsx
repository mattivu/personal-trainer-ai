"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  const [result, setResult] = useState<LoginResponse | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);

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
      setResult(data);

      if (data.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setResult({
        ok: false,
        message: "Errore di connessione. Riprova.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-6 py-12">
      <section className="w-full max-w-md">
        <p className="text-sm uppercase tracking-[0.3em] text-neutral-500 mb-4">
          Personal Trainer AI
        </p>

        <h1 className="text-3xl font-bold mb-3">Accedi</h1>

        <p className="text-neutral-400 mb-8">
          Entra nel tuo account per continuare il percorso di allenamento.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-2">
              Email
            </label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-white"
              placeholder="nome@email.it"
              type="email"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-2">
              Password
            </label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-white"
              placeholder="La tua password"
              type="password"
              autoComplete="current-password"
            />
          </div>

          <button
            disabled={loading}
            className="w-full rounded-xl bg-white text-neutral-950 font-semibold px-4 py-3 disabled:opacity-50"
          >
            {loading ? "Accesso in corso..." : "Accedi"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-400">
          Non hai ancora un account?{" "}
          <Link href="/register" className="font-medium text-white hover:underline">
            Registrati
          </Link>
        </p>

        {result && !result.ok && (
          <div className="mt-6 rounded-xl border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">
            <p>{result.message}</p>
          </div>
        )}
      </section>
    </main>
  );
}
