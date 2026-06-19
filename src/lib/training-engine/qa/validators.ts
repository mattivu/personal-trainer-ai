import { getAdvancedTechniqueAssignments } from "@/lib/training-engine/advanced-techniques";
import {
  getExerciseAvailabilityForUser,
  type ExerciseAvailabilityProfile,
} from "@/lib/training-engine/exercise-availability";
import type { ProgramWorkoutBlueprintV2 } from "@/lib/training-engine/program-builder-v2";
import type { ProgramConsistencyReport } from "@/lib/training-engine/program-consistency";
import type { QuestionnaireProfile } from "@/lib/onboarding/questionnaire-profile";
import type { GeneratedProgram, GeneratedWorkout, EngineExercise } from "@/lib/training-engine/types";
import type { TrainingStrategy } from "@/lib/training-engine/training-strategy";
import type { TrainingEngineQaScenario } from "./scenarios";

export type QaCheckStatus = "PASS" | "WARN" | "FAIL";

export type QaCheck = {
  label: string;
  status: QaCheckStatus;
  detail?: string;
};

export type ResolvedExercise = {
  generated: GeneratedWorkout["exercises"][number];
  resolvedExercise: EngineExercise | null;
};

export type ResolvedWorkout = {
  workout: GeneratedWorkout;
  exercises: ResolvedExercise[];
};

