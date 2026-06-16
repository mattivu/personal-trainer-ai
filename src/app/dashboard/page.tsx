import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { LogoutButton } from "./logout-button";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.onboardingStatus !== "completed") {
    redirect("/onboarding");
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-white">
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
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Questionario completato</h2>
              <p className="mt-3 text-neutral-400">
                Prossimo step: generazione programma
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                Dopo aver modificato il questionario, rigenera il programma per
                allinearlo ai nuovi dati.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                href="/program"
                className="inline-flex justify-center rounded-xl bg-white px-5 py-3 font-semibold text-neutral-950"
              >
                Vedi programma
              </Link>

              <Link
                href="/onboarding"
                className="inline-flex justify-center rounded-xl border border-neutral-700 px-5 py-3 font-semibold text-neutral-100"
              >
                Modifica questionario
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
