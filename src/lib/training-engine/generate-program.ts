import {
  getEnvironmentLabel,
  getGoalLabel,
  getPrescription,
  getProgramDisclaimer,
  getSplitDefinition,
} from "./training-rules";
import type {
  EngineExercise,
  ExerciseRole,
  GeneratedExercise,
  GeneratedProgram,
  GeneratedWorkout,
  NormalizedTrainingProfile,
} from "./types";

function clampWorkoutCount(daysPerWeek: number) {
  return Math.max(2, Math.min(daysPerWeek || 3, 6));
}

function hasAny(
  source: string[],
  values: string[]
) {
  return values.some((value) => source.includes(value));
}

function withAvailableFirst(candidates: string[], available: Set<string>) {
  const unique = [...new Set(candidates)];
  const availableFirst = unique.filter((candidate) => available.has(candidate));
  const unavailable = unique.filter((candidate) => !available.has(candidate));
  return [...availableFirst, ...unavailable];
}

function makeExercise(
  available: Set<string>,
  profile: NormalizedTrainingProfile,
  role: ExerciseRole,
  slugCandidates: string[],
  nameFallback: string,
  notes: string
): GeneratedExercise {
  const prescription = getPrescription(profile, role);

  return {
    slugCandidates: withAvailableFirst(slugCandidates, available),
    nameFallback,
    sets: prescription.sets,
    reps: prescription.reps,
    restSeconds: prescription.restSeconds,
    intensity: prescription.intensity,
    notes,
  };
}

function getEnvironmentFlags(profile: NormalizedTrainingProfile) {
  return {
    home: profile.environment === "home",
    gym: profile.environment === "gym",
    outdoor: profile.environment === "outdoor",
    mixed: profile.environment === "mixed",
    hasDumbbells: hasAny(profile.equipmentPreference, ["dumbbells"]),
    hasBands: hasAny(profile.equipmentPreference, ["bands"]),
    hasMachines: hasAny(profile.equipmentPreference, ["machines", "cables"]),
    hasBarbell: hasAny(profile.equipmentPreference, ["barbell"]),
  };
}

function hasLimitation(profile: NormalizedTrainingProfile, limitation: string) {
  return profile.limitations.includes(limitation);
}

function selectHorizontalPush(profile: NormalizedTrainingProfile, available: Set<string>) {
  const flags = getEnvironmentFlags(profile);

  if (flags.home && flags.hasDumbbells) {
    return makeExercise(
      available,
      profile,
      "compound",
      ["push-up", "incline-dumbbell-press"],
      "Push-up",
      "Spinta orizzontale principale con esecuzione controllata."
    );
  }

  return makeExercise(
    available,
    profile,
    profile.goal === "strength" && flags.hasBarbell ? "heavy_compound" : "compound",
    flags.gym
      ? ["chest-press-macchina", "bench-press", "incline-dumbbell-press"]
      : ["push-up", "incline-dumbbell-press", "chest-press-macchina"],
    flags.gym ? "Chest press macchina" : "Push-up",
    "Spinta orizzontale principale della seduta."
  );
}

function selectInclinePush(profile: NormalizedTrainingProfile, available: Set<string>) {
  const flags = getEnvironmentFlags(profile);

  if (flags.home) {
    return makeExercise(
      available,
      profile,
      "compound",
      ["push-up", "incline-dumbbell-press"],
      "Push-up",
      "Secondo pattern di spinta, senza lavoro overhead."
    );
  }

  return makeExercise(
    available,
    profile,
    "compound",
    ["incline-dumbbell-press", "chest-press-macchina", "bench-press"],
    "Incline dumbbell press",
    "Spinta complementare con enfasi su petto alto e controllo."
  );
}

function selectVerticalOrWidePull(
  profile: NormalizedTrainingProfile,
  available: Set<string>
) {
  const flags = getEnvironmentFlags(profile);

  if (flags.home && flags.hasDumbbells) {
    return makeExercise(
      available,
      profile,
      "compound",
      ["rematore-con-manubrio", "bird-dog"],
      "Rematore con manubrio",
      "Trazione principale scelta in base all'attrezzatura disponibile."
    );
  }

  return makeExercise(
    available,
    profile,
    "compound",
    flags.gym
      ? ["lat-machine-avanti", "assisted-pull-up", "pulldown-a-braccia-tese"]
      : ["rematore-con-manubrio", "lat-machine-avanti"],
    flags.gym ? "Lat machine avanti" : "Rematore con manubrio",
    "Trazione dominante verticale o ampia per dorsali e parte alta della schiena."
  );
}

