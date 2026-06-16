import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-6 py-12">
      <section className="max-w-3xl text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-neutral-400 mb-4">
          Personal Trainer AI
        </p>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Il tuo percorso di allenamento, costruito intorno a te.
        </h1>

        <p className="text-lg text-neutral-300 mb-8">
          Questa è la prima versione tecnica della web app. Da qui costruiremo login,
          onboarding, generazione schede, tracking allenamenti e assistente AI.
        </p>

        <div className="mb-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="rounded-xl bg-white px-5 py-3 font-semibold text-neutral-950"
          >
            Registrati
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-neutral-700 px-5 py-3 font-semibold text-neutral-100 hover:border-neutral-400"
          >
            Login
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-neutral-700 px-5 py-3 font-semibold text-neutral-100 hover:border-neutral-400"
          >
            Dashboard
          </Link>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-left">
          <h2 className="text-xl font-semibold mb-4">Stato progetto</h2>
          <ul className="space-y-2 text-neutral-300">
            <li>✅ App Next.js creata</li>
            <li>✅ Repository GitHub collegato</li>
            <li>✅ Deploy su Hostinger attivo</li>
            <li>✅ Login e sessioni custom</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
