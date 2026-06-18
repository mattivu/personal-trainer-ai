import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { AppBottomNav } from "@/components/app-bottom-nav";
import {
  getLatestCompletedWorkoutForUser,
  getWorkoutStatusLabel,
} from "@/lib/workout-history";
import { getWeeklyReviewForUser } from "@/lib/weekly-review";
import { LogoutButton } from "./logout-button";

function formatItalianDateTime(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(date);
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.onboardingStatus !== "completed") {
    redirect("/onboarding");
  }

  const [latestCompletedWorkout, weeklyReview] = await Promise.all([
    getLatestCompletedWorkoutForUser(user.id),
    getWeeklyReviewForUser(user.id),
  ]);

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 pb-28 text-white">
      <section className="mx-auto w-full max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="mb-3 text-sm uppercase tracking-[0.3em] text-neutral-500">
              Personal Trainer AI
            </p>
            <h1 className="text-3xl font-bold">Dashboard</h1>
          </div>

          <LogoutButton />
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-6 text-xl font-semibold">Account</h2>

          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="mb-1 text-neutral-500">Nome</dt>
              <dd className="text-neutral-100">{user.name ?? "Non indicato"}</dd>
            </div>

            <div>
              <dt className="mb-1 text-neutral-500">Email</dt>
              <dd className="text-neutral-100">{user.email}</dd>
            </div>

            <div>
              <dt className="mb-1 text-neutral-500">Stato onboarding</dt>
              <dd className="text-neutral-100">Questionario completato</dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Ultima seduta completata</h2>
              {latestCompletedWorkout ? (
                <>
                  <p className="mt-3 text-neutral-200">
                    {latestCompletedWorkout.workout?.title ?? "Seduta"}
                  </p>
                  <p className="mt-2 text-sm text-neutral-400">
                    Programma: {latestCompletedWorkout.program?.title ?? "Programma"}
                  </p>
                  <p className="mt-2 text-sm text-neutral-500">
                    {formatItalianDateTime(
                      latestCompletedWorkout.completedAt ?? latestCompletedWorkout.performedAt
                    )}{" "}
                    · {getWorkoutStatusLabel(latestCompletedWorkout.status)}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-neutral-400">
                  Non hai ancora completato una seduta.
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                href="/workout-history"
                className="inline-flex justify-center rounded-xl border border-neutral-700 px-5 py-3 font-semibold text-neutral-100"
              >
                Storico allenamenti
              </Link>

              <Link
                href="/program"
                className="inline-flex justify-center rounded-xl bg-white px-5 py-3 font-semibold text-neutral-950"
              >
                Vai al programma
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
                Revisione settimanale
              </p>
              <h2 className="mt-2 text-xl font-semibold">{weeklyReview.status}</h2>
              <p className="mt-3 text-neutral-400">{weeklyReview.adherenceSummary}</p>
              <p className="mt-2 text-sm text-neutral-500">
                Raccomandazione: {weeklyReview.recommendation}
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                href="/weekly-review"
                className="inline-flex justify-center rounded-xl bg-white px-5 py-3 font-semibold text-neutral-950"
              >
                Apri revisione
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Questionario completato</h2>
              <p className="mt-3 text-neutral-400">
                Il tuo programma resta stabile per un blocco di settimane.
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                Se cambi obiettivo, aggiorna il questionario e crea un nuovo
                blocco coerente con i dati aggiornati.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                href="/onboarding"
                className="inline-flex justify-center rounded-xl border border-neutral-700 px-5 py-3 font-semibold text-neutral-100"
              >
                Modifica obiettivo
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Nutrizione</h2>
              <p className="mt-3 text-neutral-400">
                Vedi un target indicativo e registra manualmente calorie e macro
                della giornata.
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                Le stime sono orientative e non sostituiscono un professionista.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                href="/nutrition"
                className="inline-flex justify-center rounded-xl bg-white px-5 py-3 font-semibold text-neutral-950"
              >
                Apri nutrizione
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Peso corporeo</h2>
              <p className="mt-3 text-neutral-400">
                Registra le pesate, consulta lo storico recente e guarda il trend.
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                Il peso giornaliero puo oscillare: usa questa sezione per vedere
                l'andamento nel tempo.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                href="/body-weight"
                className="inline-flex justify-center rounded-xl bg-white px-5 py-3 font-semibold text-neutral-950"
              >
                Apri peso corporeo
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Coach AI</h2>
              <p className="mt-3 text-neutral-400">
                Fai domande sul programma, sui progressi e sulla seduta del giorno
                usando il contesto reale gia presente nell&apos;app.
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                Il coach risponde in modalita read-only e non applica modifiche.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                href="/coach"
                className="inline-flex justify-center rounded-xl bg-white px-5 py-3 font-semibold text-neutral-950"
              >
                Apri Coach
              </Link>
            </div>
          </div>
        </div>

      </section>

      <AppBottomNav />
    </main>
  );
}
