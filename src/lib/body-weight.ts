import { prisma } from "@/lib/prisma";
export {
  BODY_WEIGHT_MAX_KG,
  BODY_WEIGHT_MIN_KG,
  BODY_WEIGHT_NOTES_MAX_LENGTH,
  calculateBodyWeightSummary,
  calculateBodyWeightTrend,
  formatBodyWeightDelta,
  getBodyWeightDateKey,
  getBodyWeightEntryDate,
  getBodyWeightTrendLabel,
  isFutureBodyWeightDate,
  validateBodyWeightInput,
  type BodyWeightInput,
  type BodyWeightSummary,
  type BodyWeightTrend,
} from "@/lib/body-weight-shared";
import type { BodyWeightEntry } from "@prisma/client";
import {
  calculateBodyWeightSummary,
  getBodyWeightDateKey,
} from "@/lib/body-weight-shared";

const RECENT_HISTORY_DAYS = 90;

export type BodyWeightEntryView = BodyWeightEntry & {
  dateKey: string;
};

export async function getBodyWeightEntriesForUser(userId: number) {
  const entries = await prisma.bodyWeightEntry.findMany({
    where: {
      userId,
    },
    orderBy: [{ date: "asc" }, { id: "asc" }],
  });

  return entries.map((entry) => ({
    ...entry,
    dateKey: getBodyWeightDateKey(entry.date),
  }));
}

export async function getRecentBodyWeightEntriesForUser(
  userId: number,
  days = RECENT_HISTORY_DAYS
) {
  const cutoffDate = new Date();
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - days);

  const entries = await prisma.bodyWeightEntry.findMany({
    where: {
      userId,
      date: {
        gte: cutoffDate,
      },
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  return entries.map((entry) => ({
    ...entry,
    dateKey: getBodyWeightDateKey(entry.date),
  }));
}

export async function getBodyWeightOverviewForUser(userId: number) {
  const [allEntries, recentEntries] = await Promise.all([
    getBodyWeightEntriesForUser(userId),
    getRecentBodyWeightEntriesForUser(userId),
  ]);

  return {
    entries: recentEntries,
    summary: calculateBodyWeightSummary(allEntries),
  };
}
