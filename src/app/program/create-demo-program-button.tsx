"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DemoProgramResponse = {
  ok?: boolean;
  code?: string;
  message?: string;
  error?: string;
  programId?: number;
};

type CreateDemoProgramButtonProps = {
  label?: string;
};

function getProgramCreationErrorMessage(message: string | undefined) {
  if (!message) {
    return "Errore durante la creazione del blocco di allenamento.";
  }

  if (message.toLowerCase().includes("programma incoerente")) {
    return "Non sono riuscito a creare un blocco coerente con i giorni selezionati. Controlla il questionario o riprova.";
  }

  return message;
}

async function parseApiResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  const rawBody = await response.text();
  const trimmedBody = rawBody.trim();

  if (contentType.includes("application/json")) {
    try {
      const data = JSON.parse(rawBody) as DemoProgramResponse;

      return {
        data,
        message: data.message ?? data.error,
      };
    } catch {
      return {
        data: null,
        message: trimmedBody
          ? `Il server ha restituito JSON non valido: ${trimmedBody}`
          : "Il server ha restituito JSON non valido.",
      };
    }
  }

  if (trimmedBody.startsWith("{") || trimmedBody.startsWith("[")) {
    try {
      const data = JSON.parse(trimmedBody) as DemoProgramResponse;

      return {
        data,
        message: data.message ?? data.error,
      };
    } catch {
      // Continue with the non-JSON fallback below.
    }
  }

  return {
    data: null,
    message: trimmedBody
      ? `Il server ha restituito una risposta non valida: ${trimmedBody}`
      : "Il server ha restituito una risposta non valida.",
  };
}

export function CreateDemoProgramButton({
  label = "Crea il tuo primo blocco di allenamento",
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
        if (
          response.status === 409 ||
          data?.code === "ACTIVE_PROGRAM_ALREADY_CURRENT"
        ) {
          throw new Error(
            "Il programma attivo è già allineato al questionario attuale."
          );
        }

        throw new Error(
          getProgramCreationErrorMessage(message)
        );
      }

      const params = new URLSearchParams({
        created: "1",
        t: Date.now().toString(),
      });

      if (typeof data.programId === "number") {
        params.set("programId", data.programId.toString());
      }

      router.replace(`/program?${params.toString()}`);
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
        {loading ? "Creazione blocco..." : label}
      </button>

      {error ? (
        <p className="rounded-xl border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
