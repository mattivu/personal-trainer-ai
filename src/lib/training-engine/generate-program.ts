import {
  getEnvironmentLabel,
  getGoalLabel,
  getProgramDisclaimer,
  getSplitDefinition,
} from "./training-rules";
import {
  selectExerciseForSlot,
  type ExerciseSlot,
} from "./exercise-selector";
import type { ExerciseAvailabilityProfile } from "./exercise-availability";
import type {
  EngineExercise,
  GeneratedProgram,
  GeneratedWorkout,
  NormalizedTrainingProfile,
} from "./types";

function clampWorkoutCount(daysPerWeek: number) {
  return Math.max(2, Math.min(daysPerWeek || 3, 6));
}

function slot(
  input: ExerciseSlot
) {
  return input;
}

function buildUpperA() {
  return {
    title: "Upper A",
    focus: "Petto, tirata orizzontale, deltoidi e braccia",
    notes:
      "Seduta upper con priorita a spinta orizzontale, tirata e complementari gestibili.",
    slots: [
      slot({
        slotId: "upper_a_primary_push",
        label: "Spinta principale petto",
        role: "heavy_compound",
        category: "strength",
        targetMuscles: ["petto"],
        secondaryMuscles: ["tricipiti", "spalle"],
        movementPatterns: ["horizontal_push"],
        preferredTags: ["compound", "machine", "dumbbell", "barbell"],
        avoidTags: ["shoulder_caution"],
        difficultyMax: "intermediate",
        notes: "Spinta orizzontale principale con tecnica pulita e scapole stabili.",
        fallbackSlugs: ["chest-press-macchina", "panca-piana-manubri", "bench-press"],
      }),
      slot({
        slotId: "upper_a_row",
        label: "Tirata orizzontale",
        role: "compound",
        category: "strength",
        targetMuscles: ["dorsali"],
        secondaryMuscles: ["deltoidi posteriori", "bicipiti"],
        movementPatterns: ["horizontal_pull"],
        preferredTags: ["compound", "machine", "cable", "dumbbell"],
        avoidTags: ["back_caution"],
        notes: "Tirata orizzontale per spessore dorsale e controllo scapolare.",
        fallbackSlugs: ["seated-cable-row", "rematore-con-manubrio", "rematore-macchina"],
      }),
      slot({
        slotId: "upper_a_secondary_push",
        label: "Spinta secondaria petto",
        role: "compound",
        category: "strength",
        targetMuscles: ["petto"],
        secondaryMuscles: ["tricipiti", "spalle"],
        movementPatterns: ["horizontal_push"],
        preferredTags: ["compound", "hypertrophy", "dumbbell", "machine"],
        avoidTags: ["shoulder_caution"],
        notes: "Secondo pattern di spinta per volume petto senza caos.",
        fallbackSlugs: ["incline-dumbbell-press", "chest-press-inclinata", "push-up-inclinati"],
      }),
      slot({
        slotId: "upper_a_vertical_pull",
        label: "Tirata verticale",
        role: "compound",
        category: "strength",
        targetMuscles: ["dorsali"],
        secondaryMuscles: ["bicipiti"],
        movementPatterns: ["vertical_pull"],
        preferredTags: ["compound", "machine", "cable", "bodyweight"],
        notes: "Tirata verticale per gran dorsale e parte alta della schiena.",
        fallbackSlugs: ["lat-machine-avanti", "neutral-grip-lat-pulldown", "assisted-pull-up"],
      }),
      slot({
        slotId: "upper_a_shoulders",
        label: "Deltoidi laterali o posteriori",
        role: "accessory",
        category: "strength",
        targetMuscles: ["spalle", "deltoidi posteriori"],
        movementPatterns: ["shoulder_abduction", "horizontal_pull"],
        preferredTags: ["isolation", "hypertrophy", "shoulder_friendly", "cable", "machine", "dumbbell"],
        avoidTags: ["shoulder_caution"],
        notes: "Complementare deltoidi con ROM gestibile e controllo.",
        fallbackSlugs: ["alzate-laterali", "face-pull", "reverse-fly-machine"],
      }),
      slot({
        slotId: "upper_a_biceps",
        label: "Bicipite",
        role: "isolation",
        category: "strength",
        targetMuscles: ["bicipiti"],
        movementPatterns: ["elbow_flexion"],
        preferredTags: ["isolation", "hypertrophy", "dumbbell", "cable", "machine"],
        notes: "Isolamento bicipiti senza inseguire il cedimento in ogni seduta.",
        fallbackSlugs: ["curl-manubri", "curl-cavo", "preacher-curl-macchina"],
      }),
      slot({
        slotId: "upper_a_triceps",
        label: "Tricipite",
        role: "isolation",
        category: "strength",
        targetMuscles: ["tricipiti"],
        movementPatterns: ["elbow_extension", "horizontal_push"],
        preferredTags: ["isolation", "hypertrophy", "cable", "machine"],
        avoidTags: ["shoulder_caution"],
        notes: "Complementare tricipiti con tecnica stabile.",
        fallbackSlugs: ["triceps-pushdown", "pushdown-barra", "triceps-machine"],
      }),
    ],
  };
}

