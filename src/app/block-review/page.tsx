import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/app-bottom-nav";
import {
  getBlockReviewForUser,
  type BlockReviewLifecycleStatus,
  type BlockReviewSummaryStatus,
} from "@/lib/block-review";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function formatItalianDate(date: Date | null) {
  if (!date) {
    return "Non disponibile";
  }

  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeZone: "Europe/Rome",
  }).format(date);
}

function getLifecycleStatusClasses(status: BlockReviewLifecycleStatus) {
  switch (status) {
    case "In corso":
      return "border-sky-700 bg-sky-950/40 text-sky-200";
    case "Quasi concluso":
      return "border-amber-700 bg-amber-950/40 text-amber-200";
    case "Da revisionare":
      return "border-emerald-700 bg-emerald-950/40 text-emerald-200";
    case "Dati insufficienti":
      return "border-neutral-700 bg-neutral-900 text-neutral-200";
  }
}

function getSummaryStatusClasses(status: BlockReviewSummaryStatus) {
  switch (status) {
    case "Percorso solido":
      return "border-emerald-700 bg-emerald-950/40 text-emerald-200";
    case "Percorso incompleto":
      return "border-sky-700 bg-sky-950/40 text-sky-200";
    case "Fatica elevata":
      return "border-amber-700 bg-amber-950/40 text-amber-200";
    case "Progressi limitati":
      return "border-orange-700 bg-orange-950/40 text-orange-200";
    case "Dati insufficienti":
      return "border-neutral-700 bg-neutral-900 text-neutral-200";
    case "Pronto per revisione":
      return "border-fuchsia-700 bg-fuchsia-950/40 text-fuchsia-200";
  }
}

export default async function BlockReviewPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.onboardingStatus !== "completed") {
    redirect("/onboarding");
  }

  const review = await getBlockReviewForUser(user.id);

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-6 pb-28 text-white sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-4xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              Personal Trainer AI
            </p>
            <h1 className="mt-3 text-3xl font-bold">Revisione del programma</h1>
            <p className="mt-3 max-w-2xl text-sm text-neutral-400">
              Controllo dell&apos;intera fase attiva del programma, senza modifiche automatiche.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-100"
            >
              Dashboard
            </Link>
            <Link
              href="/program"
              className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-100"
            >
              Programma
            </Link>
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-neutral-500">Programma attivo</p>
              <h2 className="mt-2 text-2xl font-semibold">
                {review.activeProgram?.title ?? "Nessun programma attivo"}
              </h2>
              <p className="mt-3 text-sm text-neutral-400">
                Settimana {review.block.currentWeek || 0} di {review.block.durationWeeks || 0}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div
                className={`inline-flex rounded-xl border px-4 py-2 text-sm font-semibold ${getLifecycleStatusClasses(review.block.status)}`}
              >
                {review.block.status}
              </div>
              <div
                className={`inline-flex rounded-xl border px-4 py-2 text-sm font-semibold ${getSummaryStatusClasses(review.summaryStatus)}`}
              >
                {review.summaryStatus}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-sm text-neutral-300 sm:grid-cols-2">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-neutral-500">Durata prevista</p>
              <p className="mt-1 font-semibold text-white">
                {review.block.durationWeeks || 0} settimane
              </p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-neutral-500">Prossima revisione</p>
              <p className="mt-1 font-semibold text-white">
                {formatItalianDate(review.block.plannedReviewAt)}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <p className="text-sm text-neutral-500">Sintesi</p>
            <p className="mt-2 text-sm text-neutral-200">{review.summaries.adherence}</p>
            <p className="mt-2 text-sm text-neutral-300">{review.summaries.progress}</p>
            <p className="mt-2 text-sm text-neutral-400">{review.summaries.criticality}</p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {review.keyMetrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
            >
              <p className="text-sm text-neutral-500">{metric.label}</p>
              <p className="mt-2 text-3xl font-bold">{metric.value}</p>
              <p className="mt-2 text-sm text-neutral-400">{metric.hint}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-xl font-semibold">Raccomandazione</h2>
            <p className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm font-medium text-neutral-100">
              {review.recommendation}
            </p>
            <p className="mt-4 text-sm text-neutral-400">{review.disclaimer}</p>

            {review.cautions.length > 0 ? (
              <div className="mt-5 space-y-3">
                {review.cautions.map((caution) => (
                  <p
                    key={caution}
                    className="rounded-xl border border-amber-800 bg-amber-950/40 px-4 py-3 text-sm text-amber-100"
                  >
                    {caution}
                  </p>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-xl font-semibold">Segnali rilevati</h2>
            {review.signals.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-400">
                Nessun segnale rilevante oltre al normale andamento del programma.
              </p>
            ) : (
              <ul className="mt-4 space-y-3 text-sm text-neutral-200">
                {review.signals.map((signal) => (
                  <li
                    key={signal}
                    className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3"
                  >
                    {signal}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </section>

      <AppBottomNav />
    </main>
  );
}
