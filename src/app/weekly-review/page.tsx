import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { getCurrentUser } from "@/lib/session";
import { getWeeklyReviewForUser, type WeeklyReviewStatus } from "@/lib/weekly-review";

export const dynamic = "force-dynamic";

function formatItalianDate(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeZone: "Europe/Rome",
  }).format(date);
}

function getStatusClasses(status: WeeklyReviewStatus) {
  switch (status) {
    case "Settimana solida":
      return "border-emerald-700 bg-emerald-950/40 text-emerald-200";
    case "Fatica alta":
      return "border-amber-700 bg-amber-950/40 text-amber-200";
    case "Serve continuita":
      return "border-rose-700 bg-rose-950/40 text-rose-200";
    case "Settimana incompleta":
      return "border-sky-700 bg-sky-950/40 text-sky-200";
    case "Dati insufficienti":
      return "border-neutral-700 bg-neutral-900 text-neutral-200";
  }
}

export default async function WeeklyReviewPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.onboardingStatus !== "completed") {
    redirect("/onboarding");
  }

  const review = await getWeeklyReviewForUser(user.id);
  const weekLabel = `${formatItalianDate(review.week.start)} - ${formatItalianDate(review.week.end)}`;

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-6 pb-28 text-white sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-4xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              Personal Trainer AI
            </p>
            <h1 className="mt-3 text-3xl font-bold">Revisione settimanale</h1>
            <p className="mt-3 max-w-2xl text-sm text-neutral-400">
              {review.week.isCurrentWeek
                ? "Riepilogo della settimana in corso, aggiornato sui dati registrati finora."
                : "Riepilogo della settimana appena conclusa, utile per capire come ripartire."}
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
            <Link
              href="/coach"
              className="inline-flex justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-neutral-950"
            >
              Coach
            </Link>
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-neutral-500">
                {review.week.isCurrentWeek ? "Settimana in corso" : "Settimana appena conclusa"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold">{weekLabel}</h2>
              <p className="mt-3 text-sm text-neutral-400">
                Programma attivo: {review.activeProgram?.title ?? "Non disponibile"}
              </p>
            </div>

            <div
              className={`inline-flex rounded-xl border px-4 py-2 text-sm font-semibold ${getStatusClasses(review.status)}`}
            >
              {review.status}
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <p className="text-sm text-neutral-500">Sintesi</p>
            <p className="mt-2 text-sm text-neutral-200">{review.adherenceSummary}</p>
            <p className="mt-2 text-sm text-neutral-300">{review.progressSummary}</p>
            <p className="mt-2 text-sm text-neutral-400">{review.criticalitySummary}</p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-sm text-neutral-500">Sedute completate</p>
            <p className="mt-2 text-3xl font-bold">{review.completedSessions}</p>
            <p className="mt-2 text-sm text-neutral-400">
              su {review.plannedSessions} previste
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-sm text-neutral-500">Sedute saltate</p>
            <p className="mt-2 text-3xl font-bold">{review.skippedSessions}</p>
            <p className="mt-2 text-sm text-neutral-400">
              {review.catchUpSessions} da recuperare, {review.remainingSessions} ancora da fare
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-sm text-neutral-500">Fatica percepita</p>
            <p className="mt-2 text-3xl font-bold">
              {review.averagePerceivedEffort ?? "n/d"}
            </p>
            <p className="mt-2 text-sm text-neutral-400">media settimanale sulle sedute completate</p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-sm text-neutral-500">Progressi</p>
            <p className="mt-2 text-3xl font-bold">{review.positiveProgressExercises}</p>
            <p className="mt-2 text-sm text-neutral-400">
              esercizi con segnale positivo, {review.incompleteDataExercises} con dati incompleti
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-xl font-semibold">Raccomandazione</h2>
            <p className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm font-medium text-neutral-100">
              {review.recommendation}
            </p>

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
            ) : (
              <p className="mt-5 text-sm text-neutral-400">
                Nessun segnale di cautela prioritario oltre alla normale gestione del recupero.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-xl font-semibold">Segnali da monitorare</h2>
            {review.riskSignals.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-400">
                Nessun rischio rilevante emerso dai dati disponibili.
              </p>
            ) : (
              <ul className="mt-4 space-y-3 text-sm text-neutral-200">
                {review.riskSignals.map((signal) => (
                  <li key={signal} className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3">
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
