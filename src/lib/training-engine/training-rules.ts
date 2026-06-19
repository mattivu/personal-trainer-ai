import type {
  ExerciseRole,
  ExperienceLevel,
  NormalizedTrainingProfile,
  SplitDefinition,
  TrainingEnvironment,
  TrainingGoal,
} from "./types";

type VolumeGuideline = {
  weeklySets: string;
  rir: string;
  failure: string;
  progression: string;
};

const VOLUME_BY_LEVEL: Record<ExperienceLevel, VolumeGuideline> = {
  beginner: {
    weeklySets: "6-10 serie settimanali per i gruppi principali",
    rir: "RIR 2-4",
    failure: "cedimento evitato o molto raro",
    progression: "progressione tecnica e doppia progressione conservativa",
  },
  intermediate: {
    weeklySets: "10-16 serie settimanali per i gruppi principali",
    rir: "RIR 1-3",
    failure: "cedimento solo su isolamenti o ultima serie selezionata",
    progression: "doppia progressione reps/carico",
  },
  advanced: {
    weeklySets: "12-20 serie settimanali per i gruppi principali",
    rir: "RIR 0-2 su esercizi selezionati",
    failure: "cedimento dosato, non sistematico",
    progression: "doppia progressione con autoregolazione",
  },
};

export function getGoalLabel(goal: TrainingGoal) {
  switch (goal) {
    case "hypertrophy":
      return "Ipertrofia";
    case "strength":
      return "Forza";
    case "fat_loss":
      return "Perdita di peso";
    case "recomposition":
      return "Ricomposizione";
    case "wellness":
      return "Benessere";
    default:
      return "Base";
  }
}

export function getEnvironmentLabel(environment: TrainingEnvironment) {
  switch (environment) {
    case "gym":
      return "Palestra";
    case "home":
      return "Casa";
    case "outdoor":
      return "Outdoor";
    case "mixed":
      return "Misto";
    default:
      return "Ambiente misto";
  }
}

export function getSplitDefinition(
  profile: NormalizedTrainingProfile
): SplitDefinition {
  const days = Math.max(2, Math.min(profile.daysPerWeek || 3, 6));

  switch (profile.goal) {
    case "strength":
      if (days >= 4) {
        return {
          key: "strength_upper_lower_4",
          label: "Upper/Lower forza",
          workoutCount: 4,
        };
      }

      return {
        key: "strength_full_body",
        label: days === 2 ? "Full Body A/B forza" : "Full Body forza 3x",
        workoutCount: Math.min(days, 3),
      };
    case "fat_loss":
      if (days >= 4) {
        return {
          key: "fat_loss_upper_lower_4",
          label: "Upper/Lower con cardio moderato",
          workoutCount: 4,
        };
      }

      return {
        key: "fat_loss_full_body",
        label: days === 2 ? "Full Body A/B" : "Full Body 3x",
        workoutCount: Math.min(Math.max(days, 2), 3),
      };
    case "wellness":
      return {
        key: "wellness_full_body",
        label: days <= 2 ? "Full Body benessere A/B" : "Full Body benessere 3x",
        workoutCount: Math.min(Math.max(days, 2), 3),
      };
    case "hypertrophy":
    case "recomposition":
    case "unknown":
    default:
      if (days <= 2) {
        return {
          key: "full_body_2",
          label: "Full Body A/B",
          workoutCount: 2,
        };
      }

      if (days === 3) {
        if (
          profile.experience === "beginner" ||
          profile.environment === "home" ||
          profile.goal === "unknown"
        ) {
          return {
            key: "full_body_3",
            label: "Full Body 3x",
            workoutCount: 3,
          };
        }

        return {
          key: "upper_lower_full",
          label: "Upper/Lower/Full Body",
          workoutCount: 3,
        };
      }

      if (days === 4) {
        return {
          key: "upper_lower_4",
          label: "Upper/Lower 4x",
          workoutCount: 4,
        };
      }

      if (days === 5) {
        return {
          key: "hybrid_5",
          label: "Push/Pull/Legs + Upper/Lower",
          workoutCount: 5,
        };
      }

      return {
        key:
          profile.experience === "beginner"
            ? "hybrid_5"
            : "ppl_6",
        label:
          profile.experience === "beginner"
            ? "Push/Pull/Legs + Upper/Lower"
            : "Push/Pull/Legs x2",
        workoutCount: profile.experience === "beginner" ? 5 : 6,
      };
  }
}

export function getVolumeGuideline(profile: NormalizedTrainingProfile) {
  return VOLUME_BY_LEVEL[profile.experience];
}

