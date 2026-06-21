import { AppCard } from "@/components/ui/app-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatNutritionNumber } from "@/lib/nutrition/meals";

type MacroSummary = {
  label: string;
  consumed: number;
  target: number;
};

type NutritionSummaryCardProps = {
  consumedCalories: number;
  remainingCalories: number;
  activityCalories: number;
  targetCalories: number;
  progressPercent: number;
  macroSummaries: MacroSummary[];
  statusNote?: string | null;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("it-IT").format(value);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function NutritionSummaryCard({
  consumedCalories,
  remainingCalories,
  activityCalories,
  targetCalories,
  progressPercent,
  macroSummaries,
  statusNote,
}: NutritionSummaryCardProps) {
  const safeProgress = clampPercent(progressPercent);
  const circleRadius = 66;
  const circleLength = 2 * Math.PI * circleRadius;
  const dashOffset = circleLength - (safeProgress / 100) * circleLength;

  return (
    <AppCard className="overflow-hidden p-0">
      <div className="bg-[radial-gradient(circle_at_top,_rgba(208,216,43,0.2),_transparent_48%)] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--app-muted-2)]">
              Riepilogo calorie
            </p>
            <p className="mt-1 text-sm text-[var(--app-muted)]">
              Target {formatNumber(targetCalories)} kcal
            </p>
          </div>
          <div className="rounded-full border border-[var(--app-border)] bg-black/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--app-primary)]">
            {formatNumber(safeProgress)}%
          </div>
        </div>

        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_180px_minmax(0,1fr)] items-center gap-3">
          <div className="space-y-1 text-left">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--app-muted-2)]">
              Mangiate
            </p>
            <p className="font-metrics text-[28px] font-semibold tracking-[-0.04em] text-[var(--app-text)]">
              {formatNumber(consumedCalories)}
            </p>
            <p className="text-xs text-[var(--app-muted)]">kcal registrate</p>
          </div>

          <div className="relative mx-auto h-[180px] w-[180px]">
            <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
              <circle
                cx="90"
                cy="90"
                r={circleRadius}
                fill="none"
                stroke="rgba(247,249,250,0.08)"
                strokeWidth="14"
                strokeLinecap="round"
              />
              {safeProgress > 0 ? (
                <circle
                  cx="90"
                  cy="90"
                  r={circleRadius}
                  fill="none"
                  stroke="var(--app-primary)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={circleLength}
                  strokeDashoffset={dashOffset}
                />
              ) : null}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center justify-center gap-1 text-center">
                <p className="font-metrics text-[36px] font-semibold leading-[0.9] tracking-[-0.05em] text-[var(--app-text)]">
                  {formatNumber(remainingCalories)}
                </p>
                <p className="text-sm font-medium leading-none text-[var(--app-muted)]">
                  Rimanenti
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1 text-right">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--app-muted-2)]">
              Attività
            </p>
            <p className="font-metrics text-[28px] font-semibold tracking-[-0.04em] text-[var(--app-text)]">
              {formatNumber(activityCalories)}
            </p>
            <p className="text-xs text-[var(--app-muted)]">kcal stimate</p>
          </div>
        </div>

        <div className="mt-4 rounded-[20px] border border-[var(--app-border)] bg-black/20 p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {macroSummaries.map((macro) => {
              const percent =
                macro.target > 0 ? clampPercent((macro.consumed / macro.target) * 100) : 0;

              return (
                <div key={macro.label} className="space-y-3">
                  <p className="text-sm font-semibold text-[var(--app-text)]">
                    {macro.label}
                  </p>
                  <p className="font-metrics text-sm text-[var(--app-muted)]">
                    {formatNutritionNumber(macro.consumed)} /{" "}
                    {formatNutritionNumber(macro.target)} g
                  </p>
                  <ProgressBar value={percent} className="h-[8px] bg-white/6" />
                </div>
              );
            })}
          </div>
        </div>

        {statusNote ? (
          <p className="mt-3 text-sm text-[var(--app-muted)]">{statusNote}</p>
        ) : null}
      </div>
    </AppCard>
  );
}
