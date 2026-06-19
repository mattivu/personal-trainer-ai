type ScenarioExpectation = {
  weeklyDays: number;
  acceptedSplitTypes: string[];
  focusMuscles?: string[];
  cardio: {
    minTouches: number;
    maxTouches: number;
    dominant?: boolean;
  };
  advancedTechniques: "none_intense" | "light_only" | "moderate" | "limited";
  equipmentMode: "home" | "gym" | "home_bodyweight_only";
  expectWarnings?: string[];
  limitation?: "knee";
  strengthBias?: boolean;
};

export type TrainingEngineQaScenario = {
  id: string;
  name: string;
  answers: Record<string, unknown>;
  expectations: ScenarioExpectation;
};

export const TRAINING_ENGINE_QA_SCENARIOS: TrainingEngineQaScenario[] = [
  {
    id: "A",
    name: "Beginner dimagrimento 3 giorni casa",
    answers: {
      obiettivoTraining: "dimagrimento",
      livelloEsperienza: "principiante",
      giorni: 3,
      tempoAllenamento: "45-60 min",
      luogo: "Casa",
      attrezzaturaDettagliata: ["Corpo libero", "Manubri", "Elastici"],
      recuperoAllenamenti: "medio",
      qualitaSonno: "buona",
      stress: "medio",
      preferenzaSplit: "Nessuna preferenza, decidi tu",
      preferenzeCardio: ["Camminata", "Bike/Cyclette"],
      attrezzaturaCardioDisponibile: [],
      tolleranzaCardio: "Media",
      tecnicheAvanzatePreferite: ["Non voglio tecniche avanzate"],
    },
    expectations: {
      weeklyDays: 3,
      acceptedSplitTypes: ["full_body", "upper_lower"],
      cardio: { minTouches: 1, maxTouches: 3 },
      advancedTechniques: "none_intense",
      equipmentMode: "home",
    },
  },
  {
    id: "B",
    name: "Intermediate massa 4 giorni palestra",
    answers: {
      obiettivoTraining: "massa muscolare",
      livelloEsperienza: "intermedio",
      giorni: 4,
      tempoAllenamento: "60-75 min",
      luogo: "Palestra",
      attrezzaturaDettagliata: ["Manubri", "Bilanciere", "Panca", "Rack", "Cavi", "Macchine", "Lat machine", "Leg press"],
      focusMuscolari: ["Petto alto", "Spalle laterali"],
      recuperoAllenamenti: "buono",
      qualitaSonno: "buona",
      stress: "medio-basso",
      preferenzeCardio: ["Camminata"],
      attrezzaturaCardioDisponibile: ["Tapis roulant", "Cyclette/bike"],
      tolleranzaCardio: "Alta",
      tecnicheAvanzatePreferite: ["Ok tecniche semplici", "Top set + back-off", "Superserie"],
    },
    expectations: {
      weeklyDays: 4,
      acceptedSplitTypes: ["upper_lower", "push_pull_legs", "ppl_upper_lower", "hybrid_specialization"],
      focusMuscles: ["Petto alto", "Spalle laterali"],
      cardio: { minTouches: 0, maxTouches: 2 },
      advancedTechniques: "light_only",
      equipmentMode: "gym",
    },
  },
  {
    id: "C",
    name: "Advanced bodybuilder 5 giorni palestra",
    answers: {
      obiettivoTraining: "massa muscolare",
      livelloEsperienza: "bodybuilder/utente esperto",
      giorni: 5,
      tempoAllenamento: "oltre 75 min",
      luogo: "Palestra",
      attrezzaturaDettagliata: ["Manubri", "Bilanciere", "Panca", "Rack", "Cavi", "Macchine", "Lat machine", "Leg press", "Pulley"],
      focusMuscolari: ["Braccia", "Spalle laterali", "Glutei"],
      recuperoAllenamenti: "buono",
      qualitaSonno: "buona",
      stress: "medio",
      preferenzeCardio: ["Camminata", "Bike/Cyclette"],
      attrezzaturaCardioDisponibile: ["Tapis roulant", "Cyclette/bike", "Stair climber"],
      tolleranzaCardio: "Alta",
      tecnicheAvanzatePreferite: ["Drop set", "Rest-pause", "Myo-reps", "Top set + back-off"],
    },
    expectations: {
      weeklyDays: 5,
      acceptedSplitTypes: ["push_pull_legs", "ppl_upper_lower", "body_part_split", "hybrid_specialization"],
      focusMuscles: ["Braccia", "Spalle laterali", "Glutei"],
      cardio: { minTouches: 0, maxTouches: 2 },
      advancedTechniques: "limited",
      equipmentMode: "gym",
    },
  },
  {
    id: "D",
    name: "Forza 3 giorni",
    answers: {
      obiettivoTraining: "forza",
      livelloEsperienza: "intermedio",
      giorni: 3,
      tempoAllenamento: "60-75 min",
      luogo: "Palestra",
      attrezzaturaDettagliata: ["Manubri", "Bilanciere", "Panca", "Rack", "Cavi", "Macchine"],
      recuperoAllenamenti: "buono",
      qualitaSonno: "buona",
      stress: "medio",
      preferenzeCardio: ["Camminata"],
      attrezzaturaCardioDisponibile: ["Tapis roulant"],
      tolleranzaCardio: "Media",
      tecnicheAvanzatePreferite: ["Top set + back-off"],
    },
    expectations: {
      weeklyDays: 3,
      acceptedSplitTypes: ["full_body", "upper_lower"],
      cardio: { minTouches: 0, maxTouches: 1 },
      advancedTechniques: "moderate",
      equipmentMode: "gym",
      strengthBias: true,
    },
  },
  {
    id: "E",
    name: "Ricomposizione 4 giorni",
    answers: {
      obiettivoTraining: "ricomposizione",
      livelloEsperienza: "intermedio",
      giorni: 4,
      tempoAllenamento: "60 min",
      luogo: "Palestra",
      attrezzaturaDettagliata: ["Manubri", "Bilanciere", "Panca", "Cavi", "Macchine"],
      recuperoAllenamenti: "medio",
      qualitaSonno: "buona",
      stress: "medio",
      preferenzeCardio: ["Camminata", "Bike/Cyclette"],
      attrezzaturaCardioDisponibile: ["Tapis roulant", "Cyclette/bike"],
      tolleranzaCardio: "Media",
      tecnicheAvanzatePreferite: ["Ok tecniche semplici", "Superserie"],
    },
    expectations: {
      weeklyDays: 4,
      acceptedSplitTypes: ["upper_lower", "full_body", "hybrid_specialization"],
      cardio: { minTouches: 1, maxTouches: 2 },
      advancedTechniques: "light_only",
      equipmentMode: "gym",
    },
  },
  {
    id: "F",
    name: "Recupero scarso / stress alto",
    answers: {
      obiettivoTraining: "massa muscolare",
      livelloEsperienza: "intermedio",
      giorni: 4,
      tempoAllenamento: "60 min",
      luogo: "Palestra",
      attrezzaturaDettagliata: ["Manubri", "Bilanciere", "Panca", "Cavi", "Macchine"],
      recuperoAllenamenti: "scarso",
      qualitaSonno: "pessima",
      stress: "alto stress",
      preferenzeCardio: ["Camminata"],
      attrezzaturaCardioDisponibile: ["Tapis roulant"],
      tolleranzaCardio: "Bassa",
      tecnicheAvanzatePreferite: ["Rest-pause", "Drop set", "Top set + back-off"],
    },
    expectations: {
      weeklyDays: 4,
      acceptedSplitTypes: ["upper_lower", "full_body", "hybrid_specialization"],
      cardio: { minTouches: 0, maxTouches: 2 },
      advancedTechniques: "light_only",
      equipmentMode: "gym",
      expectWarnings: ["recupero"],
    },
  },
  {
    id: "G",
    name: "Limitazione ginocchio",
    answers: {
      obiettivoTraining: "dimagrimento",
      livelloEsperienza: "intermedio",
      giorni: 3,
      tempoAllenamento: "45-60 min",
      luogo: "Palestra",
      attrezzaturaDettagliata: ["Manubri", "Bilanciere", "Panca", "Cavi", "Macchine", "Cyclette/bike"],
      recuperoAllenamenti: "medio",
      qualitaSonno: "buona",
      stress: "medio",
      doloriInfortuni: "fastidio al ginocchio destro",
      movimentiDaEvitare: "salti, affondi esplosivi",
      tolleranzaCardio: "Bassa per impatti",
      preferenzeCardio: ["Bike/Cyclette"],
      attrezzaturaCardioDisponibile: ["Cyclette/bike"],
      tecnicheAvanzatePreferite: ["Ok tecniche semplici"],
    },
    expectations: {
      weeklyDays: 3,
      acceptedSplitTypes: ["full_body", "upper_lower"],
      cardio: { minTouches: 1, maxTouches: 2 },
      advancedTechniques: "light_only",
      equipmentMode: "gym",
      expectWarnings: ["limitazioni"],
      limitation: "knee",
    },
  },
  {
    id: "H",
    name: "Solo casa senza attrezzi",
    answers: {
      obiettivoTraining: "salute/mantenimento",
      livelloEsperienza: "principiante",
      giorni: 3,
      tempoAllenamento: "30-45 min",
      luogo: "Casa",
      attrezzaturaDettagliata: ["Corpo libero"],
      recuperoAllenamenti: "medio",
      qualitaSonno: "buona",
      stress: "medio",
      preferenzeCardio: ["Camminata"],
      attrezzaturaCardioDisponibile: [],
      tolleranzaCardio: "Media",
      tecnicheAvanzatePreferite: ["Non voglio tecniche avanzate"],
    },
    expectations: {
      weeklyDays: 3,
      acceptedSplitTypes: ["full_body", "upper_lower"],
      cardio: { minTouches: 1, maxTouches: 3, dominant: false },
      advancedTechniques: "none_intense",
      equipmentMode: "home_bodyweight_only",
    },
  },
];
