import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { CoachChat } from "@/components/coach-chat";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type CoachPageProps = {
  searchParams?: Promise<{
    workoutId?: string | string[];
  }>;
};

function getSingleSearchParam(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parseWorkoutId(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

export default async function CoachPage(props: CoachPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.onboardingStatus !== "completed") {
    redirect("/onboarding");
  }

  const searchParams = (await props.searchParams) ?? {};
  const currentWorkoutId = parseWorkoutId(getSingleSearchParam(searchParams.workoutId));

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-6 pb-28 text-white sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-4xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              Personal Trainer AI
            </p>
            <h1 className="mt-3 text-3xl font-bold">Coach</h1>
            <p className="mt-3 max-w-2xl text-sm text-neutral-400">
              Chat basata sul tuo contesto reale: risposte iniziali, programma
              attivo, progressi, sedute, nutrizione, peso e cardio recente.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-100"
            >
              Dashboard
            </Link>
            <Link
              href="/program"
              className="inline-flex justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-neutral-950"
            >
              Programma
            </Link>
          </div>
        </div>

        <section className="mb-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Revisione settimanale</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Un riepilogo prudente su aderenza, fatica, progressi e criticita.
              </p>
            </div>

            <Link
              href="/weekly-review"
              className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-100"
            >
              Apri revisione
            </Link>
          </div>
        </section>

        <CoachChat currentWorkoutId={currentWorkoutId} />
      </section>

      <AppBottomNav />
    </main>
  );
}
