"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppBottomNav } from "@/components/app-bottom-nav";
import {
  type SafetyResult,
  type SafetyStatus,
  validateOnboardingSafety,
} from "@/lib/onboarding-safety";

type BaseField = {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  showWhen?: {
    field: string;
    value: string;
  };
};

type Field =
  | (BaseField & {
      type: "text" | "date" | "number" | "textarea";
    })
  | (BaseField & {
      type: "select";
      options: string[];
    });

type Step = {
  id: string;
  title: string;
  description: string;
  fields: Field[];
};

type Answers = Record<string, string>;
type AnswersByStep = Record<string, Answers>;
type ApiResponse = {
  ok: boolean;
  message?: string;
  error?: string;
  safety?: SafetyResult;
};
type OnboardingFormProps = {
  initialAnswersByStep?: Partial<AnswersByStep>;
  onboardingStatus: string;
  userName: string | null;
};

const SAFETY_CODE_STATUS: Record<string, SafetyStatus> = {
  AGE_UNDER_14_BLOCKED: "blocked",
  TARGET_BMI_TOO_LOW: "blocked",
  CURRENT_UNDERWEIGHT_WEIGHT_LOSS_BLOCKED: "blocked",
  AGGRESSIVE_WEIGHT_LOSS_TIMELINE: "blocked",
  MINOR_RESTRICTED_MODE: "restricted",
  EATING_DISORDER_RISK: "restricted",
  MEDICAL_CONDITION_REQUIRES_PROFESSIONAL: "restricted",
};

const STEP_SAFETY_CODES: Partial<Record<string, string[]>> = {
  "dati-base": ["AGE_UNDER_14_BLOCKED"],
  obiettivo: [
    "TARGET_BMI_TOO_LOW",
    "CURRENT_UNDERWEIGHT_WEIGHT_LOSS_BLOCKED",
    "AGGRESSIVE_WEIGHT_LOSS_TIMELINE",
  ],
  limitazioni: [
    "EATING_DISORDER_RISK",
    "MEDICAL_CONDITION_REQUIRES_PROFESSIONAL",
  ],
};

const STATUS_RANK: Record<SafetyStatus, number> = {
  ok: 0,
  warning: 1,
  restricted: 2,
  blocked: 3,
};

