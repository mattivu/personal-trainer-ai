import "server-only";
import { prisma } from "@/lib/prisma";
import { getBlockReviewForUser } from "@/lib/block-review";
import type { CoachContext } from "@/lib/ai/coach-context";
import type { CoachAction } from "@/lib/ai/coach-action-types";
import { getWeeklyReviewForUser } from "@/lib/weekly-review";
import {
  getFlexibleWorkoutState,
  getWeekEnd,
  getWeekStart,
  getWorkoutScheduleForProgram,
  type FlexibleWorkoutState,
} from "@/lib/workout-schedule";

const MAX_ACTIONS = 3;

type GenerateCoachActionsInput = {
  userId: number;
  latestUserMessage: string;
  context: CoachContext;
};

type ScheduledWorkoutActionSignal = {
  workoutId: number;
  title: string;
  state: FlexibleWorkoutState;
  plannedDateLabel: string;
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchesAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function createAction(
  id: string,
  label: string,
  href: string,
  kind: CoachAction["kind"],
  description?: string
): CoachAction {
  return {
    id,
    label,
    description,
    href,
    kind,
  };
}

async function getScheduledWorkoutSignals(
  userId: number,
  context: CoachContext
): Promise<ScheduledWorkoutActionSignal[]> {
  const now = new Date();
  const currentWeekStart = getWeekStart(now);
  const currentWeekEnd = getWeekEnd(now);
  const weekLogs = await prisma.workoutLog.findMany({
    where: {
      userId,
      programId: context.activeProgram.id,
      performedAt: {
        gte: currentWeekStart,
        lte: currentWeekEnd,
      },
    },
    select: {
      workoutId: true,
      status: true,
      performedAt: true,
      updatedAt: true,
      id: true,
    },
    orderBy: [{ performedAt: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
  });

  const latestLogByWorkoutId = new Map<
    number,
    {
      status: string;
      performedAt: Date;
      updatedAt: Date;
      id: number;
    }
  >();

  for (const weekLog of weekLogs) {
    if (!weekLog.workoutId || latestLogByWorkoutId.has(weekLog.workoutId)) {
      continue;
    }

    latestLogByWorkoutId.set(weekLog.workoutId, weekLog);
  }

  return getWorkoutScheduleForProgram(context.activeProgram.workouts, now).map(
    ({ workout, plannedDateLabel, plannedDateThisWeek }) => ({
      workoutId: workout.id,
      title: workout.title,
      plannedDateLabel,
      state: getFlexibleWorkoutState({
        plannedDateThisWeek,
        plannedDateLabel,
        weekLog: latestLogByWorkoutId.get(workout.id) ?? null,
        referenceDate: now,
      }).state,
    })
  );
}

function pickPreferredWorkout(
  workouts: ScheduledWorkoutActionSignal[],
  allowedStates: FlexibleWorkoutState[]
) {
  for (const state of allowedStates) {
    const match = workouts.find((workout) => workout.state === state);

    if (match) {
      return match;
    }
  }

  return null;
}

function addAction(
  actions: CoachAction[],
  action: CoachAction | null | undefined
) {
  if (!action) {
    return;
  }

  const alreadyIncluded = actions.some(
    (existingAction) =>
      existingAction.id === action.id || existingAction.href === action.href
  );

  if (alreadyIncluded || actions.length >= MAX_ACTIONS) {
    return;
  }

  actions.push(action);
}

export async function generateCoachActions({
  userId,
  latestUserMessage,
  context,
}: GenerateCoachActionsInput): Promise<CoachAction[]> {
  const normalizedMessage = normalizeText(latestUserMessage);
  const [weeklyReview, blockReview, scheduledWorkouts] = await Promise.all([
    getWeeklyReviewForUser(userId),
    getBlockReviewForUser(userId),
    getScheduledWorkoutSignals(userId, context),
  ]);

  const actions: CoachAction[] = [];
  const currentWorkoutId = context.currentWorkout?.id;
  const consultOnlyRisk = matchesAny(normalizedMessage, [
    /\bdolor(e|i)\b/,
    /\bmale\b/,
    /\binfortun/,
    /\btrauma\b/,
    /\bcapogir/,
    /\bvertigin/,
    /\bnausea\b/,
    /\bfiato corto\b/,
    /\baffanno\b/,
    /\bdolore toracic/,
    /\bpetto\b/,
    /\bsintom/,
  ]);

  const asksForWorkoutDirection = matchesAny(normalizedMessage, [
    /\bcosa devo fare oggi\b/,
    /\bche devo fare oggi\b/,
    /\bcosa faccio oggi\b/,
    /\bcosa mi consigli oggi\b/,
    /\bquale seduta\b/,
    /\bquale allenamento\b/,
    /\boggi\b/,
    /\bscheda\b/,
    /\bprogramma\b/,
    /\bseduta\b/,
  ]);
  const asksForProgress = matchesAny(normalizedMessage, [
    /\bsto migliorando\b/,
    /\bmiglior/,
    /\bprogress/,
    /\bcarich/,
    /\bandamento\b/,
    /\bstorico\b/,
  ]);
  const asksForWeeklyReview = matchesAny(normalizedMessage, [
    /\bsettimana\b/,
    /\bcostanza\b/,
    /\bfatica\b/,
    /\brecuper/,
    /\bcome sta andando\b/,
    /\bcome e andata\b/,
  ]);
  const asksForBlockReview = matchesAny(normalizedMessage, [
    /\bquesta scheda funziona\b/,
    /\bil programma sta funzionando\b/,
    /\bcambiare scheda\b/,
    /\bscarico\b/,
    /\bnuovo blocco\b/,
    /\bblocco\b/,
    /\bfunziona\b/,
  ]);
  const asksToChangeGoal = matchesAny(normalizedMessage, [
    /\bcambiare obiettiv/,
    /\bcambiato obiettiv/,
    /\bobiettiv(o|i)\b/,
    /\bdisponibilita\b/,
    /\battrezzatura\b/,
    /\blimitazion/,
    /\broutine\b/,
    /\bquestionario\b/,
  ]);
  const asksExerciseSwap = matchesAny(normalizedMessage, [
    /\bsostitu/,
    /\bsostituire\b/,
    /\bcambia(re)? esercizi?/,
    /\bswap\b/,
  ]);

  const workoutForAction =
    (currentWorkoutId
      ? scheduledWorkouts.find((workout) => workout.workoutId === currentWorkoutId) ?? null
      : null) ??
    pickPreferredWorkout(scheduledWorkouts, [
      "in_progress",
      "overdue",
      "recommended_today",
      "skipped",
      "future_available",
    ]);

  if (asksExerciseSwap) {
    addAction(
      actions,
      workoutForAction
        ? createAction(
            "open-workout-swap",
            "Apri seduta e sostituisci esercizio",
            `/workouts/${workoutForAction.workoutId}`,
            "guided",
            "Apri la seduta corretta e usa il flusso controllato di sostituzione esercizio."
          )
        : createAction(
            "open-program",
            "Vai al programma",
            "/program",
            "navigation",
            "Apri il programma per individuare la seduta da cui usare la sostituzione esercizio."
          )
    );
  }

  if (asksToChangeGoal) {
    addAction(
      actions,
      createAction(
        "edit-goal",
        "Modifica obiettivo",
        "/onboarding",
        "guided",
        "Aggiorna obiettivo, disponibilita, attrezzatura o limitazioni senza cambiare nulla automaticamente."
      )
    );
  }

  if (asksForBlockReview) {
    addAction(
      actions,
      createAction(
        "open-block-review",
        "Apri revisione blocco",
        "/block-review",
        "navigation",
        `Controlla il blocco attivo con una revisione rule-based. Stato attuale: ${blockReview.summaryStatus}.`
      )
    );
  }

  if (asksForWeeklyReview) {
    addAction(
      actions,
      createAction(
        "open-weekly-review",
        "Apri revisione settimanale",
        "/weekly-review",
        "navigation",
        `Rivedi aderenza, fatica e recuperi della settimana. Stato attuale: ${weeklyReview.status}.`
      )
    );
  }

  if (asksForProgress) {
    addAction(
      actions,
      createAction(
        "open-history",
        "Vedi storico",
        "/workout-history",
        "navigation",
        "Confronta le sedute completate per capire andamento, carichi e progressi registrati."
      )
    );
  }

  if (asksForWorkoutDirection || asksExerciseSwap || consultOnlyRisk) {
    addAction(
      actions,
      workoutForAction
        ? createAction(
            "open-workout",
            "Apri seduta",
            `/workouts/${workoutForAction.workoutId}`,
            consultOnlyRisk ? "guided" : "navigation",
            consultOnlyRisk
              ? "Apri la seduta solo per consultare struttura e note, senza forzare l'allenamento se hai sintomi o dolore."
              : workoutForAction.state === "in_progress"
                ? "Riprendi la seduta in corso."
                : workoutForAction.state === "overdue" || workoutForAction.state === "skipped"
                  ? "Apri la seduta da recuperare."
                  : "Apri la seduta piu rilevante per oggi."
          )
        : createAction(
            "open-program",
            "Vai al programma",
            "/program",
            "navigation",
            "Apri il programma attivo per vedere la struttura attuale delle sedute."
          )
    );
  }

  if (
    !consultOnlyRisk &&
    (blockReview.metrics.missedSessions > 0 ||
      weeklyReview.catchUpSessions > 0 ||
      weeklyReview.skippedSessions > 0)
  ) {
    addAction(
      actions,
      workoutForAction
        ? createAction(
            "open-catch-up-workout",
            "Apri seduta",
            `/workouts/${workoutForAction.workoutId}`,
            "navigation",
            "C'e almeno una seduta da recuperare o ancora da chiudere."
          )
        : null
    );
  }

  if (
    actions.length === 0 &&
    context.activeProgram.workouts.length > 0 &&
    matchesAny(normalizedMessage, [/\bcosa fare\b/, /\bche faccio\b/, /\bda dove parto\b/])
  ) {
    addAction(
      actions,
      createAction(
        "open-program",
        "Vai al programma",
        "/program",
        "navigation",
        "Apri il programma attivo per orientarti sulle prossime sedute."
      )
    );
  }

  return actions.slice(0, MAX_ACTIONS);
}
