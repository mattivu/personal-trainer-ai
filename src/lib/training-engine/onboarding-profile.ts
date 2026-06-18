import crypto from "crypto";
import { buildQuestionnaireProfile } from "@/lib/onboarding/questionnaire-profile";
import { normalizeOnboardingAnswers } from "./normalize-onboarding";
import type { NormalizedTrainingProfile } from "./types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function mergeOnboardingAnswers(answers: unknown[]) {
  return answers.reduce<Record<string, unknown>>((merged, item) => {
    if (!isPlainObject(item)) {
      return merged;
    }

    return {
      ...merged,
      ...item,
    };
  }, {});
}

export function buildNormalizedOnboardingProfile(answers: unknown[]) {
  const mergedAnswers = mergeOnboardingAnswers(answers);
  const profile = normalizeOnboardingAnswers(mergedAnswers);
  const questionnaireProfile = buildQuestionnaireProfile(mergedAnswers);
  const snapshot = {
    questionnaire: {
      goal: questionnaireProfile.goal,
      experience: questionnaireProfile.experience,
      trainingAvailability: questionnaireProfile.trainingAvailability,
      splitPreference: questionnaireProfile.splitPreference,
      muscleFocus: {
        priorities: [...questionnaireProfile.muscleFocus.priorities].sort(),
        notes: questionnaireProfile.muscleFocus.notes,
      },
      equipment: {
        location: questionnaireProfile.equipment.location,
        available: [...questionnaireProfile.equipment.available].sort(),
        notes: questionnaireProfile.equipment.notes,
      },
      cardio: {
        currentLevel: questionnaireProfile.cardio.currentLevel,
        preferences: [...questionnaireProfile.cardio.preferences].sort(),
        equipmentAvailable: [...questionnaireProfile.cardio.equipmentAvailable].sort(),
        dailySteps: questionnaireProfile.cardio.dailySteps,
        timingPreference: questionnaireProfile.cardio.timingPreference,
        impactTolerance: questionnaireProfile.cardio.impactTolerance,
        goal: questionnaireProfile.cardio.goal,
      },
      advancedTechniques: {
        preference: [...questionnaireProfile.advancedTechniques.preference].sort(),
        notes: questionnaireProfile.advancedTechniques.notes,
      },
      exercisePreferences: questionnaireProfile.exercisePreferences,
      limitations: questionnaireProfile.limitations,
    },
    normalizedProfile: {
      ...profile,
      equipmentPreference: [...profile.equipmentPreference].sort(),
      limitations: [...profile.limitations].sort(),
      preferredTraining: [...profile.preferredTraining].sort(),
    },
  };
  const snapshotHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(snapshot))
    .digest("hex");

  return {
    mergedAnswers,
    profile,
    snapshotHash,
  } satisfies {
    mergedAnswers: Record<string, unknown>;
    profile: NormalizedTrainingProfile;
    snapshotHash: string;
  };
}
