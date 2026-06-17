import "server-only";
import type { CoachContext } from "@/lib/ai/coach-context";

export type CoachMode =
  | "program_overview"
  | "workout_guidance"
  | "post_workout_review";

export type CoachResult = {
  title: string;
  summary: string;
  keyPoints: string[];
  suggestedFocus: string[];
  cautions: string[];
  nextAction: string;
};

export const COACH_SYSTEM_PROMPT = `
Sei un coach fitness digitale prudente.
Non sei un medico.
Non diagnosticare.
Non sostituire professionisti sanitari.
Non cambiare liberamente scheda, esercizi, carichi o progressioni.
Non proporre nuovi programmi.
Basati solo sui dati ricevuti.
Se i dati sono insufficienti, dichiaralo esplicitamente.
Fornisci consigli pratici e conservativi su esecuzione, progressione, recupero e aderenza.
Se emergono segnali di rischio, invita alla cautela e al confronto con un professionista qualificato.
Non suggerire di ignorare dolore, limitazioni o sintomi.
Non consigliare cedimento sistematico sugli esercizi multiarticolari.
Usa tono chiaro, concreto, motivante e non prolisso.
Rispondi solo nel formato JSON richiesto.
`.trim();

export const COACH_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  name: "coach_response",
  strict: true,
  description: "Risposta strutturata del Coach AI per Personal Trainer AI.",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "title",
      "summary",
      "keyPoints",
      "suggestedFocus",
      "cautions",
      "nextAction",
    ],
    properties: {
      title: {
        type: "string",
      },
      summary: {
        type: "string",
      },
      keyPoints: {
        type: "array",
        items: {
          type: "string",
        },
        maxItems: 5,
      },
      suggestedFocus: {
        type: "array",
        items: {
          type: "string",
        },
        maxItems: 4,
      },
      cautions: {
        type: "array",
        items: {
          type: "string",
        },
        maxItems: 4,
      },
      nextAction: {
        type: "string",
      },
    },
  },
};

function getModeInstruction(mode: CoachMode) {
  switch (mode) {
    case "program_overview":
      return [
        "Spiega la logica del blocco attivo senza generare una nuova scheda.",
        "Chiarisci come seguire il blocco, cosa aspettarsi, come leggere RIR/progressione e cosa evitare.",
        "Resta adeso alla struttura del programma esistente.",
      ].join("\n");
    case "workout_guidance":
      return [
        "Spiega l'obiettivo della seduta attuale.",
        "Chiarisci come interpretare 'Ultima volta' e il consiglio di progressione già presente.",
        "Sottolinea i focus tecnici e le cautele della seduta senza cambiare esercizi o carichi.",
      ].join("\n");
    case "post_workout_review":
      return [
        "Commenta la seduta completata o salvata usando solo i dati disponibili.",
        "Evidenzia cosa è andato bene, cosa monitorare e se la progressione appare sensata.",
        "Concludi con un suggerimento pratico per la prossima volta, senza prescrivere modifiche drastiche o diagnosi.",
      ].join("\n");
  }
}

export function buildCoachUserPrompt(mode: CoachMode, context: CoachContext) {
  return [
    `Modalita: ${mode}`,
    getModeInstruction(mode),
    "Restituisci JSON valido conforme allo schema.",
    "Il testo deve essere in italiano.",
    "Contesto strutturato:",
    JSON.stringify(context),
  ].join("\n\n");
}

function sanitizeString(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  return normalized || fallback;
}

function sanitizeStringArray(value: unknown, maxItems: number) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

export function parseCoachResult(value: unknown): CoachResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Risposta AI non valida.");
  }

  const payload = value as Record<string, unknown>;

  return {
    title: sanitizeString(payload.title, "Coach AI"),
    summary: sanitizeString(
      payload.summary,
      "Dati insufficienti per produrre un commento affidabile."
    ),
    keyPoints: sanitizeStringArray(payload.keyPoints, 5),
    suggestedFocus: sanitizeStringArray(payload.suggestedFocus, 4),
    cautions: sanitizeStringArray(payload.cautions, 4),
    nextAction: sanitizeString(
      payload.nextAction,
      "Prosegui attenendoti al programma attuale e monitora la prossima seduta."
    ),
  };
}
