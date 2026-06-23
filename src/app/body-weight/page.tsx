import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { BodyWeightCreateCard } from "@/components/body-weight/body-weight-create-card";
import { BodyWeightList } from "@/components/body-weight/body-weight-list";
import { AppCard } from "@/components/ui/app-card";
import { AppBadge } from "@/components/ui/app-badge";
import { AppPage } from "@/components/ui/app-page";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import {
  formatBodyWeightDelta,
  getBodyWeightOverviewForUser,
  getBodyWeightTrendLabel,
} from "@/lib/body-weight";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function formatWeight(value: number | null) {
  if (value === null) {
    return "—";
  }

  return `${new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)} kg`;
}

function formatCompactDate(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Rome",
  }).format(date);
}

function getDeltaMeta(
  summary: Awaited<ReturnType<typeof getBodyWeightOverviewForUser>>["summary"],
  entryCount: number
) {
  if (summary.change7DaysKg !== null) {
    return {
      value: summary.change7DaysKg,
      label: "ultimi 7 giorni",
    };
  }

  if (summary.totalChangeKg !== null && entryCount > 1) {
    return {
      value: summary.totalChangeKg,
      label: "dal primo dato",
    };
  }

  return null;
}

function getChartModel(entries: Array<{ weightKg: number; date: Date }>) {
  if (entries.length === 0) {
    return null;
  }

  const chartEntries = entries.slice(-7);
  const width = 320;
  const height = 132;
  const paddingX = 12;
  const paddingY = 18;
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;
  const weights = chartEntries.map((entry) => entry.weightKg);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const weightRange = maxWeight - minWeight || 1;
  const stepX = chartEntries.length > 1 ? usableWidth / (chartEntries.length - 1) : 0;

  const points = chartEntries.map((entry, index) => {
    const x = paddingX + stepX * index;
    const y = paddingY + ((maxWeight - entry.weightKg) / weightRange) * usableHeight;

    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      dateLabel: formatCompactDate(entry.date),
      weightLabel: formatWeight(entry.weightKg),
    };
  });

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = [
    `M ${points[0]?.x ?? paddingX} ${height - paddingY}`,
    ...points.map((point) => `L ${point.x} ${point.y}`),
    `L ${points.at(-1)?.x ?? width - paddingX} ${height - paddingY}`,
    "Z",
  ].join(" ");

  return {
    width,
    height,
    points,
    polyline,
    area,
    minLabel: formatWeight(minWeight),
    maxLabel: formatWeight(maxWeight),
  };
}

export default async function BodyWeightPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.onboardingStatus !== "completed") {
    redirect("/onboarding");
  }

  const overview = await getBodyWeightOverviewForUser(user.id);
  const hasEntries = overview.entries.length > 0;
  const timelineEntries = [...overview.entries].reverse();
  const latestEntry = timelineEntries.at(-1) ?? null;
  const deltaMeta = getDeltaMeta(overview.summary, timelineEntries.length);
  const chart = getChartModel(
    timelineEntries.map((entry) => ({
      weightKg: entry.weightKg,
      date: entry.date,
    }))
  );

  return (
    <AppPage className="pb-28 pt-5">
      <section className="space-y-4">
        <PageHeader
          eyebrow="Progressi corpo"
          title="Peso"
          description="Monitora l'andamento nel tempo."
          meta={
            hasEntries ? (
              <AppBadge tone="accent">
                {getBodyWeightTrendLabel(overview.summary.trend)}
              </AppBadge>
            ) : null
          }
        />

        <AppCard className="overflow-hidden p-0">
          <div className="bg-[linear-gradient(165deg,var(--app-surface-2)_0%,#101314_55%,#0f1213_100%)] px-[18px] py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-[var(--app-muted-2)]">
                  {hasEntries ? "Peso attuale" : "Progressi corpo"}
                </p>
                <h2 className="mt-2 font-metrics text-[42px] font-semibold leading-none tracking-[-0.04em] text-[var(--app-text)]">
                  {formatWeight(overview.summary.latestWeightKg)}
                </h2>
              </div>

              {deltaMeta ? (
                <div className="shrink-0 self-center text-right">
                  <p className="font-metrics text-[20px] font-semibold leading-none tracking-[-0.03em] text-[var(--app-primary)]">
                    {formatBodyWeightDelta(deltaMeta.value)}
                  </p>
                  <p className="mt-1 text-[11px] font-medium leading-none text-[var(--app-muted)]">
                    {deltaMeta.label}
                  </p>
                </div>
              ) : (
                <div className="shrink-0 self-center text-right">
                  <p className="text-[11px] font-medium text-[var(--app-muted)]">
                    {hasEntries ? "Primo dato registrato" : "Inizia da qui"}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 rounded-[20px] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3">
              {chart ? (
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3 text-[11px] font-medium text-[var(--app-muted)]">
                    <span>{chart.maxLabel}</span>
                    <span>{chart.minLabel}</span>
                  </div>
                  <svg
                    viewBox={`0 0 ${chart.width} ${chart.height}`}
                    className="h-[132px] w-full"
                    aria-label="Andamento peso"
                    role="img"
                  >
                    <defs>
                      <linearGradient id="body-weight-area" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="rgba(208,216,43,0.22)" />
                        <stop offset="100%" stopColor="rgba(208,216,43,0)" />
                      </linearGradient>
                    </defs>
                    <path
                      d={chart.area}
                      fill="url(#body-weight-area)"
                    />
                    <polyline
                      points={chart.polyline}
                      fill="none"
                      stroke="#D0D82B"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {chart.points.map((point, index) => (
                      <g key={`${point.x}-${point.y}`}>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={index === chart.points.length - 1 ? 4.5 : 3}
                          fill="#D0D82B"
                        />
                      </g>
                    ))}
                  </svg>
                  <div className="mt-3 flex items-center justify-between gap-3 overflow-hidden text-[11px] font-medium text-[var(--app-muted)]">
                    <span>{chart.points[0]?.dateLabel}</span>
                    <span>{chart.points.at(-1)?.dateLabel}</span>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[132px] items-center justify-center rounded-[16px] border border-dashed border-white/10 bg-white/[0.02] px-4 text-center text-sm text-[var(--app-muted)]">
                  Nessun peso registrato. Registra il primo dato per seguire l&apos;andamento.
                </div>
              )}
            </div>

            {latestEntry ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[18px] border border-[var(--app-border)] bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                    Ultima registrazione
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--app-text)]">
                    {formatCompactDate(latestEntry.date)}
                  </p>
                </div>
                <div className="rounded-[18px] border border-[var(--app-border)] bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                    Variazione totale
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--app-text)]">
                    {formatBodyWeightDelta(overview.summary.totalChangeKg)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </AppCard>

        {!hasEntries ? (
          <AppCard className="p-4">
            <EmptyState
              title="Nessun peso registrato"
              description="Registra il primo peso per seguire l'andamento nel tempo."
            />
          </AppCard>
        ) : null}

        <BodyWeightCreateCard />

        <AppCard className="p-4">
          <SectionHeader
            eyebrow="Storico pesate"
            title={hasEntries ? "Ultime registrazioni" : "Storico"}
          />
          <p className="mt-[-2px] text-sm text-[var(--app-muted)]">
            {hasEntries
              ? "Le 3 registrazioni piu recenti restano in primo piano."
              : "Qui appariranno le ultime registrazioni appena salvi il primo peso."}
          </p>
          <div className="mt-4">
            <BodyWeightList entries={overview.entries} />
          </div>
        </AppCard>
      </section>
      <AppBottomNav />
    </AppPage>
  );
}
