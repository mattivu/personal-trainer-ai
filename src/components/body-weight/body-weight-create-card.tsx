"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AppCard } from "@/components/ui/app-card";
import { getTodayLocalDate } from "@/lib/nutrition/date";
import { BodyWeightForm } from "./body-weight-form";

export function BodyWeightCreateCard() {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <AppCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
            Registra peso
          </p>
          <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.03em] text-[var(--app-text)]">
            Aggiungi una nuova registrazione
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
            Se per la stessa data esiste gia una registrazione, viene aggiornata.
          </p>
        </div>
      </div>

      {message ? (
        <div className="mt-4 rounded-[18px] border border-[var(--app-primary-border)] bg-[var(--app-primary-soft)] px-4 py-3 text-sm text-[var(--app-primary)]">
          {message}
        </div>
      ) : null}

      <div className="mt-4 rounded-[20px] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
        <BodyWeightForm
          initialValues={{
            date: getTodayLocalDate(),
            weightKg: "",
            notes: "",
          }}
          submitLabel="Registra peso"
          pendingLabel={isRefreshing ? "Aggiornamento..." : "Salvataggio..."}
          endpoint="/api/body-weight"
          method="POST"
          resetOnSave
          onSaved={() => {
            setMessage("Peso registrato.");
            startRefresh(() => {
              router.refresh();
            });
          }}
        />
      </div>
    </AppCard>
  );
}