const steps: Step[] = [
  {
    id: "dati-base",
    title: "Dati fisici",
    description: "I dati essenziali per definire il punto di partenza.",
    fields: [
      {
        name: "sesso",
        label: "Sesso",
        type: "select",
        required: true,
        options: ["Donna", "Uomo", "Altro", "Preferisco non indicarlo"],
      },
      {
        name: "dataNascita",
        label: "Data nascita",
        type: "date",
        required: true,
      },
      {
        name: "altezzaCm",
        label: "Altezza cm",
        type: "number",
        required: true,
        placeholder: "178",
      },
      {
        name: "pesoKg",
        label: "Peso attuale kg",
        type: "number",
        required: true,
        placeholder: "76",
      },
    ],
  },
  {
    id: "obiettivo",
    title: "Obiettivo e peso desiderato",
    description: "Priorita, direzione e orizzonte temporale realistico.",
    fields: [
      {
        name: "obiettivo",
        label: "Obiettivo principale",
        type: "select",
        required: true,
        options: [
          "Perdere peso",
          "Mantenere peso e migliorare composizione",
          "Aumentare massa muscolare",
          "Aumentare forza",
          "Migliorare benessere/energia",
          "Non lo so",
        ],
      },
      {
        name: "pesoObiettivoPresente",
        label: "Hai un peso obiettivo?",
        type: "select",
        options: ["Si", "No"],
      },
      {
        name: "pesoObiettivoKg",
        label: "Peso obiettivo kg",
        type: "number",
        placeholder: "70",
        showWhen: {
          field: "pesoObiettivoPresente",
          value: "Si",
        },
      },
      {
        name: "tempisticaDesiderata",
        label: "Tempistica desiderata",
        type: "select",
        options: [
          "Non ho fretta",
          "1-2 mesi",
          "3-6 mesi",
          "6-12 mesi",
          "Oltre 12 mesi",
        ],
      },
    ],
  },
  {
    id: "esperienza",
    title: "Esperienza allenamento",
    description: "Esperienza, continuita e familiarita con programmi strutturati.",
    fields: [
      {
        name: "esperienza",
        label: "Livello",
        type: "select",
        required: true,
        options: ["Principiante", "Intermedio", "Avanzato"],
      },
      {
        name: "tempoEsperienza",
        label: "Da quanto tempo ti alleni o ti sei allenato",
        type: "select",
        options: [
          "Mai o quasi mai",
          "Meno di 6 mesi",
          "6-12 mesi",
          "1-3 anni",
          "Oltre 3 anni",
          "A periodi alterni",
        ],
      },
      {
        name: "schedaStrutturata",
        label: "Hai mai seguito una scheda strutturata?",
        type: "select",
        options: ["Mai", "Si, per poco", "Si, per diversi mesi", "Si, spesso"],
      },
      {
        name: "sportPassati",
        label: "Sport o attivita praticate in passato",
        type: "textarea",
        placeholder: "Calcio, corsa, nuoto, palestra, arti marziali...",
      },
    ],
  },
  {
    id: "disponibilita",
    title: "Disponibilita e routine",
    description: "Quanto spazio reale puoi dedicare agli allenamenti.",
    fields: [
      {
        name: "giorni",
        label: "Giorni disponibili a settimana",
        type: "number",
        required: true,
        placeholder: "3",
      },
      {
        name: "tempoAllenamento",
        label: "Tempo realistico per allenamento",
        type: "select",
        options: [
          "20-30 minuti",
          "30-45 minuti",
          "45-60 minuti",
          "60-75 minuti",
          "Oltre 75 minuti",
        ],
      },
      {
        name: "giorniDifficili",
        label: "Giorni difficili per allenarsi",
        type: "text",
        placeholder: "Lunedi, weekend, turni variabili...",
      },
      {
        name: "orariPreferiti",
        label: "Orari preferiti",
        type: "select",
        options: ["Mattina", "Pranzo", "Pomeriggio", "Sera", "Variabile"],
      },
      {
        name: "routineRegolare",
        label: "Routine regolare",
        type: "select",
        options: [
          "Molto regolare",
          "Abbastanza",
          "Poco regolare",
          "Molto variabile",
        ],
      },
    ],
  },
  {
    id: "luogo-attrezzatura",
    title: "Luogo e attrezzatura",
    description: "Ambiente, strumenti disponibili e vincoli logistici.",
    fields: [
      {
        name: "luogo",
        label: "Luogo allenamento",
        type: "select",
        required: true,
        options: ["Casa", "Palestra", "Outdoor", "Misto"],
      },
      {
        name: "attrezzatura",
        label: "Attrezzatura disponibile",
        type: "textarea",
        placeholder: "Manubri, elastici, bilanciere, tappetino, macchine...",
      },
      {
        name: "accessoAttrezzatura",
        label: "Accesso a macchine/pesi/manubri/elastici/corpo libero",
        type: "textarea",
        placeholder: "Esempio: macchine e pesi in palestra, elastici a casa...",
      },
      {
        name: "limitiLogistici",
        label: "Note su spazio o limiti logistici",
        type: "textarea",
        placeholder: "Poco spazio, vicini, no salti, attrezzi condivisi...",
      },
    ],
  },
  {
    id: "attivita-quotidiana",
    title: "Attivita quotidiana",
    description: "Movimento e sedentarieta fuori dagli allenamenti.",
    fields: [
      {
        name: "situazionePrincipale",
        label: "Situazione principale",
        type: "select",
        options: [
          "Lavoro sedentario",
          "Lavoro in piedi/attivo",
          "Lavoro fisicamente pesante",
          "Studente",
          "Pensionato",
          "Disoccupato/in pausa",
          "Casalingo/casalinga",
          "Genitore a tempo pieno",
          "Altro",
        ],
      },
      {
        name: "oreSeduto",
        label: "Ore seduto al giorno",
        type: "select",
        options: ["Meno di 3", "3-5", "6-8", "Piu di 8"],
      },
      {
        name: "passiMedi",
        label: "Passi medi giornalieri",
        type: "select",
        options: [
          "Non lo so",
          "Meno di 3000",
          "3000-6000",
          "6000-10000",
          "Piu di 10000",
        ],
      },
      {
        name: "spostamenti",
        label: "Spostamenti",
        type: "select",
        options: [
          "Auto/mezzi",
          "Misto",
          "Cammino spesso",
          "Bici/spostamenti attivi",
        ],
      },
    ],
  },
  {
    id: "sonno-stress-energia",
    title: "Sonno, stress ed energia",
    description: "Fattori che influenzano recupero, costanza e carico sostenibile.",
    fields: [
      {
        name: "oreSonno",
        label: "Ore di sonno medie",
        type: "select",
        options: ["Meno di 5", "5-6", "6-7", "7-8", "Piu di 8"],
      },
      {
        name: "qualitaSonno",
        label: "Qualita del sonno",
        type: "select",
        options: ["Scarsa", "Sufficiente", "Buona", "Ottima", "Variabile"],
      },
      {
        name: "stanchezzaRisveglio",
        label: "Ti svegli spesso stanco?",
        type: "select",
        options: ["Si spesso", "A volte", "Raramente", "No"],
      },
      {
        name: "stress",
        label: "Livello stress",
        type: "select",
        options: ["Basso", "Medio", "Alto", "Molto alto"],
      },
      {
        name: "energiaMedia",
        label: "Livello energia medio",
        type: "select",
        options: ["Basso", "Medio-basso", "Medio", "Alto", "Variabile"],
      },
      {
        name: "recuperoAllenamenti",
        label: "Recupero tra allenamenti",
        type: "select",
        options: ["Male", "Abbastanza", "Bene", "Non lo so"],
      },
    ],
  },
  {
    id: "alimentazione-attuale",
    title: "Alimentazione attuale",
    description: "Abitudini utili per future stime indicative di calorie e macro.",
    fields: [
      {
        name: "alimentazioneAttuale",
        label: "Alimentazione attuale",
        type: "select",
        options: [
          "Molto disordinata",
          "Abbastanza disordinata",
          "Normale",
          "Abbastanza curata",
          "Molto curata",
        ],
      },
      {
        name: "pastiGiorno",
        label: "Pasti al giorno",
        type: "select",
        options: ["1-2", "3", "4", "5 o piu", "Variabile"],
      },
      {
        name: "colazione",
        label: "Fai colazione?",
        type: "select",
        options: ["Sempre", "Spesso", "Raramente", "Mai"],
      },
      {
        name: "fuoriCasa",
        label: "Mangi spesso fuori casa?",
        type: "select",
        options: [
          "Quasi mai",
          "1-2 volte a settimana",
          "3-5 volte a settimana",
          "Quasi ogni giorno",
        ],
      },
      {
        name: "cibiPronti",
        label: "Cibi pronti/delivery/fast food",
        type: "select",
        options: [
          "Quasi mai",
          "1 volta a settimana",
          "2-3 volte a settimana",
          "Spesso",
        ],
      },
      {
        name: "proteinePasti",
        label: "Fonte proteica nei pasti principali",
        type: "select",
        options: ["Quasi sempre", "A volte", "Raramente", "Non lo so"],
      },
      {
        name: "fruttaVerdura",
        label: "Porzioni frutta/verdura al giorno",
        type: "select",
        options: ["0-1", "2-3", "4-5", "Piu di 5"],
      },
      {
        name: "andamentoPeso",
        label: "Peso negli ultimi 3-6 mesi",
        type: "select",
        options: [
          "Aumentato",
          "Diminuito",
          "Stabile",
          "Oscillato molto",
          "Non lo so",
        ],
      },
    ],
  },
  {
    id: "preferenze-restrizioni-alimentari",
    title: "Preferenze e restrizioni alimentari",
    description: "Preferenze, esclusioni e abitudini da considerare in futuro.",
    fields: [
      {
        name: "restrizioniPreferenze",
        label: "Restrizioni/preferenze",
        type: "select",
        options: [
          "Nessuna",
          "Vegetariano",
          "Vegano",
          "Pescetariano",
          "Senza lattosio",
          "Senza glutine",
          "Halal",
          "Kosher",
          "Altro",
        ],
      },
      {
        name: "alimentiDaEvitare",
        label: "Alimenti da evitare o che non mangi",
        type: "textarea",
        placeholder: "Alimenti esclusi, gusti forti, ingredienti non graditi...",
      },
      {
        name: "intolleranzeAllergie",
        label: "Intolleranze o allergie dichiarate",
        type: "textarea",
        placeholder: "Inserisci solo informazioni che vuoi segnalare.",
      },
      {
        name: "alcolici",
        label: "Alcolici",
        type: "select",
        options: ["Mai", "Raramente", "1-2 volte a settimana", "3+ volte a settimana"],
      },
      {
        name: "drinkCalorici",
        label: "Bibite zuccherate/succhi/drink calorici",
        type: "select",
        options: ["Mai/quasi mai", "A volte", "Spesso", "Ogni giorno"],
      },
      {
        name: "snack",
        label: "Snack fuori pasto",
        type: "select",
        options: [
          "No",
          "1 volta al giorno",
          "Piu volte al giorno",
          "Soprattutto la sera",
        ],
      },
    ],
  },
  {
    id: "tracking-calorie-macro",
    title: "Tracking calorie e macro",
    description: "Disponibilita e livello di dettaglio per un eventuale tracking futuro.",
    fields: [
      {
        name: "conteggioCalorieMacro",
        label: "Hai mai contato calorie o macro?",
        type: "select",
        options: [
          "Mai",
          "Si per poco",
          "Si per diversi mesi",
          "Si lo faccio gia",
        ],
      },
      {
        name: "stimaQuantita",
        label: "Sai stimare le quantita?",
        type: "select",
        options: ["No", "Piu o meno", "Si abbastanza bene"],
      },
      {
        name: "registrarePasti",
        label: "Disponibilita a registrare i pasti",
        type: "select",
        options: [
          "Non voglio",
          "Solo ogni tanto",
          "3-4 giorni a settimana",
          "Tutti i giorni",
          "Solo per periodo iniziale",
        ],
      },
      {
        name: "preferenzaTracking",
        label: "Preferenza tracking",
        type: "select",
        options: [
          "Molto semplice e veloce",
          "Abbastanza preciso",
          "Dettagliato con quantita e macro",
        ],
      },
      {
        name: "interesseNutrizione",
        label: "Interesse principale nutrizione",
        type: "select",
        options: [
          "Capire quanto mangio",
          "Perdere peso",
          "Aumentare massa",
          "Migliorare qualita alimentare",
          "Avere piu energia",
          "Non lo so",
        ],
      },
    ],
  },
  {
    id: "limitazioni",
    title: "Sicurezza, dolori e limitazioni",
    description: "Informazioni per evitare proposte inadatte o poco sostenibili.",
    fields: [
      {
        name: "disturboAlimentare",
        label:
          "Hai mai avuto o ti e mai stato diagnosticato un disturbo alimentare?",
        type: "select",
        options: ["Si", "No", "Preferisco non rispondere"],
      },
      {
        name: "pauraAumentoPeso",
        label: "Hai paura intensa di aumentare peso?",
        type: "select",
        options: ["Si", "No", "Preferisco non rispondere"],
      },
      {
        name: "saltoPastiCompensazione",
        label:
          "Ti capita spesso di saltare pasti volontariamente per compensare cio che mangi?",
        type: "select",
        options: ["Si", "No", "Preferisco non rispondere"],
      },
      {
        name: "condizioniMedicheRilevanti",
        label:
          "Hai condizioni mediche rilevanti, problemi cardiaci, pressione alta non controllata, diabete, gravidanza, infortuni importanti o indicazioni mediche specifiche?",
        type: "select",
        options: ["Si", "No", "Preferisco non rispondere"],
      },
      {
        name: "doloriInfortuni",
        label: "Dolori/fastidi ricorrenti",
        type: "textarea",
        placeholder: "No, schiena, collo, spalle, gomiti, polsi, anche, ginocchia...",
      },
      {
        name: "intensitaFastidio",
        label: "Intensita fastidio",
        type: "select",
        options: ["Lieve", "Medio", "Forte", "Non saprei"],
      },
      {
        name: "movimentiDaEvitare",
        label: "Movimenti da evitare",
        type: "textarea",
        placeholder: "Squat, affondi, corsa, salti, piegamenti, sopra la testa...",
      },
      {
        name: "infortuniLimitazioni",
        label: "Infortuni o limitazioni da segnalare",
        type: "textarea",
        placeholder: "Interventi, indicazioni ricevute, limitazioni note...",
      },
      {
        name: "eserciziDaEvitare",
        label: "Esercizi che sai gia non essere adatti",
        type: "textarea",
        placeholder: "Esercizi o movimenti che vuoi evitare.",
      },
    ],
  },
  {
    id: "preferenze-allenamento",
    title: "Preferenze allenamento e ostacoli",
    description: "Cosa ti aiuta a essere costante e cosa ti ha frenato in passato.",
    fields: [
      {
        name: "tipoAllenamentoPreferito",
        label: "Tipo allenamento preferito",
        type: "select",
        options: [
          "Pesi/macchine",
          "Corpo libero",
          "Cardio",
          "Breve e intenso",
          "Tranquillo",
          "Mix",
          "Non lo so",
        ],
      },
      {
        name: "attivitaPiacciono",
        label: "Esercizi/attivita che piacciono",
        type: "textarea",
        placeholder: "Esercizi, sport o formati che ti motivano.",
      },
      {
        name: "attivitaNonPiacciono",
        label: "Esercizi/attivita che non piacciono",
        type: "textarea",
        placeholder: "Esercizi o formati che eviteresti volentieri.",
      },
      {
        name: "ostacoloPrincipale",
        label: "Ostacolo principale in passato",
        type: "select",
        options: [
          "Tempo",
          "Costanza",
          "Schede troppo difficili",
          "Noia",
          "Dolori",
          "Mancanza risultati",
          "Non sapere cosa fare",
          "Altro",
        ],
      },
      {
        name: "allenamentiRipetitiviVariati",
        label: "Preferisci allenamenti ripetitivi o variati?",
        type: "select",
        options: ["Ripetitivi", "Variati", "Mix"],
      },
    ],
  },
  {
    id: "motivazione",
    title: "Motivazione finale",
    description: "Motivo personale, aspettative e livello di guida desiderato.",
    fields: [
      {
        name: "perche",
        label: "Motivo principale per iniziare",
        type: "textarea",
        placeholder: "Energia, salute, estetica, performance, routine...",
      },
      {
        name: "risultatoDesiderato",
        label: "Risultato desiderato nei prossimi mesi",
        type: "textarea",
        placeholder: "Cosa vorresti ottenere concretamente.",
      },
      {
        name: "motivazione",
        label: "Quanto ti senti motivato da 1 a 5",
        type: "select",
        options: ["1", "2", "3", "4", "5"],
      },
      {
        name: "livelloGuida",
        label: "Quanto vuoi essere guidato?",
        type: "select",
        options: [
          "Molto",
          "Abbastanza",
          "Poco",
          "Solo indicazioni essenziali",
        ],
      },
      {
        name: "noteFinali",
        label: "Note finali libere",
        type: "textarea",
        placeholder: "Qualsiasi informazione utile da aggiungere.",
      },
    ],
  },
];

