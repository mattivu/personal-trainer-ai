"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  WorkoutFormExercise,
  WorkoutFormLog,
  WorkoutFormSetLog,
  WorkoutTodaySummarySet,
} from "@/lib/workout-execution";
import type { FlexibleWorkoutState } from "@/lib/workout-schedule";

const SWAP_REASON_OPTIONS = [
  { value: "machine_busy", label: "Macchinario occupato" },
  { value: "no_equipment", label: "Non ho l'attrezzatura" },
  { value: "discomfort_or_limitation", label: "Fastidio o limitazione" },
  { value: "too_difficult", label: "Troppo difficile" },
  { value: "prefer_alternative", label: "Preferisco un'alternativa" },
] as const;

type SwapReason = (typeof SWAP_REASON_OPTIONS)[number]["value"];

type WorkoutLogFormProps = {
  workout: {
    id: number;
    title: string;
    dayLabel: string | null;
    focus: string | null;
    notes: string | null;
  };
  exercises: WorkoutFormExercise[];
  existingLog: WorkoutFormLog | null;
  workoutState: FlexibleWorkoutState;
  plannedDateLabel: string;
};

type ExerciseState = {
  id: number;
  exerciseId: number | null;
  name: string;
  primaryMuscle: string | null;
  imageUrls: string[];
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  intensity: string | null;
  notes: string | null;
  setLogs: WorkoutFormSetLog[];
  previousPerformance: WorkoutFormExercise["previousPerformance"];
  todaySummary: WorkoutTodaySummarySet[];
  progressionSuggestion: WorkoutFormExercise["progressionSuggestion"];
};

type WorkoutLogApiResponse = {
  ok?: boolean;
  workoutLogId?: number;
  message?: string;
  error?: string;
};

type ExerciseAlternative = {
  exerciseId: number;
  name: string;
  primaryMuscle: string | null;
  equipment: string | null;
  difficulty: string | null;
  movementPattern: string | null;
  score: number;
  matchReasons: string[];
};

type ExerciseAlternativesApiResponse = {
  ok?: boolean;
  alternatives?: ExerciseAlternative[];
  message?: string;
  error?: string;
};

type ExerciseSwapApiResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
  swapSummary?: string;
  programExercise?: {
    id: number;
    exerciseId: number | null;
    name: string;
    notes: string | null;
    primaryMuscle: string | null;
  };
};

function isSetCompleted(setLog: WorkoutFormSetLog) {
  return setLog.completed;
}

function isExerciseCompleted(setLogs: WorkoutFormSetLog[]) {
  return setLogs.length > 0 && setLogs.every(isSetCompleted);
}

function hasExerciseData(setLogs: WorkoutFormSetLog[]) {
  return setLogs.some(
    (setLog) =>
      setLog.actualWeight !== null ||
      setLog.actualReps !== null ||
      setLog.actualRir !== null ||
      setLog.actualRpe !== null ||
      Boolean(setLog.notes.trim()) ||
      setLog.completed
  );
}

function formatSetSummary(setLog: {
  setNumber: number;
  actualWeight?: number | null;
  weightKg?: number | null;
  actualReps: number | null;
  actualRir?: number | null;
  rir?: number | null;
  completed: boolean;
}) {
  const weightValue = setLog.actualWeight ?? setLog.weightKg ?? null;
  const rirValue = setLog.actualRir ?? setLog.rir ?? null;
  const weight = weightValue !== null ? `${weightValue} kg` : "carico n/d";
  const reps = setLog.actualReps !== null ? `${setLog.actualReps}` : "reps n/d";
  const rir = rirValue !== null ? `RIR ${rirValue}` : "RIR n/d";
  const status = setLog.completed ? "completata" : "non completata";

  return `Serie ${setLog.setNumber}: ${weight} x ${reps} - ${rir} - ${status}`;
}

function buildInitialSetLogs(exercise: WorkoutFormExercise) {
  const plannedSets = exercise.sets ?? 1;
  const totalSets = Math.max(plannedSets, exercise.initialSetLogs.length, 1);
  const existingBySetNumber = new Map(
    exercise.initialSetLogs.map((setLog) => [setLog.setNumber, setLog])
  );

  return Array.from({ length: totalSets }, (_, index) => {
    const setNumber = index + 1;
    const existingSetLog = existingBySetNumber.get(setNumber);

    return {
      setNumber,
      actualWeight: existingSetLog?.actualWeight ?? null,
      actualReps: existingSetLog?.actualReps ?? null,
      actualRir: existingSetLog?.actualRir ?? null,
      actualRpe: existingSetLog?.actualRpe ?? null,
      completed: existingSetLog?.completed ?? false,
      notes: existingSetLog?.notes ?? "",
    };
  });
}

