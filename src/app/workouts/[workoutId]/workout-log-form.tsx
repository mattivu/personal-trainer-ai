"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExerciseInstructionsModal } from "@/components/exercises/exercise-instructions-modal";
import { AppCard } from "@/components/ui/app-card";
import { PrimaryButton, SecondaryButton } from "@/components/ui/buttons";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import {
  getExerciseDifficultyForDisplay,
  getExerciseDisplayData,
  getExerciseDisplayName,
  getExerciseEquipmentForDisplay,
  getExerciseMusclesForDisplay,
} from "@/lib/exercises/exercise-display";
import { sanitizeUserFacingNotes } from "@/lib/user-facing-copy";
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
  category: string | null;
  primaryMuscle: string | null;
  secondaryMuscles: string[];
  equipment: string | null;
  difficulty: string | null;
  instructions: string | null;
  needsTranslation: boolean;
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

type CompletionCardState = {
  visible: boolean;
  completedAtLabel: string | null;
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
  category: string | null;
  primaryMuscle: string | null;
  secondaryMuscles: string[];
  equipment: string | null;
  difficulty: string | null;
  instructions: string | null;
  imageUrls: string[];
  needsTranslation: boolean;
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
    category: string | null;
    primaryMuscle: string | null;
    secondaryMuscles: string[];
    equipment: string | null;
    difficulty: string | null;
    instructions: string | null;
    imageUrls: string[];
    needsTranslation: boolean;
  };
};

function isSetCompleted(setLog: WorkoutFormSetLog) {
  return setLog.completed;
}

function hasExerciseData(setLogs: WorkoutFormSetLog[]) {
  return setLogs.some(
    (setLog) =>
      setLog.actualWeight !== null ||
      setLog.actualReps !== null ||
      setLog.actualRir !== null ||
      setLog.actualRpe !== null ||
      Boolean(setLog.notes.trim()) ||
      setLog.completed,
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
  const reps = setLog.actualReps !== null ? `${setLog.actualReps} reps` : "reps n/d";
  const rir = rirValue !== null ? `RIR ${rirValue}` : "RIR n/d";
  const status = setLog.completed ? "completata" : "non completata";

  return `Serie ${setLog.setNumber}: ${weight} · ${reps} · ${rir} · ${status}`;
}

function buildInitialSetLogs(exercise: WorkoutFormExercise) {
  const plannedSets = exercise.sets ?? 1;
  const totalSets = Math.max(plannedSets, exercise.initialSetLogs.length, 1);
  const existingBySetNumber = new Map(
    exercise.initialSetLogs.map((setLog) => [setLog.setNumber, setLog]),
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
    category: exercise.category,
    primaryMuscle: exercise.primaryMuscle,
    secondaryMuscles: exercise.secondaryMuscles,
    equipment: exercise.equipment,
    difficulty: exercise.difficulty,
    instructions: exercise.instructions,
    needsTranslation: exercise.needsTranslation,
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
  const label = getExerciseDifficultyForDisplay({ difficulty: value });

  if (!label) {
    return "Livello n/d";
  }

  return label;
}

function formatRest(restSeconds: number | null) {
  if (restSeconds === null) {
    return "Recupero da definire";
  }

  if (restSeconds === 0) {
    return "0 sec";
  }

  return `${restSeconds} sec`;
}

function formatPrescription(sets: number | null, reps: string | null) {
  if (!sets && !reps) {
    return "Dettagli da definire";
  }

  if (!sets) {
    return reps ?? "Dettagli da definire";
  }

  return `${sets} x ${reps ?? "reps"}`;
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

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M8 6v12l10-6-10-6Z" fill="currentColor" />
    </svg>
  );
}

function CheckIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={active ? "h-4 w-4 text-[#111315]" : "h-4 w-4 text-white/35"}
    >
      <path
        d="M5 10.5 8.25 13.75 15 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExercisePreviewImage({
  name,
  imageUrls,
}: {
  name: string;
  imageUrls: string[];
}) {
  if (imageUrls.length === 0) {
    return (
      <div className="flex h-[96px] w-[96px] items-center justify-center rounded-[18px] border border-white/7 bg-[repeating-linear-gradient(135deg,#1c2123_0_8px,#181c1d_8px_16px)] text-center">
        <span className="px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-3)]">
          Preview
        </span>
      </div>
    );
  }

  return (
    <div className="h-[96px] w-[96px] overflow-hidden rounded-[18px] border border-white/7 bg-[var(--app-surface-soft)]">
      <img
        src={imageUrls[0]}
        alt={`Esecuzione esercizio: ${name}`}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </div>
  );
}

function MetricPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[16px] border border-white/7 bg-[var(--app-bg)]/50 px-3 py-2.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
        {label}
      </p>
      <p className="mt-1 text-[13px] font-semibold leading-5 text-[var(--app-text)]">
        {value}
      </p>
    </div>
  );
}

function getSuggestionAccent(status: ExerciseState["progressionSuggestion"]["status"]) {
  switch (status) {
    case "increase_load":
      return "border-[var(--app-primary-border)] bg-[var(--app-primary-soft)] text-[var(--app-text)]";
    case "increase_reps":
      return "border-emerald-800/70 bg-emerald-950/30 text-emerald-50";
    case "reduce_load":
      return "border-amber-800/70 bg-amber-950/30 text-amber-50";
    case "repeat_load":
    case "time_based":
      return "border-white/8 bg-white/[0.035] text-[var(--app-text)]";
    case "incomplete_data":
      return "border-white/8 bg-[var(--app-surface-soft)] text-[var(--app-text)]";
    default:
      return "border-white/8 bg-white/[0.035] text-[var(--app-text)]";
  }
}

function getEntryCardCopy(
  state: FlexibleWorkoutState,
  title: string,
  plannedDateLabel: string,
  isCompletedWorkout: boolean,
) {
  if (isCompletedWorkout) {
    return {
      eyebrow: "Seduta completata",
      title,
      description:
        "Hai gia completato questa seduta. Qui sotto trovi il riepilogo pulito e, se ti serve, puoi rivedere i progressi.",
      buttonLabel: "Rivedi progressi",
    };
  }

  switch (state) {
    case "recommended_today":
      return {
        eyebrow: "Pronta per oggi",
        title,
        description: "Quando inizi, apri solo gli esercizi che ti servono e registra i progressi.",
        buttonLabel: "Inizia allenamento",
      };
    case "overdue":
      return {
        eyebrow: "Da recuperare",
        title,
        description: `Era prevista per ${plannedDateLabel}. Puoi recuperarla quando vuoi.`,
        buttonLabel: "Inizia allenamento",
      };
    case "future_available":
      return {
        eyebrow: "Disponibile",
        title,
        description: "Puoi aprirla in anticipo se ti serve riorganizzare la settimana.",
        buttonLabel: "Inizia allenamento",
      };
    case "in_progress":
      return {
        eyebrow: "In corso",
        title,
        description: "Riprendi da dove avevi lasciato: i progressi gia salvati restano qui.",
        buttonLabel: "Riprendi allenamento",
      };
    case "skipped":
      return {
        eyebrow: "Seduta saltata",
        title,
        description: "Hai segnato questa seduta come saltata. Puoi recuperarla quando vuoi.",
        buttonLabel: "Recupera seduta",
      };
    case "completed":
    default:
      return {
        eyebrow: "Seduta",
        title,
        description: "Apri la seduta e registra i progressi sotto ogni esercizio.",
        buttonLabel: "Inizia allenamento",
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
    exercises.map(buildExerciseState),
  );
  const [collapsedExerciseIds, setCollapsedExerciseIds] = useState<Set<number>>(
    () => new Set(exercises.map((exercise) => exercise.id)),
  );
  const [perceivedEffort, setPerceivedEffort] = useState(
    existingLog?.perceivedEffort?.toString() ?? "",
  );
  const [sessionNotes, setSessionNotes] = useState(existingLog?.notes ?? "");
  const [loadingAction, setLoadingAction] = useState<"save" | "complete" | null>(
    null,
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
        : "not_started",
  );
  const [isEditingWorkout, setIsEditingWorkout] = useState(false);
  const [completionCard, setCompletionCard] = useState<CompletionCardState>({
    visible: false,
    completedAtLabel: existingLog?.completedAt ?? null,
  });
  const [activeSwapExerciseId, setActiveSwapExerciseId] = useState<number | null>(
    null,
  );
  const [swapReason, setSwapReason] = useState<SwapReason>("prefer_alternative");
  const [swapAlternatives, setSwapAlternatives] = useState<ExerciseAlternative[]>(
    [],
  );
  const [selectedAlternativeId, setSelectedAlternativeId] = useState<number | null>(
    null,
  );
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapSubmitting, setSwapSubmitting] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);

  const hasTodaySummary = exerciseStates.some((exercise) => exercise.todaySummary.length > 0);
  const isCompletedWorkout = workoutState === "completed";
  const completedAtLabel = existingLog?.completedAt ?? null;
  const entryCardCopy = getEntryCardCopy(
    workoutState,
    workout.title,
    plannedDateLabel,
    isCompletedWorkout,
  );

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
      return new Set([...currentState].filter((exerciseId) => validIds.has(exerciseId)));
    });
  }, [exercises]);

  useEffect(() => {
    setCompletionCard((currentState) => ({
      visible: currentState.visible,
      completedAtLabel: existingLog?.completedAt ?? currentState.completedAtLabel,
    }));
  }, [existingLog?.completedAt]);

  function updateSetLog(
    exerciseId: number,
    setNumber: number,
    field: keyof WorkoutFormSetLog,
    value: number | boolean | string | null,
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
            : setLog,
        );
        return {
          ...exercise,
          setLogs: nextSetLogs,
        };
      }),
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

  async function loadSwapAlternatives(programExerciseId: number, reason: SwapReason) {
    setSwapLoading(true);
    setSwapError(null);
    setSwapAlternatives([]);
    setSelectedAlternativeId(null);

    try {
      const response = await fetch(
        `/api/exercises/alternatives?programExerciseId=${programExerciseId}&reason=${reason}`,
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
          : "Errore di connessione. Riprova.",
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
                category: payload.programExercise?.category ?? exercise.category,
                primaryMuscle:
                  payload.programExercise?.primaryMuscle ?? exercise.primaryMuscle,
                notes: sanitizeUserFacingNotes(payload.programExercise?.notes) ?? exercise.notes,
                secondaryMuscles:
                  payload.programExercise?.secondaryMuscles ?? exercise.secondaryMuscles,
                equipment: payload.programExercise?.equipment ?? exercise.equipment,
                difficulty: payload.programExercise?.difficulty ?? exercise.difficulty,
                instructions: payload.programExercise?.instructions ?? exercise.instructions,
                needsTranslation:
                  payload.programExercise?.needsTranslation ?? exercise.needsTranslation,
                imageUrls: payload.programExercise?.imageUrls ?? exercise.imageUrls,
                setLogs: buildEmptySetLogs(exercise.setLogs.length),
                previousPerformance: null,
                todaySummary: [],
              }
            : exercise,
        ),
      );
      setCollapsedExerciseIds((currentState) => {
        const nextState = new Set(currentState);
        nextState.delete(programExerciseId);

        if (payload.programExercise && payload.programExercise.id !== programExerciseId) {
          nextState.delete(payload.programExercise.id);
        }

        return nextState;
      });

      setMessage([payload.message, payload.swapSummary].filter(Boolean).join(" "));
      closeSwapPanel();
      router.refresh();
    } catch (caughtError) {
      setSwapError(
        caughtError instanceof Error
          ? caughtError.message
          : "Errore di connessione. Riprova.",
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
            })),
          ),
        }),
      });

      const { data, message: responseMessage } = await parseApiResponse(response);

      if (!response.ok || !data?.ok) {
        throw new Error(responseMessage || "Errore durante il salvataggio.");
      }

      setLastSavedStatus(status);
      if (action === "complete") {
        setCompletionCard({
          visible: true,
          completedAtLabel: new Date().toISOString(),
        });
        setMessage(null);
      } else {
        setMessage(responseMessage || "Progressi salvati.");
      }
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Errore di connessione. Riprova.",
      );
    } finally {
      setLoadingAction(null);
    }
  }

  if (exerciseStates.length === 0) {
    return (
      <section className="mt-5">
        <EmptyState
          title="Nessun esercizio disponibile per questa seduta."
          description="Torna al programma e riprova tra poco."
        />
      </section>
    );
  }

  return (
    <section className="mt-5 space-y-5">
      {completionCard.visible ? (
        <AppCard
          soft
          className="rounded-[28px] border border-white/8 bg-[var(--app-surface)] p-5 sm:p-6"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
            Seduta completata
          </p>
          <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.03em] text-[var(--app-text)]">
            Complimenti
          </h2>
          <p className="mt-2 text-base font-medium text-[var(--app-text)]">
            Hai completato la seduta.
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
            I tuoi progressi sono stati salvati. Puoi tornare alla dashboard o
            modificare i dati appena inseriti.
          </p>
          {completionCard.completedAtLabel ? (
            <p className="mt-3 text-[13px] text-[var(--app-muted-2)]">
              Aggiornata il {formatDateLabel(completionCard.completedAtLabel)}.
            </p>
          ) : null}
          <div className="mt-6 grid gap-3">
            <PrimaryButton
              href="/dashboard"
              className="min-h-12 rounded-2xl whitespace-nowrap"
            >
              Torna alla dashboard
            </PrimaryButton>
            <SecondaryButton
              className="min-h-12 rounded-2xl whitespace-nowrap"
              onClick={() =>
                setCompletionCard((currentState) => ({
                  ...currentState,
                  visible: false,
                }))
              }
            >
              Modifica progressi
            </SecondaryButton>
          </div>
        </AppCard>
      ) : null}

      {!completionCard.visible ? (
        <>
          {!isEditingWorkout ? (
            <AppCard
              soft
              className="rounded-[24px] border border-white/8 bg-[var(--app-surface)] p-5"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                {entryCardCopy.eyebrow}
              </p>
              <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.02em] text-[var(--app-text)]">
                {entryCardCopy.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
                {entryCardCopy.description}
              </p>
              {completedAtLabel ? (
                <p className="mt-3 text-[13px] text-[var(--app-muted-2)]">
                  Aggiornata il {formatDateLabel(completedAtLabel)}.
                </p>
              ) : null}

              <div className="mt-5 flex flex-col gap-3">
                {!isCompletedWorkout ? (
                  <PrimaryButton onClick={() => setIsEditingWorkout(true)}>
                    {entryCardCopy.buttonLabel}
                    <PlayIcon />
                  </PrimaryButton>
                ) : (
                  <SecondaryButton onClick={() => setIsEditingWorkout(true)}>
                    {entryCardCopy.buttonLabel}
                  </SecondaryButton>
                )}

                {workoutState === "skipped" && !isCompletedWorkout ? (
                  <SecondaryButton href="/program">Apri programma</SecondaryButton>
                ) : null}

                {isCompletedWorkout ? (
                  <>
                    <SecondaryButton href="/program">Torna al programma</SecondaryButton>
                    <SecondaryButton href="/workout-history">Vedi storico</SecondaryButton>
                  </>
                ) : null}
              </div>
            </AppCard>
          ) : null}

          {isCompletedWorkout && !isEditingWorkout ? (
            <div className="space-y-4">
              <SectionHeader eyebrow="Esercizi" title="Riepilogo seduta" />

              {exerciseStates.map((exercise, index) => {
                const displayData = getExerciseDisplayData(exercise);

                return (
                  <AppCard
                    key={exercise.id}
                    soft
                    className="rounded-[24px] border border-white/8 bg-[var(--app-surface)] p-4"
                  >
                    <div className="flex items-start gap-4">
                      <ExercisePreviewImage name={displayData.name} imageUrls={exercise.imageUrls} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                          Esercizio {index + 1}
                        </p>
                        <h3 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-[var(--app-text)]">
                          {displayData.name}
                        </h3>
                        <p className="mt-2 text-sm text-[var(--app-muted)]">
                          {formatPrescription(exercise.sets, exercise.reps)} · {formatRest(exercise.restSeconds)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[18px] border border-white/7 bg-[var(--app-bg)]/55 p-4">
                      <p className="text-[13px] font-semibold text-[var(--app-text)]">Progressi</p>
                      {exercise.todaySummary.length > 0 ? (
                        <div className="mt-3 space-y-2 text-sm text-[var(--app-muted)]">
                          {exercise.todaySummary.map((setLog) => (
                            <p key={`${exercise.id}-summary-${setLog.setNumber}`}>
                              {formatSetSummary(setLog)}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-[var(--app-muted)]">
                          Nessun progresso registrato per questo esercizio.
                        </p>
                      )}
                    </div>
                  </AppCard>
                );
              })}

              {!hasTodaySummary ? (
                <EmptyState
                  title="Nessun progresso registrato."
                  description="Questa seduta non contiene ancora un riepilogo da mostrare."
                />
              ) : null}
            </div>
          ) : null}

          {isEditingWorkout ? (
            <div className="space-y-5">
              <AppCard
                soft
                className="rounded-[24px] border border-white/8 bg-[var(--app-surface)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                      Sessione attiva
                    </p>
                    <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-[var(--app-text)]">
                      {lastSavedStatus === "completed"
                        ? "Seduta completata"
                        : lastSavedStatus === "in_progress"
                          ? "Allenamento in corso"
                          : "Pronto a registrare i progressi"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingWorkout(false)}
                    className="rounded-full border border-white/10 px-3 py-1.5 text-[12px] font-semibold text-[var(--app-muted)] transition hover:border-white/16 hover:text-[var(--app-text)]"
                  >
                    Riduci
                  </button>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
                  {lastSavedStatus === "completed"
                    ? "Puoi aggiornare i progressi senza aprire una nuova seduta."
                    : "Troverai i progressi sotto ogni esercizio. Puoi salvare in fondo quando vuoi."}
                </p>
              </AppCard>

              <SectionHeader
                eyebrow="Esercizi"
                title={`${exerciseStates.length} ${exerciseStates.length === 1 ? "esercizio" : "esercizi"}`}
              />

              <div className="space-y-4">
            {exerciseStates.map((exercise, index) => {
              const completedSets = exercise.setLogs.filter(isSetCompleted).length;
              const totalSets = exercise.setLogs.length;
              const isCollapsed = collapsedExerciseIds.has(exercise.id);
              const hasEnteredData = hasExerciseData(exercise.setLogs);
              const displayData = getExerciseDisplayData(exercise);
              const primaryMuscleLabel = displayData.primaryMuscles[0] ?? null;
              const equipmentLabel = getExerciseEquipmentForDisplay(exercise).join(", ");
              const cleanNote = sanitizeUserFacingNotes(exercise.notes);
              const exerciseActionLabel = hasEnteredData
                ? "Modifica esercizio"
                : "Inizia esercizio";
              const canSwapExercise = exercise.exerciseId !== null;

              return (
                <AppCard
                  key={exercise.id}
                  soft
                  className="rounded-[24px] border border-white/8 bg-[var(--app-surface)] p-4"
                >
                  <div className="flex items-start gap-4">
                    <ExercisePreviewImage name={displayData.name} imageUrls={exercise.imageUrls} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                            Esercizio {index + 1}
                          </p>
                          <h3 className="mt-1 text-[19px] font-semibold tracking-[-0.02em] text-[var(--app-text)]">
                            {displayData.name}
                          </h3>
                        </div>
                        <span className="text-[14px] font-semibold tracking-[-0.02em] text-[#D0D82B]">
                          {completedSets}/{totalSets}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-[var(--app-muted)]">
                        {[primaryMuscleLabel, equipmentLabel || null].filter(Boolean).join(" · ") ||
                          "Dettagli da definire"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MetricPill
                      label="Serie x reps"
                      value={formatPrescription(exercise.sets, exercise.reps)}
                    />
                    <MetricPill label="Recupero" value={formatRest(exercise.restSeconds)} />
                    <MetricPill
                      label="Intensita"
                      value={exercise.intensity?.trim() || "Da definire"}
                    />
                    <MetricPill
                      label="Livello"
                      value={formatDifficultyLabel(exercise.difficulty)}
                    />
                  </div>

                  <div
                    className={`mt-4 rounded-[18px] border p-4 ${getSuggestionAccent(
                      exercise.progressionSuggestion.status,
                    )}`}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                      Obiettivo prossima seduta
                    </p>
                    <p className="mt-2 text-[14px] font-semibold text-current">
                      {exercise.progressionSuggestion.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-current/85">
                      {exercise.progressionSuggestion.message}
                    </p>
                    <p className="mt-3 text-sm text-current/75">
                      {exercise.progressionSuggestion.suggestedAction}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <ExerciseInstructionsModal
                      name={exercise.name}
                      imageUrls={exercise.imageUrls}
                      instructions={exercise.instructions}
                      technicalNote={cleanNote}
                      primaryMuscle={exercise.primaryMuscle}
                      secondaryMuscles={exercise.secondaryMuscles}
                      equipment={exercise.equipment}
                      difficulty={exercise.difficulty}
                      category={exercise.category}
                      needsTranslation={exercise.needsTranslation}
                    />

                    {canSwapExercise ? (
                      <button
                        type="button"
                        onClick={() => openSwapPanel(exercise.id)}
                        className="inline-flex min-h-[52px] items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-semibold text-[var(--app-text)] transition hover:border-white/16 hover:bg-white/[0.05]"
                      >
                        Sostituisci
                      </button>
                    ) : null}
                  </div>

                  {isCollapsed ? (
                    <button
                      type="button"
                      onClick={() => openExercise(exercise.id)}
                      className="mt-3 inline-flex min-h-[56px] w-full items-center justify-center rounded-[18px] bg-[#D0D82B] px-4 py-3 text-sm font-bold text-[#121212] transition hover:brightness-105"
                    >
                      {exerciseActionLabel}
                    </button>
                  ) : null}

                  {activeSwapExerciseId === exercise.id ? (
                    <div className="mt-4 rounded-[22px] border border-[var(--app-primary-border)] bg-[var(--app-primary-soft)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-primary)]">
                            Sostituzione esercizio
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[var(--app-text)]">
                            Scegli il motivo e valuta le alternative piu coerenti.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={closeSwapPanel}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-[12px] font-semibold text-[var(--app-text)]"
                        >
                          Chiudi
                        </button>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {SWAP_REASON_OPTIONS.map((option) => (
                          <label
                            key={option.value}
                            className={`cursor-pointer rounded-[16px] border p-3 text-sm transition ${
                              swapReason === option.value
                                ? "border-[var(--app-primary-border)] bg-[var(--app-bg)]/40 text-[var(--app-text)]"
                                : "border-white/8 bg-[var(--app-bg)]/35 text-[var(--app-muted)]"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`swap-reason-${exercise.id}`}
                              checked={swapReason === option.value}
                              onChange={() => {
                                setSwapReason(option.value);
                                void loadSwapAlternatives(exercise.id, option.value);
                              }}
                              className="sr-only"
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>

                      {swapReason === "discomfort_or_limitation" ? (
                        <p className="mt-3 rounded-[16px] border border-amber-800/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
                          Se il fastidio e acuto, persistente o peggiora, interrompi l'esercizio.
                        </p>
                      ) : null}

                      {swapError ? (
                        <p className="mt-3 rounded-[16px] border border-red-800/60 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                          {swapError}
                        </p>
                      ) : null}

                      {!swapLoading && !swapError && swapAlternatives.length === 0 ? (
                        <p className="mt-3 rounded-[16px] border border-white/8 bg-[var(--app-bg)]/35 px-4 py-3 text-sm text-[var(--app-muted)]">
                          Nessuna alternativa coerente disponibile per questo esercizio.
                        </p>
                      ) : null}

                      <div className="mt-3 space-y-3">
                        {swapAlternatives.map((alternative) => {
                          const alternativeName = getExerciseDisplayName(alternative);
                          const alternativePrimaryMuscle =
                            getExerciseMusclesForDisplay(alternative).primaryMuscles[0] ?? null;
                          const alternativeEquipment =
                            getExerciseEquipmentForDisplay(alternative);

                          return (
                            <button
                              key={alternative.exerciseId}
                              type="button"
                              onClick={() => setSelectedAlternativeId(alternative.exerciseId)}
                              className={`w-full rounded-[18px] border p-4 text-left transition ${
                                selectedAlternativeId === alternative.exerciseId
                                  ? "border-[var(--app-primary-border)] bg-[var(--app-bg)]/50"
                                  : "border-white/8 bg-[var(--app-bg)]/35 hover:border-white/16"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-[15px] font-semibold text-[var(--app-text)]">
                                    {alternativeName}
                                  </p>
                                  <p className="mt-1 text-sm text-[var(--app-muted)]">
                                    {alternativePrimaryMuscle
                                      ? `Focus: ${alternativePrimaryMuscle}`
                                      : "Focus da definire"}
                                  </p>
                                </div>
                                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                                  {alternative.score}
                                </span>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="app-pill">
                                  {alternativeEquipment.join(", ") || "Attrezzatura n/d"}
                                </span>
                                <span className="app-pill">
                                  {alternative.movementPattern ?? "Pattern n/d"}
                                </span>
                                <span className="app-pill">
                                  {formatDifficultyLabel(alternative.difficulty)}
                                </span>
                              </div>

                              {alternative.matchReasons.length > 0 ? (
                                <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
                                  {alternative.matchReasons.join(" · ")}
                                </p>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => applyExerciseSwap(exercise.id)}
                          disabled={selectedAlternativeId === null || swapSubmitting}
                          className="inline-flex min-h-[52px] items-center justify-center rounded-[16px] bg-[var(--app-primary)] px-4 py-3 text-sm font-bold text-[var(--app-bg)] disabled:opacity-50"
                        >
                          {swapSubmitting ? "Applicazione..." : "Usa questo esercizio"}
                        </button>
                        <button
                          type="button"
                          onClick={closeSwapPanel}
                          className="inline-flex min-h-[52px] items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-semibold text-[var(--app-text)]"
                        >
                          Annulla
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 rounded-[18px] border border-white/7 bg-[var(--app-bg)]/55 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                      Ultima volta
                    </p>
                    {exercise.previousPerformance ? (
                      <>
                        <p className="mt-2 text-sm text-[var(--app-muted)]">
                          {formatPreviousPerformanceDate(exercise.previousPerformance.performedAt)}
                        </p>
                        <div className="mt-3 space-y-2 text-sm text-[var(--app-muted)]">
                          {exercise.previousPerformance.sets.map((setLog) => (
                            <p key={`${exercise.id}-previous-${setLog.setNumber}`}>
                              {formatSetSummary(setLog)}
                            </p>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-[var(--app-muted)]">
                        Prima volta con questo esercizio.
                      </p>
                    )}
                  </div>

                  {!isCollapsed ? (
                    <div className="mt-4 rounded-[22px] border border-white/8 bg-[var(--app-bg)]/45 p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                          Progressi
                        </p>
                        <p className="text-[12px] font-semibold text-[var(--app-muted)]">
                          {completedSets}/{totalSets}
                        </p>
                      </div>

                      <div className="mt-4">
                        <div className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-3 px-1">
                          <div aria-hidden="true" />
                          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_52px] gap-2">
                            <p className="px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                              KG
                            </p>
                            <p className="px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                              REPS
                            </p>
                            <div aria-hidden="true" />
                          </div>
                        </div>

                        <div className="mt-2 space-y-3">
                          {exercise.setLogs.map((setLog) => (
                            <div
                              key={`${exercise.id}-${setLog.setNumber}`}
                              className="space-y-2.5"
                            >
                              <div className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-3">
                                <p className="text-[28px] font-semibold leading-none tracking-[-0.04em] text-[#D0D82B]">
                                  {setLog.setNumber}
                                </p>

                                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_52px] gap-2">
                                  <label className="text-sm">
                                    <span className="sr-only">
                                      KG serie {setLog.setNumber}
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
                                          parseNumberInput(event.target.value),
                                        )
                                      }
                                      className="h-11 w-full rounded-[14px] border border-white/10 bg-[var(--app-surface-soft)] px-3 text-[15px] font-semibold text-[var(--app-text)] outline-none transition placeholder:text-white/30 focus:border-[#D0D82B]/60"
                                      placeholder="KG"
                                    />
                                  </label>

                                  <label className="text-sm">
                                    <span className="sr-only">
                                      Reps serie {setLog.setNumber}
                                    </span>
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
                                          parseNumberInput(event.target.value),
                                        )
                                      }
                                      className="h-11 w-full rounded-[14px] border border-white/10 bg-[var(--app-surface-soft)] px-3 text-[15px] font-semibold text-[var(--app-text)] outline-none transition placeholder:text-white/30 focus:border-[#D0D82B]/60"
                                      placeholder="Reps"
                                    />
                                  </label>

                                  <button
                                    type="button"
                                    aria-pressed={setLog.completed}
                                    aria-label={
                                      setLog.completed
                                        ? `Segna serie ${setLog.setNumber} come non completata`
                                        : `Segna serie ${setLog.setNumber} come completata`
                                    }
                                    onClick={() =>
                                      updateSetLog(
                                        exercise.id,
                                        setLog.setNumber,
                                        "completed",
                                        !setLog.completed,
                                      )
                                    }
                                    className={`flex h-11 w-[52px] items-center justify-center rounded-[14px] border transition ${
                                      setLog.completed
                                        ? "border-[#D0D82B] bg-[#D0D82B]"
                                        : "border-white/10 bg-[var(--app-surface-soft)]"
                                    }`}
                                  >
                                    <CheckIcon active={setLog.completed} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => collapseExercise(exercise.id)}
                        className="mt-4 inline-flex min-h-[56px] w-full items-center justify-center rounded-[18px] bg-[#D0D82B] px-4 py-3 text-sm font-bold text-[#121212] transition hover:brightness-105"
                      >
                        Finisci esercizio
                      </button>
                    </div>
                  ) : null}
                </AppCard>
              );
            })}
          </div>

          {error ? (
            <p className="rounded-[18px] border border-red-800/60 bg-red-950/30 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="rounded-[18px] border border-[var(--app-primary-border)] bg-[var(--app-primary-soft)] px-4 py-3 text-sm text-[var(--app-text)]">
              {message}
            </p>
          ) : null}

          <SectionHeader eyebrow="Finale" title="Feedback finale" />

          <AppCard
            soft
            className="rounded-[24px] border border-white/8 bg-[var(--app-surface)] p-4"
          >
            <div className="grid gap-3">
              <label className="rounded-[18px] border border-white/7 bg-[var(--app-bg)]/55 p-4 text-sm">
                <span className="block text-[var(--app-muted)]">Fatica percepita</span>
                <span className="mt-2 block text-xs leading-5 text-[var(--app-muted-2)]">
                  1 = molto facile, 10 = massimo sforzo.
                </span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={perceivedEffort}
                  onChange={(event) => setPerceivedEffort(event.target.value)}
                  className="mt-3 h-12 w-full rounded-[14px] border border-white/10 bg-[var(--app-surface-soft)] px-4 text-[var(--app-text)] outline-none transition focus:border-[var(--app-primary-border)]"
                  placeholder="1-10"
                />
              </label>

              <label className="rounded-[18px] border border-white/7 bg-[var(--app-bg)]/55 p-4 text-sm">
                <span className="block text-[var(--app-muted)]">Note finali</span>
                <textarea
                  value={sessionNotes}
                  onChange={(event) => setSessionNotes(event.target.value)}
                  rows={4}
                  className="mt-3 w-full rounded-[14px] border border-white/10 bg-[var(--app-surface-soft)] px-4 py-3 text-[var(--app-text)] outline-none transition focus:border-[var(--app-primary-border)]"
                  placeholder="Come ti sei sentito, cosa vuoi ricordare, eventuali adattamenti..."
                />
              </label>
            </div>

            <div className="mt-5 rounded-[18px] border border-white/7 bg-[var(--app-bg)]/55 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                Stato seduta
              </p>
              <p className="mt-1 text-sm text-[var(--app-text)]">
                {lastSavedStatus === "completed"
                  ? "Completata"
                  : lastSavedStatus === "in_progress"
                    ? "In corso"
                    : "Da iniziare"}
              </p>
            </div>

            <div className="mt-5 grid gap-3">
              <SecondaryButton
                onClick={() => submitWorkout("save")}
                disabled={loadingAction !== null}
              >
                {loadingAction === "save" ? "Salvataggio..." : "Salva e continua dopo"}
              </SecondaryButton>

              <PrimaryButton
                onClick={() => submitWorkout("complete")}
                disabled={loadingAction !== null}
              >
                {loadingAction === "complete"
                  ? "Salvataggio..."
                  : lastSavedStatus === "completed"
                    ? "Aggiorna progressi"
                    : "Salva progressi"}
              </PrimaryButton>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/program"
                className="text-[13px] font-semibold text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
              >
                Torna al programma
              </Link>
              <Link
                href="/workout-history"
                className="text-[13px] font-semibold text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
              >
                Vedi storico
              </Link>
            </div>
          </AppCard>
        </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
