import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { BodyWeightCreateCard } from "@/components/body-weight/body-weight-create-card";
import { BodyWeightList } from "@/components/body-weight/body-weight-list";
import {
  formatBodyWeightDelta,
  getBodyWeightOverviewForUser,
  getBodyWeightTrendLabel,
} from "@/lib/body-weight";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function formatWeight(value: number | null) {
  if (value === null) {
    return "Dati insufficienti";
  }

  return `${new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)} kg`;
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

  return (
    <main className="min-h-screen bg-neutral-950 px-5 py-8 pb-28 text-white">
      <section className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-neutral-500">
              Personal Trainer AI
            </p>
            <h1 className="mt-2 text-3xl font-bold">Peso corporeo</h1>
            <p className="mt-3 max-w-2xl text-sm text-neutral-400">
              Monitora l'andamento delle pesate nel tempo con una vista semplice e
              orientata al trend.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex justify-center rounded-xl border border-neutral-700 px-5 py-3 font-semibold text-neutral-100"
          >
            Torna alla dashboard
          </Link>
        </div>

        <div className="rounded-2xl border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-100">
          Il peso puo oscillare per acqua, glicogeno, sale, digestione e altri
          fattori. Guarda il trend, non il singolo giorno.
        </div>

        <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
            Trend
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Ultimo peso</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatWeight(overview.summary.latestWeightKg)}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Variazione totale</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatBodyWeightDelta(overview.summary.totalChangeKg)}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Variazione 7 giorni</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatBodyWeightDelta(overview.summary.change7DaysKg)}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Variazione 30 giorni</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatBodyWeightDelta(overview.summary.change30DaysKg)}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Trend</p>
              <p className="mt-2 text-2xl font-semibold">
                {getBodyWeightTrendLabel(overview.summary.trend)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
            Registra peso
          </p>
          <h2 className="mt-2 text-xl font-semibold">Aggiungi o aggiorna una pesata</h2>
          <p className="mt-2 text-sm text-neutral-400">
            Se esiste gia una pesata per la stessa data, viene aggiornata.
          </p>

          <div className="mt-5">
            <BodyWeightCreateCard />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
                Storico pesate
              </p>
              <h2 className="mt-2 text-xl font-semibold">Ultimi 90 giorni</h2>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/nutrition"
                className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-3 text-sm font-semibold text-neutral-100"
              >
                Vai a nutrizione
              </Link>
              <Link
                href="/nutrition/weekly-review"
                className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-3 text-sm font-semibold text-neutral-100"
              >
                Apri revisione nutrizionale
              </Link>
            </div>
          </div>

          <div className="mt-5">
            <BodyWeightList entries={overview.entries} />
          </div>
        </div>
      </section>

      <AppBottomNav />
    </main>
  );
}
