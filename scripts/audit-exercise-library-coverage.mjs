import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REPORT_DATE = new Date().toISOString().slice(0, 10);
const REPORT_DIR = path.join(process.cwd(), "reports");
const REPORT_BASENAME = `exercise-library-audit-${REPORT_DATE}`;

const GENERIC_TOKENS = new Set([
  "a",
  "ad",
  "ai",
  "al",
  "alla",
  "alle",
  "an",
  "and",
  "con",
  "da",
  "de",
  "del",
  "della",
  "delle",
  "di",
  "el",
  "exercise",
  "esercizio",
  "for",
  "gli",
  "i",
  "il",
  "in",
  "la",
  "le",
  "machine",
  "macchina",
  "of",
  "on",
  "per",
  "su",
  "the",
  "to",
  "with",
]);

const TOKEN_SYNONYMS = new Map([
  ["abdominals", "addome"],
  ["abs", "addome"],
  ["addominali", "addome"],
  ["airbike", "assault"],
  ["alzate", "raise"],
  ["anca", "hip"],
  ["anche", "hip"],
  ["assisted", "assistita"],
  ["avambracci", "forearm"],
  ["back", "dorso"],
  ["band", "elastico"],
  ["bands", "elastico"],
  ["bar", "barra"],
  ["barbell", "bilanciere"],
  ["bench", "panca"],
  ["bent", "piegato"],
  ["biceps", "bicipiti"],
  ["bici", "bike"],
  ["bike", "bike"],
  ["bilanciere", "bilanciere"],
  ["bodyonly", "corpo"],
  ["bodyweight", "corpo"],
  ["bridge", "ponte"],
  ["bulgarian", "bulgaro"],
  ["cable", "cavo"],
  ["cables", "cavo"],
  ["calf", "polpacci"],
  ["camminata", "walking"],
  ["chair", "sedia"],
  ["chest", "petto"],
  ["climber", "climb"],
  ["closegrip", "presa-stretta"],
  ["core", "addome"],
  ["corpo", "corpo"],
  ["cow", "mucca"],
  ["croci", "fly"],
  ["curls", "curl"],
  ["cyclette", "bike"],
  ["deadbug", "dead-bug"],
  ["deadlift", "stacco"],
  ["deck", "deck"],
  ["delts", "deltoidi"],
  ["diamond", "diamante"],
  ["dips", "dip"],
  ["dog", "cane"],
  ["dorsali", "dorso"],
  ["dorso", "dorso"],
  ["dumbbell", "manubrio"],
  ["dumbbells", "manubrio"],
  ["elliptical", "ellittica"],
  ["extension", "estensione"],
  ["extensions", "estensione"],
  ["facepull", "face-pull"],
  ["farmer", "farmer"],
  ["farmers", "farmer"],
  ["fitball", "fitball"],
  ["flat", "piana"],
  ["floor", "floor"],
  ["flyes", "fly"],
  ["fly", "fly"],
  ["forearms", "forearm"],
  ["free", "corpo"],
  ["french", "french"],
  ["front", "front"],
  ["glute", "glutei"],
  ["glutes", "glutei"],
  ["glutei", "glutei"],
  ["goblet", "goblet"],
  ["grip", "presa"],
  ["hamstring", "femorali"],
  ["hamstrings", "femorali"],
  ["heel", "tallone"],
  ["hip", "hip"],
  ["hollow", "hollow"],
  ["hyperextension", "hyperextension"],
  ["incline", "inclinata"],
  ["inclinata", "inclinata"],
  ["jumping", "jump"],
  ["kettlebell", "kettlebell"],
  ["lat", "lat"],
  ["laterali", "laterale"],
  ["lateral", "laterale"],
  ["leg", "gamba"],
  ["lento", "slow"],
  ["libero", "libero"],
  ["lunge", "affondo"],
  ["lunges", "affondo"],
  ["machine", "macchina"],
  ["manubri", "manubrio"],
  ["manubrio", "manubrio"],
  ["marching", "march"],
  ["mountain", "mountain"],
  ["neutral", "neutra"],
  ["onearm", "monolaterale"],
  ["overhead", "overhead"],
  ["pallof", "pallof"],
  ["pec", "pec"],
  ["petto", "petto"],
  ["piana", "piana"],
  ["plank", "plank"],
  ["polpacci", "polpacci"],
  ["press", "press"],
  ["pull", "pull"],
  ["pullup", "pull-up"],
  ["pullups", "pull-up"],
  ["pulldown", "pulldown"],
  ["pullthrough", "pull-through"],
  ["pullover", "pullover"],
  ["pushup", "push-up"],
  ["pushups", "push-up"],
  ["quadricipiti", "quadricipiti"],
  ["raise", "raise"],
  ["raises", "raise"],
  ["rear", "rear"],
  ["rematore", "row"],
  ["reverse", "reverse"],
  ["romanian", "romanian"],
  ["rope", "rope"],
  ["rotation", "rotazione"],
  ["row", "row"],
  ["rows", "row"],
  ["rowing", "row"],
  ["sbarra", "barra"],
  ["scapular", "scapole"],
  ["seat", "seduta"],
  ["seated", "seduta"],
  ["seduto", "seduta"],
  ["side", "laterale"],
  ["single", "single"],
  ["smith", "smith"],
  ["spalle", "spalle"],
  ["split", "split"],
  ["squat", "squat"],
  ["standing", "in-piedi"],
  ["statici", "statico"],
  ["statico", "statico"],
  ["stepper", "stair"],
  ["stiff", "rigido"],
  ["stretch", "stretch"],
  ["sumo", "sumo"],
  ["sweep", "sweep"],
  ["tapis", "treadmill"],
  ["thrust", "thrust"],
  ["thoracic", "toracica"],
  ["towel", "asciugamano"],
  ["trazioni", "pull-up"],
  ["treadmill", "treadmill"],
  ["triceps", "tricipiti"],
  ["tricipiti", "tricipiti"],
  ["trx", "trx"],
  ["vogatore", "rower"],
  ["walking", "walking"],
  ["wall", "wall"],
  ["wide", "larga"],
  ["worlds", "world"],
]);