function buildUpperB() {
  return {
    title: "Upper B",
    focus: "Dorso, petto alternativo, spalle e braccia",
    notes:
      "Seduta upper con enfasi dorsale e spinta petto alternativa, senza duplicare in modo rigido Upper A.",
    slots: [
      slot({
        slotId: "upper_b_primary_pull",
        label: "Tirata verticale principale",
        role: "heavy_compound",
        category: "strength",
        targetMuscles: ["dorsali"],
        secondaryMuscles: ["bicipiti"],
        movementPatterns: ["vertical_pull"],
        preferredTags: ["compound", "machine", "bodyweight", "strength"],
        notes: "Dominante dorsale verticale come asse principale della seduta.",
        fallbackSlugs: ["lat-machine-avanti", "assisted-pull-up", "neutral-grip-lat-pulldown"],
      }),
      slot({
        slotId: "upper_b_push",
        label: "Spinta petto alternativa",
        role: "compound",
        category: "strength",
        targetMuscles: ["petto"],
        secondaryMuscles: ["tricipiti", "spalle"],
        movementPatterns: ["horizontal_push"],
        preferredTags: ["compound", "dumbbell", "machine", "hypertrophy"],
        avoidTags: ["shoulder_caution"],
        notes: "Spinta petto alternativa rispetto a Upper A.",
        fallbackSlugs: ["incline-dumbbell-press", "chest-press-inclinata", "push-up"],
      }),
      slot({
        slotId: "upper_b_row",
        label: "Tirata orizzontale alternativa",
        role: "compound",
        category: "strength",
        targetMuscles: ["dorsali"],
        secondaryMuscles: ["deltoidi posteriori", "bicipiti"],
        movementPatterns: ["horizontal_pull"],
        preferredTags: ["compound", "cable", "machine", "dumbbell"],
        avoidTags: ["back_caution"],
        notes: "Seconda tirata per spessore dorsale senza ripetere sempre lo stesso rematore.",
        fallbackSlugs: ["rematore-macchina", "seated-cable-row", "chest-supported-row"],
      }),
      slot({
        slotId: "upper_b_shoulders",
        label: "Spalle",
        role: "accessory",
        category: "strength",
        targetMuscles: ["spalle", "deltoidi posteriori"],
        movementPatterns: ["shoulder_abduction", "horizontal_pull", "vertical_push"],
        preferredTags: ["shoulder_friendly", "machine", "dumbbell", "cable", "isolation"],
        avoidTags: ["shoulder_caution"],
        notes: "Lavoro spalle ordinato, non come esercizio tecnico dominante.",
        fallbackSlugs: ["alzate-laterali-ai-cavi", "alzate-laterali", "face-pull"],
      }),
      slot({
        slotId: "upper_b_biceps",
        label: "Bicipite",
        role: "isolation",
        category: "strength",
        targetMuscles: ["bicipiti"],
        movementPatterns: ["elbow_flexion"],
        preferredTags: ["isolation", "hypertrophy", "cable", "dumbbell", "machine"],
        notes: "Richiamo bicipiti con variante diversa se disponibile.",
        fallbackSlugs: ["curl-cavo", "curl-manubri", "hammer-curl"],
      }),
      slot({
        slotId: "upper_b_triceps",
        label: "Tricipite",
        role: "isolation",
        category: "strength",
        targetMuscles: ["tricipiti"],
        movementPatterns: ["elbow_extension", "horizontal_push"],
        preferredTags: ["isolation", "hypertrophy", "cable", "machine"],
        avoidTags: ["shoulder_caution"],
        notes: "Richiamo tricipiti coerente e stabile.",
        fallbackSlugs: ["pushdown-barra", "triceps-pushdown", "triceps-machine"],
      }),
    ],
  };
}