function isFieldVisible(field: Field, answers: Answers) {
  if (!field.showWhen) {
    return true;
  }

  return answers[field.showWhen.field] === field.showWhen.value;
}

function getVisibleFields(step: Step, answers: Answers) {
  return step.fields.filter((field) => isFieldVisible(field, answers));
}

function getFlattenedAnswers(answersByStep: AnswersByStep) {
  return Object.values(answersByStep).reduce<Record<string, unknown>>(
    (allAnswers, stepAnswers) => ({
      ...allAnswers,
      ...stepAnswers,
    }),
    {}
  );
}

function getInitialAnswers(initialAnswersByStep: Partial<AnswersByStep> = {}) {
  return steps.reduce<AnswersByStep>((accumulator, step) => {
    const savedAnswers = initialAnswersByStep[step.id] ?? {};

    accumulator[step.id] = step.fields.reduce<Answers>((fields, field) => {
      fields[field.name] = savedAnswers[field.name] ?? "";
      return fields;
    }, {});

    return accumulator;
  }, {});
}

function getInitialStepIndex(
  onboardingStatus: string,
  initialAnswersByStep: Partial<AnswersByStep>
) {
  if (onboardingStatus === "completed") {
    return 0;
  }

  const firstMissingStepIndex = steps.findIndex(
    (step) => !initialAnswersByStep[step.id]
  );

  return firstMissingStepIndex === -1 ? steps.length - 1 : firstMissingStepIndex;
}

