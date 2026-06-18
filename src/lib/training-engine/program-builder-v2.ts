import type { ExerciseSlot } from "./exercise-selector";
import type { NormalizedTrainingProfile } from "./types";
import type {
  StrategyMuscleKey,
  StrategySplitType,
  TrainingStrategy,
} from "./training-strategy";

export type ProgramWorkoutBlueprintV2 = {
  title: string;
  focus: string;
  notes: string;
  slots: ExerciseSlot[];
};

type SessionKind =
  | "full_body_a"
  | "full_body_b"
  | "full_body_c"
  | "upper_a"
  | "upper_b"
  | "lower_a"
  | "lower_b"
  | "push"
  | "pull"
  | "legs"
  | "upper_focus"
  | "lower_focus"
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "specialization";

type SessionTheme = TrainingStrategy["split"]["sessionThemes"][number];
type SlotRecipeInput = {
  sessionId: string;
  key: string;
  label: string;
  role: ExerciseSlot["role"];
  priority: NonNullable<ExerciseSlot["priority"]>;
  category: ExerciseSlot["category"];
  targetMuscles: string[];
  secondaryMuscles?: string[];
  movementPatterns: string[];
  preferredTags?: string[];
  avoidTags?: string[];
  allowedCategories?: ExerciseSlot["allowedCategories"];
  difficultyMax?: ExerciseSlot["difficultyMax"];
  notes: string;
  fallbackSlugs?: string[];
  volumeMuscle?: StrategyMuscleKey;
  repsBias?: "main" | "secondary" | "pump" | "core" | "mobility";
};

const LOWER_MUSCLES: StrategyMuscleKey[] = [
  "quadricipiti",
  "femorali",
  "glutei",
  "polpacci",
];

