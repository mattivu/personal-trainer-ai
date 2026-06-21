"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppBottomNav } from "@/components/app-bottom-nav";
import {
  type SafetyResult,
  type SafetyStatus,
  validateOnboardingSafety,
} from "@/lib/onboarding-safety";

type AnswerValue = string | string[];
type Answers = Record<string, AnswerValue>;
type AnswersByStep = Record<string, Answers>;

type Option = {
  label: string;
  value: string;
};

type BaseField = {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  helpText?: string;
  showWhen?: {
    field: string;
    value: string;
  };
  initialValue?: AnswerValue;
  fullWidth?: boolean;
};

type Field =
  | (BaseField & {
      type: "text" | "date" | "number" | "textarea";
    })
  | (BaseField & {
      type: "select";
      options: Option[];
    })
  | (BaseField & {
      type: "multiselect";
      options: Option[];
      maxSelections?: number;
      exclusiveOption?: string;
    });

type Step = {
  id: string;
  title: string;
  description: string;
  fields: Field[];
};

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

const option = (value: string, label = value): Option => ({
  label,
  value,
});

const GOAL_OPTIONS = [
  option("Massa muscolare"),
  option("Forza"),
  option("Dimagrimento"),
  option("Ricomposizione"),
  option("Performance atletica"),
  option("Salute/mantenimento"),
  option("Mobilita/postura"),
  option("Altro"),
];

const EXPERIENCE_OPTIONS = [
  option("Principiante assoluto"),
  option("Principiante con esperienza"),
  option("Intermedio"),
  option("Avanzato"),
  option("Bodybuilder/utente esperto"),
];

const SPLIT_OPTIONS = [
  option("Nessuna preferenza, decidi tu"),
  option("Full body"),
  option("Upper/lower"),
  option("Push/pull/legs"),
  option("Monofrequenza"),
  option("Multifrequenza"),
  option("Focus su gruppo carente"),
  option("Non so"),
];

const FOCUS_OPTIONS = [
  option("Petto"),
  option("Petto alto"),
  option("Dorso ampiezza"),
  option("Dorso spessore"),
  option("Spalle laterali"),
  option("Deltoidi posteriori"),
  option("Braccia"),
  option("Quadricipiti"),
  option("Femorali"),
  option("Glutei"),
  option("Polpacci"),
  option("Core"),
  option("Mobilita"),
  option("Postura"),
  option("Nessuno"),
];

const EQUIPMENT_OPTIONS = [
  option("Corpo libero"),
  option("Manubri"),
  option("Bilanciere"),
  option("Panca"),
  option("Rack"),
  option("Cavi"),
  option("Macchine"),
  option("Leg press"),
  option("Lat machine"),
  option("Pulley"),
  option("Sbarra trazioni"),
  option("Elastici"),
  option("Kettlebell"),
  option("TRX/anelli"),
  option("Tapis roulant"),
  option("Cyclette/bike"),
  option("Vogatore"),
  option("Stair climber"),
  option("Box/CrossFit"),
  option("Sled/slitta"),
  option("Corda climbing"),
  option("Attrezzatura strongman"),
  option("Parete arrampicata/Boulder"),
  option("Altro"),
];

const CARDIO_OPTIONS = [
  option("Camminata"),
  option("Corsa"),
  option("Bike/Cyclette"),
  option("Vogatore"),
  option("Tapis roulant inclinato"),
  option("Stair climber"),
  option("HIIT"),
  option("Circuiti"),
  option("Sport"),
];

const ADVANCED_TECHNIQUE_OPTIONS = [
  option("Non voglio tecniche avanzate"),
  option("Ok tecniche semplici"),
  option("Rest-pause"),
  option("Drop set"),
  option("Superserie"),
  option("Myo-reps"),
  option("Top set + back-off"),
  option("Cluster"),
  option("Tempo controllato"),
  option("Stripping/metaboliche"),
  option("Decidi tu"),
];

