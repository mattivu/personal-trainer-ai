"use client";

import { FormEvent, useState } from "react";

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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RegisterResponse | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);

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
      setResult(data);

      if (data.ok) {
        setName("");
        setEmail("");
        setPassword("");
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

        <h1 className="text-3xl font-bold mb-3">
          Crea il tuo account
        </h1>

        <p className="text-neutral-400 mb-8">
          Primo test tecnico: registrazione utente con salvataggio sicuro nel database.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-2">
              Nome
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-white"
              placeholder="Mario Rossi"
              autoComplete="name"
            />
          </div>

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
              placeholder="Minimo 8 caratteri"
              type="password"
              autoComplete="new-password"
            />
          </div>

          <button
            disabled={loading}
            className="w-full rounded-xl bg-white text-neutral-950 font-semibold px-4 py-3 disabled:opacity-50"
          >
            {loading ? "Creazione account..." : "Crea account"}
          </button>
        </form>

        {result && (
          <div
            className={`mt-6 rounded-xl border px-4 py-3 text-sm ${
              result.ok
                ? "border-green-800 bg-green-950 text-green-200"
                : "border-red-800 bg-red-950 text-red-200"
            }`}
          >
            <p>{result.message}</p>

            {result.ok && result.user && (
              <p className="mt-2 text-xs opacity-80">
                Utente creato: #{result.user.id} — {result.user.email}
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