function selectHorizontalPull(
  profile: NormalizedTrainingProfile,
  available: Set<string>
) {
  const flags = getEnvironmentFlags(profile);
  const backSensitive = hasLimitation(profile, "back");

  if (flags.gym && !backSensitive) {
    return makeExercise(
      available,
      profile,
      "compound",
      ["seated-cable-row", "rematore-con-manubrio", "lat-machine-avanti"],
      "Seated cable row",
      "Trazione orizzontale per spessore dorsale e controllo scapolare."
    );
  }

  if (flags.home && flags.hasDumbbells && !backSensitive) {
    return makeExercise(
      available,
      profile,
      "compound",
      ["rematore-con-manubrio", "bird-dog"],
      "Rematore con manubrio",
      "Trazione orizzontale stabile, evita compensi lombari."
    );
  }

  return makeExercise(
    available,
    profile,
    "accessory",
    ["bird-dog", "face-pull", "seated-cable-row"],
    "Bird dog",
    "Fallback prudente quando la schiena richiede piu controllo."
  );
}

function selectShoulderWork(profile: NormalizedTrainingProfile, available: Set<string>) {
  if (hasLimitation(profile, "shoulder")) {
    return makeExercise(
      available,
      profile,
      "accessory",
      ["face-pull", "mobility-spalle"],
      "Face pull",
      "Lavoro spalle conservativo: evita shoulder press e alzate laterali come scelta principale."
    );
  }

  const flags = getEnvironmentFlags(profile);

  return makeExercise(
    available,
    profile,
    "accessory",
    flags.gym
      ? ["alzate-laterali", "face-pull", "shoulder-press-macchina"]
      : ["alzate-laterali", "face-pull"],
    "Alzate laterali",
    "Complementare deltoidi con controllo e ROM gestibile."
  );
}

function selectBiceps(profile: NormalizedTrainingProfile, available: Set<string>) {
  return makeExercise(
    available,
    profile,
    "isolation",
    ["curl-manubri"],
    "Curl manubri",
    "Isolamento bicipiti, cedimento non sistematico."
  );
}

function selectTriceps(profile: NormalizedTrainingProfile, available: Set<string>) {
  const flags = getEnvironmentFlags(profile);

  return makeExercise(
    available,
    profile,
    "isolation",
    flags.gym ? ["triceps-pushdown", "push-up"] : ["push-up"],
    flags.gym ? "Triceps pushdown" : "Push-up stretto",
    "Isolamento o finisher tricipiti, senza inseguire il cedimento in ogni seduta."
  );
}

function selectQuad(profile: NormalizedTrainingProfile, available: Set<string>) {
  const flags = getEnvironmentFlags(profile);

  if (hasLimitation(profile, "knee")) {
    return makeExercise(
      available,
      profile,
      "compound",
      flags.gym
        ? ["leg-press", "wall-sit", "glute-bridge"]
        : ["wall-sit", "glute-bridge", "squat-corpo-libero"],
      flags.gym ? "Leg press" : "Wall sit",
      "Scelta prudente per ginocchia: niente affondi o jumping jack come esercizio principale."
    );
  }

  if (flags.home && flags.hasDumbbells) {
    return makeExercise(
      available,
      profile,
      profile.goal === "strength" ? "heavy_compound" : "compound",
      ["goblet-squat", "squat-corpo-libero"],
      "Goblet squat",
      "Pattern dominante di squat per quadricipiti e glutei."
    );
  }

  return makeExercise(
    available,
    profile,
    flags.gym && profile.goal === "strength" ? "heavy_compound" : "compound",
    flags.gym
      ? ["leg-press", "goblet-squat", "squat-corpo-libero"]
      : ["squat-corpo-libero", "goblet-squat"],
    flags.gym ? "Leg press" : "Squat corpo libero",
    "Pattern dominante di squat per quadricipiti e glutei."
  );
}