const NUTRITION_DIFFICULTY_OPTIONS = [
  option("Weekend"),
  option("Fame serale"),
  option("Fuori casa"),
  option("Dolci/snack"),
  option("Poca proteina"),
];

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
        options: [
          option("Donna"),
          option("Uomo"),
          option("Altro"),
          option("Preferisco non indicarlo"),
        ],
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
    title: "Obiettivo principale",
    description:
      "Definiamo direzione, urgenza e aspettative realistiche del percorso.",
    fields: [
      {
        name: "obiettivoTraining",
        label: "Obiettivo allenamento",
        type: "select",
        required: true,
        options: GOAL_OPTIONS,
        helpText: "Questa scelta aiutera a definire la direzione del programma.",
      },
      {
        name: "intensitaObiettivo",
        label: "Approccio desiderato",
        type: "select",
        required: true,
        options: [
          option("Conservativo"),
          option("Moderato"),
          option("Aggressivo solo se sicuro"),
        ],
        helpText: "Le indicazioni prudenziali restano prioritarie.",
      },
      {
        name: "pesoObiettivoPresente",
        label: "Hai un peso obiettivo?",
        type: "select",
        options: [option("Si"), option("No")],
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
          option("Non ho fretta"),
          option("1-2 mesi"),
          option("3-6 mesi"),
          option("6-12 mesi"),
          option("Oltre 12 mesi"),
        ],
      },
      {
        name: "risultatoDesiderato",
        label: "Cosa vuoi ottenere in concreto",
        type: "textarea",
        placeholder:
          "Esempio: piu massa su petto e spalle, piu forza nei fondamentali, perdere 6 kg...",
        fullWidth: true,
      },
    ],
  },
  {
    id: "esperienza",
    title: "Livello reale",
    description:
      "Serve per calibrare volume, esercizi, progressione e tecniche utilizzabili.",
    fields: [
      {
        name: "livelloEsperienza",
        label: "Come ti descriveresti oggi",
        type: "select",
        required: true,
        options: EXPERIENCE_OPTIONS,
      },
      {
        name: "tempoEsperienza",
        label: "Da quanto ti alleni",
        type: "select",
        options: [
          option("Mai o quasi mai"),
          option("Meno di 6 mesi"),
          option("6-12 mesi"),
          option("1-3 anni"),
          option("Oltre 3 anni"),
          option("A periodi alterni"),
        ],
      },
      {
        name: "schedaStrutturata",
        label: "Hai mai seguito una programmazione strutturata?",
        type: "select",
        options: [
          option("Mai"),
          option("Si, per poco"),
          option("Si, per diversi mesi"),
          option("Si, spesso"),
        ],
      },
      {
        name: "conosceRirRpe",
        label: "Sai usare RIR o RPE?",
        type: "select",
        options: [
          option("No"),
          option("Ne ho sentito parlare"),
          option("Si, abbastanza"),
          option("Si, bene"),
        ],
      },
      {
        name: "conosceTecnicheAvanzate",
        label: "Conosci tecniche avanzate come drop set o rest-pause?",
        type: "select",
        options: [
          option("No"),
          option("Solo di nome"),
          option("Si, qualcuna"),
          option("Si, le uso gia"),
        ],
      },
      {
        name: "sportPassati",
        label: "Sport o attivita praticate in passato",
        type: "textarea",
        placeholder: "Calcio, corsa, nuoto, palestra, arti marziali...",
        fullWidth: true,
      },
    ],
  },
  {
    id: "disponibilita",
    title: "Frequenza e recupero",
    description:
      "Questa parte aiuta a stimare frequenza sostenibile, recupero e giorni utili.",
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
        label: "Durata media seduta",
        type: "select",
        options: [
          option("20-30 minuti"),
          option("30-45 minuti"),
          option("45-60 minuti"),
          option("60-75 minuti"),
          option("Oltre 75 minuti"),
        ],
      },
      {
        name: "giorniConsecutiviPossibili",
        label: "Quanti giorni consecutivi riesci a fare",
        type: "select",
        options: [
          option("1"),
          option("2"),
          option("3"),
          option("4 o piu"),
          option("Variabile"),
        ],
      },
      {
        name: "preferenzaRiposo",
        label: "Preferenza giorni di riposo",
        type: "select",
        options: [
          option("Nessuna preferenza"),
          option("Weekend liberi"),
          option("Mettere pausa a meta settimana"),
          option("Evitare troppi giorni consecutivi"),
          option("Variabile"),
        ],
      },
      {
        name: "orariPreferiti",
        label: "Orari preferiti",
        type: "select",
        options: [
          option("Mattina"),
          option("Pranzo"),
          option("Pomeriggio"),
          option("Sera"),
          option("Variabile"),
        ],
      },
      {
        name: "routineRegolare",
        label: "Routine regolare",
        type: "select",
        options: [
          option("Molto regolare"),
          option("Abbastanza"),
          option("Poco regolare"),
          option("Molto variabile"),
        ],
      },
      {
        name: "qualitaSonno",
        label: "Qualita del sonno",
        type: "select",
        options: [
          option("Scarsa"),
          option("Sufficiente"),
          option("Buona"),
          option("Ottima"),
          option("Variabile"),
        ],
      },
      {
        name: "stress",
        label: "Livello stress",
        type: "select",
        options: [
          option("Basso"),
          option("Medio"),
          option("Alto"),
          option("Molto alto"),
        ],
      },
      {
        name: "recuperoAllenamenti",
        label: "Recupero percepito",
        type: "select",
        options: [
          option("Male"),
          option("Abbastanza"),
          option("Bene"),
          option("Non lo so"),
        ],
      },
    ],
  },
  {
    id: "split-focus",
    title: "Split e focus",
    description:
      "La preferenza non e una regola assoluta, ma ci aiuta a costruire un programma piu adatto a te.",
    fields: [
      {
        name: "preferenzaSplit",
        label: "Preferenza split",
        type: "select",
        required: true,
        options: SPLIT_OPTIONS,
        helpText: "Se necessario, questa scelta verra adattata per mantenere il programma equilibrato.",
      },
      {
        name: "focusMuscolari",
        label: "Focus prioritari",
        type: "multiselect",
        options: FOCUS_OPTIONS,
        maxSelections: 3,
        exclusiveOption: "Nessuno",
        helpText: "Seleziona fino a 3 priorita.",
        fullWidth: true,
      },
      {
        name: "focusMuscolariNote",
        label: "C'e qualcosa che vuoi migliorare in particolare?",
        type: "textarea",
        placeholder: "Esempio: petto alto, postura scapole, femorali, mobilita caviglie...",
        fullWidth: true,
      },
    ],
  },
  {
    id: "luogo-attrezzatura",
    title: "Luogo e attrezzatura",
    description:
      "Indica in modo esplicito cosa hai davvero a disposizione per filtrare meglio gli esercizi.",
    fields: [
      {
        name: "luogo",
        label: "Luogo allenamento",
        type: "select",
        required: true,
        options: [
          option("Casa"),
          option("Palestra"),
          option("Outdoor"),
          option("Misto"),
        ],
      },
      {
        name: "attrezzaturaDettagliata",
        label: "Attrezzatura disponibile",
        type: "multiselect",
        options: EQUIPMENT_OPTIONS,
        helpText: "Seleziona tutto quello che puoi usare con continuita.",
        fullWidth: true,
      },
      {
        name: "limitiLogistici",
        label: "Note su spazio o limiti logistici",
        type: "textarea",
        placeholder: "Poco spazio, no rumore, no salti, attrezzi condivisi, tempi stretti...",
        fullWidth: true,
      },
    ],
  },
  {
    id: "cardio-conditioning",
    title: "Cardio e conditioning",
    description:
      "Raccogliamo il minimo utile per capire volume cardio, impatto e preferenze pratiche.",
    fields: [
      {
        name: "cardioAttuale",
        label: "Quanto cardio fai oggi",
        type: "select",
        options: [
          option("Mai"),
          option("Poco"),
          option("1-2 volte"),
          option("3+ volte"),
        ],
      },
      {
        name: "preferenzeCardio",
        label: "Preferenze cardio",
        type: "multiselect",
        options: CARDIO_OPTIONS,
        fullWidth: true,
      },
      {
        name: "attrezzaturaCardioDisponibile",
        label: "Attrezzatura cardio disponibile",
        type: "multiselect",
        options: CARDIO_OPTIONS,
        helpText: "Se non hai macchine, lascia solo cio che puoi fare davvero.",
        fullWidth: true,
      },
      {
        name: "passiGiornalieriIndicativi",
        label: "Passi giornalieri indicativi",
        type: "select",
        options: [
          option("Non lo so"),
          option("Meno di 3000"),
          option("3000-6000"),
          option("6000-10000"),
          option("Piu di 10000"),
        ],
      },
      {
        name: "preferenzaTimingCardio",
        label: "Quando preferisci fare cardio",
        type: "select",
        options: [
          option("Dopo i pesi"),
          option("In giorni separati"),
          option("Nessuna preferenza"),
        ],
      },
      {
        name: "tolleranzaCardio",
        label: "Tolleranza intensita",
        type: "select",
        options: [
          option("Basso impatto"),
          option("Normale"),
          option("Alta intensita"),
        ],
      },
      {
        name: "obiettivoCardio",
        label: "Obiettivo cardio",
        type: "select",
        options: [
          option("Salute"),
          option("Dimagrimento"),
          option("Fiato"),
          option("Performance"),
          option("Recupero"),
          option("Non so"),
        ],
      },
    ],
  },
  {
    id: "tecniche-avanzate",
    title: "Tecniche avanzate",
    description:
      "Le useremo solo se coerenti con livello, obiettivo e recupero.",
    fields: [
      {
        name: "tecnicheAvanzatePreferite",
        label: "Preferenze su tecniche avanzate",
        type: "multiselect",
        options: ADVANCED_TECHNIQUE_OPTIONS,
        exclusiveOption: "Non voglio tecniche avanzate",
        fullWidth: true,
      },
      {
        name: "noteTecnicheAvanzate",
        label: "Note tecniche opzionali",
        type: "textarea",
        placeholder: "Esempio: ok top set, no drop set su gambe, bene superserie corte...",
        fullWidth: true,
      },
    ],
  },
  {
    id: "preferenze-esercizi",
    title: "Preferenze esercizi",
    description:
      "Qui raccogliamo segnali pratici su esercizi graditi, fastidi e priorita di esecuzione.",
    fields: [
      {
        name: "tipoAllenamentoPreferito",
        label: "Formato allenamento che ti piace di piu",
        type: "select",
        options: [
          option("Pesi/macchine"),
          option("Corpo libero"),
          option("Cardio"),
          option("Breve e intenso"),
          option("Tranquillo"),
          option("Mix"),
          option("Non lo so"),
        ],
      },
      {
        name: "eserciziPreferiti",
        label: "Esercizi preferiti",
        type: "textarea",
        placeholder: "Esempio: panca inclinata, rematore chest supported, hack squat...",
        fullWidth: true,
      },
      {
        name: "eserciziDaEvitare",
        label: "Esercizi da evitare",
        type: "textarea",
        placeholder: "Esempio: stacco da terra classico, military press, jumping lunges...",
        fullWidth: true,
      },
      {
        name: "eserciziCheDannoFastidio",
        label: "Esercizi che danno fastidio",
        type: "textarea",
        placeholder: "Descrivi eventuali fastidi ricorrenti o pattern problematici.",
        fullWidth: true,
      },
      {
        name: "macchinePreferite",
        label: "Macchine preferite se ti alleni in palestra",
        type: "textarea",
        placeholder: "Leg press, chest press, lat machine, cavi, smith machine...",
        fullWidth: true,
      },
      {
        name: "prioritaSicurezzaVsIntensita",
        label: "Priorita tra sicurezza tecnica e intensita",
        type: "select",
        options: [
          option("Prima sicurezza e tecnica"),
          option("Equilibrio tra le due"),
          option("Spingere forte quando ha senso"),
        ],
      },
      {
        name: "attivitaPiacciono",
        label: "Attivita o esercizi che ti motivano",
        type: "textarea",
        placeholder: "Sport, formati o sensazioni che ti fanno restare costante.",
        fullWidth: true,
      },
      {
        name: "attivitaNonPiacciono",
        label: "Attivita o esercizi che non ti piacciono",
        type: "textarea",
        placeholder: "Quello che preferiresti evitare il piu possibile.",
        fullWidth: true,
      },
    ],
  },
  {
    id: "alimentazione-attuale",
    title: "Nutrizione",
    description:
      "Raccogliamo dati utili per proporti indicazioni nutrizionali piu adatte nel tempo.",
    fields: [
      {
        name: "obiettivoNutrizionale",
        label: "Obiettivo nutrizionale coerente con l'allenamento",
        type: "select",
        options: [
          option("Supportare massa muscolare"),
          option("Supportare forza"),
          option("Supportare dimagrimento"),
          option("Supportare ricomposizione"),
          option("Mangiare meglio senza rigidita"),
          option("Non lo so"),
        ],
      },
      {
        name: "registrarePasti",
        label: "Disponibilita a tracciare i pasti",
        type: "select",
        options: [
          option("Non voglio"),
          option("Solo ogni tanto"),
          option("3-4 giorni a settimana"),
          option("Tutti i giorni"),
          option("Solo per periodo iniziale"),
        ],
      },
      {
        name: "preferenzaTracking",
        label: "Preferenza tra precisione e semplicita",
        type: "select",
        options: [
          option("Indicazioni molto semplici"),
          option("Abbastanza preciso"),
          option("Target preciso"),
        ],
      },
      {
        name: "pastiGiorno",
        label: "Numero pasti abituali",
        type: "select",
        options: [
          option("1-2"),
          option("3"),
          option("4"),
          option("5 o piu"),
          option("Variabile"),
        ],
      },
      {
        name: "fameAppetito",
        label: "Fame/appetito",
        type: "select",
        options: [option("Basso"), option("Normale"), option("Alto")],
      },
      {
        name: "difficoltaNutrizione",
        label: "Dove fai piu fatica",
        type: "multiselect",
        options: NUTRITION_DIFFICULTY_OPTIONS,
        fullWidth: true,
      },
      {
        name: "disponibilitaAggiustamenti",
        label: "Disponibilita ad aggiustamenti ogni 1-2 settimane",
        type: "select",
        options: [
          option("Si"),
          option("Solo se serve davvero"),
          option("Preferisco cambiare poco"),
        ],
      },
      {
        name: "alimentazioneAttuale",
        label: "Come valuti oggi la tua alimentazione",
        type: "select",
        options: [
          option("Molto disordinata"),
          option("Abbastanza disordinata"),
          option("Normale"),
          option("Abbastanza curata"),
          option("Molto curata"),
        ],
      },
      {
        name: "proteinePasti",
        label: "Fonte proteica nei pasti principali",
        type: "select",
        options: [
          option("Quasi sempre"),
          option("A volte"),
          option("Raramente"),
          option("Non lo so"),
        ],
      },
    ],
  },
  {
    id: "limitazioni",
    title: "Sicurezza e limitazioni",
    description:
      "Informazioni per evitare proposte inadatte o poco sostenibili.",
    fields: [
      {
        name: "disturboAlimentare",
        label:
          "Hai mai avuto o ti e mai stato diagnosticato un disturbo alimentare?",
        type: "select",
        options: [
          option("Si"),
          option("No"),
          option("Preferisco non rispondere"),
        ],
      },
      {
        name: "pauraAumentoPeso",
        label: "Hai paura intensa di aumentare peso?",
        type: "select",
        options: [
          option("Si"),
          option("No"),
          option("Preferisco non rispondere"),
        ],
      },
      {
        name: "saltoPastiCompensazione",
        label:
          "Ti capita spesso di saltare pasti volontariamente per compensare cio che mangi?",
        type: "select",
        options: [
          option("Si"),
          option("No"),
          option("Preferisco non rispondere"),
        ],
      },
      {
        name: "condizioniMedicheRilevanti",
        label:
          "Hai condizioni mediche rilevanti, problemi cardiaci, pressione alta non controllata, diabete, gravidanza, infortuni importanti o indicazioni mediche specifiche?",
        type: "select",
        options: [
          option("Si"),
          option("No"),
          option("Preferisco non rispondere"),
        ],
      },
      {
        name: "doloriInfortuni",
        label: "Dolori o fastidi ricorrenti",
        type: "textarea",
        placeholder: "Schiena, collo, spalle, gomiti, polsi, anche, ginocchia...",
        fullWidth: true,
      },
      {
        name: "intensitaFastidio",
        label: "Intensita fastidio",
        type: "select",
        options: [
          option("Lieve"),
          option("Medio"),
          option("Forte"),
          option("Non saprei"),
        ],
      },
      {
        name: "movimentiDaEvitare",
        label: "Movimenti da evitare",
        type: "textarea",
        placeholder: "Squat, affondi, corsa, salti, piegamenti, sopra la testa...",
        fullWidth: true,
      },
      {
        name: "infortuniLimitazioni",
        label: "Infortuni o limitazioni da segnalare",
        type: "textarea",
        placeholder: "Interventi, indicazioni ricevute, limitazioni note...",
        fullWidth: true,
      },
    ],
  },
  {
    id: "motivazione",
    title: "Motivazione finale",
    description:
      "Ultimi dettagli su motivazione, ostacoli e livello di guida desiderato.",
    fields: [
      {
        name: "ostacoloPrincipale",
        label: "Ostacolo principale in passato",
        type: "select",
        options: [
          option("Tempo"),
          option("Costanza"),
          option("Schede troppo difficili"),
          option("Noia"),
          option("Dolori"),
          option("Mancanza risultati"),
          option("Non sapere cosa fare"),
          option("Altro"),
        ],
      },
      {
        name: "allenamentiRipetitiviVariati",
        label: "Preferisci allenamenti ripetitivi o variati?",
        type: "select",
        options: [option("Ripetitivi"), option("Variati"), option("Mix")],
      },
      {
        name: "perche",
        label: "Motivo principale per iniziare",
        type: "textarea",
        placeholder: "Energia, salute, estetica, performance, routine...",
        fullWidth: true,
      },
      {
        name: "motivazione",
        label: "Quanto ti senti motivato da 1 a 5",
        type: "select",
        options: [option("1"), option("2"), option("3"), option("4"), option("5")],
      },
      {
        name: "livelloGuida",
        label: "Quanto vuoi essere guidato?",
        type: "select",
        options: [
          option("Molto"),
          option("Abbastanza"),
          option("Poco"),
          option("Solo indicazioni essenziali"),
        ],
      },
      {
        name: "noteFinali",
        label: "Note finali libere",
        type: "textarea",
        placeholder: "Qualsiasi informazione utile da aggiungere.",
        fullWidth: true,
      },
    ],
  },
];

