import crypto from "crypto";
import type { NormalizedTrainingProfile, TrainingGoal } from "./types";

export function getTrainingBlockDurationWeeks(goal: TrainingGoal) {
  switch (goal) {
    case "fat_loss":
    case "wellness":
      return 4;
    case "hypertrophy":
    case "strength":
    case "recomposition":
    case "unknown":
    default:
      return 6;
  }
}

export function getTrainingBlockDates(
  startedAt: Date,
  durationWeeks: number
) {
  return {
    startedAt,
    plannedReviewAt: new Date(
      startedAt.getTime() + durationWeeks * 7 * 24 * 60 * 60 * 1000
    ),
  };
}

export function getCurrentBlockWeek(
  startedAt: Date,
  durationWeeks: number,
  now = new Date()
) {
  const elapsedMs = Math.max(0, now.getTime() - startedAt.getTime());
  const elapsedWeeks = Math.floor(elapsedMs / (7 * 24 * 60 * 60 * 1000));
  return Math.min(durationWeeks, elapsedWeeks + 1);
}

export function createOnboardingSnapshotHash(
  profile: NormalizedTrainingProfile
) {
  const snapshot = {
    goal: profile.goal,
    experience: profile.experience,
    daysPerWeek: profile.daysPerWeek,
    environment: profile.environment,
    equipmentPreference: [...profile.equipmentPreference].sort(),
    limitations: [...profile.limitations].sort(),
    preferredTraining: [...profile.preferredTraining].sort(),
    sessionMinutes: profile.sessionMinutes,
  };

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(snapshot))
    .digest("hex");
}