function selectPosteriorChain(
  profile: NormalizedTrainingProfile,
  available: Set<string>,
  primary = false
) {
  const flags = getEnvironmentFlags(profile);
  const backSensitive = hasLimitation(profile, "back");

  if (backSensitive) {
    return makeExercise(
      available,
      profile,
      primary ? "compound" : "accessory",
      flags.gym
        ? ["leg-curl-macchina", "glute-bridge", "hip-thrust"]
        : ["glute-bridge", "dead-bug"],
      flags.gym ? "Leg curl macchina" : "Glute bridge",
      "Scelta prudente per schiena: evita Romanian deadlift come scelta principale."
    );
  }

  if (flags.gym) {
    return makeExercise(
      available,
      profile,
      primary ? "heavy_compound" : "compound",
      ["hip-thrust", "romanian-deadlift-con-manubri", "leg-curl-macchina"],
      "Hip thrust",
      "Focus su glutei e femorali con catena posteriore stabile."
    );
  }

  return makeExercise(
    available,
    profile,
    primary ? "compound" : "accessory",
    flags.hasDumbbells
      ? ["romanian-deadlift-con-manubri", "glute-bridge"]
      : ["glute-bridge", "dead-bug"],
    flags.hasDumbbells ? "Romanian deadlift con manubri" : "Glute bridge",
    "Lavoro catena posteriore con attenzione al controllo lombare."
  );
}

function selectSingleLeg(profile: NormalizedTrainingProfile, available: Set<string>) {
  if (hasLimitation(profile, "knee")) {
    return makeExercise(
      available,
      profile,
      "accessory",
      ["glute-bridge", "wall-sit"],
      "Glute bridge",
      "Fallback prudente: evita lavoro unilaterale aggressivo sulle ginocchia."
    );
  }

  return makeExercise(
    available,
    profile,
    "accessory",
    ["split-squat-statico", "step-up", "affondi"],
    "Split squat statico",
    "Pattern unilaterale per stabilita e volume locale."
  );
}

function selectCalves(profile: NormalizedTrainingProfile, available: Set<string>) {
  return makeExercise(
    available,
    profile,
    "isolation",
    ["calf-raise"],
    "Calf raise",
    "Volume semplice per polpacci e caviglie."
  );
}

function selectCore(profile: NormalizedTrainingProfile, available: Set<string>) {
  if (hasLimitation(profile, "back")) {
    return makeExercise(
      available,
      profile,
      "core",
      ["bird-dog", "dead-bug", "pallof-press"],
      "Bird dog",
      "Core anti-estensione/anti-rotazione con focus sul controllo."
    );
  }

  return makeExercise(
    available,
    profile,
    "core",
    ["dead-bug", "pallof-press", "plank", "side-plank"],
    "Dead bug",
    "Core stabile per supportare la tecnica dei multiarticolari."
  );
}

function selectCardio(profile: NormalizedTrainingProfile, available: Set<string>) {
  const flags = getEnvironmentFlags(profile);

  if (flags.gym) {
    return makeExercise(
      available,
      profile,
      "cardio",
      ["bike-cyclette", "ellittica", "camminata-inclinata"],
      "Bike cyclette",
      "Cardio moderato a basso impatto per supportare il dispendio senza trasformare tutto in cardio."
    );
  }

  if (flags.outdoor) {
    return makeExercise(
      available,
      profile,
      "cardio",
      ["farmer-walk", "bike-cyclette"],
      "Farmer walk",
      "Cardio o carry leggero/moderato compatibile con ambiente outdoor."
    );
  }

  return makeExercise(
    available,
    profile,
    "cardio",
    ["bike-cyclette", "farmer-walk"],
    "Bike cyclette",
    "Cardio moderato a basso impatto come complemento, non come asse principale del piano."
  );
}

function buildUpperA(profile: NormalizedTrainingProfile, available: Set<string>) {
  return {
    title: "Upper A",
    focus: "Petto, tirata orizzontale, deltoidi e braccia",
    estimatedMinutes: profile.sessionMinutes ?? 60,
    notes:
      "Seduta upper con priorita a spinta orizzontale, tirata e complementari gestibili.",
    exercises: [
      selectHorizontalPush(profile, available),
      selectHorizontalPull(profile, available),
      selectVerticalOrWidePull(profile, available),
      selectShoulderWork(profile, available),
      selectBiceps(profile, available),
      selectTriceps(profile, available),
    ],
  } satisfies GeneratedWorkout;
}