function buildEmptySetLogs(totalSets: number) {
  return Array.from({ length: Math.max(totalSets, 1) }, (_, index) => ({
    setNumber: index + 1,
    actualWeight: null,
    actualReps: null,
    actualRir: null,
    actualRpe: null,
    completed: false,
    notes: "",
  }));
}

function buildExerciseState(exercise: WorkoutFormExercise): ExerciseState {
  return {
    id: exercise.id,
    exerciseId: exercise.exerciseId,
    name: exercise.name,
    primaryMuscle: exercise.primaryMuscle,
    imageUrls: exercise.imageUrls,
    sets: exercise.sets,
    reps: exercise.reps,
    restSeconds: exercise.restSeconds,
    intensity: exercise.intensity,
    notes: exercise.notes,
    setLogs: buildInitialSetLogs(exercise),
    previousPerformance: exercise.previousPerformance,
    todaySummary: exercise.todaySummary,
    progressionSuggestion: exercise.progressionSuggestion,
  };
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(new Date(value));
}

function formatPreviousPerformanceDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeZone: "Europe/Rome",
  }).format(new Date(value));
}

function parseNumberInput(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function formatDifficultyLabel(value: string | null) {
  if (!value) {
    return "Difficolta n/d";
  }

  switch (value.toLowerCase()) {
    case "beginner":
      return "Difficolta: base";
    case "intermediate":
      return "Difficolta: intermedia";
    case "advanced":
      return "Difficolta: avanzata";
    default:
      return `Difficolta: ${value}`;
  }
}

function ExerciseImages({
  name,
  imageUrls,
}: {
  name: string;
  imageUrls: string[];
}) {
  if (imageUrls.length === 0) {
    return <p className="mt-3 text-xs text-neutral-500">Immagini non disponibili</p>;
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {imageUrls.slice(0, 2).map((imageUrl, index) => (
        <img
          key={`${name}-${imageUrl}`}
          src={imageUrl}
          alt={`${name} immagine ${index + 1}`}
          className="h-20 w-20 rounded-xl border border-neutral-800 object-cover"
          loading="lazy"
        />
      ))}
    </div>
  );
}

async function parseApiResponse(response: Response) {
  const rawBody = await response.text();
  const trimmedBody = rawBody.trim();

  if (!trimmedBody) {
    return {
      data: null,
      message: "Risposta vuota dal server.",
    };
  }

  try {
    const data = JSON.parse(trimmedBody) as WorkoutLogApiResponse;
    return {
      data,
      message: data.message ?? data.error ?? "Operazione completata.",
    };
  } catch {
    return {
      data: null,
      message: trimmedBody,
    };
  }
}

export function WorkoutLogForm({
  workout,
  exercises,
  existingLog,
  workoutState,
  plannedDateLabel,
}: WorkoutLogFormProps) {
  const router = useRouter();
  const [exerciseStates, setExerciseStates] = useState<ExerciseState[]>(
    exercises.map(buildExerciseState)
  );
  const [collapsedExerciseIds, setCollapsedExerciseIds] = useState<Set<number>>(
    () =>
      new Set(
        exercises
          .map((exercise) => ({
            id: exercise.id,
            setLogs: buildInitialSetLogs(exercise),
          }))
          .filter((exercise) => isExerciseCompleted(exercise.setLogs))
          .map((exercise) => exercise.id)
      )
  );
  const [perceivedEffort, setPerceivedEffort] = useState(
    existingLog?.perceivedEffort?.toString() ?? ""
  );
  const [sessionNotes, setSessionNotes] = useState(existingLog?.notes ?? "");
  const [loadingAction, setLoadingAction] = useState<"save" | "complete" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastSavedStatus, setLastSavedStatus] = useState<
    "not_started" | "in_progress" | "completed"
  >(
    existingLog?.status === "completed"
      ? "completed"
      : existingLog?.status === "in_progress" || existingLog?.status === "saved"
        ? "in_progress"
        : "not_started"
  );
  const [isEditingWorkout, setIsEditingWorkout] = useState(false);
  const [activeSwapExerciseId, setActiveSwapExerciseId] = useState<number | null>(
    null
  );
  const [swapReason, setSwapReason] = useState<SwapReason>("prefer_alternative");
  const [swapAlternatives, setSwapAlternatives] = useState<ExerciseAlternative[]>(
    []
  );
  const [selectedAlternativeId, setSelectedAlternativeId] = useState<number | null>(
    null
  );
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapSubmitting, setSwapSubmitting] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);

  const hasTodaySummary = exerciseStates.some((exercise) => exercise.todaySummary.length > 0);
  const isCompletedWorkout = workoutState === "completed";
  const completedAtLabel = existingLog?.completedAt ?? null;

  useEffect(() => {
    setExerciseStates((currentState) => {
      const currentById = new Map(currentState.map((exercise) => [exercise.id, exercise]));

      return exercises.map((exercise) => {
        const currentExercise = currentById.get(exercise.id);

        if (!currentExercise) {
          return buildExerciseState(exercise);
        }

        return {
          ...buildExerciseState(exercise),
          setLogs: currentExercise.setLogs,
        };
      });
    });

    setCollapsedExerciseIds((currentState) => {
      const validIds = new Set(exercises.map((exercise) => exercise.id));
      const nextState = new Set(
        [...currentState].filter((exerciseId) => validIds.has(exerciseId))
      );

      for (const exercise of exercises) {
        const setLogs = buildInitialSetLogs(exercise);

        if (isExerciseCompleted(setLogs)) {
          nextState.add(exercise.id);
        }
      }

      return nextState;
    });
  }, [exercises]);

  function formatRest(restSeconds: number | null) {
    if (restSeconds === null) {
      return "Non indicato";
    }

    if (restSeconds === 0) {
      return "0 sec";
    }

    return `${restSeconds} sec`;
  }

  function getSuggestionAccent(status: ExerciseState["progressionSuggestion"]["status"]) {
    switch (status) {
      case "increase_load":
        return "border-sky-800/70 bg-sky-950/40 text-sky-100";
      case "increase_reps":
        return "border-emerald-800/70 bg-emerald-950/40 text-emerald-100";
      case "reduce_load":
        return "border-amber-800/70 bg-amber-950/40 text-amber-100";
      case "repeat_load":
      case "time_based":
        return "border-neutral-700 bg-neutral-950 text-neutral-100";
      case "no_previous_data":
      case "incomplete_data":
        return "border-neutral-800 bg-neutral-950/80 text-neutral-100";
      default:
        return "border-neutral-800 bg-neutral-950 text-neutral-100";
    }
  }

  function updateSetLog(
    exerciseId: number,
    setNumber: number,
    field: keyof WorkoutFormSetLog,
    value: number | boolean | string | null
  ) {
    setExerciseStates((currentState) =>
      currentState.map((exercise) => {
        if (exercise.id !== exerciseId) {
          return exercise;
        }

        const nextSetLogs = exercise.setLogs.map((setLog) =>
          setLog.setNumber === setNumber
            ? {
                ...setLog,
                [field]: value,
              }
            : setLog
        );
        const wasCompleted = isExerciseCompleted(exercise.setLogs);
        const isCompletedNow = isExerciseCompleted(nextSetLogs);

        if (!wasCompleted && isCompletedNow) {
          setCollapsedExerciseIds((currentState) => {
            const nextState = new Set(currentState);
            nextState.add(exerciseId);
            return nextState;
          });
        }

        return {
          ...exercise,
          setLogs: nextSetLogs,
        };
      })
    );
  }

  function openExercise(exerciseId: number) {
    setCollapsedExerciseIds((currentState) => {
      const nextState = new Set(currentState);
      nextState.delete(exerciseId);
      return nextState;
    });
  }

  function collapseExercise(exerciseId: number) {
    setCollapsedExerciseIds((currentState) => {
      const nextState = new Set(currentState);
      nextState.add(exerciseId);
      return nextState;
    });
  }

  function closeSwapPanel() {
    setActiveSwapExerciseId(null);
    setSwapReason("prefer_alternative");
    setSwapAlternatives([]);
    setSelectedAlternativeId(null);
    setSwapLoading(false);
    setSwapSubmitting(false);
    setSwapError(null);
  }

  async function loadSwapAlternatives(
    programExerciseId: number,
    reason: SwapReason
  ) {
    setSwapLoading(true);
    setSwapError(null);
    setSwapAlternatives([]);
    setSelectedAlternativeId(null);

    try {
      const response = await fetch(
        `/api/exercises/alternatives?programExerciseId=${programExerciseId}&reason=${reason}`
      );
      const { data, message: responseMessage } = await parseApiResponse(response);
      const payload = data as ExerciseAlternativesApiResponse | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(responseMessage || "Errore durante il recupero delle alternative.");
      }

      setSwapAlternatives(payload.alternatives ?? []);
    } catch (caughtError) {
      setSwapError(
        caughtError instanceof Error
          ? caughtError.message
          : "Errore di connessione. Riprova."
      );
    } finally {
      setSwapLoading(false);
    }
  }

  function openSwapPanel(exerciseId: number) {
    const defaultReason: SwapReason = "prefer_alternative";

    setActiveSwapExerciseId(exerciseId);
    setSwapReason(defaultReason);
    setSwapError(null);
    setMessage(null);
    void loadSwapAlternatives(exerciseId, defaultReason);
  }

  async function applyExerciseSwap(programExerciseId: number) {
    if (!selectedAlternativeId) {
      setSwapError("Seleziona prima un'alternativa.");
      return;
    }

    setSwapSubmitting(true);
    setSwapError(null);
    setError(null);

    try {
      const response = await fetch("/api/program-exercises/swap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          programExerciseId,
          newExerciseId: selectedAlternativeId,
          reason: swapReason,
        }),
      });
      const { data, message: responseMessage } = await parseApiResponse(response);
      const payload = data as ExerciseSwapApiResponse | null;

      if (!response.ok || !payload?.ok || !payload.programExercise) {
        throw new Error(responseMessage || "Errore durante la sostituzione.");
      }

      setExerciseStates((currentState) =>
        currentState.map((exercise) =>
          exercise.id === programExerciseId
            ? {
                ...exercise,
                id: payload.programExercise?.id ?? exercise.id,
                exerciseId: payload.programExercise?.exerciseId ?? null,
                name: payload.programExercise?.name ?? exercise.name,
                primaryMuscle:
                  payload.programExercise?.primaryMuscle ?? exercise.primaryMuscle,
                notes: payload.programExercise?.notes ?? exercise.notes,
                imageUrls: [],
                setLogs: buildEmptySetLogs(exercise.setLogs.length),
                previousPerformance: null,
                todaySummary: [],
              }
            : exercise
        )
      );
      setCollapsedExerciseIds((currentState) => {
        const nextState = new Set(currentState);
        nextState.delete(programExerciseId);

        if (payload.programExercise && payload.programExercise.id !== programExerciseId) {
          nextState.delete(payload.programExercise.id);
        }

        return nextState;
      });

      setMessage(
        [payload.message, payload.swapSummary].filter(Boolean).join(" ")
      );
      closeSwapPanel();
      router.refresh();
    } catch (caughtError) {
      setSwapError(
        caughtError instanceof Error
          ? caughtError.message
          : "Errore di connessione. Riprova."
      );
    } finally {
      setSwapSubmitting(false);
    }
  }

  async function submitWorkout(action: "save" | "complete") {
    const status =
      action === "complete" || lastSavedStatus === "completed"
        ? "completed"
        : "in_progress";

    setLoadingAction(action);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/workout-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workoutId: workout.id,
          status,
          perceivedEffort: parseNumberInput(perceivedEffort),
          notes: sessionNotes.trim() || null,
          setLogs: exerciseStates.flatMap((exercise) =>
            exercise.setLogs.map((setLog) => ({
              programExerciseId: exercise.id,
              setNumber: setLog.setNumber,
              actualWeight: setLog.actualWeight,
              actualReps: setLog.actualReps,
              actualRir: setLog.actualRir,
              actualRpe: setLog.actualRpe,
              completed: setLog.completed,
              notes: setLog.notes.trim() || null,
            }))
          ),
        }),
      });

      const { data, message: responseMessage } = await parseApiResponse(response);

      if (!response.ok || !data?.ok) {
        throw new Error(responseMessage || "Errore durante il salvataggio.");
      }

      setLastSavedStatus(status);
      setMessage(
        responseMessage ||
          (status === "completed"
            ? "Seduta completata."
            : "Progressi salvati.")
      );
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Errore di connessione. Riprova."
      );
    } finally {
      setLoadingAction(null);
    }
  }

  const editorStatusLabel =
    lastSavedStatus === "completed"
      ? "Seduta completata"
      : lastSavedStatus === "in_progress"
        ? "Allenamento in corso"
        : workoutState === "skipped"
          ? "Recupera seduta"
          : workoutState === "future_available"
            ? "Inizia comunque"
            : workoutState === "overdue"
              ? "Da recuperare"
              : "Consigliata oggi";
  const editorIntro =
    lastSavedStatus === "completed"
      ? "Stai correggendo una seduta già completata. I salvataggi aggiornano la stessa seduta senza crearne una nuova."
      : "Compila i dati della serie sotto ogni esercizio e salva quando vuoi.";
  const saveButtonLabel =
    lastSavedStatus === "completed" ? "Salva correzioni" : "Salva progressi";
  const completeButtonLabel =
    lastSavedStatus === "completed"
      ? "Aggiorna dati allenamento"
      : "Completa allenamento";

  function getEntryCardCopy(state: FlexibleWorkoutState) {
    switch (state) {
      case "recommended_today":
        return {
          eyebrow: "Consigliata oggi",
          title: workout.title,
          description:
            "Compila i dati reali delle serie mentre ti alleni: carico usato, ripetizioni fatte e ripetizioni in riserva.",
          buttonLabel: "Inizia allenamento",
        };
      case "overdue":
        return {
          eyebrow: "Da recuperare",
          title: "Seduta da recuperare",
          description: `Questa seduta era prevista per ${plannedDateLabel}.`,
          buttonLabel: "Recupera seduta",
        };
      case "future_available":
        return {
          eyebrow: "Prevista più avanti",
          title: "Questa seduta è prevista più avanti",
          description:
            "Puoi iniziarla comunque se hai modificato la tua settimana.",
          buttonLabel: "Inizia comunque",
        };
      case "in_progress":
        return {
          eyebrow: "Allenamento in corso",
          title: "Allenamento in corso",
          description:
            "Abbiamo mantenuto i dati già salvati. Puoi continuare la compilazione da dove avevi lasciato.",
          buttonLabel: "Continua seduta",
        };
      case "completed":
        return {
          eyebrow: "Seduta completata",
          title: "Allenamento completato",
          description:
            "Hai già completato questa seduta questa settimana. Puoi correggere i dati se hai commesso un errore.",
          buttonLabel: "Modifica dati allenamento",
        };
      case "skipped":
        return {
          eyebrow: "Seduta saltata",
          title: "Seduta segnata come saltata",
          description:
            "Hai segnato questa seduta come saltata. Puoi recuperarla quando vuoi.",
          buttonLabel: "Recupera seduta",
        };
    }
  }

  const entryCardCopy = getEntryCardCopy(workoutState);

  return (
    <section className="mt-6 space-y-6">
      {!isEditingWorkout ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
            {entryCardCopy.eyebrow}
          </p>
          <h2 className="mt-3 text-2xl font-semibold">{entryCardCopy.title}</h2>
          <p className="mt-4 max-w-2xl text-sm text-neutral-300">
            {entryCardCopy.description}
          </p>
          {isCompletedWorkout && completedAtLabel ? (
            <p className="mt-3 text-sm text-neutral-400">
              Completato il {formatDateLabel(completedAtLabel)}.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setIsEditingWorkout(true)}
            className="mt-6 inline-flex justify-center rounded-xl bg-white px-5 py-3 font-semibold text-neutral-950 disabled:opacity-50"
          >
            {entryCardCopy.buttonLabel}
          </button>
        </div>
      ) : null}

      {isCompletedWorkout && !isEditingWorkout ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h3 className="text-xl font-semibold">Dati registrati</h3>
            <p className="mt-2 text-sm text-neutral-400">
              Qui sotto trovi il riepilogo della seduta già completata per ogni esercizio.
            </p>
          </div>

          {exerciseStates.map((exercise) => (
            <section
              key={exercise.id}
              className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
            >
              <h4 className="text-lg font-semibold text-white">{exercise.name}</h4>
              {exercise.primaryMuscle ? (
                <p className="mt-2 text-sm text-neutral-400">
                  Muscolo principale: {exercise.primaryMuscle}
                </p>
              ) : null}
              <ExerciseImages name={exercise.name} imageUrls={exercise.imageUrls} />
              <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                <p className="text-sm font-semibold text-white">Dati registrati</p>
                {exercise.todaySummary.length > 0 ? (
                  <div className="mt-3 space-y-2 text-sm text-neutral-300">
                    {exercise.todaySummary.map((setLog) => (
                      <p key={`${exercise.id}-summary-${setLog.setNumber}`}>
                        {formatSetSummary(setLog)}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-neutral-400">
                    Nessun dato registrato per questo esercizio.
                  </p>
                )}
              </div>
            </section>
          ))}

          {!hasTodaySummary ? (
            <p className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-300">
              Nessun dato registrato da mostrare nel riepilogo.
            </p>
          ) : null}
        </div>
      ) : null}

      {isEditingWorkout ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">{editorStatusLabel}</h2>
              <p className="mt-2 text-sm text-neutral-400">{editorIntro}</p>
            </div>
            <p className="max-w-md text-sm text-neutral-400">
              {lastSavedStatus === "completed"
                ? "Puoi correggere kg, reps, RIR, stato di completamento, fatica e note senza aprire una nuova seduta."
                : "I dati salvati resteranno associati alla seduta della settimana corrente."}
            </p>
          </div>

          <div className="space-y-5">
            {exerciseStates.map((exercise) => {
              const completedSets = exercise.setLogs.filter(isSetCompleted).length;
              const totalSets = exercise.setLogs.length;
              const isCollapsed = collapsedExerciseIds.has(exercise.id);
              const canCollapseManually = hasExerciseData(exercise.setLogs);

              return (
                <section
                  key={exercise.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
                >
                  {isCollapsed ? (
                    <div className="space-y-4">
                      <button
                        type="button"
                        onClick={() => openExercise(exercise.id)}
                        className="w-full rounded-2xl text-left outline-none transition hover:bg-neutral-950/40 focus-visible:ring-2 focus-visible:ring-white/60"
                      >
                        <div className="flex flex-col gap-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="max-w-3xl">
                            <h3 className="text-xl font-semibold text-white">
                              {exercise.name}
                            </h3>
                            <p className="mt-2 text-sm font-medium text-emerald-300">
                              Esercizio completato
                            </p>
                            <p className="mt-2 text-sm text-neutral-300">
                              {completedSets}/{totalSets} serie completate
                            </p>
                            <div className="mt-4 space-y-2 text-sm text-neutral-300">
                              {exercise.setLogs.map((setLog) => (
                                <p key={`${exercise.id}-${setLog.setNumber}`}>
                                  {formatSetSummary(setLog)}
                                </p>
                              ))}
                            </div>
                          </div>
                          <span className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-100">
                            Modifica
                          </span>
                        </div>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-2xl">
                          <h3 className="text-xl font-semibold">{exercise.name}</h3>
                          {exercise.primaryMuscle ? (
                            <p className="mt-2 text-sm text-neutral-400">
                              Muscolo principale: {exercise.primaryMuscle}
                            </p>
                          ) : null}
                          <ExerciseImages name={exercise.name} imageUrls={exercise.imageUrls} />
                          <p className="mt-3 text-sm text-neutral-200">
                            Obiettivo: {exercise.sets ?? "Serie non indicate"} serie x{" "}
                            {exercise.reps ?? "reps non indicate"}
                          </p>
                          {exercise.notes ? (
                            <p className="mt-3 whitespace-pre-line text-sm text-neutral-300">
                              {exercise.notes}
                            </p>
                          ) : null}
                          {!isCompletedWorkout ? (
                            <div className="mt-4">
                              <button
                                type="button"
                                onClick={() => openSwapPanel(exercise.id)}
                                className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-100"
                              >
                                Sostituisci esercizio
                              </button>
                            </div>
                          ) : null}
                        </div>

                        <div className="grid gap-3 text-sm text-neutral-300 sm:grid-cols-3 lg:min-w-[320px]">
                          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                            <p className="text-neutral-500">Serie previste</p>
                            <p className="mt-1 font-medium text-white">
                              {exercise.sets ?? "Non indicate"}
                            </p>
                          </div>
                          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                            <p className="text-neutral-500">Recupero</p>
                            <p className="mt-1 font-medium text-white">
                              {formatRest(exercise.restSeconds)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                            <p className="text-neutral-500">Intensita</p>
                            <p className="mt-1 font-medium text-white">
                              {exercise.intensity ?? "Non indicata"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {activeSwapExerciseId === exercise.id ? (
                        <div className="mt-5 rounded-2xl border border-amber-700/60 bg-amber-950/20 p-5">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="max-w-2xl">
                              <h4 className="text-lg font-semibold text-white">
                                Sostituisci esercizio
                              </h4>
                              <p className="mt-2 text-sm text-neutral-300">
                                Scegli il motivo, valuta le alternative consigliate e
                                conferma solo quella che vuoi usare.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={closeSwapPanel}
                              className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-100"
                            >
                              Annulla
                            </button>
                          </div>

                          <div className="mt-5">
                            <p className="text-sm font-semibold text-white">
                              Motivo sostituzione
                            </p>
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              {SWAP_REASON_OPTIONS.map((option) => (
                                <label
                                  key={option.value}
                                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-200"
                                >
                                  <input
                                    type="radio"
                                    name={`swap-reason-${exercise.id}`}
                                    checked={swapReason === option.value}
                                    onChange={() => {
                                      setSwapReason(option.value);
                                      void loadSwapAlternatives(
                                        exercise.id,
                                        option.value
                                      );
                                    }}
                                    className="mt-0.5 h-4 w-4"
                                  />
                                  <span>{option.label}</span>
                                </label>
                              ))}
                            </div>
                            {swapReason === "discomfort_or_limitation" ? (
                              <p className="mt-3 rounded-xl border border-amber-800 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
                                Se il fastidio e dolore acuto, persistente o peggiora,
                                interrompi l'esercizio e valuta un professionista.
                              </p>
                            ) : null}
                          </div>

                          <div className="mt-5">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-white">
                                Alternative consigliate
                              </p>
                              {swapLoading ? (
                                <p className="text-sm text-neutral-400">
                                  Caricamento...
                                </p>
                              ) : null}
                            </div>

                            {swapError ? (
                              <p className="mt-3 rounded-xl border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">
                                {swapError}
                              </p>
                            ) : null}

                            {!swapLoading && !swapError && swapAlternatives.length === 0 ? (
                              <p className="mt-3 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-300">
                                Nessuna alternativa coerente disponibile per questo
                                esercizio.
                              </p>
                            ) : null}

                            <div className="mt-3 space-y-3">
                              {swapAlternatives.map((alternative) => (
                                <button
                                  key={alternative.exerciseId}
                                  type="button"
                                  onClick={() =>
                                    setSelectedAlternativeId(alternative.exerciseId)
                                  }
                                  className={`w-full rounded-xl border p-4 text-left transition ${
                                    selectedAlternativeId === alternative.exerciseId
                                      ? "border-white bg-white/10"
                                      : "border-neutral-800 bg-neutral-950 hover:border-neutral-600"
                                  }`}
                                >
                                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                      <p className="text-sm font-semibold text-white">
                                        {alternative.name}
                                      </p>
                                      <p className="mt-1 text-sm text-neutral-400">
                                        {alternative.primaryMuscle
                                          ? `Muscolo principale: ${alternative.primaryMuscle}`
                                          : "Muscolo principale non indicato"}
                                      </p>
                                    </div>
                                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                                      Punteggio {alternative.score}
                                    </p>
                                  </div>

                                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-300">
                                    <span className="rounded-full border border-neutral-700 px-2.5 py-1">
                                      {alternative.equipment ?? "Attrezzatura n/d"}
                                    </span>
                                    <span className="rounded-full border border-neutral-700 px-2.5 py-1">
                                      {alternative.movementPattern ?? "Pattern n/d"}
                                    </span>
                                    <span className="rounded-full border border-neutral-700 px-2.5 py-1">
                                      {formatDifficultyLabel(alternative.difficulty)}
                                    </span>
                                  </div>

                                  {alternative.matchReasons.length > 0 ? (
                                    <p className="mt-3 text-sm text-neutral-300">
                                      {alternative.matchReasons.join(" · ")}
                                    </p>
                                  ) : null}
                                </button>
                              ))}
                            </div>

                            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                              <button
                                type="button"
                                onClick={() => applyExerciseSwap(exercise.id)}
                                disabled={
                                  selectedAlternativeId === null || swapSubmitting
                                }
                                className="inline-flex justify-center rounded-xl bg-white px-5 py-3 font-semibold text-neutral-950 disabled:opacity-50"
                              >
                                {swapSubmitting
                                  ? "Applicazione..."
                                  : "Usa questa alternativa"}
                              </button>
                              <button
                                type="button"
                                onClick={closeSwapPanel}
                                className="inline-flex justify-center rounded-xl border border-neutral-700 px-5 py-3 font-semibold text-neutral-100"
                              >
                                Annulla
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                        <p className="text-sm font-semibold text-white">Ultima volta</p>
                        {exercise.previousPerformance ? (
                          <>
                            <p className="mt-2 text-sm text-neutral-400">
                              {formatPreviousPerformanceDate(
                                exercise.previousPerformance.performedAt
                              )}{" "}
                              ·{" "}
                              {exercise.previousPerformance.status === "completed"
                                ? "Completato"
                                : exercise.previousPerformance.status === "in_progress"
                                  ? "In corso"
                                  : exercise.previousPerformance.status === "skipped"
                                    ? "Seduta saltata"
                                  : "Salvato"}
                            </p>
                            <div className="mt-3 space-y-2 text-sm text-neutral-300">
                              {exercise.previousPerformance.sets.map((setLog) => (
                                <p key={`${exercise.id}-previous-${setLog.setNumber}`}>
                                  {formatSetSummary(setLog)}
                                </p>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="mt-2 text-sm text-neutral-400">
                            Prima volta con questo esercizio.
                          </p>
                        )}
                      </div>

                      <div
                        className={`mt-4 rounded-xl border p-4 ${getSuggestionAccent(
                          exercise.progressionSuggestion.status
                        )}`}
                      >
                        <p className="text-sm font-semibold text-white">
                          {exercise.progressionSuggestion.title}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-current">
                          {exercise.progressionSuggestion.message}
                        </p>
                        <p className="mt-3 text-sm text-current/80">
                          {exercise.progressionSuggestion.suggestedAction}
                        </p>
                      </div>

                      <div className="mt-5 border-t border-neutral-800 pt-5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-white">Dati della serie</p>
                          <p className="text-sm text-neutral-400">
                            {completedSets}/{totalSets} serie completate
                          </p>
                        </div>
                        <div className="mt-4 space-y-3">
                          {exercise.setLogs.map((setLog) => (
                            <div
                              key={`${exercise.id}-${setLog.setNumber}`}
                              className="rounded-xl border border-neutral-800 bg-neutral-950 p-4"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm font-semibold text-white">
                                  Serie {setLog.setNumber}
                                </p>
                                <label className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300">
                                  <input
                                    type="checkbox"
                                    checked={setLog.completed}
                                    onChange={(event) =>
                                      updateSetLog(
                                        exercise.id,
                                        setLog.setNumber,
                                        "completed",
                                        event.target.checked
                                      )
                                    }
                                    className="h-4 w-4"
                                  />
                                  <span>Serie completata</span>
                                </label>
                              </div>

                              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                <label className="text-sm">
                                  <span className="block text-neutral-400">
                                    Carico usato (kg)
                                  </span>
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    value={setLog.actualWeight ?? ""}
                                    onChange={(event) =>
                                      updateSetLog(
                                        exercise.id,
                                        setLog.setNumber,
                                        "actualWeight",
                                        parseNumberInput(event.target.value)
                                      )
                                    }
                                    className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none"
                                    placeholder="0"
                                  />
                                </label>

                                <label className="text-sm">
                                  <span className="block text-neutral-400">Reps fatte</span>
                                  <input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={setLog.actualReps ?? ""}
                                    onChange={(event) =>
                                      updateSetLog(
                                        exercise.id,
                                        setLog.setNumber,
                                        "actualReps",
                                        parseNumberInput(event.target.value)
                                      )
                                    }
                                    className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none"
                                    placeholder="0"
                                  />
                                </label>

                                <label className="text-sm md:col-span-2 xl:col-span-1">
                                  <span className="block text-neutral-400">
                                    Ripetizioni in riserva
                                  </span>
                                  <span className="mt-2 block text-xs leading-5 text-neutral-500">
                                    Quante ripetizioni pensi ti sarebbero rimaste con
                                    tecnica corretta?
                                  </span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={10}
                                    step={1}
                                    value={setLog.actualRir ?? ""}
                                    onChange={(event) =>
                                      updateSetLog(
                                        exercise.id,
                                        setLog.setNumber,
                                        "actualRir",
                                        parseNumberInput(event.target.value)
                                      )
                                    }
                                    className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none"
                                    placeholder="0-4"
                                  />
                                  <span className="mt-2 block text-xs leading-5 text-neutral-500">
                                    0 = cedimento, 1 = ne avevi ancora 1, 2 = ne avevi
                                    ancora 2, 3+ = potevi continuare.
                                  </span>
                                </label>

                                <label className="text-sm">
                                  <span className="block text-neutral-400">Fatica serie</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={10}
                                    step={1}
                                    value={setLog.actualRpe ?? ""}
                                    onChange={(event) =>
                                      updateSetLog(
                                        exercise.id,
                                        setLog.setNumber,
                                        "actualRpe",
                                        parseNumberInput(event.target.value)
                                      )
                                    }
                                    className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none"
                                    placeholder="0-10"
                                  />
                                </label>

                                <label className="text-sm md:col-span-2">
                                  <span className="block text-neutral-400">Note serie</span>
                                  <textarea
                                    value={setLog.notes}
                                    onChange={(event) =>
                                      updateSetLog(
                                        exercise.id,
                                        setLog.setNumber,
                                        "notes",
                                        event.target.value
                                      )
                                    }
                                    rows={3}
                                    className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none"
                                    placeholder="Note su esecuzione, adattamenti o sensazioni..."
                                  />
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>

                        {canCollapseManually ? (
                          <div className="mt-5 flex justify-end">
                            <button
                              type="button"
                              onClick={() => collapseExercise(exercise.id)}
                              className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-100"
                            >
                              Chiudi esercizio
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </>
                  )}
                </section>
              );
            })}
          </div>

          {error ? (
            <p className="rounded-xl border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="rounded-xl border border-emerald-800 bg-emerald-950 px-4 py-3 text-sm text-emerald-200">
              {message}
            </p>
          ) : null}

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {lastSavedStatus === "completed"
                    ? "Salva correzioni"
                    : "Salva progressi"}
                </h3>
                <p className="mt-2 text-sm text-neutral-400">
                  {lastSavedStatus === "completed"
                    ? "Salva le modifiche senza far sembrare che stai iniziando una nuova seduta."
                    : "Puoi salvare anche se non hai ancora completato tutta la seduta."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => submitWorkout("save")}
                disabled={loadingAction !== null}
                className="inline-flex justify-center rounded-xl border border-neutral-700 px-5 py-3 font-semibold text-neutral-100 disabled:opacity-50"
              >
                {loadingAction === "save" ? "Salvataggio..." : saveButtonLabel}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h3 className="text-xl font-semibold">
              {lastSavedStatus === "completed"
                ? "Aggiorna dati allenamento"
                : "Feedback finale"}
            </h3>
            <p className="mt-2 text-sm text-neutral-400">
              {lastSavedStatus === "completed"
                ? "Aggiorna i dati finali mantenendo la seduta nello stato completato."
                : "Completa il feedback finale alla fine della seduta."}
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm">
                <span className="block text-neutral-400">
                  Fatica percepita della seduta
                </span>
                <span className="mt-2 block text-xs leading-5 text-neutral-500">
                  1 = molto facile, 10 = massimo sforzo.
                </span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={perceivedEffort}
                  onChange={(event) => setPerceivedEffort(event.target.value)}
                  className="mt-3 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none"
                  placeholder="1-10"
                />
              </label>

              <label className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm">
                <span className="block text-neutral-400">Note sulla seduta</span>
                <textarea
                  value={sessionNotes}
                  onChange={(event) => setSessionNotes(event.target.value)}
                  rows={4}
                  className="mt-3 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none"
                  placeholder="Sensazioni, adattamenti, osservazioni finali..."
                />
              </label>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => submitWorkout("complete")}
                disabled={loadingAction !== null}
                className="inline-flex justify-center rounded-xl bg-white px-5 py-3 font-semibold text-neutral-950 disabled:opacity-50"
              >
                {loadingAction === "complete"
                  ? "Salvataggio..."
                  : completeButtonLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