function isFieldVisible(field: Field, answers: Answers) {
  if (!field.showWhen) {
    return true;
  }

  const currentValue = answers[field.showWhen.field];
  return typeof currentValue === "string" && currentValue === field.showWhen.value;
}

function getVisibleFields(step: Step, answers: Answers) {
  return step.fields.filter((field) => isFieldVisible(field, answers));
}

function normalizeLegacyGoal(value: string) {
  switch (value) {
    case "Massa muscolare":
      return "Aumentare massa muscolare";
    case "Forza":
      return "Aumentare forza";
    case "Dimagrimento":
      return "Perdere peso";
    case "Ricomposizione":
      return "Mantenere peso e migliorare composizione";
    case "Performance atletica":
    case "Salute/mantenimento":
    case "Mobilita/postura":
      return "Migliorare benessere/energia";
    default:
      return "Non lo so";
  }
}

function normalizeLegacyExperience(value: string) {
  switch (value) {
    case "Intermedio":
      return "Intermedio";
    case "Avanzato":
    case "Bodybuilder/utente esperto":
      return "Avanzato";
    default:
      return "Principiante";
  }
}

function getEquipmentLegacySummary(values: string[]) {
  return values.join(", ");
}

function applyDerivedAnswers(stepId: string, answers: Answers): Answers {
  if (stepId === "obiettivo") {
    const trainingGoal =
      typeof answers.obiettivoTraining === "string"
        ? answers.obiettivoTraining
        : "";

    return {
      ...answers,
      obiettivo: normalizeLegacyGoal(trainingGoal),
    };
  }

  if (stepId === "esperienza") {
    const experience =
      typeof answers.livelloEsperienza === "string"
        ? answers.livelloEsperienza
        : "";

    return {
      ...answers,
      esperienza: normalizeLegacyExperience(experience),
    };
  }

  if (stepId === "luogo-attrezzatura") {
    const equipment = Array.isArray(answers.attrezzaturaDettagliata)
      ? answers.attrezzaturaDettagliata
      : [];
    const equipmentSummary = getEquipmentLegacySummary(equipment);
    const location =
      typeof answers.luogo === "string" && answers.luogo ? answers.luogo : "";

    return {
      ...answers,
      attrezzatura: equipmentSummary,
      accessoAttrezzatura:
        equipmentSummary && location
          ? `${location}: ${equipmentSummary}`
          : equipmentSummary || location,
    };
  }

  if (stepId === "alimentazione-attuale") {
    const nutritionGoal =
      typeof answers.obiettivoNutrizionale === "string"
        ? answers.obiettivoNutrizionale
        : "";

    let interesseNutrizione = "Non lo so";

    if (nutritionGoal === "Supportare dimagrimento") {
      interesseNutrizione = "Perdere peso";
    } else if (nutritionGoal === "Supportare massa muscolare") {
      interesseNutrizione = "Aumentare massa";
    } else if (nutritionGoal === "Mangiare meglio senza rigidita") {
      interesseNutrizione = "Migliorare qualita alimentare";
    } else if (nutritionGoal === "Supportare forza") {
      interesseNutrizione = "Avere piu energia";
    }

    return {
      ...answers,
      interesseNutrizione,
    };
  }

  return answers;
}