function buildUpperB(profile: NormalizedTrainingProfile, available: Set<string>) {
  return {
    title: "Upper B",
    focus: "Dorso, petto inclinato/macchina, deltoidi e braccia",
    estimatedMinutes: profile.sessionMinutes ?? 60,
    notes:
      "Seduta upper con enfasi dorsale e secondo pattern di spinta per volume sostenibile.",
    exercises: [
      selectVerticalOrWidePull(profile, available),
      selectInclinePush(profile, available),
      selectHorizontalPull(profile, available),
      selectShoulderWork(profile, available),
      selectTriceps(profile, available),
      selectBiceps(profile, available),
    ],
  } satisfies GeneratedWorkout;
}

function buildLowerA(profile: NormalizedTrainingProfile, available: Set<string>) {
  return {
    title: "Lower A",
    focus: "Quadricipiti, glutei, femorali, polpacci e core",
    estimatedMinutes: profile.sessionMinutes ?? 60,
    notes:
      "Seduta lower con pattern di squat come asse principale e catena posteriore complementare.",
    exercises: [
      selectQuad(profile, available),
      selectPosteriorChain(profile, available),
      selectSingleLeg(profile, available),
      selectCalves(profile, available),
      selectCore(profile, available),
    ],
  } satisfies GeneratedWorkout;
}

function buildLowerB(profile: NormalizedTrainingProfile, available: Set<string>) {
  return {
    title: "Lower B",
    focus: "Posterior chain, gambe e core",
    estimatedMinutes: profile.sessionMinutes ?? 60,
    notes:
      "Seduta lower con focus su glutei/femorali e richiamo quadricipiti senza impatto inutile.",
    exercises: [
      selectPosteriorChain(profile, available, true),
      selectQuad(profile, available),
      selectSingleLeg(profile, available),
      selectCalves(profile, available),
      selectCore(profile, available),
    ],
  } satisfies GeneratedWorkout;
}

function buildFullBodyA(profile: NormalizedTrainingProfile, available: Set<string>) {
  return {
    title: "Full Body A",
    focus: "Squat, spinta, tirata e core",
    estimatedMinutes: profile.sessionMinutes ?? 60,
    notes:
      "Seduta full body tecnica e completa, adatta a principianti o frequenze piu basse.",
    exercises: [
      selectQuad(profile, available),
      selectHorizontalPush(profile, available),
      selectHorizontalPull(profile, available),
      selectPosteriorChain(profile, available),
      selectCore(profile, available),
    ],
  } satisfies GeneratedWorkout;
}

function buildFullBodyB(profile: NormalizedTrainingProfile, available: Set<string>) {
  return {
    title: "Full Body B",
    focus: "Hinge, tirata, spinta complementare e core",
    estimatedMinutes: profile.sessionMinutes ?? 60,
    notes:
      "Seconda seduta full body con enfasi su catena posteriore e variazione della parte alta.",
    exercises: [
      selectPosteriorChain(profile, available, true),
      selectVerticalOrWidePull(profile, available),
      selectInclinePush(profile, available),
      selectSingleLeg(profile, available),
      selectCore(profile, available),
    ],
  } satisfies GeneratedWorkout;
}

function buildFullBodyC(profile: NormalizedTrainingProfile, available: Set<string>) {
  return {
    title: "Full Body C",
    focus: "Richiamo globale, deltoidi, braccia e condizionamento",
    estimatedMinutes: profile.sessionMinutes ?? 60,
    notes:
      profile.goal === "fat_loss"
        ? "Seduta full body con finale cardio moderato, senza snaturare il lavoro di forza/ipertrofia."
        : "Terza seduta full body con volume sostenibile e richiamo tecnico.",
    exercises: [
      selectQuad(profile, available),
      selectVerticalOrWidePull(profile, available),
      selectShoulderWork(profile, available),
      selectBiceps(profile, available),
      profile.goal === "fat_loss" || profile.goal === "wellness"
        ? selectCardio(profile, available)
        : selectCore(profile, available),
    ],
  } satisfies GeneratedWorkout;
}

