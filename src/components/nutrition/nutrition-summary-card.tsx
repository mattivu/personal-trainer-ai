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
  activityTitle?: string | null;
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
  activityTitle,
}: NutritionSummaryCardProps) {
  const safeProgress = clampPercent(progressPercent);
  const circleRadius = 50;
  const circleLength = 2 * Math.PI * circleRadius;
  const dashOffset = circleLength - (safeProgress / 100) * circleLength;
  const showActivityCard = activityCalories > 0 || Boolean(activityTitle);

  return (
    <div className="space-y-2.5">
      <AppCard className="overflow-hidden border-white/8 bg-[#101515] p-4 sm:p-4.5">
        <div className="grid grid-cols-[132px_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[154px_minmax(0,1fr)] sm:gap-5">
          <div className="relative mx-auto h-[132px] w-[132px] sm:h-[154px] sm:w-[154px]">
            <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
              <circle
                cx="64"
                cy="64"
                r={circleRadius}
                fill="none"
                stroke="rgba(247,249,250,0.08)"
                strokeWidth="9"
              />
              {safeProgress > 0 ? (
                <circle
                  cx="64"
                  cy="64"
                  r={circleRadius}
                  fill="none"
                  stroke="var(--app-primary)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={circleLength}
                  strokeDashoffset={dashOffset}
                />
              ) : null}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex w-[76%] flex-col items-center justify-center gap-1.5 text-center">
                <p className="font-metrics text-[24px] font-semibold leading-none tracking-[-0.05em] text-[var(--app-text)] sm:text-[28px]">
                  {formatNumber(remainingCalories)}
                </p>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--app-muted)] sm:text-[12px]">
                  Rimanenti
                </p>
              </div>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--app-muted-2)]">
              Riepilogo calorie
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--app-muted-2)]">
                  Target
                </p>
                <p className="font-metrics mt-1 text-[22px] font-semibold leading-none tracking-[-0.05em] text-[var(--app-text)] sm:text-[24px]">
                  {formatNumber(targetCalories)} kcal
                </p>
              </div>
              <div className="h-px w-full bg-white/8" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--app-muted-2)]">
                  Consumate
                </p>
                <p
                  className={`font-metrics mt-1 text-[22px] font-semibold leading-none tracking-[-0.05em] sm:text-[24px] ${
                    consumedCalories > 0
                      ? "text-[var(--app-primary)]"
                      : "text-[var(--app-text)]"
                  }`}
                >
                  {formatNumber(consumedCalories)} kcal
                </p>
              </div>
            </div>
          </div>
        </div>
      </AppCard>

      <div className="grid grid-cols-3 gap-2">
        {macroSummaries.map((macro) => {
          const percent =
            macro.target > 0 ? clampPercent((macro.consumed / macro.target) * 100) : 0;

          return (
            <AppCard
              key={macro.label}
              className="border-white/8 bg-[#101515] p-2.5 sm:p-3"
            >
              <div className="space-y-2">
                <p className="truncate text-xs font-semibold text-[var(--app-text)] sm:text-[13px]">
                  {macro.label}
                </p>
                <ProgressBar value={percent} className="h-[6px] bg-white/6" />
                <p className="font-metrics text-[11px] text-[var(--app-muted)] sm:text-xs">
                  {formatNutritionNumber(macro.consumed)} /{" "}
                  {formatNutritionNumber(macro.target)} g
                </p>
              </div>
            </AppCard>
          );
        })}
      </div>

      {showActivityCard ? (
        <AppCard className="border-white/8 bg-[#101515] p-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] border border-[rgba(208,216,43,0.18)] bg-[rgba(208,216,43,0.08)] text-[var(--app-primary)]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 10v4" />
                  <path d="M7 7v10" />
                  <path d="M17 7v10" />
                  <path d="M21 10v4" />
                  <path d="M5 10h4" />
                  <path d="M15 10h4" />
                  <path d="M9 6h6" />
                  <path d="M9 18h6" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--app-text)]">
                  {activityTitle ? `Attivita · ${activityTitle}` : "Attivita"}
                </p>
                <p className="text-xs text-[var(--app-muted)]">
                  Stimate dall&apos;allenamento
                </p>
              </div>
            </div>
            <p
              className={`font-metrics shrink-0 text-[22px] font-semibold tracking-[-0.05em] ${
                activityCalories > 0
                  ? "text-[var(--app-primary)]"
                  : "text-[var(--app-text)]"
              }`}
            >
              {activityCalories > 0
                ? `+${formatNumber(activityCalories)}`
                : `${formatNumber(activityCalories)} kcal`}
            </p>
          </div>
        </AppCard>
      ) : null}
    </div>
  );
}
