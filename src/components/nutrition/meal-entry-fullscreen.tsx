"use client";

import type { MealType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MealEntryForm, type MealEntryTab } from "@/components/nutrition/meal-entry-form";
import { getMealTypeLabel } from "@/lib/nutrition/meals";

type MealEntryFullscreenProps = {
  open: boolean;
  date: string;
  mealType: MealType;
  closeHref: string;
};

const TABS: Array<{ value: MealEntryTab; label: string }> = [
  { value: "estimate", label: "Stima AI" },
  { value: "manual", label: "Seleziona" },
  { value: "barcode", label: "Barcode" },
];

export function MealEntryFullscreen({
  open,
  date,
  mealType,
  closeHref,
}: MealEntryFullscreenProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MealEntryTab>("estimate");

  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveTab("estimate");
  }, [open, mealType, date]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  function handleClose() {
    router.replace(closeHref, { scroll: false });
  }

  function handleSaved() {
    router.replace(closeHref, { scroll: false });
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[70] bg-[#0A0D0D] text-[var(--app-text)] backdrop-blur-xl">
      <div className="mx-auto flex h-dvh min-h-dvh w-full max-w-md flex-col px-4 py-4">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div
            className="shrink-0 rounded-t-[32px] border-b border-white/8 bg-[#0A0D0D] px-4 pb-4 backdrop-blur-xl"
            style={{
              paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-xl text-[var(--app-text)] transition-colors hover:bg-white/[0.06]"
                aria-label="Chiudi aggiunta pasto"
              >
                ←
              </button>

              <div className="min-w-0 flex-1 text-center">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--app-muted-2)]">
                  Aggiungi pasto
                </p>
                <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-[var(--app-text)]">
                  Aggiungi pasto
                </h1>
                <p className="mt-1 text-sm text-[var(--app-muted)]">
                  {getMealTypeLabel(mealType)}
                </p>
              </div>

              <div className="h-11 w-11 shrink-0" aria-hidden="true" />
            </div>

            <div className="mt-4 rounded-full border border-white/8 bg-white/[0.03] p-1">
              <div className="grid grid-cols-3 gap-1">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.value;

                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setActiveTab(tab.value)}
                      className={`min-h-11 whitespace-nowrap rounded-full px-3 text-sm font-semibold transition-colors ${
                        isActive
                          ? "bg-[var(--app-primary)] text-[#0A0D0D]"
                          : "text-[var(--app-muted)] hover:bg-white/[0.05] hover:text-[var(--app-text)]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-5"
            style={{
              paddingBottom: "calc(7rem + env(safe-area-inset-bottom, 0px))",
            }}
          >
            <MealEntryForm
              key={`${date}-${mealType}`}
              date={date}
              mealType={mealType}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onSaved={handleSaved}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