export type ScenarioValidationContext = {
  scenario: TrainingEngineQaScenario;
  questionnaireProfile: QuestionnaireProfile;
  trainingStrategy: TrainingStrategy;
  generationAvailabilityProfile: ExerciseAvailabilityProfile;
  program: GeneratedProgram;
  blueprint: ProgramWorkoutBlueprintV2[];
  consistency: ProgramConsistencyReport;
  resolvedWorkouts: ResolvedWorkout[];
  exerciseMap: Map<string, EngineExercise>;
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

function buildCheck(label: string, status: QaCheckStatus, detail?: string): QaCheck {
  return { label, status, detail };
}

function countCardioTouches(context: ScenarioValidationContext) {
  return context.resolvedWorkouts.reduce((count, workout) => {
    const workoutCardio = workout.exercises.some(({ generated, resolvedExercise }) => {
      const text = normalizeText(
        [
          generated.nameFallback,
          resolvedExercise?.name,
          generated.reps,
          generated.intensity,
          generated.notes,
        ].join(" ")
      );

      return (
        resolvedExercise?.category === "cardio" ||
        text.includes("cardio") ||
        text.includes("camminata") ||
        text.includes("bike") ||
        text.includes("cyclette") ||
        text.includes("conditioning")
      );
    });

    return count + (workoutCardio ? 1 : 0);
  }, 0);
}

function getResolvedExercises(context: ScenarioValidationContext) {
  return context.resolvedWorkouts.flatMap((workout) =>
    workout.exercises
      .map((entry) => entry.resolvedExercise)
      .filter((entry): entry is EngineExercise => Boolean(entry))
  );
}

function getTechniqueAssignments(context: ScenarioValidationContext) {
  return getAdvancedTechniqueAssignments(context.trainingStrategy, context.blueprint);
}

function isHighRiskTechniqueNote(note: string) {
  const text = normalizeText(note);
  return (
    text.includes("drop set") ||
    text.includes("rest-pause") ||
    text.includes("myo-reps") ||
    text.includes("serie metabolica") ||
    text.includes("cluster set")
  );
}

function isModerateTechniqueNote(note: string) {
  const text = normalizeText(note);
  return (
    isHighRiskTechniqueNote(note) ||
    text.includes("superserie") ||
    text.includes("top set + back-off") ||
    text.includes("back-off set")
  );
}

function validateWeeklyDays(context: ScenarioValidationContext) {
  const expected = context.scenario.expectations.weeklyDays;
  const actual = context.program.workouts.length;

  if (actual !== expected || context.trainingStrategy.weeklyTrainingDays !== expected) {
    return buildCheck(
      "weekly days",
      "FAIL",
      `sedute ${actual}/${expected}, strategy ${context.trainingStrategy.weeklyTrainingDays}/${expected}`
    );
  }

  return buildCheck("weekly days", "PASS");
}

function validateNonEmptySessions(context: ScenarioValidationContext) {
  const emptyWorkouts = context.program.workouts.filter(
    (workout) => workout.exercises.length === 0
  );

  if (emptyWorkouts.length > 0) {
    return buildCheck(
      "non-empty sessions",
      "FAIL",
      `sedute vuote: ${emptyWorkouts.map((workout) => workout.title).join(", ")}`
    );
  }

  return buildCheck("non-empty sessions", "PASS");
}

function validateDuration(context: ScenarioValidationContext) {
  const requestedMinutes = context.trainingStrategy.sessionDurationMinutes;
  const outliers = context.program.workouts.filter((workout) => {
    const estimate = workout.estimatedMinutes ?? requestedMinutes;
    return estimate < Math.max(25, requestedMinutes - 20) || estimate > requestedMinutes + 25;
  });

  if (outliers.length > 0) {
    return buildCheck(
      "estimated duration",
      "WARN",
      `durata fuori scala su ${outliers.map((workout) => `${workout.title} (${workout.estimatedMinutes ?? "n/d"} min)`).join(", ")}`
    );
  }

  return buildCheck("estimated duration", "PASS");
}

function validateSplit(context: ScenarioValidationContext) {
  const split = context.trainingStrategy.split.type;
  const accepted = context.scenario.expectations.acceptedSplitTypes;

  if (!accepted.includes(split)) {
    return buildCheck(
      "split coherence",
      "FAIL",
      `split ${split} non tra quelli attesi: ${accepted.join(", ")}`
    );
  }

  return buildCheck("split coherence", "PASS", split);
}

function validateGoalAndCardio(context: ScenarioValidationContext) {
  const touches = countCardioTouches(context);
  const expected = context.scenario.expectations.cardio;
  const goal = context.trainingStrategy.goal;

  if (touches < expected.minTouches) {
    return buildCheck(
      "cardio presence",
      "WARN",
      `cardio presente ${touches} volte, atteso almeno ${expected.minTouches}`
    );
  }

  if (touches > expected.maxTouches) {
    return buildCheck(
      "cardio presence",
      goal === "massa muscolare" || goal === "forza" ? "FAIL" : "WARN",
      `cardio presente ${touches} volte, atteso massimo ${expected.maxTouches}`
    );
  }

  if (
    (goal === "massa muscolare" || goal === "forza") &&
    context.consistency.dedicatedCardioWorkoutCount > 0
  ) {
    return buildCheck(
      "cardio presence",
      "WARN",
      `presente ${context.consistency.dedicatedCardioWorkoutCount} seduta cardio dedicata su goal ${goal}`
    );
  }

  return buildCheck("cardio presence", "PASS", `${touches} touch`);
}

function validateAdvancedTechniques(context: ScenarioValidationContext) {
  const assignments = getTechniqueAssignments(context);
  const intenseCount = assignments.filter((assignment) => assignment.risk === "high").length;
  const moderateOrHighCount = assignments.filter(
    (assignment) => assignment.risk === "moderate" || assignment.risk === "high"
  ).length;

  switch (context.scenario.expectations.advancedTechniques) {
    case "none_intense":
      if (moderateOrHighCount > 0) {
        return buildCheck(
          "advanced techniques",
          "FAIL",
          `rilevate tecniche non consentite: ${assignments.map((assignment) => assignment.technique).join(", ")}`
        );
      }
      break;
    case "light_only":
      if (intenseCount > 0) {
        return buildCheck(
          "advanced techniques",
          "FAIL",
          `rilevate tecniche intense: ${assignments.filter((assignment) => assignment.risk === "high").map((assignment) => assignment.technique).join(", ")}`
        );
      }
      break;
    case "moderate":
      if (assignments.some((assignment) => isHighRiskTechniqueNote(assignment.note))) {
        return buildCheck(
          "advanced techniques",
          "FAIL",
          `tecniche metaboliche o aggressive presenti su scenario forza`
        );
      }
      break;
    case "limited":
      if (assignments.length > context.trainingStrategy.weeklyTrainingDays) {
        return buildCheck(
          "advanced techniques",
          "WARN",
          `tecniche assegnate ${assignments.length}, volume alto per ${context.trainingStrategy.weeklyTrainingDays} sedute`
        );
      }
      break;
  }

  const cardioTechniques = context.blueprint.flatMap((workout) =>
    workout.slots
      .filter((slot) => slot.role === "cardio" || slot.role === "mobility")
      .filter((slot) => slot.notes.includes("Tecnica:"))
      .map((slot) => `${workout.title}:${slot.slotId}`)
  );

  if (cardioTechniques.length > 0) {
    return buildCheck(
      "advanced techniques",
      "FAIL",
      `tecniche applicate a slot cardio/mobility: ${cardioTechniques.join(", ")}`
    );
  }

  const riskyCompoundAssignments = assignments.filter((assignment) => {
    const workout = context.blueprint[assignment.workoutIndex];
    const slot = workout?.slots.find((candidate) => candidate.slotId === assignment.slotId);

    return Boolean(
      slot &&
        slot.role === "heavy_compound" &&
        isHighRiskTechniqueNote(assignment.note)
    );
  });

  if (riskyCompoundAssignments.length > 0) {
    return buildCheck(
      "advanced techniques",
      "FAIL",
      `tecniche intense su main compound: ${riskyCompoundAssignments.map((assignment) => assignment.technique).join(", ")}`
    );
  }

  return buildCheck("advanced techniques", "PASS", `${assignments.length} assegnazioni`);
}

function validateEquipment(context: ScenarioValidationContext) {
  const resolvedExercises = getResolvedExercises(context);
  const incompatible = resolvedExercises.filter((exercise) => {
    const text = normalizeText([exercise.equipment, ...(exercise.tags as string[])].join(" "));

    if (context.scenario.expectations.equipmentMode === "gym") {
      return false;
    }

    if (context.scenario.expectations.equipmentMode === "home") {
      return text.includes("macchina") || text.includes("cavi") || text.includes("bilanciere");
    }

    return (
      text.includes("macchina") ||
      text.includes("cavi") ||
      text.includes("bilanciere") ||
      text.includes("manubri") ||
      text.includes("dumbbell") ||
      text.includes("band") ||
      text.includes("elastici")
    );
  });

  if (incompatible.length > 0) {
    return buildCheck(
      "equipment compatibility",
      "FAIL",
      `esercizi incompatibili: ${incompatible.map((exercise) => exercise.slug).join(", ")}`
    );
  }

  return buildCheck("equipment compatibility", "PASS");
}

function validateFocus(context: ScenarioValidationContext) {
  const focusMuscles = context.scenario.expectations.focusMuscles;

  if (!focusMuscles || focusMuscles.length === 0) {
    return buildCheck("focus", "PASS");
  }

  const text = normalizeText(
    [
      ...context.program.workouts.map((workout) => `${workout.title} ${workout.focus}`),
      ...getResolvedExercises(context).map((exercise) => exercise.name),
      ...context.trainingStrategy.volume.focusBoosts,
    ].join(" ")
  );
  const matched = focusMuscles.filter((focus) =>
    normalizeText(focus)
      .split(" ")
      .some((part) => text.includes(part))
  );

  if (matched.length === 0) {
    return buildCheck(
      "focus",
      "FAIL",
      `nessun segnale chiaro dei focus richiesti: ${focusMuscles.join(", ")}`
    );
  }

  if (matched.length < focusMuscles.length) {
    return buildCheck(
      "focus",
      "WARN",
      `focus parziale: ${matched.join(", ")} su ${focusMuscles.join(", ")}`
    );
  }

  return buildCheck("focus", "PASS", matched.join(", "));
}

function validateSafety(context: ScenarioValidationContext) {
  const warningText = normalizeText(context.trainingStrategy.warnings.join(" "));
  const expectedWarnings = context.scenario.expectations.expectWarnings ?? [];
  const missingWarnings = expectedWarnings.filter(
    (entry) => !warningText.includes(normalizeText(entry))
  );

  if (missingWarnings.length > 0) {
    return buildCheck(
      "safety and recovery",
      "WARN",
      `warning attesi non trovati: ${missingWarnings.join(", ")}`
    );
  }

  if (context.scenario.id === "F") {
    if (context.trainingStrategy.intensity.defaultRir < 2) {
      return buildCheck(
        "safety and recovery",
        "FAIL",
        `RIR base troppo aggressivo: ${context.trainingStrategy.intensity.defaultRir}`
      );
    }
  }

  return buildCheck("safety and recovery", "PASS");
}

function validateStrengthBias(context: ScenarioValidationContext) {
  if (!context.scenario.expectations.strengthBias) {
    return buildCheck("strength emphasis", "PASS");
  }

  const heavyCompoundByWorkout = context.blueprint.map((workout) =>
    workout.slots.filter((slot) => slot.role === "heavy_compound").length
  );

  if (heavyCompoundByWorkout.some((count) => count === 0)) {
    return buildCheck(
      "strength emphasis",
      "FAIL",
      `manca heavy compound in alcune sedute: ${heavyCompoundByWorkout.join(", ")}`
    );
  }

  if (context.trainingStrategy.intensity.defaultRir > 2) {
    return buildCheck(
      "strength emphasis",
      "WARN",
      `RIR base prudente per forza: ${context.trainingStrategy.intensity.defaultRir}`
    );
  }

  return buildCheck("strength emphasis", "PASS");
}

function validateLimitations(context: ScenarioValidationContext) {
  if (context.scenario.expectations.limitation !== "knee") {
    return buildCheck("limitations", "PASS");
  }

  const risky = getResolvedExercises(context).filter((exercise) => {
    const contraindications = Array.isArray(exercise.contraindications)
      ? exercise.contraindications.map((item) => normalizeText(String(item)))
      : [];
    const tags = Array.isArray(exercise.tags)
      ? exercise.tags.map((item) => normalizeText(String(item)))
      : [];

    return (
      contraindications.includes("knee") ||
      tags.includes("high_impact") ||
      normalizeText(exercise.movementPattern).includes("lunge")
    );
  });

  if (risky.length > 0) {
    return buildCheck(
      "limitations",
      "FAIL",
      `esercizi a rischio ginocchio: ${risky.map((exercise) => exercise.slug).join(", ")}`
    );
  }

  return buildCheck("limitations", "PASS");
}

function validateExerciseIntegrity(context: ScenarioValidationContext) {
  const unresolved = context.resolvedWorkouts.flatMap((workout) =>
    workout.exercises.filter((entry) => !entry.resolvedExercise)
  );

  if (unresolved.length > 0) {
    return buildCheck(
      "exercise integrity",
      "FAIL",
      `esercizi non risolti: ${unresolved.map((entry) => entry.generated.nameFallback).join(", ")}`
    );
  }

  const invalidNames = context.resolvedWorkouts.flatMap((workout) =>
    workout.exercises.filter(({ generated }) => {
      const name = normalizeText(generated.nameFallback);
      return (
        name.length === 0 ||
        name.startsWith("exercise ") ||
        [
          "tempo controllato",
          "drop set",
          "rest-pause",
          "myo-reps",
        ].includes(name)
      );
    })
  );

  if (invalidNames.length > 0) {
    return buildCheck(
      "exercise integrity",
      "FAIL",
      `nomi placeholder o sporchi: ${invalidNames.map((entry) => entry.generated.nameFallback).join(", ")}`
    );
  }

  const incompatibleAvailability = getResolvedExercises(context).filter((exercise) => {
    const availability = getExerciseAvailabilityForUser(
      exercise,
      context.generationAvailabilityProfile
    );
    return !availability.eligible;
  });

  if (incompatibleAvailability.length > 0) {
    return buildCheck(
      "exercise integrity",
      "FAIL",
      `availability fallita per: ${incompatibleAvailability.map((exercise) => exercise.slug).join(", ")}`
    );
  }

  return buildCheck("exercise integrity", "PASS");
}

function validateProgramNotes(context: ScenarioValidationContext) {
  const notes = context.program.notes;

  if (!notes.includes("RIR base:") || !notes.includes("Cardio integrato nel piano:")) {
    return buildCheck(
      "progressions and notes",
      "WARN",
      "note globali incomplete su RIR/cardio"
    );
  }

  const emptyExerciseNotes = context.program.workouts.flatMap((workout) =>
    workout.exercises.filter((exercise) => normalizeText(exercise.notes).length === 0)
  );

  if (emptyExerciseNotes.length > 0) {
    return buildCheck(
      "progressions and notes",
      "WARN",
      `note mancanti su ${emptyExerciseNotes.length} esercizi`
    );
  }

  return buildCheck("progressions and notes", "PASS");
}

export function validateScenario(context: ScenarioValidationContext) {
  return [
    validateWeeklyDays(context),
    validateNonEmptySessions(context),
    validateDuration(context),
    validateSplit(context),
    validateGoalAndCardio(context),
    validateAdvancedTechniques(context),
    validateEquipment(context),
    validateFocus(context),
    validateSafety(context),
    validateStrengthBias(context),
    validateLimitations(context),
    validateExerciseIntegrity(context),
    validateProgramNotes(context),
  ];
}
