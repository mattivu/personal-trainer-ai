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
    <div className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
          Diario del giorno
        </p>
      </div>

      <label className="block space-y-2 text-sm text-neutral-200">
        <span>Data</span>
        <input
          type="date"
          value={selectedDate}
          max={today}
          onChange={(event) => navigateToDate(event.target.value)}
          className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none"
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => navigateToDate(previousDate)}
          className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-3 text-sm font-semibold text-neutral-100"
        >
          Giorno precedente
        </button>

        <button
          type="button"
          disabled={selectedDate === today}
          onClick={() => navigateToDate(today)}
          className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-3 text-sm font-semibold text-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-500"
        >
          Oggi
        </button>

        <button
          type="button"
          disabled={!canGoNext}
          onClick={() => navigateToDate(nextDate)}
          className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-3 text-sm font-semibold text-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-500"
        >
          Giorno successivo
        </button>
      </div>
    </div>
  );
}
