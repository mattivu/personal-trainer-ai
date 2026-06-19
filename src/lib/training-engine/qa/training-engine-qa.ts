import { buildQuestionnaireProfile } from "@/lib/onboarding/questionnaire-profile";
import { generateRuleBasedProgram } from "@/lib/training-engine/generate-program";
import { buildProgramBlueprintV2 } from "@/lib/training-engine/program-builder-v2";
import { validateGeneratedProgramConsistency } from "@/lib/training-engine/program-consistency";
import { buildProgramGenerationProfile } from "@/lib/training-engine/program-generation-profile";
import { buildTrainingStrategy } from "@/lib/training-engine/training-strategy";
import type { GeneratedWorkout, EngineExercise } from "@/lib/training-engine/types";
import { MOCK_ENGINE_EXERCISES } from "./mock-exercises";
import { formatTrainingEngineQaReport, type ScenarioQaReport, type TrainingEngineQaReport } from "./report";
import { TRAINING_ENGINE_QA_SCENARIOS } from "./scenarios";
import { validateScenario } from "./validators";

function resolveWorkoutExercise(
  exerciseMap: Map<string, EngineExercise>,
  exercise: GeneratedWorkout["exercises"][number]
) {
  const matchedSlug = exercise.slugCandidates.find((slug) => exerciseMap.has(slug));
  return matchedSlug ? exerciseMap.get(matchedSlug) ?? null : null;
}

export function runTrainingEngineQa(exercises: EngineExercise[] = MOCK_ENGINE_EXERCISES): TrainingEngineQaReport {
  const exerciseMap = new Map(exercises.map((exercise) => [exercise.slug, exercise]));
  const scenarios: ScenarioQaReport[] = TRAINING_ENGINE_QA_SCENARIOS.map((scenario) => {
    const questionnaireProfile = buildQuestionnaireProfile(scenario.answers);
    const trainingStrategy = buildTrainingStrategy(questionnaireProfile);
    const generationProfile = buildProgramGenerationProfile(questionnaireProfile);
    const generationAvailabilityProfile = {
      profile: generationProfile,
      mergedAnswers: scenario.answers,
    };
    const blueprint = buildProgramBlueprintV2(trainingStrategy, generationProfile);
    const program = generateRuleBasedProgram(generationAvailabilityProfile, exercises, {
      trainingStrategy,
    });
    const consistency = validateGeneratedProgramConsistency(program, trainingStrategy);
    const resolvedWorkouts = program.workouts.map((workout) => ({
      workout,
      exercises: workout.exercises.map((exercise) => ({
        generated: exercise,
        resolvedExercise: resolveWorkoutExercise(exerciseMap, exercise),
      })),
    }));
    const checks = validateScenario({
      scenario,
      questionnaireProfile,
      trainingStrategy,
      generationAvailabilityProfile,
      program,
      blueprint,
      consistency,
      resolvedWorkouts,
      exerciseMap,
    });

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      checks,
    };
  });
  const failed = scenarios.filter((scenario) =>
    scenario.checks.some((check) => check.status === "FAIL")
  ).length;
  const warnings = scenarios.filter(
    (scenario) =>
      !scenario.checks.some((check) => check.status === "FAIL") &&
      scenario.checks.some((check) => check.status === "WARN")
  ).length;
  const passed = scenarios.length - failed - warnings;

  return {
    scenarios,
    passed,
    warnings,
    failed,
    exitCode: failed > 0 ? 1 : 0,
  };
}

export function runAndFormatTrainingEngineQa(exercises?: EngineExercise[]) {
  const report = runTrainingEngineQa(exercises);

  return {
    report,
    text: formatTrainingEngineQaReport(report),
  };
}
