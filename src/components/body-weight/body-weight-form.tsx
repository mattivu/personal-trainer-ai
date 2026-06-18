"use client";

import { useState } from "react";
import {
  BODY_WEIGHT_NOTES_MAX_LENGTH,
  validateBodyWeightInput,
} from "@/lib/body-weight-shared";

type BodyWeightFormValues = {
  date: string;
  weightKg: string;
  notes: string;
};

type SaveResponse =
  | {
      ok: true;
    }
  | {
      ok: false;
      message?: string;
    };

type BodyWeightFormProps = {
  initialValues: BodyWeightFormValues;
  submitLabel: string;
  pendingLabel: string;
  endpoint: string;
  method: "POST" | "PATCH";
  onSaved: () => void | Promise<void>;
  onCancel?: () => void;
  resetOnSave?: boolean;
};

async function parseApiResponse<T>(response: Response) {
  const rawBody = await response.text();
  const trimmedBody = rawBody.trim();

  if (!trimmedBody) {
    return {
      ok: false,
      message: "Risposta vuota dal server.",
    } as T;
  }

  try {
    return JSON.parse(trimmedBody) as T;
  } catch {
    return {
      ok: false,
      message: trimmedBody,
    } as T;
  }
}

export function BodyWeightForm({
  initialValues,
  submitLabel,
  pendingLabel,
  endpoint,
  method,
  onSaved,
  onCancel,
  resetOnSave = false,
}: BodyWeightFormProps) {
  const [form, setForm] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validatedInput = validateBodyWeightInput({
      date: form.date,
      weightKg: form.weightKg,
      notes: form.notes,
    });

    if (!validatedInput.ok) {
      setError(validatedInput.message);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validatedInput.value),
      });
      const payload = await parseApiResponse<SaveResponse>(response);

      if (!response.ok || !payload.ok) {
        setError(
          !payload.ok
            ? payload.message ?? "Impossibile salvare la pesata."
            : "Impossibile salvare la pesata."
        );
        return;
      }

      if (resetOnSave) {
        setForm(initialValues);
      }

      await onSaved();
    } catch {
      setError("Errore di rete durante il salvataggio della pesata.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-neutral-200">
          <span>Data</span>
          <input
            type="date"
            value={form.date}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                date: event.target.value,
              }))
            }
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none"
            required
          />
        </label>

        <label className="space-y-2 text-sm text-neutral-200">
          <span>Peso kg</span>
          <input
            type="number"
            inputMode="decimal"
            min="20"
            max="300"
            step="0.1"
            value={form.weightKg}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                weightKg: event.target.value,
              }))
            }
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none"
            required
          />
        </label>
      </div>

      <label className="block space-y-2 text-sm text-neutral-200">
        <span>Note opzionali</span>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              notes: event.target.value,
            }))
          }
          maxLength={BODY_WEIGHT_NOTES_MAX_LENGTH}
          className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none"
          placeholder="Ad esempio: stessa bilancia, mattina a digiuno"
        />
        <span className="block text-right text-xs text-neutral-500">
          {form.notes.length}/{BODY_WEIGHT_NOTES_MAX_LENGTH}
        </span>
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex justify-center rounded-xl bg-white px-5 py-3 font-semibold text-neutral-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? pendingLabel : submitLabel}
        </button>

        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex justify-center rounded-xl border border-neutral-700 px-5 py-3 font-semibold text-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Annulla
          </button>
        ) : null}
      </div>
    </form>
  );
}