function getFlattenedAnswers(answersByStep: AnswersByStep) {
  return Object.entries(answersByStep).reduce<Record<string, unknown>>(
    (allAnswers, [stepId, stepAnswers]) => ({
      ...allAnswers,
      ...applyDerivedAnswers(stepId, stepAnswers),
    }),
    {}
  );
}

function inferInitialValue(field: Field, savedAnswers: Answers) {
  const savedValue = savedAnswers[field.name];

  if (savedValue !== undefined) {
    return savedValue;
  }

  if (field.name === "obiettivoTraining") {
    const legacyGoal = savedAnswers.obiettivo;

    if (legacyGoal === "Aumentare massa muscolare") {
      return "Massa muscolare";
    }

    if (legacyGoal === "Aumentare forza") {
      return "Forza";
    }

    if (legacyGoal === "Perdere peso") {
      return "Dimagrimento";
    }

    if (legacyGoal === "Mantenere peso e migliorare composizione") {
      return "Ricomposizione";
    }

    if (legacyGoal === "Migliorare benessere/energia") {
      return "Salute/mantenimento";
    }
  }

  if (field.name === "livelloEsperienza") {
    const legacyExperience = savedAnswers.esperienza;

    if (legacyExperience === "Intermedio") {
      return "Intermedio";
    }

    if (legacyExperience === "Avanzato") {
      return "Avanzato";
    }

    if (legacyExperience === "Principiante") {
      return "Principiante con esperienza";
    }
  }

  if (field.name === "attrezzaturaDettagliata") {
    const legacyEquipment = savedAnswers.attrezzatura;

    if (typeof legacyEquipment === "string" && legacyEquipment.trim()) {
      return legacyEquipment
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
  }

  if (field.name === "obiettivoNutrizionale") {
    const legacyNutritionInterest = savedAnswers.interesseNutrizione;

    if (legacyNutritionInterest === "Perdere peso") {
      return "Supportare dimagrimento";
    }

    if (legacyNutritionInterest === "Aumentare massa") {
      return "Supportare massa muscolare";
    }

    if (legacyNutritionInterest === "Migliorare qualita alimentare") {
      return "Mangiare meglio senza rigidita";
    }

    if (legacyNutritionInterest === "Avere piu energia") {
      return "Supportare forza";
    }
  }

  if (field.type === "multiselect") {
    return field.initialValue ?? [];
  }

  return field.initialValue ?? "";
}

function getInitialAnswers(initialAnswersByStep: Partial<AnswersByStep> = {}) {
  return steps.reduce<AnswersByStep>((accumulator, step) => {
    const savedAnswers = initialAnswersByStep[step.id] ?? {};

    accumulator[step.id] = step.fields.reduce<Answers>((fields, field) => {
      fields[field.name] = inferInitialValue(field, savedAnswers);
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

  const firstMissingStepIndex = steps.findIndex((step) => {
    const savedStep = initialAnswersByStep[step.id];

    if (!savedStep) {
      return true;
    }

    return step.fields.some((field) => savedStep[field.name] === undefined);
  });

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

function getAnswerArray(value: AnswerValue | undefined) {
  return Array.isArray(value) ? value : [];
}

function getAnswerString(value: AnswerValue | undefined) {
  return typeof value === "string" ? value : "";
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

  function updateAnswer(fieldName: string, value: AnswerValue) {
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

  function toggleMultiSelect(field: Extract<Field, { type: "multiselect" }>, value: string) {
    const currentValues = getAnswerArray(currentAnswers[field.name]);

    if (currentValues.includes(value)) {
      updateAnswer(
        field.name,
        currentValues.filter((entry) => entry !== value)
      );
      return;
    }

    if (field.exclusiveOption === value) {
      updateAnswer(field.name, [value]);
      return;
    }

    const withoutExclusive = field.exclusiveOption
      ? currentValues.filter((entry) => entry !== field.exclusiveOption)
      : currentValues;

    if (field.maxSelections && withoutExclusive.length >= field.maxSelections) {
      setMessage(`Puoi selezionare massimo ${field.maxSelections} opzioni.`);
      return;
    }

    updateAnswer(field.name, [...withoutExclusive, value]);
  }

  function validateCurrentStep() {
    const missingField = visibleFields.find((field) => {
      if (!field.required) {
        return false;
      }

      const value = currentAnswers[field.name];

      if (field.type === "multiselect") {
        return getAnswerArray(value).length === 0;
      }

      return !getAnswerString(value).trim();
    });

    if (missingField) {
      return `Completa il campo obbligatorio: ${missingField.label}.`;
    }

    const daysPerWeek = Number(getAnswerString(currentAnswers.giorni));

    if (currentStep.id === "disponibilita" && Number.isFinite(daysPerWeek)) {
      if (daysPerWeek < 1 || daysPerWeek > 7) {
        return "Inserisci un numero di giorni compreso tra 1 e 7.";
      }
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
        answers: applyDerivedAnswers(currentStep.id, currentAnswers),
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
    <main className="min-h-screen bg-neutral-950 px-4 py-8 pb-28 text-white sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-4xl">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-sm uppercase tracking-[0.3em] text-neutral-500">
              Personal Trainer AI
            </p>
            <h1 className="text-3xl font-bold">
              {isCompleted
                ? "Aggiorna le tue risposte iniziali"
                : "Prima di creare il tuo percorso, conosciamoti meglio"}
            </h1>
            <p className="mt-3 max-w-2xl text-neutral-400">
              {isCompleted
                ? "Hai gia completato questa fase iniziale. Puoi aggiornare le risposte senza perdere l'accesso alle aree gia attive."
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

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 sm:p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">{currentStep.title}</h2>
            <p className="mt-2 text-neutral-400">{currentStep.description}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {visibleFields.map((field) => (
                <label
                  key={field.name}
                  className={field.fullWidth ? "sm:col-span-2" : ""}
                >
                  <span className="mb-2 block text-sm text-neutral-300">
                    {field.label}
                    {field.required && (
                      <span className="text-amber-300"> *</span>
                    )}
                  </span>

                  {field.helpText && (
                    <p className="mb-2 text-xs text-neutral-500">{field.helpText}</p>
                  )}

                  {field.type === "select" ? (
                    <select
                      value={getAnswerString(currentAnswers[field.name])}
                      onChange={(event) =>
                        updateAnswer(field.name, event.target.value)
                      }
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
                    >
                      <option value="">Seleziona</option>
                      {field.options.map((entry) => (
                        <option key={entry.value} value={entry.value}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "multiselect" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {field.options.map((entry) => {
                        const selected = getAnswerArray(
                          currentAnswers[field.name]
                        ).includes(entry.value);

                        return (
                          <button
                            key={entry.value}
                            type="button"
                            onClick={() => toggleMultiSelect(field, entry.value)}
                            className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                              selected
                                ? "border-white bg-white text-neutral-950"
                                : "border-neutral-800 bg-neutral-950 text-neutral-200"
                            }`}
                          >
                            {entry.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : field.type === "textarea" ? (
                    <textarea
                      value={getAnswerString(currentAnswers[field.name])}
                      onChange={(event) =>
                        updateAnswer(field.name, event.target.value)
                      }
                      className="min-h-28 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <input
                      value={getAnswerString(currentAnswers[field.name])}
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
