"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { getTodayLocalDate } from "@/lib/nutrition/date";
import { BodyWeightForm } from "./body-weight-form";

export function BodyWeightCreateCard() {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div>
      {message ? (
        <div className="mb-4 rounded-2xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      ) : null}

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
          setMessage("Pesata salvata.");
          startRefresh(() => {
            router.refresh();
          });
        }}
      />
    </div>
  );
}