const PHRASE_SYNONYMS = [
  [/push[\s-]?up/gi, "push-up"],
  [/pull[\s-]?up/gi, "pull-up"],
  [/lat[\s-]?machine/gi, "lat pulldown"],
  [/stair[\s-]?master/gi, "stair climber"],
  [/side[\s-]?lateral/gi, "lateral"],
  [/body[\s-]?weight/gi, "corpo libero"],
  [/body[\s-]?only/gi, "corpo libero"],
  [/free[\s-]?body/gi, "corpo libero"],
  [/chest[\s-]?press/gi, "chest press"],
  [/bench[\s-]?press/gi, "bench press"],
  [/hip[\s-]?thrust/gi, "hip thrust"],
  [/goblet[\s-]?squat/gi, "goblet squat"],
  [/romanian[\s-]?deadlift/gi, "romanian deadlift"],
  [/dead[\s-]?bug/gi, "dead bug"],
  [/face[\s-]?pull/gi, "face pull"],
  [/pull[\s-]?through/gi, "pull through"],
  [/calf[\s-]?raise/gi, "calf raise"],
  [/panca piana/gi, "bench press"],
  [/panca inclinata/gi, "incline bench press"],
  [/corpo libero/gi, "bodyweight"],
  [/croci/gi, "fly"],
  [/alzate laterali/gi, "lateral raise"],
  [/dip alle parallele/gi, "dip"],
  [/trazioni alla sbarra/gi, "pull up"],
  [/lat machine/gi, "lat pulldown"],
  [/rematore/gi, "row"],
  [/affondi/gi, "lunge"],
  [/stacco rumeno/gi, "romanian deadlift"],
  [/camminata/gi, "walking"],
];