function buildLowerA() {
  return {
    title: "Lower A",
    focus: "Quadricipiti, glutei, femorali, polpacci e core",
    notes:
      "Seduta lower con pattern di squat come asse principale e catena posteriore complementare.",
    slots: [
      slot({
        slotId: "lower_a_quad_primary",
        label: "Quadricipite principale",
        role: "heavy_compound",
        category: "strength",
        targetMuscles: ["quadricipiti"],
        secondaryMuscles: ["glutei"],
        movementPatterns: ["squat", "knee_extension"],
        preferredTags: ["compound", "machine", "dumbbell", "barbell", "beginner_friendly"],
        avoidTags: ["knee_caution", "high_impact"],
        notes: "Pattern dominante per quadricipiti, senza impatto inutile.",
        fallbackSlugs: ["leg-press", "goblet-squat", "hack-squat"],
      }),
      slot({
        slotId: "lower_a_hip_extension",
        label: "Hip extension glutei",
        role: "compound",
        category: "strength",
        targetMuscles: ["glutei"],
        secondaryMuscles: ["femorali"],
        movementPatterns: ["hip_extension", "hinge"],
        preferredTags: ["compound", "machine", "dumbbell", "barbell", "hypertrophy"],
        avoidTags: ["back_caution"],
        notes: "Focus glutei con variante gestibile e stabile.",
        fallbackSlugs: ["hip-thrust", "glute-bridge", "back-extension-glute-focus"],
      }),
      slot({
        slotId: "lower_a_hamstrings",
        label: "Femorale",
        role: "accessory",
        category: "strength",
        targetMuscles: ["femorali"],
        movementPatterns: ["knee_flexion", "hinge", "hip_extension"],
        preferredTags: ["machine", "dumbbell", "hypertrophy", "beginner_friendly"],
        avoidTags: ["back_caution"],
        notes: "Richiamo femorali per completare il lower quad-dominant.",
        fallbackSlugs: ["leg-curl-macchina", "romanian-deadlift-con-manubri", "leg-curl-fitball"],
      }),
      slot({
        slotId: "lower_a_calves",
        label: "Polpacci",
        role: "isolation",
        category: "strength",
        targetMuscles: ["polpacci"],
        movementPatterns: ["knee_extension", "mobility"],
        preferredTags: ["isolation", "beginner_friendly"],
        notes: "Volume semplice per polpacci e caviglie.",
        fallbackSlugs: ["calf-raise", "seated-calf-raise", "mobility-caviglie"],
      }),
      slot({
        slotId: "lower_a_core",
        label: "Core",
        role: "core",
        category: "core",
        allowedCategories: ["core"],
        targetMuscles: ["core", "addome", "obliqui"],
        movementPatterns: ["core_anti_extension", "core_anti_rotation"],
        preferredTags: ["core_anti_rotation", "stability", "low_impact"],
        notes: "Core anti-estensione o anti-rotazione con focus sul controllo.",
        fallbackSlugs: ["dead-bug", "pallof-press", "plank"],
      }),
    ],
  };
}

