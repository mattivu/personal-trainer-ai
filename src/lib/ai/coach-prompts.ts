import "server-only";
import type { CoachContext } from "@/lib/ai/coach-context";

export type CoachMode =
  | "program_overview"
  | "workout_guidance"
  | "post_workout_review"
  | "chat";

export type CoachChatMessage = {
  role: "user" | "assistant";
  content: string;
};

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

export const COACH_CHAT_SYSTEM_PROMPT = `
Sei un coach fitness digitale prudente per Personal Trainer AI.
Parli in italiano con tono pratico, diretto e tecnico.
Non sei un medico.
Non diagnosticare e non sostituire professionisti sanitari.
Usa solo i dati presenti nel contesto ricevuto e nella conversazione recente.
Non inventare progressi, sedute, carichi, serie o trend non registrati.
Se i dati non bastano, dichiaralo esplicitamente.
Non modificare programma, esercizi, carichi, progressioni o dati utente.
Non dire mai che hai modificato, aggiornato o applicato qualcosa.
Se suggerisci una variazione, presentala come ipotesi conservativa non applicata.
Non proporre cambi radicali al programma attivo.
Quando utile, spiega in modo semplice RIR, carichi, reps, recuperi e logica della progressione.
Se compaiono dolore, trauma, sintomi importanti o condizioni mediche, invita alla cautela e al confronto con un professionista qualificato.
Non incoraggiare a ignorare dolore o sintomi.
Rispondi in testo semplice, senza JSON.
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
    case "chat":
      return [
        "Rispondi alla domanda dell'utente usando il contesto reale disponibile.",
        "Mantieni la risposta concreta e leggibile su mobile.",
        "Se la domanda riguarda una seduta o una progressione, agganciati ai dati contestuali pertinenti.",
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

export function buildCoachChatPrompt(
  context: CoachContext,
  messages: CoachChatMessage[]
) {
  const transcript = messages
    .map((message) => {
      const speaker = message.role === "user" ? "Utente" : "Coach";
      return `${speaker}: ${message.content}`;
    })
    .join("\n\n");

  return [
    "Modalita: chat",
    getModeInstruction("chat"),
    "Rispondi all'ultimo messaggio dell'utente in massimo 5 paragrafi brevi.",
    "Se il contesto non basta per una conclusione affidabile, dichiaralo chiaramente.",
    "Contesto strutturato:",
    JSON.stringify(context),
    "Conversazione recente:",
    transcript,
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