function filterSafetyResultByCodes(
  result: SafetyResult,
  allowedCodes: string[] | undefined
) {
  if (!allowedCodes?.length) {
    return null;
  }

  const filteredCodes = result.codes.filter((code) => allowedCodes.includes(code));

  if (filteredCodes.length === 0) {
    return null;
  }

  const messageByCode = result.codes.reduce<Record<string, string>>(
    (accumulator, code, index) => {
      accumulator[code] = result.messages[index] ?? code;
      return accumulator;
    },
    {}
  );

  const status = filteredCodes.reduce<SafetyStatus>(
    (currentStatus, code) =>
      STATUS_RANK[SAFETY_CODE_STATUS[code] ?? "ok"] > STATUS_RANK[currentStatus]
        ? SAFETY_CODE_STATUS[code] ?? "ok"
        : currentStatus,
    "ok"
  );

  return {
    status,
    codes: filteredCodes,
    messages: filteredCodes.map((code) => messageByCode[code]),
  } satisfies SafetyResult;
}

async function parseApiResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const data = (await response.json()) as ApiResponse;

    return {
      data,
      message: data.message ?? data.error,
    };
  }

  const text = (await response.text()).trim();

  return {
    data: null,
    message: text
      ? `Il server ha restituito una risposta non valida: ${text}`
      : "Il server ha restituito una risposta non valida.",
  };
}