function buildLowerB() {
  return {
    title: "Lower B",
    focus: "Posterior chain, gambe e core",
    notes:
      "Seduta lower con focus su glutei/femorali e richiamo quadricipiti senza impatto inutile.",
    slots: [
      slot({
        slotId: "lower_b_hinge_primary",
        label: "Posterior chain principale",
        role: "heavy_compound",
        category: "strength",
        targetMuscles: ["glutei", "femorali", "erettori spinali"],
        secondaryMuscles: ["quadricipiti"],
        movementPatterns: ["hinge", "hip_extension"],
        preferredTags: ["compound", "barbell", "dumbbell", "machine", "strength"],
        avoidTags: ["back_caution"],
        notes: "Asse posterior chain con variante prudente se la schiena lo richiede.",
        fallbackSlugs: ["hip-thrust", "romanian-deadlift-con-manubri", "glute-bridge"],
      }),
      slot({
        slotId: "lower_b_quad_secondary",
        label: "Quadricipite secondario",
        role: "compound",
        category: "strength",
        targetMuscles: ["quadricipiti"],
        secondaryMuscles: ["glutei"],
        movementPatterns: ["squat", "knee_extension", "lunge"],
        preferredTags: ["compound", "machine", "dumbbell", "beginner_friendly"],
        avoidTags: ["knee_caution", "high_impact"],
        notes: "Richiamo quadricipiti con variante secondaria e ordinata.",
        fallbackSlugs: ["hack-squat", "leg-extension", "goblet-squat"],
      }),
      slot({
        slotId: "lower_b_glutes_hams",
        label: "Glutei o femorali complementare",
        role: "accessory",
        category: "strength",
        targetMuscles: ["glutei", "femorali"],
        movementPatterns: ["hip_extension", "knee_flexion", "hinge"],
        preferredTags: ["machine", "dumbbell", "hypertrophy", "unilateral"],
        avoidTags: ["back_caution"],
        notes: "Complementare catena posteriore senza duplicare il main lift.",
        fallbackSlugs: ["leg-curl-macchina", "glute-bridge", "cable-kickback"],
      }),
      slot({
        slotId: "lower_b_calves",
        label: "Polpacci",
        role: "isolation",
        category: "strength",
        targetMuscles: ["polpacci"],
        movementPatterns: ["knee_extension", "mobility"],
        preferredTags: ["isolation", "beginner_friendly"],
        notes: "Volume semplice per polpacci e caviglie.",
        fallbackSlugs: ["calf-raise", "seated-calf-raise", "mobility-caviglie"],
      }),
      slot({
        slotId: "lower_b_core",
        label: "Core",
        role: "core",
        category: "core",
        allowedCategories: ["core"],
        targetMuscles: ["core", "addome", "obliqui"],
        movementPatterns: ["core_anti_rotation", "core_anti_extension", "carry"],
        preferredTags: ["core_anti_rotation", "stability", "low_impact"],
        notes: "Core stabile per supportare il lavoro lower.",
        fallbackSlugs: ["pallof-press", "side-plank", "bird-dog"],
      }),
    ],
  };
}

function buildFullBodyA() {
  return {
    title: "Full Body A",
    focus: "Squat, spinta, tirata e core",
    notes:
      "Seduta full body tecnica e completa, adatta a principianti o frequenze piu basse.",
    slots: [
      buildLowerA().slots[0],
      buildUpperA().slots[0],
      buildUpperA().slots[1],
      buildLowerA().slots[1],
      buildLowerA().slots[4],
    ],
  };
}

function buildFullBodyB() {
  return {
    title: "Full Body B",
    focus: "Hinge, tirata, spinta complementare e core",
    notes:
      "Seconda seduta full body con enfasi su catena posteriore e variazione della parte alta.",
    slots: [
      buildLowerB().slots[0],
      buildUpperB().slots[0],
      buildUpperB().slots[1],
      slot({
        slotId: "full_body_b_unilateral",
        label: "Unilaterale prudente",
        role: "accessory",
        category: "strength",
        targetMuscles: ["quadricipiti", "glutei"],
        movementPatterns: ["lunge", "squat"],
        preferredTags: ["unilateral", "dumbbell", "beginner_friendly"],
        avoidTags: ["knee_caution", "high_impact"],
        notes: "Pattern unilaterale solo se coerente con profilo e limitazioni.",
        fallbackSlugs: ["split-squat-statico", "step-up", "goblet-squat"],
      }),
      buildLowerB().slots[4],
    ],
  };
}

function buildFullBodyC(profile: NormalizedTrainingProfile) {
  const upperPullSlot =
    profile.environment === "home" || profile.environment === "outdoor"
      ? buildUpperA().slots[1]
      : buildUpperB().slots[0];

  return {
    title: "Full Body C",
    focus: "Richiamo globale, deltoidi, braccia e condizionamento",
    notes:
      profile.goal === "fat_loss"
        ? "Seduta full body con finale cardio moderato, senza snaturare il lavoro di forza/ipertrofia."
        : "Terza seduta full body con volume sostenibile e richiamo tecnico.",
    slots: [
      buildLowerA().slots[0],
      upperPullSlot,
      buildUpperA().slots[4],
      buildUpperA().slots[5],
      profile.goal === "fat_loss" || profile.goal === "wellness"
        ? slot({
            slotId: "conditioning_finisher",
            label: "Cardio leggero",
            role: "cardio",
            category: "cardio",
            allowedCategories: ["cardio"],
            targetMuscles: ["cardio", "quadricipiti", "glutei", "core"],
            movementPatterns: ["cardio", "carry"],
            preferredTags: ["low_impact", "conditioning", "cardio"],
            avoidTags: ["high_impact"],
            notes: "Complemento cardio low impact, non asse principale della scheda.",
            fallbackSlugs: ["bike-cyclette", "ellittica", "camminata-inclinata"],
          })
        : buildLowerA().slots[4],
    ],
  };
}