const KNOWN_ALIAS_GROUPS = [
  {
    canonical: "bench press",
    aliases: ["panca piana bilanciere", "barbell bench press", "bench press"],
  },
  {
    canonical: "incline bench press",
    aliases: ["panca inclinata bilanciere", "incline barbell press", "incline bench press"],
  },
  {
    canonical: "dumbbell bench press",
    aliases: ["panca piana manubri", "dumbbell bench press"],
  },
  {
    canonical: "incline dumbbell press",
    aliases: ["panca inclinata manubri", "incline dumbbell press"],
  },
  {
    canonical: "lat pulldown",
    aliases: ["lat machine avanti", "lat pulldown", "lat machine"],
  },
  {
    canonical: "seated cable row",
    aliases: ["pulley basso", "seated cable row", "seated cable rows", "rematore al cavo seduto"],
  },
  {
    canonical: "lateral raise",
    aliases: ["alzate laterali", "side lateral raise", "lateral raise"],
  },
  {
    canonical: "calf raise",
    aliases: ["calf raise", "standing calf raise", "standing calf raises"],
  },
  {
    canonical: "push-up",
    aliases: ["push-up", "push up", "pushup"],
  },
  {
    canonical: "dip",
    aliases: ["dip", "dips", "dip alle parallele"],
  },
];

function normalizeText(value) {
  return typeof value === "string"
    ? value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
    : "";
}

function normalizeArray(value) {
  return Array.isArray(value)
    ? [...new Set(value.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean))]
    : [];
}

function normalizeObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value;
}

function slugify(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function tokenize(value) {
  const base = normalizeText(value);
  const phrased = PHRASE_SYNONYMS.reduce((current, [pattern, replacement]) => {
    return current.replace(pattern, ` ${replacement} `);
  }, base);

  return [...new Set(
    phrased
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .map((token) => TOKEN_SYNONYMS.get(token) ?? token)
      .filter((token) => token.length >= 2 && !GENERIC_TOKENS.has(token))
  )];
}

function jaccard(left, right) {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let overlap = 0;

  for (const token of left) {
    if (right.has(token)) {
      overlap += 1;
    }
  }

  return overlap / new Set([...left, ...right]).size;
}

function levenshtein(a, b) {
  const left = normalizeText(a);
  const right = normalizeText(b);

  if (left === right) {
    return 0;
  }

  if (!left.length) {
    return right.length;
  }

  if (!right.length) {
    return left.length;
  }

  const matrix = Array.from({ length: left.length + 1 }, () => new Array(right.length + 1).fill(0));

  for (let i = 0; i <= left.length; i += 1) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= right.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[left.length][right.length];
}

function similarityFromDistance(a, b) {
  const maxLength = Math.max(normalizeText(a).length, normalizeText(b).length);

  if (maxLength === 0) {
    return 1;
  }

  return 1 - levenshtein(a, b) / maxLength;
}

function buildAliasStrings(exercise) {
  const metadata = normalizeObject(exercise.sourceMetadata);
  const mediaEnrichment = normalizeObject(metadata.mediaEnrichment);
  const mediaEnrichmentV2 = normalizeObject(metadata.mediaEnrichmentV2);

  return [...new Set([
    exercise.slug,
    exercise.externalId,
    typeof mediaEnrichment.externalId === "string" ? mediaEnrichment.externalId : null,
    typeof mediaEnrichmentV2.matchedSlug === "string" ? mediaEnrichmentV2.matchedSlug : null,
  ].filter(Boolean))];
}

function buildCanonicalTokens(exercise) {
  const aliases = buildAliasStrings(exercise);
  const searchable = [
    exercise.name,
    exercise.slug,
    exercise.externalId,
    exercise.primaryMuscle,
    exercise.equipment,
    ...aliases,
  ].filter(Boolean).join(" ");

  return [...new Set(tokenize(searchable))];
}

function buildCanonicalKey(exercise) {
  const tokens = buildCanonicalTokens(exercise);
  return tokens.slice().sort().join("|");
}

function buildKnownAliasKey(value) {
  return tokenize(value).sort().join("|");
}

function escapeCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function csvCell(value) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replace(/"/g, "\"\"")}"`;
}

function inferImageStatus(imageCount) {
  const hasStart = imageCount >= 1;
  const hasEnd = imageCount >= 2;

  if (hasStart && hasEnd) {
    return "completo";
  }

  if (!hasStart && !hasEnd) {
    return "manca entrambe";
  }

  if (!hasStart) {
    return "manca start";
  }

  return "manca end";
}