function buildWellnessWorkout(
  title: string,
  focus: string,
  profile: NormalizedTrainingProfile,
  available: Set<string>,
  includeCardio: boolean
) {
  return {
    title,
    focus,
    estimatedMinutes: Math.min(profile.sessionMinutes ?? 60, 55),
    notes:
      "Seduta conservativa: tecnica pulita, recupero completo e intensita gestibile.",
    exercises: [
      selectQuad(profile, available),
      selectHorizontalPush(profile, available),
      selectHorizontalPull(profile, available),
      selectCore(profile, available),
      includeCardio
        ? selectCardio(profile, available)
        : makeExercise(
            available,
            profile,
            "mobility",
            ["mobility-anche", "mobility-spalle"],
            "Mobility anche",
            "Chiusura su mobilita e respirazione."
          ),
    ],
  } satisfies GeneratedWorkout;
}

function buildWorkoutList(
  profile: NormalizedTrainingProfile,
  available: Set<string>
) {
  const split = getSplitDefinition(profile);

  switch (split.key) {
    case "upper_lower_4":
    case "fat_loss_upper_lower_4":
    case "strength_upper_lower_4":
      return [
        buildUpperA(profile, available),
        buildLowerA(profile, available),
        buildUpperB(profile, available),
        buildLowerB(profile, available),
      ];
    case "upper_lower_full":
      return [
        buildUpperA(profile, available),
        buildLowerA(profile, available),
        buildFullBodyB(profile, available),
      ];
    case "full_body_2":
    case "strength_full_body":
    case "fat_loss_full_body":
      return [buildFullBodyA(profile, available), buildFullBodyB(profile, available)];
    case "full_body_3":
      return [
        buildFullBodyA(profile, available),
        buildFullBodyB(profile, available),
        buildFullBodyC(profile, available),
      ];
    case "wellness_full_body":
      return [
        buildWellnessWorkout(
          "Full Body A",
          "Forza base e mobilita",
          profile,
          available,
          false
        ),
        buildWellnessWorkout(
          "Full Body B",
          "Tecnica, core e controllo",
          profile,
          available,
          true
        ),
        ...(clampWorkoutCount(profile.daysPerWeek) >= 3
          ? [
              buildWellnessWorkout(
                "Full Body C",
                "Recupero attivo e tonicita",
                profile,
                available,
                true
              ),
            ]
          : []),
      ];
    case "hybrid_5":
      return [
        {
          ...buildUpperA(profile, available),
          title: "Push",
          focus: "Petto, spalle, tricipiti",
        },
        {
          ...buildUpperB(profile, available),
          title: "Pull",
          focus: "Dorso, bicipiti, deltoidi posteriori",
        },
        {
          ...buildLowerA(profile, available),
          title: "Legs",
          focus: "Gambe complete e core",
        },
        {
          ...buildUpperA(profile, available),
          title: "Upper",
          focus: "Richiamo upper sostenibile",
        },
        {
          ...buildLowerB(profile, available),
          title: "Lower",
          focus: "Richiamo lower con posterior chain",
        },
      ];
    case "ppl_6":
      return [
        {
          ...buildUpperA(profile, available),
          title: "Push A",
          focus: "Spinte e tricipiti",
        },
        {
          ...buildUpperB(profile, available),
          title: "Pull A",
          focus: "Tirate e bicipiti",
        },
        {
          ...buildLowerA(profile, available),
          title: "Legs A",
          focus: "Quad focus",
        },
        {
          ...buildUpperA(profile, available),
          title: "Push B",
          focus: "Spinte e deltoidi",
        },
        {
          ...buildUpperB(profile, available),
          title: "Pull B",
          focus: "Dorso e parte posteriore",
        },
        {
          ...buildLowerB(profile, available),
          title: "Legs B",
          focus: "Posterior chain focus",
        },
      ];
    default:
      return [
        buildFullBodyA(profile, available),
        buildFullBodyB(profile, available),
        buildFullBodyC(profile, available),
      ];
  }
}

function getProgramTitle(profile: NormalizedTrainingProfile) {
  return `Programma ${getGoalLabel(profile.goal)} ${profile.daysPerWeek} giorni - ${getEnvironmentLabel(profile.environment)}`;
}

export function generateRuleBasedProgram(
  profile: NormalizedTrainingProfile,
  exercises: EngineExercise[]
): GeneratedProgram {
  const available = new Set(exercises.map((exercise) => exercise.slug));
  const split = getSplitDefinition(profile);
  const workouts = buildWorkoutList(profile, available);
  const notes = [
    getProgramDisclaimer(profile),
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