function buildWellnessWorkout(
  title: string,
  focus: string,
  includeCardio: boolean
) {
  return {
    title,
    focus,
    notes:
      "Seduta conservativa: tecnica pulita, recupero completo e intensita gestibile.",
    slots: [
      slot({
        slotId: `${title.toLowerCase().replaceAll(" ", "_")}_base_lower`,
        label: "Lower base wellness",
        role: "compound",
        category: "strength",
        targetMuscles: ["quadricipiti", "glutei"],
        movementPatterns: ["squat", "hip_extension"],
        preferredTags: ["beginner_friendly", "low_impact", "machine", "bodyweight"],
        avoidTags: ["high_impact", "knee_caution"],
        difficultyMax: "beginner",
        notes: "Lavoro lower di base, low impact e gestibile.",
        fallbackSlugs: ["goblet-squat", "leg-press", "glute-bridge"],
      }),
      slot({
        slotId: `${title.toLowerCase().replaceAll(" ", "_")}_base_push`,
        label: "Upper base wellness",
        role: "compound",
        category: "strength",
        targetMuscles: ["petto", "spalle"],
        movementPatterns: ["horizontal_push", "vertical_push"],
        preferredTags: ["beginner_friendly", "machine", "bodyweight", "shoulder_friendly"],
        avoidTags: ["shoulder_caution"],
        difficultyMax: "beginner",
        notes: "Spinta upper semplice e stabile.",
        fallbackSlugs: ["chest-press-macchina", "push-up-inclinati", "panca-piana-manubri"],
      }),
      slot({
        slotId: `${title.toLowerCase().replaceAll(" ", "_")}_base_pull`,
        label: "Upper pull wellness",
        role: "compound",
        category: "strength",
        targetMuscles: ["dorsali", "deltoidi posteriori"],
        movementPatterns: ["horizontal_pull", "vertical_pull"],
        preferredTags: ["beginner_friendly", "machine", "cable", "bodyweight"],
        avoidTags: ["back_caution"],
        difficultyMax: "beginner",
        notes: "Tirata upper controllata e low impact.",
        fallbackSlugs: ["seated-cable-row", "lat-machine-avanti", "face-pull"],
      }),
      slot({
        slotId: `${title.toLowerCase().replaceAll(" ", "_")}_core`,
        label: "Core wellness",
        role: "core",
        category: "core",
        allowedCategories: ["core"],
        targetMuscles: ["core", "addome", "obliqui"],
        movementPatterns: ["core_anti_extension", "core_anti_rotation"],
        preferredTags: ["low_impact", "stability"],
        notes: "Core di base per controllo e postura.",
        fallbackSlugs: ["dead-bug", "bird-dog", "pallof-press"],
      }),
      includeCardio
        ? slot({
            slotId: `${title.toLowerCase().replaceAll(" ", "_")}_cardio`,
            label: "Cardio leggero wellness",
            role: "cardio",
            category: "cardio",
            allowedCategories: ["cardio"],
            targetMuscles: ["cardio", "quadricipiti", "glutei", "core"],
            movementPatterns: ["cardio", "carry"],
            preferredTags: ["low_impact", "conditioning", "cardio"],
            avoidTags: ["high_impact"],
            notes: "Finale cardio leggero e sostenibile.",
            fallbackSlugs: ["bike-cyclette", "camminata-treadmill", "ellittica"],
          })
        : slot({
            slotId: `${title.toLowerCase().replaceAll(" ", "_")}_mobility`,
            label: "Mobilita wellness",
            role: "mobility",
            category: "mobility",
            allowedCategories: ["mobility", "prehab"],
            targetMuscles: ["anche", "spalle", "colonna toracica", "caviglie"],
            movementPatterns: ["mobility"],
            preferredTags: ["mobility", "prehab", "low_impact", "warmup"],
            notes: "Chiusura su mobilita e respirazione.",
            fallbackSlugs: ["mobility-anche", "mobility-spalle", "thoracic-rotation"],
          }),
    ],
  };
}