export function getRestSeconds(role: ExerciseRole) {
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

export function getPrescription(
  profile: NormalizedTrainingProfile,
  role: ExerciseRole
) {
  const goal = profile.goal;
  const level = profile.experience;

  if (role === "cardio") {
    return {
      sets: 1,
      reps: goal === "fat_loss" ? "12-20 min" : "10-15 min",
      intensity:
        goal === "fat_loss"
          ? "Cardio moderato, respirazione controllata"
          : "Cardio leggero/moderato",
      restSeconds: 0,
    };
  }

  if (role === "mobility") {
    return {
      sets: 2,
      reps: "45-60 sec",
      intensity: "Controllo e mobilita, senza dolore",
      restSeconds: getRestSeconds(role),
    };
  }

  if (role === "core") {
    return {
      sets: level === "advanced" ? 3 : 2,
      reps: "8-12 o 25-40 sec",
      intensity: level === "beginner" ? "RIR 3-4" : "RIR 2-3",
      restSeconds: getRestSeconds(role),
    };
  }

  if (goal === "strength") {
    if (role === "heavy_compound") {
      return {
        sets: level === "advanced" ? 5 : 4,
        reps: "4-6",
        intensity: level === "beginner" ? "RIR 3" : "RIR 1-2",
        restSeconds: 180,
      };
    }

    if (role === "compound") {
      return {
        sets: level === "advanced" ? 4 : 3,
        reps: "5-8",
        intensity: level === "beginner" ? "RIR 2-3" : "RIR 1-2",
        restSeconds: 150,
      };
    }

    if (role === "accessory") {
      return {
        sets: 2,
        reps: "6-10",
        intensity: "RIR 2",
        restSeconds: 90,
      };
    }

    return {
      sets: 2,
      reps: "8-12",
      intensity: "RIR 2-3",
      restSeconds: getRestSeconds(role),
    };
  }

  if (goal === "wellness") {
    if (role === "heavy_compound" || role === "compound") {
      return {
        sets: level === "beginner" ? 2 : 3,
        reps: "8-12",
        intensity: "RIR 3-4",
        restSeconds: 120,
      };
    }

    return {
      sets: 2,
      reps: role === "isolation" ? "12-15" : "10-12",
      intensity: "RIR 3",
      restSeconds: getRestSeconds(role),
    };
  }

  if (role === "heavy_compound") {
    return {
      sets:
        level === "beginner" ? 3 : level === "intermediate" ? 4 : 4,
      reps: goal === "hypertrophy" ? "6-10" : "5-8",
      intensity:
        level === "beginner"
          ? "RIR 3-4"
          : level === "intermediate"
            ? "RIR 2-3"
            : "RIR 1-2",
      restSeconds: goal === "fat_loss" ? 120 : 150,
    };
  }

  if (role === "compound") {
    return {
      sets:
        level === "beginner" ? 2 : level === "intermediate" ? 3 : 4,
      reps:
        goal === "hypertrophy" || goal === "recomposition" ? "8-12" : "6-10",
      intensity:
        level === "beginner"
          ? "RIR 2-4"
          : level === "intermediate"
            ? "RIR 1-3"
            : "RIR 1-2",
      restSeconds: getRestSeconds(role),
    };
  }

  if (role === "accessory") {
    return {
      sets: level === "advanced" ? 3 : 2,
      reps: "10-15",
      intensity: level === "beginner" ? "RIR 3" : "RIR 1-2",
      restSeconds: getRestSeconds(role),
    };
  }

  return {
    sets: level === "advanced" ? 3 : 2,
    reps: "10-15",
    intensity:
      level === "beginner"
        ? "RIR 2-3, niente cedimento"
        : "RIR 1-2, cedimento solo se selezionato",
    restSeconds: getRestSeconds(role),
  };
}

export function getProgramDisclaimer(profile: NormalizedTrainingProfile) {
  const volume = getVolumeGuideline(profile);

  return [
    "Programma creato sulla base delle tue risposte, del tuo obiettivo e della tua disponibilita.",
    `Obiettivo: ${getGoalLabel(profile.goal)}.`,
    `Frequenza prevista: ${profile.daysPerWeek} giorni a settimana.`,
    `Volume orientativo: ${volume.weeklySets}.`,
    `Intensita di riferimento: ${volume.rir}.`,
    "Usa una doppia progressione: quando completi il range alto di ripetizioni in tutte le serie con tecnica buona e il RIR previsto, aumenta leggermente il carico.",
    "Se non completi le ripetizioni o la tecnica peggiora, mantieni o riduci il carico.",
    `Intensita: ${volume.failure}.`,
    "Recuperi: 120-180 sec sui multiarticolari pesanti, 90-120 sec sui complementari, 60-90 sec sugli isolamenti, 30-60 sec su core e mobilita.",
    "I progressi registrati aiuteranno a leggere meglio l'andamento del percorso.",
  ].join("\n");
}
