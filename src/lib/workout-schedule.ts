export const FLEXIBLE_WORKOUT_STATES = [
  "recommended_today",
  "overdue",
  "future_available",
  "in_progress",
  "completed",
  "skipped",
] as const;

export type FlexibleWorkoutState = (typeof FLEXIBLE_WORKOUT_STATES)[number];

type WeekWorkoutLog = {
  id: number;
  status: string;
  performedAt: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
  updatedAt?: Date;
};

export type PlannedWorkoutDay = {
  dayOffset: number;
  label: string;
};

export type WorkoutScheduleEntry<TWorkout> = {
  workout: TWorkout;
  workoutIndex: number;
  plannedDateThisWeek: Date;
  plannedDateLabel: string;
  isPlannedToday: boolean;
  isPastPlannedDate: boolean;
  isFuturePlannedDate: boolean;
};

export type FlexibleWorkoutStateResult = {
  state: FlexibleWorkoutState;
  plannedDateThisWeek: Date;
  plannedDateLabel: string;
  isPlannedToday: boolean;
  isPastPlannedDate: boolean;
  isFuturePlannedDate: boolean;
  weekLog: WeekWorkoutLog | null;
};

const WORKOUT_DAY_OFFSETS: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
};

function cloneDate(value: Date) {
  return new Date(value.getTime());
}

function getDayOffsetFromMonday(date: Date) {
  return (date.getDay() + 6) % 7;
}

function getWeekdayLabel(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    timeZone: "Europe/Rome",
  }).format(date);
}

function getDayOffsetsForWorkoutCount(totalWorkouts: number) {
  if (WORKOUT_DAY_OFFSETS[totalWorkouts]) {
    return WORKOUT_DAY_OFFSETS[totalWorkouts];
  }

  const cappedCount = Math.max(1, Math.min(totalWorkouts, 7));
  return Array.from({ length: cappedCount }, (_, index) => index);
}

export function getWeekStart(date: Date) {
  const weekStart = cloneDate(date);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - getDayOffsetFromMonday(weekStart));
  return weekStart;
}

export function getWeekEnd(date: Date) {
  const weekEnd = getWeekStart(date);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

export function getPlannedWorkoutDay(
  workoutIndex: number,
  totalWorkouts: number
): PlannedWorkoutDay {
  const dayOffsets = getDayOffsetsForWorkoutCount(totalWorkouts);
  const safeIndex = Math.max(0, Math.min(workoutIndex, dayOffsets.length - 1));
  const dayOffset = dayOffsets[safeIndex] ?? 0;
  const referenceDate = getWeekStart(new Date());
  referenceDate.setDate(referenceDate.getDate() + dayOffset);

  return {
    dayOffset,
    label: getWeekdayLabel(referenceDate),
  };
}

export function getWorkoutScheduleForProgram<TWorkout>(
  workouts: TWorkout[],
  referenceDate = new Date()
): Array<WorkoutScheduleEntry<TWorkout>> {
  const weekStart = getWeekStart(referenceDate);
  const todayOffset = getDayOffsetFromMonday(referenceDate);

  return workouts.map((workout, workoutIndex) => {
    const plannedWorkoutDay = getPlannedWorkoutDay(workoutIndex, workouts.length);
    const plannedDateThisWeek = cloneDate(weekStart);
    plannedDateThisWeek.setDate(weekStart.getDate() + plannedWorkoutDay.dayOffset);

    return {
      workout,
      workoutIndex,
      plannedDateThisWeek,
      plannedDateLabel: plannedWorkoutDay.label,
      isPlannedToday: plannedWorkoutDay.dayOffset === todayOffset,
      isPastPlannedDate: plannedWorkoutDay.dayOffset < todayOffset,
      isFuturePlannedDate: plannedWorkoutDay.dayOffset > todayOffset,
    };
  });
}

export function getFlexibleWorkoutState(input: {
  plannedDateThisWeek: Date;
  plannedDateLabel: string;
  weekLog?: WeekWorkoutLog | null;
  referenceDate?: Date;
}): FlexibleWorkoutStateResult {
  const referenceDate = input.referenceDate ?? new Date();
  const plannedDayOffset = getDayOffsetFromMonday(input.plannedDateThisWeek);
  const todayOffset = getDayOffsetFromMonday(referenceDate);
  const isPlannedToday = plannedDayOffset === todayOffset;
  const isPastPlannedDate = plannedDayOffset < todayOffset;
  const isFuturePlannedDate = plannedDayOffset > todayOffset;
  const normalizedStatus = input.weekLog?.status ?? null;

  if (normalizedStatus === "completed") {
    return {
      state: "completed",
      plannedDateThisWeek: input.plannedDateThisWeek,
      plannedDateLabel: input.plannedDateLabel,
      isPlannedToday,
      isPastPlannedDate,
      isFuturePlannedDate,
      weekLog: input.weekLog ?? null,
    };
  }

  if (normalizedStatus === "skipped") {
    return {
      state: "skipped",
      plannedDateThisWeek: input.plannedDateThisWeek,
      plannedDateLabel: input.plannedDateLabel,
      isPlannedToday,
      isPastPlannedDate,
      isFuturePlannedDate,
      weekLog: input.weekLog ?? null,
    };
  }

  if (normalizedStatus === "in_progress" || normalizedStatus === "saved") {
    return {
      state: "in_progress",
      plannedDateThisWeek: input.plannedDateThisWeek,
      plannedDateLabel: input.plannedDateLabel,
      isPlannedToday,
      isPastPlannedDate,
      isFuturePlannedDate,
      weekLog: input.weekLog ?? null,
    };
  }

  if (isPlannedToday) {
    return {
      state: "recommended_today",
      plannedDateThisWeek: input.plannedDateThisWeek,
      plannedDateLabel: input.plannedDateLabel,
      isPlannedToday,
      isPastPlannedDate,
      isFuturePlannedDate,
      weekLog: null,
    };
  }

  if (isPastPlannedDate) {
    return {
      state: "overdue",
      plannedDateThisWeek: input.plannedDateThisWeek,
      plannedDateLabel: input.plannedDateLabel,
      isPlannedToday,
      isPastPlannedDate,
      isFuturePlannedDate,
      weekLog: null,
    };
  }

  return {
    state: "future_available",
    plannedDateThisWeek: input.plannedDateThisWeek,
    plannedDateLabel: input.plannedDateLabel,
    isPlannedToday,
    isPastPlannedDate,
    isFuturePlannedDate,
    weekLog: null,
  };
}