function buildWorkoutList(
  profile: NormalizedTrainingProfile
) {
  const split = getSplitDefinition(profile);

  switch (split.key) {
    case "upper_lower_4":
    case "fat_loss_upper_lower_4":
    case "strength_upper_lower_4":
      return [buildUpperA(), buildLowerA(), buildUpperB(), buildLowerB()];
    case "upper_lower_full":
      return [buildUpperA(), buildLowerA(), buildFullBodyB()];
    case "full_body_2":
    case "strength_full_body":
    case "fat_loss_full_body":
      return [buildFullBodyA(), buildFullBodyB()];
    case "full_body_3":
      return [buildFullBodyA(), buildFullBodyB(), buildFullBodyC(profile)];
    case "wellness_full_body":
      return [
        buildWellnessWorkout("Full Body A", "Forza base e mobilita", false),
        buildWellnessWorkout("Full Body B", "Tecnica, core e controllo", true),
        ...(clampWorkoutCount(profile.daysPerWeek) >= 3
          ? [
              buildWellnessWorkout(
                "Full Body C",
                "Recupero attivo e tonicita",
                true
              ),
            ]
          : []),
      ];
    case "hybrid_5":
      return [
        {
          ...buildUpperA(),
          title: "Push",
          focus: "Petto, spalle, tricipiti",
        },
        {
          ...buildUpperB(),
          title: "Pull",
          focus: "Dorso, bicipiti, deltoidi posteriori",
        },
        {
          ...buildLowerA(),
          title: "Legs",
          focus: "Gambe complete e core",
        },
        {
          ...buildUpperA(),
          title: "Upper",
          focus: "Richiamo upper sostenibile",
        },
        {
          ...buildLowerB(),
          title: "Lower",
          focus: "Richiamo lower con posterior chain",
        },
      ];
    case "ppl_6":
      return [
        {
          ...buildUpperA(),
          title: "Push A",
          focus: "Spinte e tricipiti",
        },
        {
          ...buildUpperB(),
          title: "Pull A",
          focus: "Tirate e bicipiti",
        },
        {
          ...buildLowerA(),
          title: "Legs A",
          focus: "Quad focus",
        },
        {
          ...buildUpperA(),
          title: "Push B",
          focus: "Spinte e deltoidi",
        },
        {
          ...buildUpperB(),
          title: "Pull B",
          focus: "Dorso e parte posteriore",
        },
        {
          ...buildLowerB(),
          title: "Legs B",
          focus: "Posterior chain focus",
        },
      ];
    default:
      return [buildFullBodyA(), buildFullBodyB(), buildFullBodyC(profile)];
  }
}

function getProgramTitle(profile: NormalizedTrainingProfile) {
  return `Programma ${getGoalLabel(profile.goal)} ${profile.daysPerWeek} giorni - ${getEnvironmentLabel(profile.environment)}`;
}

export function generateRuleBasedProgram(
  onboardingProfile: NormalizedTrainingProfile | ExerciseAvailabilityProfile,
  exercises: EngineExercise[]
): GeneratedProgram {
  const profile =
    "profile" in onboardingProfile ? onboardingProfile.profile : onboardingProfile;
  const split = getSplitDefinition(profile);
  const context = {
    selectedSlugs: new Set<string>(),
    slotSelections: new Map<string, string>(),
  };
  const workouts = buildWorkoutList(profile).map((workout) => ({
    title: workout.title,
    focus: workout.focus,
    estimatedMinutes:
      profile.goal === "wellness"
        ? Math.min(profile.sessionMinutes ?? 60, 55)
        : profile.sessionMinutes ?? 60,
    notes: workout.notes,
    exercises: workout.slots.map((exerciseSlot) =>
      selectExerciseForSlot(exerciseSlot, onboardingProfile, exercises, context)
    ),
  })) satisfies GeneratedWorkout[];
  const notes = [
    getProgramDisclaimer(profile).replace("Training Engine v1", "Training Engine v2"),
    `Split scelta: ${split.label}.`,
    profile.limitations.length > 0
      ? `Limitazioni considerate: ${profile.limitations.join(", ")}.`
      : "Limitazioni considerate: nessuna segnalazione specifica.",
  ].join("\n");

  return {
    title: getProgramTitle(profile),
    goal: getGoalLabel(profile.goal),
    notes,
    workouts,
  };
}