export function OnboardingForm({
  initialAnswersByStep = {},
  onboardingStatus,
  userName,
}: OnboardingFormProps) {
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(() =>
    getInitialStepIndex(onboardingStatus, initialAnswersByStep)
  );
  const [answersByStep, setAnswersByStep] = useState<AnswersByStep>(() =>
    getInitialAnswers(initialAnswersByStep)
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [safetyResult, setSafetyResult] = useState<SafetyResult | null>(null);

  const currentStep = steps[currentStepIndex];
  const currentAnswers = answersByStep[currentStep.id];
  const visibleFields = getVisibleFields(currentStep, currentAnswers);
  const isLastStep = currentStepIndex === steps.length - 1;
  const isCompleted = onboardingStatus === "completed";
  const flattenedAnswers = useMemo(
    () => getFlattenedAnswers(answersByStep),
    [answersByStep]
  );
  const liveSafetyResult = useMemo(
    () => validateOnboardingSafety(flattenedAnswers),
    [flattenedAnswers]
  );
  const currentStepSafetyResult = useMemo(
    () =>
      filterSafetyResultByCodes(
        liveSafetyResult,
        STEP_SAFETY_CODES[currentStep.id]
      ),
    [currentStep.id, liveSafetyResult]
  );
  const shouldBlockCurrentStep =
    (currentStep.id === "dati-base" || currentStep.id === "obiettivo") &&
    currentStepSafetyResult?.status === "blocked";
  const previewSafetyResult = isLastStep ? liveSafetyResult : null;
  const displayedSafetyResult =
    currentStepSafetyResult ??
    (isLastStep && previewSafetyResult && previewSafetyResult.codes.length > 0
      ? previewSafetyResult
      : safetyResult);
  const progress = useMemo(
    () => Math.round(((currentStepIndex + 1) / steps.length) * 100),
    [currentStepIndex]
  );

  function updateAnswer(fieldName: string, value: string) {
    setMessage(null);
    setSafetyResult(null);
    setAnswersByStep((current) => ({
      ...current,
      [currentStep.id]: {
        ...current[currentStep.id],
        [fieldName]: value,
      },
    }));
  }

  function validateCurrentStep() {
    const missingField = visibleFields.find(
      (field) => field.required && !currentAnswers[field.name]?.trim()
    );

    if (missingField) {
      return `Completa il campo obbligatorio: ${missingField.label}.`;
    }

    return null;
  }

  async function saveCurrentStep() {
    const response = await fetch("/api/onboarding/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        step: currentStep.id,
        answers: currentAnswers,
      }),
    });

    const { data, message } = await parseApiResponse(response);

    if (data?.safety) {
      setSafetyResult(data.safety);
    }

    if (!response.ok || !data?.ok) {
      throw new Error(message ?? "Errore durante il salvataggio.");
    }
  }

  async function completeOnboarding() {
    const response = await fetch("/api/onboarding/complete", {
      method: "POST",
    });

    const { data, message } = await parseApiResponse(response);

    if (!response.ok || !data?.ok) {
      if (data?.safety) {
        setSafetyResult(data.safety);
      }

      throw new Error(message ?? "Errore durante il completamento.");
    }

    if (data?.safety) {
      setSafetyResult(data.safety);
    }

    return data;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const validationMessage = validateCurrentStep();

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setLoading(true);

    try {
      await saveCurrentStep();

      if (isLastStep) {
        const nextSafetyResult = liveSafetyResult;

        setSafetyResult(nextSafetyResult);

        if (nextSafetyResult.status === "blocked") {
          return;
        }

        await completeOnboarding();
        router.push("/dashboard");
        router.refresh();
        return;
      }

      if (shouldBlockCurrentStep) {
        setSafetyResult(currentStepSafetyResult);
        setMessage(
          "Correggi le informazioni segnalate nel controllo di sicurezza per continuare."
        );
        return;
      }

      setCurrentStepIndex((index) => index + 1);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Errore di connessione. Riprova."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-10 pb-28 text-white">
      <section className="mx-auto w-full max-w-4xl">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-sm uppercase tracking-[0.3em] text-neutral-500">
              Personal Trainer AI
            </p>
            <h1 className="text-3xl font-bold">
              {isCompleted
                ? "Aggiorna il tuo questionario"
                : "Prima di creare il tuo percorso, conosciamoti meglio"}
            </h1>
            <p className="mt-3 max-w-2xl text-neutral-400">
              {isCompleted
                ? "Hai gia completato il questionario. Puoi aggiornare le risposte e salvare di nuovo il percorso."
                : `${userName ? `${userName}, ` : ""}rispondi alle domande essenziali per preparare un percorso piu adatto al tuo contesto.`}
            </p>
            <p className="mt-4 max-w-2xl rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Le informazioni nutrizionali saranno usate solo per stime
              indicative e consigli generali, non per creare diete mediche.
            </p>
          </div>

          <div className="text-sm text-neutral-400">
            Step {currentStepIndex + 1} di {steps.length}
          </div>
        </div>

        <div className="mb-8 h-2 overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">{currentStep.title}</h2>
            <p className="mt-2 text-neutral-400">{currentStep.description}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {visibleFields.map((field) => (
                <label
                  key={field.name}
                  className={field.type === "textarea" ? "sm:col-span-2" : ""}
                >
                  <span className="mb-2 block text-sm text-neutral-300">
                    {field.label}
                    {field.required && (
                      <span className="text-amber-300"> *</span>
                    )}
                  </span>

                  {field.type === "select" ? (
                    <select
                      value={currentAnswers[field.name]}
                      onChange={(event) =>
                        updateAnswer(field.name, event.target.value)
                      }
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
                    >
                      <option value="">Seleziona</option>
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      value={currentAnswers[field.name]}
                      onChange={(event) =>
                        updateAnswer(field.name, event.target.value)
                      }
                      className="min-h-32 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <input
                      value={currentAnswers[field.name]}
                      onChange={(event) =>
                        updateAnswer(field.name, event.target.value)
                      }
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
                      placeholder={field.placeholder}
                      type={field.type}
                    />
                  )}
                </label>
              ))}
            </div>

            <p className="text-sm text-neutral-500">* Campo obbligatorio</p>

            {displayedSafetyResult && displayedSafetyResult.codes.length > 0 && (
              <div
                className={`rounded-xl border px-4 py-4 text-sm ${
                  displayedSafetyResult.status === "blocked"
                    ? "border-red-800 bg-red-950 text-red-100"
                    : displayedSafetyResult.status === "restricted"
                      ? "border-amber-700 bg-amber-950/60 text-amber-100"
                      : "border-yellow-700 bg-yellow-950/50 text-yellow-100"
                }`}
              >
                <h3 className="text-base font-semibold">Controllo di sicurezza</h3>
                <div className="mt-3 space-y-2">
                  {displayedSafetyResult.messages.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>

                {displayedSafetyResult.status === "blocked" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMessage(null);
                      setSafetyResult(null);
                      setCurrentStepIndex((index) => Math.max(index - 1, 0));
                    }}
                    className="mt-4 rounded-xl border border-red-700 px-4 py-2 font-semibold text-red-50"
                  >
                    Torna agli step precedenti
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                disabled={loading || currentStepIndex === 0}
                onClick={() => {
                  setMessage(null);
                  setSafetyResult(null);
                  setCurrentStepIndex((index) => index - 1);
                }}
                className="rounded-xl border border-neutral-700 px-5 py-3 font-semibold text-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Indietro
              </button>

              <button
                disabled={loading}
                className="rounded-xl bg-white px-5 py-3 font-semibold text-neutral-950 disabled:opacity-50"
              >
                {loading
                  ? "Salvataggio..."
                  : isLastStep
                    ? "Completa e vai alla dashboard"
                    : "Salva e continua"}
              </button>
            </div>
          </form>

          {message && (
            <div className="mt-6 rounded-xl border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">
              {message}
            </div>
          )}
        </div>
      </section>

      <AppBottomNav />
    </main>
  );
}
