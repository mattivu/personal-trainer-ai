import type { GeneratedProgram } from "./types";
import type { TrainingStrategy } from "./training-strategy";

type DetectedGoal =
  | "massa muscolare"
  | "forza"
  | "dimagrimento"
  | "ricomposizione"
  | "salute/mantenimento"
  | null;

export type ProgramConsistencyReport = {
  expectedGoal: TrainingStrategy["goal"];
  detectedGoalInNotes: DetectedGoal;
  expectedWeeklyTrainingDays: number;
  actualWorkoutCount: number;
  cardioSlotCount: number;
  dedicatedCardioWorkoutCount: number;
  splitType: TrainingStrategy["split"]["type"];
  focusMuscles: string[];
  warnings: string[];
};

function normalizeText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function detectGoalSignals(text: string) {
  const normalized = normalizeText(text);
  const matches = new Set<Exclude<DetectedGoal, null>>();

  if (normalized.includes("ipertrof") || normalized.includes("massa muscolare")) {
    matches.add("massa muscolare");
  }

  if (normalized.includes("forza") || normalized.includes("fondamentali")) {
    matches.add("forza");
  }

  if (
    normalized.includes("dimagr") ||
    normalized.includes("perdita di peso") ||
    normalized.includes("dispendio")
  ) {
    matches.add("dimagrimento");
  }

  if (normalized.includes("ricompos")) {
    matches.add("ricomposizione");
  }

  if (
    normalized.includes("salute") ||
    normalized.includes("benessere") ||
    normalized.includes("postura") ||
    normalized.includes("mobilita")
  ) {
    matches.add("salute/mantenimento");
  }

  return [...matches];
}

function getComparableGoal(
  goal: TrainingStrategy["goal"]
): DetectedGoal {
  switch (goal) {
    case "massa muscolare":
    case "forza":
    case "dimagrimento":
    case "ricomposizione":
    case "salute/mantenimento":
      return goal;
    default:
      return null;
  }
}

function isCardioExercise(exercise: {
  reps: string;
  intensity: string;
  notes: string;
  nameFallback?: string;
  name?: string;
}) {
  const combined = normalizeText(
    [exercise.nameFallback, exercise.name, exercise.reps, exercise.intensity, exercise.notes]
      .filter(Boolean)
      .join(" ")
  );

  return (
    combined.includes("cardio") ||
    combined.includes("zone 2") ||
    combined.includes("camminata") ||
    combined.includes("bike") ||
    combined.includes("cyclette") ||
    combined.includes("conditioning") ||
    combined.includes("vogatore") ||
    combined.includes("stair") ||
    combined.includes(" min")
  );
}

export function validateGeneratedProgramConsistency(
  program: GeneratedProgram,
  strategy: TrainingStrategy
): ProgramConsistencyReport {
  const goalSignals = detectGoalSignals(
    [program.title, program.goal, program.notes]
      .filter(Boolean)
      .join(" ")
  );
  const comparableGoal = getComparableGoal(strategy.goal);
  const detectedGoalInNotes =
    comparableGoal && goalSignals.includes(comparableGoal)
      ? comparableGoal
      : (goalSignals[0] ?? null);
  const dedicatedCardioWorkoutCount = program.workouts.filter((workout) =>
    normalizeText([workout.title, workout.focus, workout.notes].join(" ")).includes(
      "cardio"
    )
  ).length;
  const cardioSlotCount = program.workouts.reduce((count, workout) => {
    const workoutSignals = detectGoalSignals(
      [workout.title, workout.focus, workout.notes].join(" ")
    );
    const hasWorkoutCardioLabel = normalizeText(
      [workout.title, workout.focus, workout.notes].join(" ")
    ).includes("cardio");
    const cardioExercises = workout.exercises.filter((exercise) =>
      isCardioExercise(exercise)
    ).length;

    const hasCardioSignals =
      hasWorkoutCardioLabel ||
      cardioExercises > 0 ||
      workoutSignals.includes("dimagrimento");

    return count + (hasCardioSignals ? Math.max(cardioExercises, hasWorkoutCardioLabel ? 1 : 0) : 0);
  }, 0);
  const warnings: string[] = [];

  if (program.workouts.length > strategy.weeklyTrainingDays) {
    warnings.push("workout_count_exceeds_weekly_training_days");
  }

  if (strategy.split.sessionThemes.length > strategy.weeklyTrainingDays) {
    warnings.push("session_themes_exceed_weekly_training_days");
  }

  if (strategy.split.weeklyResistanceSessions > strategy.weeklyTrainingDays) {
    warnings.push("weekly_resistance_sessions_exceed_weekly_training_days");
  }

  if (strategy.cardio.weeklySessions > 0 && cardioSlotCount === 0) {
    warnings.push("cardio_missing_from_generated_program");
  }

  if (
    strategy.goal !== "massa muscolare" &&
    goalSignals.includes("massa muscolare")
  ) {
    warnings.push("hypertrophy_wording_detected_for_non_mass_goal");
  }

  if (
    strategy.goal === "forza" &&
    normalizeText(program.notes).includes("ipertrof")
  ) {
    warnings.push("hypertrophy_wording_detected_for_strength_goal");
  }

  return {
    expectedGoal: strategy.goal,
    detectedGoalInNotes,
    expectedWeeklyTrainingDays: strategy.weeklyTrainingDays,
    actualWorkoutCount: program.workouts.length,
    cardioSlotCount,
    dedicatedCardioWorkoutCount,
    splitType: strategy.split.type,
    focusMuscles: [...strategy.volume.focusBoosts],
    warnings,
  };
}
