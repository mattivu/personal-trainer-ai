export type TrainingGoal =
  | "hypertrophy"
  | "strength"
  | "fat_loss"
  | "recomposition"
  | "wellness"
  | "unknown";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type TrainingEnvironment =
  | "home"
  | "gym"
  | "outdoor"
  | "mixed"
  | "unknown";

export type NormalizedTrainingProfile = {
  goal: TrainingGoal;
  experience: ExperienceLevel;
  daysPerWeek: number;
  environment: TrainingEnvironment;
  equipmentPreference: string[];
  limitations: string[];
  preferredTraining: string[];
  sessionMinutes: number | null;
};

export type EngineExercise = {
  id: number;
  slug: string;
  name: string;
  primaryMuscle?: string | null;
  secondaryMuscles?: unknown;
  category?: string | null;
  equipment?: string | null;
  difficulty?: string | null;
  movementPattern?: string | null;
  environments?: unknown;
  tags?: unknown;
  alternatives?: unknown;
  contraindications?: unknown;
  externalSource?: string | null;
  externalId?: string | null;
  imageUrls?: unknown;
  sourceMetadata?: unknown;
  importedAt?: Date | null;
};

export type GeneratedExercise = {
  slugCandidates: string[];
  nameFallback: string;
  sets: number;
  reps: string;
  restSeconds: number;
  intensity: string;
  notes: string;
};

export type GeneratedWorkout = {
  title: string;
  focus: string;
  estimatedMinutes: number;
  notes: string;
  exercises: GeneratedExercise[];
};

export type GeneratedProgram = {
  title: string;
  goal: string;
  notes: string;
  workouts: GeneratedWorkout[];
};

export type SplitKey =
  | "full_body_2"
  | "full_body_3"
  | "upper_lower_full"
  | "upper_lower_4"
  | "hybrid_5"
  | "ppl_6"
  | "strength_full_body"
  | "strength_upper_lower_4"
  | "fat_loss_full_body"
  | "fat_loss_upper_lower_4"
  | "wellness_full_body";

export type SplitDefinition = {
  key: SplitKey;
  label: string;
  workoutCount: number;
};

export type ExerciseRole =
  | "heavy_compound"
  | "compound"
  | "accessory"
  | "isolation"
  | "core"
  | "mobility"
  | "cardio";
