import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/app-bottom-nav";
import {
  getExerciseLibrary,
  type ExerciseLibraryFilters,
  type ExerciseLibraryItem,
} from "@/lib/exercises/library-query";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type ExerciseLibraryPageProps = {
  searchParams?: Promise<{
    source?: string | string[];
    status?: string | string[];
    search?: string | string[];
    muscle?: string | string[];
    equipment?: string | string[];
    page?: string | string[];
  }>;
};

function joinValues(values: string[]) {
  return values.length > 0 ? values.join(", ") : "Non indicato";
}

function formatDifficulty(value: string | null) {
  if (!value) {
    return "Non indicata";
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function formatCategory(value: string) {
  if (!value) {
    return "Non indicata";
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function buildQueryString(filters: ExerciseLibraryFilters, page: number) {
  const params = new URLSearchParams();

  if (filters.source !== "all") {
    params.set("source", filters.source);
  }

  if (filters.status !== "all") {
    params.set("status", filters.status);
  }

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.muscle) {
    params.set("muscle", filters.muscle);
  }

  if (filters.equipment) {
    params.set("equipment", filters.equipment);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();
  return queryString ? `/exercise-library?${queryString}` : "/exercise-library";
}

function ExerciseCard({ exercise }: { exercise: ExerciseLibraryItem }) {
  return (
    <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded-full border border-neutral-700 px-2.5 py-1 text-neutral-200">
              Stato: {exercise.reviewStatusLabel}
            </span>
            <span className="rounded-full border border-neutral-700 px-2.5 py-1 text-neutral-400">
              Fonte: {exercise.sourceLabel}
            </span>
            {exercise.qualityStatusLabel ? (
              <span className="rounded-full border border-amber-700/60 bg-amber-500/10 px-2.5 py-1 text-amber-200">
                Revisione: {exercise.qualityStatusLabel}
              </span>
            ) : null}
            {exercise.externalId ? (
              <span className="rounded-full border border-neutral-700 px-2.5 py-1 text-neutral-400">
                ID esterno: {exercise.externalId}
              </span>
            ) : null}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">{exercise.name}</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Categoria: {formatCategory(exercise.category)} · Difficoltà:{" "}
              {formatDifficulty(exercise.difficulty)}
            </p>
          </div>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
          <div>
            <dt className="text-neutral-500">Muscoli</dt>
            <dd className="mt-1 text-neutral-100">{exercise.primaryMuscle}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Muscoli secondari</dt>
            <dd className="mt-1 text-neutral-100">{joinValues(exercise.secondaryMuscles)}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Attrezzatura</dt>
            <dd className="mt-1 text-neutral-100">{exercise.equipment ?? "Non indicata"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Ambiente</dt>
            <dd className="mt-1 text-neutral-100">{joinValues(exercise.environments)}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Fonte</dt>
            <dd className="mt-1 text-neutral-100">{exercise.sourceLabel}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Stato</dt>
            <dd className="mt-1 text-neutral-100">
              {exercise.reviewStatusLabel}
              {exercise.qualityStatusLabel ? ` · ${exercise.qualityStatusLabel}` : ""}
            </dd>
          </div>
        </dl>

        <div>
          <p className="text-sm text-neutral-500">Istruzioni</p>
          <p className="mt-1 text-sm leading-6 text-neutral-200">
            {exercise.instructionsPreview}
          </p>
        </div>

        {exercise.reviewWarnings.length > 0 ? (
          <div>
            <p className="text-sm text-neutral-500">Avvisi revisione</p>
            <ul className="mt-2 space-y-1 text-sm text-amber-200">
              {exercise.reviewWarnings.map((warning) => (
                <li key={`${exercise.id}-${warning}`}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <p className="text-sm text-neutral-500">Immagini</p>
          {exercise.imageUrls.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-3">
              {exercise.imageUrls.map((imageUrl, index) => (
                <img
                  key={`${exercise.id}-${imageUrl}`}
                  src={imageUrl}
                  alt={`${exercise.name} immagine ${index + 1}`}
                  className="h-24 w-24 rounded-xl border border-neutral-800 object-cover"
                  loading="lazy"
                />
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-neutral-400">Nessuna immagine disponibile.</p>
          )}
        </div>

        {exercise.externalSource ? (
          <details className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-3">
            <summary className="cursor-pointer text-sm font-medium text-neutral-200">
              Fonte originale
            </summary>
            <div className="mt-3 space-y-3 text-sm text-neutral-300">
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-neutral-500">Categoria</dt>
                  <dd className="mt-1">{exercise.sourceMetadata?.rawCategory ?? "Non indicata"}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Attrezzatura</dt>
                  <dd className="mt-1">{exercise.sourceMetadata?.rawEquipment ?? "Non indicata"}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Difficoltà</dt>
                  <dd className="mt-1">{exercise.sourceMetadata?.rawLevel ?? "Non indicata"}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Immagini</dt>
                  <dd className="mt-1">
                    {exercise.sourceMetadata?.imageCount ?? exercise.imageUrls.length}
                  </dd>
                </div>
              </dl>

              <div>
                <p className="text-neutral-500">Istruzioni</p>
                <p className="mt-1 whitespace-pre-line leading-6 text-neutral-300">
                  {exercise.originalInstructions ?? "Nessuna istruzione sorgente disponibile."}
                </p>
              </div>
            </div>
          </details>
        ) : null}
      </div>
    </article>
  );
}

export default async function ExerciseLibraryPage(props: ExerciseLibraryPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.onboardingStatus !== "completed") {
    redirect("/onboarding");
  }

  const searchParams = (await props.searchParams) ?? {};
  const library = await getExerciseLibrary(searchParams);

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-6 pb-28 text-white sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              Personal Trainer AI
            </p>
            <h1 className="mt-3 text-3xl font-bold">Libreria esercizi</h1>
            <p className="mt-3 max-w-3xl text-sm text-neutral-400">
              Vista di sola revisione degli esercizi interni e di quelli importati da
              free-exercise-db prima del loro eventuale utilizzo operativo.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-100"
            >
              Torna alla dashboard
            </Link>
          </div>
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-sm text-neutral-500">Esercizi totali</p>
            <p className="mt-2 text-3xl font-bold">{library.counts.total}</p>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-sm text-neutral-500">Esercizi interni</p>
            <p className="mt-2 text-3xl font-bold">{library.counts.internal}</p>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-sm text-neutral-500">Esercizi importati</p>
            <p className="mt-2 text-3xl font-bold">{library.counts.imported}</p>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-sm text-neutral-500">In revisione</p>
            <p className="mt-2 text-3xl font-bold">{library.counts.pending}</p>
          </div>
        </section>

        <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-sm text-neutral-500">Importati con immagini</p>
            <p className="mt-2 text-3xl font-bold">{library.counts.importedWithImages}</p>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-sm text-neutral-500">Importati senza immagini</p>
            <p className="mt-2 text-3xl font-bold">{library.counts.importedWithoutImages}</p>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-sm text-neutral-500">Specialistici / da revisionare</p>
            <p className="mt-2 text-3xl font-bold">{library.counts.specializedOrReview}</p>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-5">
          <form className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div>
              <label htmlFor="source" className="text-sm text-neutral-400">
                Fonte
              </label>
              <select
                id="source"
                name="source"
                defaultValue={library.filters.source}
                className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-white"
              >
                <option value="all">Tutti</option>
                <option value="internal">Interni</option>
                <option value="free_exercise_db">Import da free-exercise-db</option>
              </select>
            </div>

            <div>
              <label htmlFor="status" className="text-sm text-neutral-400">
                Stato
              </label>
              <select
                id="status"
                name="status"
                defaultValue={library.filters.status}
                className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-white"
              >
                <option value="all">Tutti</option>
                <option value="pending">Importati in revisione</option>
                <option value="active">Attivi</option>
              </select>
            </div>

            <div>
              <label htmlFor="search" className="text-sm text-neutral-400">
                Ricerca
              </label>
              <input
                id="search"
                name="search"
                type="search"
                defaultValue={library.filters.search}
                placeholder="Nome, categoria, muscolo, externalId"
                className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-white placeholder:text-neutral-500"
              />
            </div>

            <div>
              <label htmlFor="muscle" className="text-sm text-neutral-400">
                Muscolo
              </label>
              <input
                id="muscle"
                name="muscle"
                type="text"
                defaultValue={library.filters.muscle}
                placeholder="es. petto"
                className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-white placeholder:text-neutral-500"
              />
            </div>

            <div>
              <label htmlFor="equipment" className="text-sm text-neutral-400">
                Attrezzatura
              </label>
              <input
                id="equipment"
                name="equipment"
                type="text"
                defaultValue={library.filters.equipment}
                placeholder="es. manubri"
                className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-white placeholder:text-neutral-500"
              />
            </div>

            <div className="sm:col-span-2 xl:col-span-5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  className="inline-flex justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-neutral-950"
                >
                  Applica filtri
                </button>
                <Link
                  href="/exercise-library"
                  className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-100"
                >
                  Azzera filtri
                </Link>
              </div>
            </div>
          </form>
        </section>

        <section className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-300">
          <p>
            Risultati: {library.pagination.totalItems} · Pagina {library.pagination.currentPage} di{" "}
            {library.pagination.totalPages}
          </p>
          <p>{library.pagination.pageSize} per pagina</p>
        </section>

        <section className="mt-6 space-y-4">
          {library.exercises.length > 0 ? (
            library.exercises.map((exercise) => (
              <ExerciseCard key={exercise.id} exercise={exercise} />
            ))
          ) : (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-sm text-neutral-400">
              Nessun esercizio trovato con i filtri selezionati.
            </div>
          )}
        </section>

        <section className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          {library.pagination.hasPreviousPage ? (
            <Link
              href={buildQueryString(
                library.filters,
                library.pagination.currentPage - 1
              )}
              className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-100"
            >
              Precedente
            </Link>
          ) : (
            <span className="inline-flex rounded-xl border border-neutral-800 px-4 py-2.5 text-sm font-semibold text-neutral-600">
              Precedente
            </span>
          )}

          <p className="text-sm text-neutral-400">
            Pagina corrente: {library.pagination.currentPage}
          </p>

          {library.pagination.hasNextPage ? (
            <Link
              href={buildQueryString(
                library.filters,
                library.pagination.currentPage + 1
              )}
              className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-100"
            >
              Successiva
            </Link>
          ) : (
            <span className="inline-flex rounded-xl border border-neutral-800 px-4 py-2.5 text-sm font-semibold text-neutral-600">
              Successiva
            </span>
          )}
        </section>
      </section>

      <AppBottomNav />
    </main>
  );
}