function buildCandidateScore(left, right, knownAliasKeys) {
  const leftTokens = new Set(left.canonicalTokens);
  const rightTokens = new Set(right.canonicalTokens);
  const tokenScore = jaccard(leftTokens, rightTokens);
  const slugSimilarity = similarityFromDistance(left.slug, right.slug);
  const nameSimilarity = similarityFromDistance(left.name, right.name);
  const samePrimary = normalizeText(left.primaryMuscle) === normalizeText(right.primaryMuscle);
  const sameEquipment = normalizeText(left.equipment) === normalizeText(right.equipment);
  const sameCategory = normalizeText(left.category) === normalizeText(right.category);
  const sameCanonical = left.canonicalKey !== "" && left.canonicalKey === right.canonicalKey;
  const knownAliasMatch =
    knownAliasKeys.has(left.canonicalKey) &&
    left.canonicalKey === right.canonicalKey &&
    left.canonicalKey !== "";

  let score = 0;
  const reasons = [];

  if (sameCanonical) {
    score += 0.55;
    reasons.push("canonical_tokens");
  }

  if (knownAliasMatch) {
    score += 0.2;
    reasons.push("known_alias_group");
  }

  score += tokenScore * 0.3;

  if (slugSimilarity >= 0.82) {
    score += 0.12;
    reasons.push("slug_similar");
  }

  if (nameSimilarity >= 0.8) {
    score += 0.12;
    reasons.push("name_similar");
  }

  if (samePrimary) {
    score += 0.08;
    reasons.push("same_primary");
  }

  if (sameEquipment) {
    score += 0.06;
    reasons.push("same_equipment");
  }

  if (sameCategory) {
    score += 0.04;
    reasons.push("same_category");
  }

  return {
    score: Math.min(score, 1),
    tokenScore,
    slugSimilarity,
    nameSimilarity,
    samePrimary,
    sameEquipment,
    sameCategory,
    reasons,
  };
}

function findBestMatch(exercises, knownAliasKeys) {
  const results = new Map();

  for (const exercise of exercises) {
    let best = null;

    for (const candidate of exercises) {
      if (candidate.id === exercise.id) {
        continue;
      }

      const score = buildCandidateScore(exercise, candidate, knownAliasKeys);
      const shouldKeep =
        score.score >= 0.82 &&
        (
          exercise.canonicalKey === candidate.canonicalKey ||
          score.tokenScore >= 0.7 ||
          score.slugSimilarity >= 0.9 ||
          score.nameSimilarity >= 0.9
        ) &&
        (score.samePrimary || score.sameEquipment);

      if (!shouldKeep) {
        continue;
      }

      if (!best || score.score > best.score) {
        best = {
          score: score.score,
          candidate,
          reason: score.reasons.join(","),
        };
      }
    }

    results.set(exercise.id, best);
  }

  return results;
}

function buildNormalizationProposal(exercises) {
  const groups = new Map();

  for (const exercise of exercises) {
    if (!exercise.bestMatch) {
      continue;
    }

    const ids = [exercise.id, exercise.bestMatch.candidate.id].sort((a, b) => a - b);
    const key = ids.join("-");
    const canonical = exercise.canonicalKey || buildKnownAliasKey(exercise.name || exercise.slug);

    if (!groups.has(key)) {
      groups.set(key, {
        canonical,
        exercises: [exercise, exercise.bestMatch.candidate],
        reason: exercise.bestMatch.reason,
      });
    }
  }

  return [...groups.values()]
    .sort((left, right) => left.canonical.localeCompare(right.canonical, "it"))
    .map((group) => ({
      canonicalLabel:
        KNOWN_ALIAS_GROUPS.find((item) => buildKnownAliasKey(item.canonical) === group.canonical)?.canonical ??
        group.exercises
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name, "it"))[0]
          .name,
      reason: group.reason,
      exercises: [...new Map(group.exercises.map((exercise) => [exercise.id, exercise])).values()]
        .sort((a, b) => a.id - b.id)
        .map((exercise) => ({
          id: exercise.id,
          name: exercise.name,
          slug: exercise.slug,
          source: exercise.externalSource ?? "internal",
        })),
    }));
}

