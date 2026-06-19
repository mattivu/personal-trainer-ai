const FALLBACK_NOTES = "Indicazioni personalizzate disponibili.";

const SPLIT_LABELS: Record<string, string> = {
  upper_lower: "parte alta/bassa",
  push_pull_legs: "spinta/tirata/gambe",
  ppl_upper_lower: "spinta/tirata/gambe con parte alta/bassa",
  full_body: "total body",
  body_part_split: "gruppi muscolari",
  hybrid_specialization: "focus specifico",
};

const BUILDER_INTROS: Record<string, string> = {
  upper_lower: "Seduta dedicata alla parte alta, con lavoro bilanciato tra spinta e tirata.",
  push_pull_legs:
    "Seduta costruita per distribuire il lavoro in modo ordinato tra spinta, tirata e gambe.",
  ppl_upper_lower:
    "Seduta costruita per distribuire il lavoro in modo ordinato tra parte alta, parte bassa e richiami utili.",
  full_body: "Seduta total body costruita in modo equilibrato e sostenibile.",
  body_part_split: "Seduta organizzata per gruppi muscolari, con lavoro concentrato ma gestibile.",
  hybrid_specialization: "Seduta con focus specifico sulle priorita principali del programma.",
};

function normalizeLineSpacing(value: string) {
  return value
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,.;:!?])([^\s])/g, "$1 $2")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}

export function formatUserFacingSplitLabel(splitType: string | null | undefined) {
  if (!splitType) {
    return null;
  }

  return SPLIT_LABELS[splitType] ?? splitType.replaceAll("_", " ");
}

function getBuilderIntro(splitType: string | null | undefined) {
  if (!splitType) {
    return "Seduta costruita per distribuire il lavoro in modo ordinato e sostenibile.";
  }

  return (
    BUILDER_INTROS[splitType] ??
    `Seduta costruita con distribuzione ${formatUserFacingSplitLabel(splitType) ?? "personalizzata"}.`
  );
}

function sanitizeTechnicalLine(line: string) {
  const builderMatch = line.match(/^Builder\s*v?\d*\s*([a-z_]+)\s*:\s*(.*)$/i);

  if (builderMatch) {
    const [, splitType, rest] = builderMatch;
    const intro = getBuilderIntro(splitType);
    const remainder = normalizeLineSpacing(rest);
    return remainder ? `${intro} ${remainder}` : intro;
  }

  if (/^Programma creato con /i.test(line)) {
    return "Programma creato sulla base delle tue risposte, del tuo obiettivo e della tua disponibilita.";
  }

  if (/^Strategia Training Engine/i.test(line)) {
    return "";
  }

  if (/^Motivo split:/i.test(line)) {
    return "La distribuzione delle sedute e stata scelta per mantenere equilibrio, recupero e continuita.";
  }

  if (/^I futuri log useranno /i.test(line)) {
    return "I progressi registrati aiuteranno a leggere meglio l'andamento del percorso.";
  }

  return line
    .replace(/^Goal reale:/i, "Obiettivo:")
    .replace(/^Obiettivo usato:/i, "Obiettivo:")
    .replace(/^Frequenza massima visibile:/i, "Frequenza prevista:")
    .replace(/^Split reale:/i, "Distribuzione settimanale:")
    .replace(/^Split scelta:/i, "Distribuzione settimanale:")
    .replace(/^Split:/i, "Distribuzione settimanale:")
    .replace(/^Target primari:/i, "Focus principali:")
    .replace(/^Cardio integrato nel piano:/i, "Cardio previsto nel programma:")
    .replace(/^Cardio:/i, "Cardio previsto:")
    .replace(/^Tecniche ammesse:/i, "Tecniche previste:")
    .replace(/^Boost focus:/i, "Focus aggiuntivo:")
    .replace(/^Warning:/i, "Attenzioni:")
    .replace(/^Linee guida volume:/i, "Volume orientativo:")
    .replace(/^Intensita di riferimento:/i, "Intensita di riferimento:");
}

function applyGlobalReplacements(value: string) {
  let next = value;

  next = next.replace(
    /questionario v2 normalizzato|questionario normalizzato|questionario v2/gi,
    "le tue risposte iniziali"
  );
  next = next.replace(/Training Engine\s*v?\d*/gi, "programma");
  next = next.replace(/\bTraining Engine\b/gi, "programma");
  next = next.replace(/\bBuilder\s*v?\d*\b/gi, "");
  next = next.replace(/\bBuilder\b/gi, "");
  next = next.replace(/\badaptive engine\b/gi, "");
  next = next.replace(/\bwrite-back\b/gi, "");
  next = next.replace(/\bblueprint\b/gi, "struttura");
  next = next.replace(/\bnormalized\b/gi, "adattato");
  next = next.replace(/\bnormalizzato\b/gi, "adattato");
  next = next.replace(/\bstrategy\b/gi, "percorso");
  next = next.replace(/\bengine\b/gi, "");
  next = next.replace(/\bJSON\b/g, "");
  next = next.replace(/\bdebug\b/gi, "");
  next = next.replace(/\bPrisma\b/g, "");
  next = next.replace(/\bAPI\b/g, "");
  next = next.replace(/\bmock\b/gi, "");
  next = next.replace(/\bQA\b/g, "");
  next = next.replace(/\bv2\b/gi, "");

  for (const [splitType, label] of Object.entries(SPLIT_LABELS)) {
    next = next.replace(new RegExp(`\\b${splitType}\\b`, "gi"), label);
  }

  next = next.replace(/\bplacement\b/gi, "distribuzione");
  next = next.replace(/\bseparate_days\b/gi, "su giorni separati");
  next = next.replace(/\bmixed\b/gi, "mista");
  next = next.replace(/\bhigh\b/gi, "alta");
  next = next.replace(/\blow\b/gi, "bassa");
  next = next.replace(/\bmoderate\b/gi, "moderata");

  return next;
}

export function sanitizeUserFacingText(text: string | null | undefined): string | null {
  if (!text) {
    return null;
  }

  const normalizedInput = text.replace(/\r\n/g, "\n").trim();

  if (!normalizedInput) {
    return null;
  }

  const lines = normalizedInput
    .split("\n")
    .map((line) => normalizeLineSpacing(sanitizeTechnicalLine(line.trim())))
    .map((line) => normalizeLineSpacing(applyGlobalReplacements(line)))
    .map((line) =>
      line
        .replace(/\s{2,}/g, " ")
        .replace(/\.\./g, ".")
        .replace(/^[-:;,.\s]+/, "")
        .replace(/\s+\/\s+/g, " / ")
        .trim()
    )
    .filter(Boolean);

  const result = lines.join("\n").trim();
  return result || null;
}

export function sanitizeUserFacingNotes(text: string | null | undefined): string | null {
  if (!text) {
    return null;
  }

  return sanitizeUserFacingText(text) ?? FALLBACK_NOTES;
}
