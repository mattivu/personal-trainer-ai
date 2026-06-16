"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DemoProgramResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
  programId?: number;
};

type CreateDemoProgramButtonProps = {
  label?: string;
};

async function parseApiResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const data = (await response.json()) as DemoProgramResponse;

    return {
      data,
      message: data.message ?? data.error,
    };
  }

  const text = (await response.text()).trim();

  return {
    data: null,
    message: text
      ? `Il server ha restituito una risposta non valida: ${text}`
      : "Il server ha restituito una risposta non valida.",
  };
}

export function CreateDemoProgramButton({
  label = "Crea programma demo",
}: CreateDemoProgramButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateProgram() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/training/demo-program", {
        method: "POST",
      });

      const { data, message } = await parseApiResponse(response);

      if (!response.ok || !data?.ok) {
        throw new Error(
          message ?? "Errore durante la generazione del programma demo."
        );
      }

      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Errore di connessione. Riprova."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <button
        type="button"
        onClick={handleCreateProgram}
        disabled={loading}
        className="inline-flex justify-center rounded-xl bg-white px-5 py-3 font-semibold text-neutral-950 disabled:opacity-50"
      >
        {loading ? "Generazione programma..." : label}
      </button>

      {error ? (
        <p className="rounded-xl border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
