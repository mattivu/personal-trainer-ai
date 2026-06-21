"use client";

import { usePathname, useRouter } from "next/navigation";
import { getTodayLocalDate, shiftNutritionDate } from "@/lib/nutrition/date";

type NutritionDateControlsProps = {
  selectedDate: string;
};

export function NutritionDateControls({
  selectedDate,
}: NutritionDateControlsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const today = getTodayLocalDate();
  const previousDate = shiftNutritionDate(selectedDate, -1);
  const nextDate = shiftNutritionDate(selectedDate, 1);
  const canGoNext = selectedDate < today;

  function navigateToDate(date: string) {
    if (date >= today) {
      router.push(pathname);
      return;
    }

    router.push(`${pathname}?date=${date}`);
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--app-muted-2)]">
        Giorno
      </p>

      <label className="block space-y-2 text-sm text-[var(--app-text)]">
        <span className="font-medium text-[var(--app-muted)]">Data</span>
        <input
          type="date"
          value={selectedDate}
          max={today}
          onChange={(event) => navigateToDate(event.target.value)}
          className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-3 text-[var(--app-text)] outline-none transition-colors focus:border-[var(--app-primary-border)]"
        />
      </label>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => navigateToDate(previousDate)}
          className="inline-flex min-h-11 items-center justify-start gap-2 rounded-full border border-transparent px-3 text-sm font-medium text-[var(--app-muted)] transition-colors hover:border-[var(--app-border)] hover:bg-white/[0.03] hover:text-[var(--app-text)]"
        >
          <span aria-hidden="true" className="text-base leading-none">
            &larr;
          </span>
          <span className="truncate">Precedente</span>
        </button>

        <button
          type="button"
          disabled={selectedDate === today}
          onClick={() => navigateToDate(today)}
          className={`inline-flex min-h-11 items-center justify-center rounded-full border px-3 text-sm font-medium transition-colors ${
            selectedDate === today
              ? "border-[var(--app-primary-border)] bg-[var(--app-primary-soft)] text-[var(--app-primary)]"
              : "border-transparent text-[var(--app-muted)] hover:border-[var(--app-border)] hover:bg-white/[0.03] hover:text-[var(--app-text)]"
          }`}
        >
          Oggi
        </button>

        <button
          type="button"
          disabled={!canGoNext}
          onClick={() => navigateToDate(nextDate)}
          className="inline-flex min-h-11 items-center justify-end gap-2 rounded-full border border-transparent px-3 text-sm font-medium text-[var(--app-muted)] transition-colors hover:border-[var(--app-border)] hover:bg-white/[0.03] hover:text-[var(--app-text)] disabled:cursor-default disabled:opacity-40"
        >
          <span className="truncate">Successivo</span>
          <span aria-hidden="true" className="text-base leading-none">
            &rarr;
          </span>
        </button>
      </div>
    </div>
  );
}
