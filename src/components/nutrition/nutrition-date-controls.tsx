"use client";

import { usePathname, useRouter } from "next/navigation";
import { getTodayLocalDate, shiftNutritionDate } from "@/lib/nutrition/date";

type NutritionDateControlsProps = {
  selectedDate: string;
  maxDate?: string;
  onDateChange?: (date: string) => void;
};

export function NutritionDateControls({
  selectedDate,
  maxDate,
  onDateChange,
}: NutritionDateControlsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const today = maxDate ?? getTodayLocalDate();
  const previousDate = shiftNutritionDate(selectedDate, -1);
  const nextDate = shiftNutritionDate(selectedDate, 1);
  const canGoNext = selectedDate < today;

  function navigateToDate(date: string) {
    if (onDateChange) {
      onDateChange(date >= today ? today : date);
      return;
    }

    if (date >= today) {
      router.push(pathname);
      return;
    }

    router.push(`${pathname}?date=${date}`);
  }

  const headerTitle =
    selectedDate === today
      ? "Oggi"
      : new Intl.DateTimeFormat("it-IT", {
          weekday: "long",
          timeZone: "Europe/Rome",
        })
          .format(new Date(`${selectedDate}T12:00:00Z`))
          .replace(/^./, (value) => value.toUpperCase());
  const headerDate = new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Rome",
  })
    .format(new Date(`${selectedDate}T12:00:00Z`))
    .replace(".", "")
    .replace(/^./, (value) => value.toUpperCase());

  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.02] px-3 py-3 sm:px-4 sm:py-3.5">
      <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-2.5 sm:grid-cols-[44px_minmax(0,1fr)_44px]">
        <button
          type="button"
          onClick={() => navigateToDate(previousDate)}
          aria-label="Vai al giorno precedente"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] border border-white/8 bg-white/[0.03] text-[var(--app-text)] transition-colors hover:border-[var(--app-primary-border)] hover:bg-white/[0.05] sm:h-11 sm:w-11"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            &larr;
          </span>
        </button>

        <div className="min-w-0 text-center">
          <p className="text-[24px] font-semibold leading-none tracking-[-0.05em] text-[var(--app-text)] sm:text-[28px]">
            {headerTitle}
          </p>
          <p className="mt-1 text-xs text-[var(--app-muted)] sm:text-[13px]">{headerDate}</p>
          <label className="relative mt-2 inline-flex items-center justify-center overflow-hidden rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)] sm:text-[11px]">
            <span>Seleziona data</span>
            <input
              type="date"
              value={selectedDate}
              max={today}
              onChange={(event) => navigateToDate(event.target.value)}
              aria-label="Seleziona data"
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>

        <button
          type="button"
          disabled={!canGoNext}
          onClick={() => navigateToDate(nextDate)}
          aria-label="Vai al giorno successivo"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] border border-white/8 bg-white/[0.03] text-[var(--app-text)] transition-colors hover:border-[var(--app-primary-border)] hover:bg-white/[0.05] disabled:cursor-default disabled:opacity-40 sm:h-11 sm:w-11"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            &rarr;
          </span>
        </button>
      </div>
    </div>
  );
}