const MUSCLE_ALIASES: Record<StrategyMuscleKey, string[]> = {
  petto: ["petto", "petto alto"],
  dorso: ["dorso", "dorsali"],
  spalle: ["spalle", "deltoidi"],
  "deltoidi laterali": ["deltoidi laterali", "spalle laterali"],
  "deltoidi posteriori": ["deltoidi posteriori"],
  bicipiti: ["bicipiti", "braccia"],
  tricipiti: ["tricipiti", "braccia"],
  quadricipiti: ["quadricipiti"],
  femorali: ["femorali"],
  glutei: ["glutei"],
  polpacci: ["polpacci"],
  core: ["core", "addome", "obliqui", "postura", "mobilita"],
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isLowRecoveryStrategy(strategy: TrainingStrategy) {
  return (
    strategy.intensity.defaultRir >= 3 ||
    strategy.warnings.some((warning) => normalizeText(warning).includes("recupero"))
  );
}

function getSessionSlotBudget(
  strategy: TrainingStrategy,
  profile: NormalizedTrainingProfile
) {
  const minutes = strategy.sessionDurationMinutes || profile.sessionMinutes || 60;
  let budget = minutes <= 45 ? 5 : minutes <= 60 ? 6 : minutes <= 75 ? 7 : 8;

  if (profile.experience === "beginner") {
    budget -= 1;
  }

  if (profile.experience === "advanced") {
    budget += 1;
  }

  if (isLowRecoveryStrategy(strategy)) {
    budget -= 1;
  }

  return clamp(budget, 4, 9);
}

function getVolumePerExposure(
  strategy: TrainingStrategy,
  muscle: StrategyMuscleKey
) {
  const target = strategy.volume.weeklySetsByMuscle[muscle]?.target ?? 0;
  const frequency = Math.max(
    1,
    strategy.frequency.muscleFrequencyByMuscle[muscle] ?? 1
  );

  return target / frequency;
}

function getFocusedMuscles(strategy: TrainingStrategy) {
  const focused = new Set<StrategyMuscleKey>();
  const boostText = normalizeText(strategy.volume.focusBoosts.join(" "));

  for (const muscle of Object.keys(MUSCLE_ALIASES) as StrategyMuscleKey[]) {
    const hasBoostText = MUSCLE_ALIASES[muscle].some((alias) =>
      boostText.includes(normalizeText(alias))
    );

    if (hasBoostText) {
      focused.add(muscle);
    }
  }

  return focused;
}

function getThemeMuscles(theme: SessionTheme) {
  return [...theme.focus, ...theme.secondaryFocus]
    .map((entry) => normalizeText(entry))
    .flatMap((entry) =>
      (Object.keys(MUSCLE_ALIASES) as StrategyMuscleKey[]).filter((muscle) =>
        MUSCLE_ALIASES[muscle].some((alias) => entry.includes(normalizeText(alias)))
      )
    );
}

function getPrimaryThemeMuscles(theme: SessionTheme) {
  return theme.focus
    .map((entry) => normalizeText(entry))
    .flatMap((entry) =>
      (Object.keys(MUSCLE_ALIASES) as StrategyMuscleKey[]).filter((muscle) =>
        MUSCLE_ALIASES[muscle].some((alias) => entry.includes(normalizeText(alias)))
      )
    );
}

function getFocusMuscleForSession(
  theme: SessionTheme,
  focusedMuscles: Set<StrategyMuscleKey>,
  exposureCounts: Map<StrategyMuscleKey, number>
) {
  const candidates = getPrimaryThemeMuscles(theme).filter((muscle) =>
    focusedMuscles.has(muscle)
  );

  for (const muscle of candidates) {
    if ((exposureCounts.get(muscle) ?? 0) < 3) {
      return muscle;
    }
  }

  return null;
}

function getSessionKind(
  splitType: StrategySplitType,
  theme: SessionTheme,
  index: number
): SessionKind {
  const title = normalizeText(theme.title);

  if (splitType === "full_body") {
    return index === 0 ? "full_body_a" : index === 1 ? "full_body_b" : "full_body_c";
  }

  if (splitType === "upper_lower") {
    if (title.includes("upper a")) {
      return "upper_a";
    }

    if (title.includes("lower a")) {
      return "lower_a";
    }

    if (title.includes("upper b")) {
      return "upper_b";
    }

    if (title.includes("lower b")) {
      return "lower_b";
    }

    if (title.includes("focus")) {
      return getThemeMuscles(theme).some((muscle) => LOWER_MUSCLES.includes(muscle))
        ? "lower_focus"
        : "upper_focus";
    }
  }

  if (splitType === "push_pull_legs" || splitType === "ppl_upper_lower") {
    if (title.includes("push")) {
      return "push";
    }

    if (title.includes("pull")) {
      return "pull";
    }

    if (title.includes("legs")) {
      return "legs";
    }

    if (title.includes("upper")) {
      return "upper_focus";
    }

    if (title.includes("lower")) {
      return "lower_focus";
    }
  }

  if (splitType === "body_part_split") {
    if (title.includes("chest")) {
      return "chest";
    }

    if (title.includes("back")) {
      return "back";
    }

    if (title.includes("legs")) {
      return "legs";
    }

    if (title.includes("shoulders")) {
      return "shoulders";
    }

    if (title.includes("arms")) {
      return "arms";
    }

    return "specialization";
  }

  if (title.includes("lower")) {
    return index === 1 ? "lower_a" : "lower_b";
  }

  if (title.includes("focus")) {
    return "specialization";
  }

  return title.includes("upper b") ? "upper_b" : "upper_a";
}

function getSetsForRole(
  role: ExerciseSlot["role"],
  strategy: TrainingStrategy,
  profile: NormalizedTrainingProfile,
  muscle: StrategyMuscleKey | undefined
) {
  const volume = muscle ? getVolumePerExposure(strategy, muscle) : 3;

  switch (role) {
    case "heavy_compound":
      return clamp(
        Math.round(volume >= 5.5 ? 4 : volume >= 4 ? 3 : 3),
        3,
        profile.experience === "advanced" ? 5 : 4
      );
    case "compound":
      return clamp(
        Math.round(volume >= 4.5 ? 4 : volume >= 3 ? 3 : 2),
        2,
        profile.experience === "advanced" ? 4 : 3
      );
    case "accessory":
    case "isolation":
      return clamp(
        Math.round(volume >= 4 ? 3 : 2),
        2,
        profile.experience === "advanced" ? 4 : 3
      );
    case "core":
      return profile.experience === "advanced" ? 3 : 2;
    case "mobility":
      return 2;
    case "cardio":
      return 1;
    default:
      return 3;
  }
}

function getRepsByRole(
  role: ExerciseSlot["role"],
  strategy: TrainingStrategy,
  bias: SlotRecipeInput["repsBias"],
  profile: NormalizedTrainingProfile
) {
  if (role === "cardio") {
    return strategy.cardio.minutesPerSession <= 15 ? "10-15 min" : "12-20 min";
  }

  if (role === "mobility") {
    return "45-60 sec";
  }

  if (role === "core") {
    return bias === "core" ? "8-12 o 30-45 sec" : "8-12 o 25-40 sec";
  }

  if (role === "heavy_compound") {
    if (strategy.goal === "forza") {
      return "4-6";
    }

    return profile.experience === "beginner" ? "6-10" : "6-10 o 8-12";
  }

  if (role === "compound") {
    return bias === "secondary" ? "8-12" : "6-10 o 8-12";
  }

  if (role === "accessory") {
    return bias === "pump" ? "12-15" : "10-15";
  }

  return "12-20";
}

function getIntensityForRole(
  role: ExerciseSlot["role"],
  strategy: TrainingStrategy,
  bias: SlotRecipeInput["repsBias"]
) {
  const [rirMin, rirMax] = strategy.intensity.rirRange;
  const defaultRir = strategy.intensity.defaultRir;

  if (role === "mobility") {
    return "Controllo, respirazione e ROM pulito";
  }

  if (role === "cardio") {
    return `Cardio ${strategy.cardio.intensity}, ritmo sostenibile`;
  }

  if (role === "core") {
    return `RIR ${clamp(defaultRir + 1, rirMin, rirMax)}-${clamp(
      defaultRir + 2,
      rirMin,
      rirMax + 1
    )}`;
  }

  if (role === "heavy_compound") {
    return `RIR ${clamp(defaultRir, rirMin, rirMax)}-${clamp(
      defaultRir + 1,
      rirMin,
      rirMax
    )}`;
  }

  if (role === "compound") {
    return `RIR ${clamp(defaultRir, rirMin, rirMax)}-${clamp(
      defaultRir + 1,
      rirMin,
      rirMax + 1
    )}`;
  }

  if (bias === "pump") {
    return strategy.intensity.failureAllowed
      ? `RIR ${clamp(defaultRir, rirMin, rirMax)}-${clamp(
          defaultRir + 1,
          rirMin,
          rirMax + 1
        )}, vicino al cedimento solo se stabile`
      : `RIR ${clamp(defaultRir + 1, rirMin, rirMax + 1)}-${clamp(
          defaultRir + 2,
          rirMin,
          rirMax + 2
        )}`;
  }

  return `RIR ${clamp(defaultRir, rirMin, rirMax + 1)}-${clamp(
    defaultRir + 1,
    rirMin,
    rirMax + 1
  )}`;
}

function getRestSeconds(role: ExerciseSlot["role"]) {
  switch (role) {
    case "heavy_compound":
      return 150;
    case "compound":
      return 120;
    case "accessory":
      return 90;
    case "isolation":
      return 75;
    case "core":
    case "mobility":
      return 45;
    case "cardio":
      return 0;
    default:
      return 90;
  }
}

function createSlot(
  input: SlotRecipeInput,
  strategy: TrainingStrategy,
  profile: NormalizedTrainingProfile
): ExerciseSlot {
  return {
    slotId: `${input.sessionId}_${input.key}`,
    label: input.label,
    role: input.role,
    priority: input.priority,
    category: input.category,
    targetMuscles: input.targetMuscles,
    secondaryMuscles: input.secondaryMuscles,
    movementPatterns: input.movementPatterns,
    preferredTags: input.preferredTags,
    avoidTags: input.avoidTags,
    allowedCategories: input.allowedCategories,
    difficultyMax: input.difficultyMax,
    notes: input.notes,
    fallbackSlugs: input.fallbackSlugs,
    prescriptionOverride: {
      sets: getSetsForRole(input.role, strategy, profile, input.volumeMuscle),
      reps: getRepsByRole(input.role, strategy, input.repsBias, profile),
      intensity: getIntensityForRole(input.role, strategy, input.repsBias),
      restSeconds: getRestSeconds(input.role),
    },
  };
}

function addChestMain(sessionId: string, note: string): SlotRecipeInput {
  return {
    sessionId,
    key: "chest_main",
    label: "Spinta principale petto",
    role: "heavy_compound",
    priority: "main",
    category: "strength",
    targetMuscles: ["petto"],
    secondaryMuscles: ["tricipiti", "spalle"],
    movementPatterns: ["horizontal_push"],
    preferredTags: ["compound", "machine", "dumbbell", "barbell"],
    avoidTags: ["shoulder_caution"],
    notes: note,
    fallbackSlugs: ["chest-press-macchina", "panca-piana-manubri", "bench-press"],
    volumeMuscle: "petto",
    repsBias: "main",
  };
}

function addChestIncline(sessionId: string, note: string): SlotRecipeInput {
  return {
    sessionId,
    key: "chest_incline",
    label: "Spinta petto inclinata",
    role: "compound",
    priority: "secondary",
    category: "strength",
    targetMuscles: ["petto"],
    secondaryMuscles: ["tricipiti", "spalle"],
    movementPatterns: ["horizontal_push"],
    preferredTags: ["compound", "hypertrophy", "dumbbell", "machine"],
    avoidTags: ["shoulder_caution"],
    notes: note,
    fallbackSlugs: ["incline-dumbbell-press", "chest-press-inclinata", "push-up-inclinati"],
    volumeMuscle: "petto",
    repsBias: "secondary",
  };
}

function addRow(sessionId: string, note: string): SlotRecipeInput {
  return {
    sessionId,
    key: "row",
    label: "Tirata orizzontale",
    role: "compound",
    priority: "secondary",
    category: "strength",
    targetMuscles: ["dorsali"],
    secondaryMuscles: ["deltoidi posteriori", "bicipiti"],
    movementPatterns: ["horizontal_pull"],
    preferredTags: ["compound", "machine", "cable", "dumbbell"],
    avoidTags: ["back_caution"],
    notes: note,
    fallbackSlugs: ["seated-cable-row", "rematore-con-manubrio", "rematore-macchina"],
    volumeMuscle: "dorso",
    repsBias: "secondary",
  };
}

function addVerticalPull(sessionId: string, note: string): SlotRecipeInput {
  return {
    sessionId,
    key: "vertical_pull",
    label: "Tirata verticale",
    role: "heavy_compound",
    priority: "main",
    category: "strength",
    targetMuscles: ["dorsali"],
    secondaryMuscles: ["bicipiti"],
    movementPatterns: ["vertical_pull"],
    preferredTags: ["compound", "machine", "cable", "bodyweight"],
    notes: note,
    fallbackSlugs: ["lat-machine-avanti", "neutral-grip-lat-pulldown", "assisted-pull-up"],
    volumeMuscle: "dorso",
    repsBias: "main",
  };
}

function addShoulderPress(sessionId: string, note: string): SlotRecipeInput {
  return {
    sessionId,
    key: "shoulder_press",
    label: "Spinta verticale spalle",
    role: "compound",
    priority: "secondary",
    category: "strength",
    targetMuscles: ["spalle"],
    secondaryMuscles: ["tricipiti"],
    movementPatterns: ["vertical_push"],
    preferredTags: ["compound", "machine", "dumbbell", "shoulder_friendly"],
    avoidTags: ["shoulder_caution"],
    notes: note,
    fallbackSlugs: ["shoulder-press-machine", "seated-dumbbell-press", "landmine-press"],
    volumeMuscle: "spalle",
    repsBias: "secondary",
  };
}

function addLateralRaise(sessionId: string, note: string): SlotRecipeInput {
  return {
    sessionId,
    key: "lateral_raise",
    label: "Deltoidi laterali",
    role: "isolation",
    priority: "isolation",
    category: "strength",
    targetMuscles: ["spalle", "deltoidi laterali"],
    movementPatterns: ["shoulder_abduction"],
    preferredTags: ["isolation", "hypertrophy", "cable", "dumbbell", "shoulder_friendly"],
    avoidTags: ["shoulder_caution"],
    notes: note,
    fallbackSlugs: ["alzate-laterali", "alzate-laterali-ai-cavi", "lateral-raise-machine"],
    volumeMuscle: "deltoidi laterali",
    repsBias: "pump",
  };
}

function addRearDelt(sessionId: string, note: string): SlotRecipeInput {
  return {
    sessionId,
    key: "rear_delt",
    label: "Deltoidi posteriori",
    role: "accessory",
    priority: "accessory",
    category: "strength",
    targetMuscles: ["deltoidi posteriori", "spalle"],
    secondaryMuscles: ["dorsali"],
    movementPatterns: ["horizontal_pull"],
    preferredTags: ["isolation", "hypertrophy", "cable", "machine", "shoulder_friendly"],
    avoidTags: ["shoulder_caution"],
    notes: note,
    fallbackSlugs: ["face-pull", "reverse-fly-machine", "reverse-fly-ai-cavi"],
    volumeMuscle: "deltoidi posteriori",
    repsBias: "pump",
  };
}

function addBiceps(sessionId: string, note: string): SlotRecipeInput {
  return {
    sessionId,
    key: "biceps",
    label: "Bicipiti",
    role: "isolation",
    priority: "isolation",
    category: "strength",
    targetMuscles: ["bicipiti"],
    movementPatterns: ["elbow_flexion"],
    preferredTags: ["isolation", "hypertrophy", "dumbbell", "cable", "machine"],
    notes: note,
    fallbackSlugs: ["curl-manubri", "curl-cavo", "hammer-curl"],
    volumeMuscle: "bicipiti",
    repsBias: "pump",
  };
}

function addTriceps(sessionId: string, note: string): SlotRecipeInput {
  return {
    sessionId,
    key: "triceps",
    label: "Tricipiti",
    role: "isolation",
    priority: "isolation",
    category: "strength",
    targetMuscles: ["tricipiti"],
    movementPatterns: ["elbow_extension"],
    preferredTags: ["isolation", "hypertrophy", "cable", "machine"],
    avoidTags: ["shoulder_caution"],
    notes: note,
    fallbackSlugs: ["triceps-pushdown", "pushdown-barra", "triceps-machine"],
    volumeMuscle: "tricipiti",
    repsBias: "pump",
  };
}

function addQuadMain(sessionId: string, note: string): SlotRecipeInput {
  return {
    sessionId,
    key: "quad_main",
    label: "Quadricipite principale",
    role: "heavy_compound",
    priority: "main",
    category: "strength",
    targetMuscles: ["quadricipiti"],
    secondaryMuscles: ["glutei"],
    movementPatterns: ["squat", "knee_extension"],
    preferredTags: ["compound", "machine", "dumbbell", "barbell", "beginner_friendly"],
    avoidTags: ["knee_caution", "high_impact"],
    notes: note,
    fallbackSlugs: ["leg-press", "goblet-squat", "hack-squat"],
    volumeMuscle: "quadricipiti",
    repsBias: "main",
  };
}

function addHingeMain(sessionId: string, note: string): SlotRecipeInput {
  return {
    sessionId,
    key: "hinge_main",
    label: "Posterior chain principale",
    role: "heavy_compound",
    priority: "main",
    category: "strength",
    targetMuscles: ["glutei", "femorali", "erettori spinali"],
    secondaryMuscles: ["quadricipiti"],
    movementPatterns: ["hinge", "hip_extension"],
    preferredTags: ["compound", "barbell", "dumbbell", "machine", "strength"],
    avoidTags: ["back_caution"],
    notes: note,
    fallbackSlugs: ["hip-thrust", "romanian-deadlift-con-manubri", "glute-bridge"],
    volumeMuscle: "femorali",
    repsBias: "main",
  };
}

function addGluteAccessory(sessionId: string, note: string): SlotRecipeInput {
  return {
    sessionId,
    key: "glute_accessory",
    label: "Hip extension glutei",
    role: "compound",
    priority: "secondary",
    category: "strength",
    targetMuscles: ["glutei"],
    secondaryMuscles: ["femorali"],
    movementPatterns: ["hip_extension", "hinge"],
    preferredTags: ["compound", "machine", "dumbbell", "barbell", "hypertrophy"],
    avoidTags: ["back_caution"],
    notes: note,
    fallbackSlugs: ["hip-thrust", "glute-bridge", "back-extension-glute-focus"],
    volumeMuscle: "glutei",
    repsBias: "secondary",
  };
}

function addHamCurl(sessionId: string, note: string): SlotRecipeInput {
  return {
    sessionId,
    key: "hamstrings",
    label: "Femorali",
    role: "accessory",
    priority: "accessory",
    category: "strength",
    targetMuscles: ["femorali"],
    movementPatterns: ["knee_flexion", "hinge", "hip_extension"],
    preferredTags: ["machine", "dumbbell", "hypertrophy", "beginner_friendly"],
    avoidTags: ["back_caution"],
    notes: note,
    fallbackSlugs: ["leg-curl-macchina", "romanian-deadlift-con-manubri", "leg-curl-fitball"],
    volumeMuscle: "femorali",
    repsBias: "secondary",
  };
}

function addCalves(sessionId: string, note: string): SlotRecipeInput {
  return {
    sessionId,
    key: "calves",
    label: "Polpacci",
    role: "isolation",
    priority: "isolation",
    category: "strength",
    targetMuscles: ["polpacci"],
    movementPatterns: ["knee_extension", "mobility"],
    preferredTags: ["isolation", "beginner_friendly"],
    notes: note,
    fallbackSlugs: ["calf-raise", "seated-calf-raise", "mobility-caviglie"],
    volumeMuscle: "polpacci",
    repsBias: "pump",
  };
}

function addCore(sessionId: string, note: string): SlotRecipeInput {
  return {
    sessionId,
    key: "core",
    label: "Core",
    role: "core",
    priority: "core",
    category: "core",
    allowedCategories: ["core"],
    targetMuscles: ["core", "addome", "obliqui"],
    movementPatterns: ["core_anti_extension", "core_anti_rotation", "carry"],
    preferredTags: ["core_anti_rotation", "stability", "low_impact"],
    notes: note,
    fallbackSlugs: ["dead-bug", "pallof-press", "side-plank"],
    volumeMuscle: "core",
    repsBias: "core",
  };
}

function addMobility(sessionId: string, note: string): SlotRecipeInput {
  return {
    sessionId,
    key: "mobility",
    label: "Mobilita e postura",
    role: "mobility",
    priority: "accessory",
    category: "mobility",
    allowedCategories: ["mobility", "prehab"],
    targetMuscles: ["anche", "spalle", "colonna toracica", "core"],
    movementPatterns: ["mobility"],
    preferredTags: ["mobility", "prehab", "low_impact", "warmup"],
    notes: note,
    fallbackSlugs: ["mobility-anche", "mobility-spalle", "thoracic-rotation"],
    repsBias: "mobility",
  };
}

function getFocusSlot(
  sessionId: string,
  focusMuscle: StrategyMuscleKey
): SlotRecipeInput | null {
  switch (focusMuscle) {
    case "petto":
      return addChestIncline(
        sessionId,
        "Richiamo focus petto inserito presto nella seduta per aumentare priorita senza allungare troppo il lavoro."
      );
    case "dorso":
      return addVerticalPull(
        sessionId,
        "Richiamo focus dorso per aumentare ampiezza o qualita della tirata gia nelle prime fasi della seduta."
      );
    case "spalle":
    case "deltoidi laterali":
      return addLateralRaise(
        sessionId,
        "Richiamo focus spalle con isolamento stabile e ripetibile, senza trasformare la seduta in pumping casuale."
      );
    case "deltoidi posteriori":
      return addRearDelt(
        sessionId,
        "Richiamo focus deltoidi posteriori con enfasi sul controllo scapolare."
      );
    case "bicipiti":
      return addBiceps(sessionId, "Richiamo focus bicipiti aggiunto in esposizioni selezionate.");
    case "tricipiti":
      return addTriceps(sessionId, "Richiamo focus tricipiti aggiunto in esposizioni selezionate.");
    case "quadricipiti":
      return addQuadMain(
        sessionId,
        "Richiamo focus quadricipiti con pattern dominante messo all'inizio della seduta."
      );
    case "femorali":
      return addHamCurl(
        sessionId,
        "Richiamo focus femorali controllato, usato per alzare la frequenza senza stressare troppo la schiena."
      );
    case "glutei":
      return addGluteAccessory(
        sessionId,
        "Richiamo focus glutei aggiunto dove la seduta puo assorbirlo senza diventare dispersiva."
      );
    case "polpacci":
      return addCalves(sessionId, "Richiamo focus polpacci con volume semplice e ripetibile.");
    case "core":
      return addCore(sessionId, "Richiamo focus core con slot tecnico invece di alzare il caos metabolico.");
    default:
      return null;
  }
}

function buildRecipesForSession(
  kind: SessionKind,
  sessionId: string,
  theme: SessionTheme,
  focusMuscle: StrategyMuscleKey | null,
  strategy: TrainingStrategy
) {
  const recipes: SlotRecipeInput[] = [];
  const wantsMobility = getThemeMuscles(theme).includes("core") &&
    normalizeText(theme.notes.join(" ")).includes("postura");

  switch (kind) {
    case "full_body_a":
      recipes.push(
        addQuadMain(sessionId, "Main lift quad-dominant per aprire la seduta full body A con un pattern stabile."),
        addChestMain(sessionId, "Spinta principale dopo il lower dominante, per mantenere la seduta veramente full body."),
        addRow(sessionId, "Tirata orizzontale per bilanciare il lavoro di spinta e tenere ordine scapolare."),
        addGluteAccessory(sessionId, "Hinge leggero o hip extension per completare la base full body senza duplicare il main lift."),
        addCore(sessionId, "Core finale per stabilita e controllo.")
      );
      break;
    case "full_body_b":
      recipes.push(
        addHingeMain(sessionId, "Main lift posterior chain per differenziare chiaramente la seduta B dalla A."),
        addVerticalPull(sessionId, "Tirata verticale subito dopo il hinge per mantenere dorso prioritario."),
        addChestIncline(sessionId, "Spinta alternativa con enfasi leggermente diversa rispetto alla seduta A."),
        addGluteAccessory(sessionId, "Complementare lower a volume gestibile."),
        addCore(sessionId, "Core tecnico a chiusura seduta.")
      );
      break;
    case "full_body_c":
      recipes.push(
        addQuadMain(sessionId, "Seduta C usata come richiamo tecnico-metabolico, non come copia delle altre full body."),
        addVerticalPull(sessionId, "Tirata principale di richiamo globale."),
        addLateralRaise(sessionId, "Richiamo deltoidi o weak point senza alzare troppo la fatica sistemica."),
        addBiceps(sessionId, "Accessorio breve per migliorare qualita e completare il richiamo upper."),
        getThemeMuscles(theme).includes("core")
          ? addCore(sessionId, "Core o controllo posturale a fine seduta.")
          : addMobility(sessionId, "Chiusura tecnica leggera, lasciando il cardio solo come indicazione generale nelle note programma.")
      );
      break;
    case "upper_a":
      recipes.push(
        addChestMain(sessionId, "Upper A: petto, dorso e spalle partono con una spinta primaria ordinata."),
        addRow(sessionId, "Tirata orizzontale per bilanciare il volume upper."),
        addChestIncline(sessionId, "Seconda spinta petto per completare il volume della giornata senza caos."),
        addVerticalPull(sessionId, "Tirata verticale per dare frequenza utile al dorso."),
        addLateralRaise(sessionId, "Spalle complementari con enfasi su deltoidi laterali o posteriori."),
        addBiceps(sessionId, "Braccia inserite solo dopo i pattern principali."),
        addTriceps(sessionId, "Chiusura upper con lavoro tricipiti controllato.")
      );
      break;
    case "upper_b":
      recipes.push(
        addVerticalPull(sessionId, "Upper B: dorso prioritario fin dall'inizio della seduta."),
        addChestIncline(sessionId, "Richiamo petto controllato, non dominante come in Upper A."),
        addRow(sessionId, "Seconda tirata per spessore dorsale e qualita scapolare."),
        addShoulderPress(sessionId, "Spinta verticale o macchina per volume spalle sensato."),
        addRearDelt(sessionId, "Deltoidi posteriori per completare il lavoro upper B."),
        addBiceps(sessionId, "Bicipiti in coda alla seduta pull-biased."),
        addTriceps(sessionId, "Richiamo petto/tricipiti mantenuto senza rubare spazio al dorso.")
      );
      break;
    case "lower_a":
      recipes.push(
        addQuadMain(sessionId, "Lower A: base quadricipiti/glutei con pattern principale semplice e recuperabile."),
        addGluteAccessory(sessionId, "Hip extension secondaria per glutei senza rubare priorita al main lift."),
        addHamCurl(sessionId, "Femorali come complemento strutturato."),
        addCalves(sessionId, "Polpacci a volume contenuto."),
        addCore(sessionId, "Core per stabilita e transfer sul lower.")
      );
      break;
    case "lower_b":
      recipes.push(
        addHingeMain(sessionId, "Lower B: posterior chain in apertura per distinguere la seduta dalla A."),
        addQuadMain(sessionId, "Richiamo quadricipiti dopo il hinge, con carico sistemico piu controllato."),
        addHamCurl(sessionId, "Secondo lavoro femorali o glutei per completare la distribuzione."),
        addCalves(sessionId, "Polpacci mantenuti anche nelle settimane con focus posterior chain."),
        addCore(sessionId, "Core a chiusura seduta.")
      );
      break;
    case "push":
      recipes.push(
        addChestMain(sessionId, "Push: spinta petto principale all'inizio della seduta."),
        addChestIncline(sessionId, "Seconda spinta per petto alto o variante complementare."),
        addShoulderPress(sessionId, "Spinta verticale dosata, non messa davanti al petto se il focus primario non lo richiede."),
        addLateralRaise(sessionId, "Deltoidi laterali con volume ordinato."),
        addTriceps(sessionId, "Tricipiti finali come estensione naturale della seduta push.")
      );
      break;
    case "pull":
      recipes.push(
        addVerticalPull(sessionId, "Pull: tirata verticale come asse principale."),
        addRow(sessionId, "Seconda tirata per spessore dorsale."),
        addRearDelt(sessionId, "Deltoidi posteriori coerenti con la giornata di tirata."),
        addBiceps(sessionId, "Bicipiti in coda, senza anticiparli troppo."),
        addCore(sessionId, "Core tecnico breve per mantenere ordine e non solo lavoro di braccia.")
      );
      break;
    case "legs":
      recipes.push(
        addQuadMain(sessionId, "Legs: prima esposizione lower con quadricipiti o squat dominante."),
        addHingeMain(sessionId, "Secondo pattern pesante per posterior chain, dosato in base al recupero."),
        addHamCurl(sessionId, "Complementare femorali per completare la seduta."),
        addGluteAccessory(sessionId, "Richiamo glutei senza trasformare tutto in glute day."),
        addCalves(sessionId, "Polpacci sempre presenti se il tempo lo consente."),
        addCore(sessionId, "Core come chiusura lower.")
      );
      break;
    case "upper_focus":
      recipes.push(
        addChestIncline(sessionId, "Seduta upper/focus con priorita ai gruppi superiori scelti dalla strategy."),
        addVerticalPull(sessionId, "Tirata principale per mantenere frequenza utile sul dorso."),
        addRow(sessionId, "Seconda tirata o richiamo di bilanciamento upper."),
        addLateralRaise(sessionId, "Deltoidi in richiamo controllato."),
        addBiceps(sessionId, "Braccia solo come completamento.")
      );
      break;
    case "lower_focus":
      recipes.push(
        addHingeMain(sessionId, "Seduta lower/focus con posterior chain o weak point lower in evidenza."),
        addQuadMain(sessionId, "Seconda priorita lower per tenere quadricipiti attivi."),
        addHamCurl(sessionId, "Complementare femorali selezionato."),
        addCalves(sessionId, "Polpacci mantenuti."),
        addCore(sessionId, "Core e controllo finale.")
      );
      break;
    case "chest":
      recipes.push(
        addChestMain(sessionId, "Body part chest: petto come asse principale della seduta dedicata."),
        addChestIncline(sessionId, "Secondo angolo di spinta per upper chest o fibre carenti."),
        addShoulderPress(sessionId, "Spalle anteriori solo come sostegno tecnico, non protagonista."),
        addTriceps(sessionId, "Tricipiti coerenti con la seduta petto.")
      );
      break;
    case "back":
      recipes.push(
        addVerticalPull(sessionId, "Body part back: ampiezza dorsale in apertura."),
        addRow(sessionId, "Spessore dorsale come secondo asse della seduta."),
        addRearDelt(sessionId, "Parte posteriore delle spalle come supporto alla giornata dorsale."),
        addBiceps(sessionId, "Bicipiti in chiusura seduta.")
      );
      break;
    case "shoulders":
      recipes.push(
        addShoulderPress(sessionId, "Seduta spalle con una spinta verticale stabile come base."),
        addLateralRaise(sessionId, "Focus deltoidi laterali in seduta dedicata."),
        addRearDelt(sessionId, "Deltoidi posteriori per completare il cingolo scapolare."),
        addTriceps(sessionId, "Tricipiti opzionali come richiamo breve.")
      );
      break;
    case "arms":
      recipes.push(
        addBiceps(sessionId, "Seduta braccia/focus con bicipiti all'inizio per dare vera priorita."),
        addTriceps(sessionId, "Tricipiti come secondo asse della giornata."),
        addLateralRaise(sessionId, "Deltoidi laterali come richiamo utile se resta spazio."),
        addCore(sessionId, "Core breve per non lasciare la seduta completamente isolata.")
      );
      break;
    case "specialization":
      recipes.push(
        addChestIncline(sessionId, "Seduta focus breve e ordinata, usata per il gruppo carente o per un richiamo tecnico."),
        addLateralRaise(sessionId, "Secondo slot focalizzato se il weak point e sull'upper."),
        addCore(sessionId, "Controllo posturale/core a supporto del focus.")
      );
      break;
  }

  if (focusMuscle) {
    const focusSlot = getFocusSlot(sessionId, focusMuscle);
    if (focusSlot) {
      recipes.splice(kind === "arms" || kind === "specialization" ? 0 : 1, 0, focusSlot);
    }
  }

  if (wantsMobility || strategy.goal === "mobilita/postura") {
    recipes.push(
      addMobility(
        sessionId,
        "Chiusura tecnica coerente con focus posturale o mobilita dichiarata."
      )
    );
  }

  return recipes;
}

function trimRecipes(
  recipes: SlotRecipeInput[],
  maxSlots: number
) {
  if (recipes.length <= maxSlots) {
    return recipes;
  }

  const priorities: Record<NonNullable<ExerciseSlot["priority"]>, number> = {
    main: 0,
    secondary: 1,
    accessory: 2,
    isolation: 3,
    core: 4,
  };

  const keepKeys = new Set(
    recipes
      .map((recipe, index) => ({ recipe, index }))
      .sort(
        (left, right) =>
          priorities[left.recipe.priority] - priorities[right.recipe.priority] ||
          left.index - right.index
      )
      .slice(0, maxSlots)
      .map(({ recipe }) => recipe.key)
  );

  return recipes.filter((recipe) => keepKeys.has(recipe.key));
}

function buildWorkoutFocus(theme: SessionTheme, focusMuscle: StrategyMuscleKey | null) {
  const primary = theme.focus.join(", ");
  if (!focusMuscle) {
    return primary;
  }

  return `${primary} con richiamo ${focusMuscle}`;
}

function buildWorkoutNotes(
  strategy: TrainingStrategy,
  theme: SessionTheme,
  focusMuscle: StrategyMuscleKey | null
) {
  const targets = getPrimaryThemeMuscles(theme);
  const noteParts = [
    `Builder v2 ${strategy.split.type}: ${theme.notes.join(" ")}`,
    targets.length > 0
      ? `Target primari: ${targets.join(", ")}.`
      : "Target primari distribuiti in base alla seduta.",
    focusMuscle
      ? `Focus aumentato in modo controllato su ${focusMuscle}.`
      : "Volume accessorio mantenuto controllato per non appiattire la split.",
  ];

  return noteParts.join(" ");
}

export function buildProgramBlueprintV2(
  strategy: TrainingStrategy,
  profile: NormalizedTrainingProfile
) {
  const focusedMuscles = getFocusedMuscles(strategy);
  const exposureCounts = new Map<StrategyMuscleKey, number>();
  const sessionBudget = getSessionSlotBudget(strategy, profile);

  return strategy.split.sessionThemes
    .slice(0, strategy.split.weeklyResistanceSessions)
    .map((theme, index) => {
      const kind = getSessionKind(strategy.split.type, theme, index);
      const sessionId = theme.title.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      const focusMuscle = getFocusMuscleForSession(theme, focusedMuscles, exposureCounts);
      const recipes = trimRecipes(
        buildRecipesForSession(kind, sessionId, theme, focusMuscle, strategy),
        sessionBudget
      );

      if (focusMuscle) {
        exposureCounts.set(focusMuscle, (exposureCounts.get(focusMuscle) ?? 0) + 1);
      }

      return {
        title: theme.title,
        focus: buildWorkoutFocus(theme, focusMuscle),
        notes: buildWorkoutNotes(strategy, theme, focusMuscle),
        slots: recipes.map((recipe) => createSlot(recipe, strategy, profile)),
      } satisfies ProgramWorkoutBlueprintV2;
    });
}