async function main() {
  const exercisesRaw = await prisma.exercise.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      primaryMuscle: true,
      equipment: true,
      externalSource: true,
      externalId: true,
      imageUrls: true,
      sourceMetadata: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  const knownAliasKeys = new Set(
    KNOWN_ALIAS_GROUPS.map((group) => buildKnownAliasKey(group.canonical))
  );

  const exercises = exercisesRaw.map((exercise) => {
    const imageUrls = normalizeArray(exercise.imageUrls);
    const aliasStrings = buildAliasStrings(exercise);
    const canonicalTokens = buildCanonicalTokens(exercise);

    return {
      ...exercise,
      imageUrls,
      aliasStrings,
      canonicalTokens,
      canonicalKey: buildCanonicalKey(exercise),
    };
  });

  const bestMatches = findBestMatch(exercises, knownAliasKeys);

  const rows = exercises.map((exercise) => {
    const imageCount = exercise.imageUrls.length;
    const bestMatch = bestMatches.get(exercise.id);
    const notes = [];

    if (imageCount > 2) {
      notes.push(`${imageCount} immagini totali: la UI oggi usa solo le prime due`);
    } else if (imageCount === 1) {
      notes.push("solo una immagine disponibile: start presente, end assente");
    } else if (imageCount === 0) {
      notes.push("nessuna immagine in imageUrls");
    }

    if (!exercise.externalSource) {
      notes.push("esercizio interno");
    } else {
      notes.push(`fonte=${exercise.externalSource}`);
    }

    return {
      ...exercise,
      imageCount,
      imageStartPresent: imageCount >= 1 ? "sì" : "no",
      imageEndPresent: imageCount >= 2 ? "sì" : "no",
      finalStatus: inferImageStatus(imageCount),
      bestMatch,
      aliasDescriptor: exercise.aliasStrings.join(" | "),
      notes: notes.join("; "),
    };
  });

  const summary = rows.reduce(
    (accumulator, row) => {
      if (row.finalStatus === "completo") {
        accumulator.completi += 1;
      } else {
        accumulator.incompleti += 1;
      }

      if (row.bestMatch) {
        accumulator.duplicatiProbabili += 1;
      }

      if (row.finalStatus === "manca entrambe") {
        accumulator.mancaEntrambe += 1;
      }

      if (row.finalStatus === "manca end") {
        accumulator.mancaEnd += 1;
      }

      if (row.finalStatus === "manca start") {
        accumulator.mancaStart += 1;
      }

      if (!row.externalSource) {
        accumulator.interni += 1;
      } else {
        accumulator.importati += 1;
      }

      if (row.imageCount > 2) {
        accumulator.oltreDueImmagini += 1;
      }

      return accumulator;
    },
    {
      totale: rows.length,
      completi: 0,
      incompleti: 0,
      mancaStart: 0,
      mancaEnd: 0,
      mancaEntrambe: 0,
      duplicatiProbabili: 0,
      interni: 0,
      importati: 0,
      oltreDueImmagini: 0,
    }
  );

  const normalizationProposal = buildNormalizationProposal(
    rows.filter((row) => row.bestMatch)
  );

  const markdownLines = [
    "# Audit libreria esercizi",
    "",
    `Data report: ${REPORT_DATE}`,
    "",
    "## Contesto strutturale",
    "",
    "- Modello Prisma immagini esercizi: `Exercise.imageUrls Json?`.",
    "- Non esistono oggi campi distinti `imageStart` e `imageEnd` nello schema.",
    "- La UI tratta `imageUrls[0]` come prima immagine e `imageUrls[1]` come seconda immagine.",
    `- Esercizi analizzati: ${summary.totale}.`,
    "",
    "## Riepilogo quantitativo",
    "",
    `- Completi: ${summary.completi}`,
    `- Incompleti: ${summary.incompleti}`,
    `- Manca start: ${summary.mancaStart}`,
    `- Manca end: ${summary.mancaEnd}`,
    `- Manca entrambe: ${summary.mancaEntrambe}`,
    `- Probabili duplicati/sinonimi: ${summary.duplicatiProbabili}`,
    `- Esercizi interni: ${summary.interni}`,
    `- Esercizi importati: ${summary.importati}`,
    `- Esercizi con oltre 2 immagini: ${summary.oltreDueImmagini}`,
    "",
    "## Proposta normalizzazione alias/sinonimi",
    "",
    "| Canonico proposto | Motivo match | Esercizi coinvolti |",
    "| --- | --- | --- |",
    ...normalizationProposal.map((group) => {
      const exercisesLabel = group.exercises
        .map((exercise) => `${exercise.id}: ${exercise.name} [${exercise.slug}]`)
        .join("<br>");

      return `| ${escapeCell(group.canonicalLabel)} | ${escapeCell(group.reason)} | ${escapeCell(exercisesLabel)} |`;
    }),
    "",
    "## Report completo",
    "",
    "| id | nome | nome inglese / alias / slug | imageStart presente | imageEnd presente | stato finale | possibile match con altro esercizio esistente | note |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) => {
      const matchLabel = row.bestMatch
        ? `${row.bestMatch.candidate.id}: ${row.bestMatch.candidate.name} [${row.bestMatch.candidate.slug}] (${row.bestMatch.reason})`
        : "";

      return `| ${row.id} | ${escapeCell(row.name)} | ${escapeCell(row.aliasDescriptor || row.slug)} | ${row.imageStartPresent} | ${row.imageEndPresent} | ${row.finalStatus} | ${escapeCell(matchLabel)} | ${escapeCell(row.notes)} |`;
    }),
    "",
  ];

  const csvLines = [
    [
      "id",
      "name",
      "english_or_alias_or_slug",
      "imageStartPresent",
      "imageEndPresent",
      "finalStatus",
      "possibleExistingMatch",
      "notes",
    ].map(csvCell).join(","),
    ...rows.map((row) => {
      const matchLabel = row.bestMatch
        ? `${row.bestMatch.candidate.id}: ${row.bestMatch.candidate.name} [${row.bestMatch.candidate.slug}] (${row.bestMatch.reason})`
        : "";

      return [
        row.id,
        row.name,
        row.aliasDescriptor || row.slug,
        row.imageStartPresent,
        row.imageEndPresent,
        row.finalStatus,
        matchLabel,
        row.notes,
      ].map(csvCell).join(",");
    }),
  ];

  const jsonPayload = {
    generatedAt: new Date().toISOString(),
    reportDate: REPORT_DATE,
    structuralNotes: {
      imageField: "Exercise.imageUrls Json?",
      explicitImageStartField: false,
      explicitImageEndField: false,
      uiUsesFirstTwoImages: true,
    },
    summary,
    normalizationProposal,
    exercises: rows.map((row) => ({
      id: row.id,
      name: row.name,
      englishOrAliasOrSlug: row.aliasDescriptor || row.slug,
      imageStartPresent: row.imageStartPresent === "sì",
      imageEndPresent: row.imageEndPresent === "sì",
      finalStatus: row.finalStatus,
      possibleExistingMatch: row.bestMatch
        ? {
            id: row.bestMatch.candidate.id,
            name: row.bestMatch.candidate.name,
            slug: row.bestMatch.candidate.slug,
            reason: row.bestMatch.reason,
            score: Number(row.bestMatch.score.toFixed(4)),
          }
        : null,
      notes: row.notes,
      externalSource: row.externalSource,
      externalId: row.externalId,
      imageCount: row.imageCount,
      imageUrls: row.imageUrls,
    })),
  };

  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(path.join(REPORT_DIR, `${REPORT_BASENAME}.md`), markdownLines.join("\n"));
  await writeFile(path.join(REPORT_DIR, `${REPORT_BASENAME}.csv`), csvLines.join("\n"));
  await writeFile(
    path.join(REPORT_DIR, `${REPORT_BASENAME}.json`),
    `${JSON.stringify(jsonPayload, null, 2)}\n`
  );

  console.log(
    JSON.stringify(
      {
        reportBase: path.join("reports", REPORT_BASENAME),
        summary,
        normalizationGroups: normalizationProposal.length,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("EXERCISE_LIBRARY_AUDIT_FAILED", {
      message: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
