import { normalizeOnboardingAnswers } from "./normalize-onboarding";
import { createOnboardingSnapshotHash } from "./program-block";
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

  return {
    mergedAnswers,
    profile,
    snapshotHash: createOnboardingSnapshotHash(profile),
  } satisfies {
    mergedAnswers: Record<string, unknown>;
    profile: NormalizedTrainingProfile;
    snapshotHash: string;
  };
}
