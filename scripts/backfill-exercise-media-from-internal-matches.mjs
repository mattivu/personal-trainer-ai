import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { getMovementBucket, normalizeArray, normalizeObject, normalizeSlug, normalizeText } from "./exercise-media-coverage-helpers.mjs";

const prisma = new PrismaClient();

const AUDIT_REPORT_PATH = path.join(
  process.cwd(),
  "reports",
  "exercise-library-audit-2026-06-25.json"
);

const REPORT_DATE = "2026-06-25";
const REPORT_DIR = path.join(process.cwd(), "reports");
const REPORT_BASE = `exercise-media-backfill-internal-${REPORT_DATE}`;

const EXPLICIT_ALIAS_SLUGS = new Map([
  ["bench-press", ["barbell-bench-press-medium-grip"]],
  ["panca-inclinata-bilanciere", ["barbell-incline-bench-press-medium-grip"]],
  ["croci-manubri", ["dumbbell-flyes"]],
  ["croci-ai-cavi", ["cable-cross-over"]],
  ["pec-deck", ["pec-deck-flyes"]],
  ["rematore-con-manubrio", ["one-arm-dumbbell-row"]],
  ["rematore-bilanciere", ["bent-over-barbell-row"]],
  ["lat-machine-avanti", ["front-lat-pulldown"]],
  ["neutral-grip-lat-pulldown", ["close-grip-front-lat-pulldown"]],
  ["pull-up-prona", ["pullups"]],
  ["assisted-pull-up", ["band-assisted-pull-up"]],
  ["pull-down-braccia-tese", ["straight-arm-pulldown"]],
  ["pulldown-a-braccia-tese", ["straight-arm-pulldown"]],
  ["curl-bilanciere", ["barbell-curl"]],
  ["hammer-curl", ["hammer-curls"]],
  ["curl-inclinato", ["incline-dumbbell-curl"]],
  ["preacher-curl-macchina", ["machine-preacher-curls"]],
  ["triceps-pushdown", ["triceps-pushdown"]],
  ["pushdown-barra", ["reverse-grip-triceps-pushdown"]],
  ["overhead-cable-extension", ["cable-rope-overhead-triceps-extension"]],
  ["hip-thrust", ["barbell-hip-thrust"]],
  ["squat-bilanciere", ["barbell-squat"]],
  ["front-squat", ["front-barbell-squat"]],
  ["romanian-deadlift-bilanciere", ["romanian-deadlift"]],
  ["leg-curl-seduto", ["seated-leg-curl"]],
  ["leg-curl-sdraiato", ["lying-leg-curls"]],
  ["alzate-laterali", ["side-lateral-raise"]],
  ["shoulder-press-manubri", ["dumbbell-shoulder-press"]],
  ["chest-press-macchina", ["machine-bench-press"]],
  ["chest-press-inclinata", ["leverage-incline-chest-press"]],
  ["pulley-basso", ["seated-cable-rows"]],
  ["floor-press-manubri", ["dumbbell-floor-press"]],
  ["calf-raise", ["standing-calf-raises"]],
  ["farmer-walk", ["farmers-walk"]],
]);

const PHRASE_REPLACEMENTS = [
  [/push[\s-]?ups?/g, "push up"],
  [/pull[\s-]?ups?/g, "pull up"],
  [/bench[\s-]?press/g, "bench press"],
  [/lat[\s-]?machine/g, "lat pulldown"],
  [/stair[\s-]?master/g, "stair climber"],
  [/body[\s-]?weight/g, "corpo libero"],
  [/body[\s-]?only/g, "corpo libero"],
  [/chest[\s-]?press/g, "chest press"],
  [/hip[\s-]?thrust/g, "hip thrust"],
  [/romanian[\s-]?deadlift/g, "romanian deadlift"],
  [/dead[\s-]?bug/g, "dead bug"],
  [/face[\s-]?pull/g, "face pull"],
  [/pull[\s-]?through/g, "pull through"],
  [/calf[\s-]?raise/g, "calf raise"],
  [/panca piana/g, "bench press"],
  [/panca inclinata/g, "incline bench press"],
  [/croci/g, "fly"],
  [/spinte/g, "press"],
  [/rematore/g, "row"],
  [/trazioni/g, "pull up"],
  [/affondi/g, "lunge"],
  [/stacco rumeno/g, "romanian deadlift"],
  [/squat bulgaro/g, "bulgarian split squat"],
  [/curl bicipiti/g, "biceps curl"],
  [/french press/g, "triceps extension"],
  [/alzate laterali/g, "lateral raise"],
  [/leg curl/g, "hamstring curl"],
  [/polpacci/g, "calf raise"],
];

const TOKEN_SYNONYMS = new Map([
  ["abdominals", "addome"],
  ["abs", "addome"],
  ["airbike", "assault"],
  ["alzate", "raise"],
  ["anca", "hip"],
  ["anche", "hip"],
  ["assisted", "assistita"],
  ["back", "dorso"],
  ["band", "elastico"],
  ["bands", "elastico"],
  ["barbell", "bilanciere"],
  ["bench", "panca"],
  ["biceps", "bicipiti"],
  ["bike", "bike"],
  ["bodyweight", "corpo"],
  ["bridge", "bridge"],
  ["bulgarian", "bulgarian"],
  ["cable", "cavo"],
  ["calf", "polpacci"],
  ["camminata", "walking"],
  ["chest", "petto"],
  ["climber", "climber"],
  ["close", "close"],
  ["core", "addome"],
  ["corpo", "corpo"],
  ["croci", "fly"],
  ["curls", "curl"],
  ["cyclette", "bike"],
  ["deadbug", "deadbug"],
  ["deadlift", "stacco"],
  ["delts", "deltoidi"],
  ["dips", "dip"],
  ["dorso", "dorso"],
  ["dumbbell", "manubri"],
  ["dumbbells", "manubri"],
  ["elliptical", "ellittica"],
  ["extension", "extension"],
  ["extensions", "extension"],
  ["flyes", "fly"],
  ["fly", "fly"],
  ["glute", "glutei"],
  ["glutes", "glutei"],
  ["hamstring", "femorali"],
  ["hamstrings", "femorali"],
  ["hip", "hip"],
  ["incline", "inclinata"],
  ["kettlebell", "kettlebell"],
  ["lat", "lat"],
  ["laterali", "laterale"],
  ["lateral", "laterale"],
  ["leg", "gamba"],
  ["lunge", "affondo"],
  ["lunges", "affondo"],
  ["machine", "macchina"],
  ["manubrio", "manubri"],
  ["manubri", "manubri"],
  ["mountain", "mountain"],
  ["pec", "pec"],
  ["petto", "petto"],
  ["plank", "plank"],
  ["polpacci", "polpacci"],
  ["press", "press"],
  ["pull", "pull"],
  ["pulldown", "pulldown"],
  ["pullover", "pullover"],
  ["quadricipiti", "quadricipiti"],
  ["raise", "raise"],
  ["raises", "raise"],
  ["rematore", "row"],
  ["romanian", "romanian"],
  ["row", "row"],
  ["rows", "row"],
  ["rowing", "row"],
  ["seduto", "seated"],
  ["seated", "seated"],
  ["shoulders", "spalle"],
  ["side", "laterale"],
  ["split", "split"],
  ["squat", "squat"],
  ["stair", "stair"],
  ["statici", "statico"],
  ["statico", "statico"],
  ["stretch", "stretch"],
  ["thrust", "thrust"],
  ["trapezi", "trapezi"],
  ["trazioni", "pull"],
  ["triceps", "tricipiti"],
  ["tricipiti", "tricipiti"],
  ["vogatore", "rower"],
  ["walking", "walking"],
]);

const GENERIC_TOKENS = new Set([
  "a",
  "ad",
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
  "exercise",
  "esercizio",
  "for",
  "gli",
  "i",
  "il",
  "in",
  "la",
  "le",
  "of",
  "on",
  "per",
  "su",
  "the",
  "to",
  "with",
]);

const MUSCLE_FAMILY_MAP = new Map([
  ["petto", "chest"],
  ["chest", "chest"],
  ["spalle", "shoulders"],
  ["shoulders", "shoulders"],
  ["deltoidi", "shoulders"],
  ["tricipiti", "triceps"],
  ["triceps", "triceps"],
  ["bicipiti", "biceps"],
  ["biceps", "biceps"],
  ["dorsali", "back"],
  ["dorso", "back"],
  ["dorso medio", "back"],
  ["back", "back"],
  ["lats", "back"],
  ["lat", "back"],
  ["trapezi", "back"],
  ["quadricipiti", "quads"],
  ["quadriceps", "quads"],
  ["glutei", "glutes"],
  ["glutes", "glutes"],
  ["femorali", "hamstrings"],
  ["hamstrings", "hamstrings"],
  ["polpacci", "calves"],
  ["calves", "calves"],
  ["addome", "core"],
  ["core", "core"],
  ["abdominals", "core"],
]);

const EQUIPMENT_FAMILY_MAP = new Map([
  ["corpo libero", "bodyweight"],
  ["bodyweight", "bodyweight"],
  ["body only", "bodyweight"],
  ["manubri", "dumbbell"],
  ["dumbbell", "dumbbell"],
  ["dumbbells", "dumbbell"],
  ["bilanciere", "barbell"],
  ["barbell", "barbell"],
  ["bilanciere ez", "barbell"],
  ["macchina", "machine"],
  ["machine", "machine"],
  ["cavi", "cable"],
  ["cavo", "cable"],
  ["cable", "cable"],
  ["elastico", "band"],
  ["band", "band"],
  ["bands", "band"],
  ["fitball", "ball"],
  ["exercise ball", "ball"],
  ["box", "box"],
  ["panca", "bench"],
  ["bench", "bench"],
]);

function parseArgs(argv) {
  const includeMediumArg = argv.find((arg) => arg.startsWith("--include-medium="));
  const includeMediumIds = includeMediumArg
    ? includeMediumArg
        .slice("--include-medium=".length)
        .split(",")
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isInteger(value) && value > 0)
    : [];

  return {
    apply: argv.includes("--apply"),
    includeMediumIds: new Set(includeMediumIds),
  };
}

function normalizeString(value) {
  return normalizeText(value)
    .replace(/[()\/_,]+/g, " ")
    .replace(/[-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singularize(token) {
  if (token.endsWith("ies") && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }

  if (token.endsWith("es") && token.length > 4) {
    return token.slice(0, -2);
  }

  if (token.endsWith("s") && token.length > 3) {
    return token.slice(0, -1);
  }

  if (token.endsWith("i") && token.length > 4) {
    return token.slice(0, -1);
  }

  return token;
}

function normalizeForTokens(value) {
  const base = normalizeString(value);
  return PHRASE_REPLACEMENTS.reduce((current, [pattern, replacement]) => {
    return current.replace(pattern, ` ${replacement} `);
  }, base);
}

function buildTokens(...values) {
  const text = values.filter(Boolean).join(" ");
  return [...new Set(
    normalizeForTokens(text)
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => singularize(token))
      .map((token) => TOKEN_SYNONYMS.get(token) ?? token)
      .filter((token) => token.length >= 2 && !GENERIC_TOKENS.has(token))
  )];
}

function toSet(values) {
  return new Set(values);
}

function overlap(left, right) {
  let count = 0;

  for (const value of left) {
    if (right.has(value)) {
      count += 1;
    }
  }

  return count;
}

function jaccard(left, right) {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  return overlap(left, right) / new Set([...left, ...right]).size;
}

function levenshtein(leftValue, rightValue) {
  const left = normalizeString(leftValue);
  const right = normalizeString(rightValue);

  if (left === right) {
    return 0;
  }

  if (!left.length) {
    return right.length;
  }

  if (!right.length) {
    return left.length;
  }

  const matrix = Array.from({ length: left.length + 1 }, () =>
    new Array(right.length + 1).fill(0)
  );

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

function similarity(left, right) {
  const normalizedLeft = normalizeString(left);
  const normalizedRight = normalizeString(right);
  const maxLength = Math.max(normalizedLeft.length, normalizedRight.length);

  if (!maxLength) {
    return 1;
  }

  return 1 - levenshtein(normalizedLeft, normalizedRight) / maxLength;
}

function muscleFamily(value) {
  return MUSCLE_FAMILY_MAP.get(normalizeString(value)) ?? normalizeString(value);
}

function equipmentFamily(value) {
  return EQUIPMENT_FAMILY_MAP.get(normalizeString(value)) ?? normalizeString(value);
}

function movementFamily(exercise) {
  return normalizeString(exercise.movementPattern || getMovementBucket(exercise) || "");
}

function buildAliasValues(exercise) {
  const metadata = normalizeObject(exercise.sourceMetadata);
  const mediaEnrichment = normalizeObject(metadata.mediaEnrichment);
  const mediaEnrichmentV2 = normalizeObject(metadata.mediaEnrichmentV2);

  return [
    exercise.slug,
    normalizeSlug(exercise.name),
    exercise.externalId,
    typeof mediaEnrichment.externalId === "string" ? mediaEnrichment.externalId : null,
    typeof mediaEnrichmentV2.matchedSlug === "string" ? mediaEnrichmentV2.matchedSlug : null,
    ...(EXPLICIT_ALIAS_SLUGS.get(exercise.slug) ?? []),
  ].filter(Boolean);
}

function classifyMatchedBy(context) {
  if (context.exactSlug || context.exactName) {
    return "exact";
  }

  if (context.explicitAlias || context.alternativeLink) {
    return "alias";
  }

  if (context.normalizedAlias || context.normalizedNameOverlap >= 0.86) {
    return "normalized";
  }

  if (context.metadataStrong) {
    return "metadata";
  }

  return "fuzzy";
}

function buildReason(parts) {
  return parts.filter(Boolean).join("; ");
}

function scoreCandidate(target, candidate) {
  const targetAliases = buildAliasValues(target);
  const candidateAliases = buildAliasValues(candidate);
  const targetAliasSet = new Set(targetAliases.map((value) => normalizeSlug(value)));
  const candidateAliasSet = new Set(candidateAliases.map((value) => normalizeSlug(value)));
  const targetTokenSet = toSet(buildTokens(target.name, target.slug, ...targetAliases));
  const candidateTokenSet = toSet(buildTokens(candidate.name, candidate.slug, ...candidateAliases));
  const tokenJaccard = jaccard(targetTokenSet, candidateTokenSet);
  const slugSimilarity = similarity(target.slug, candidate.slug);
  const nameSimilarity = similarity(target.name, candidate.name);
  const exactSlug = normalizeSlug(target.slug) === normalizeSlug(candidate.slug);
  const exactName = normalizeString(target.name) === normalizeString(candidate.name);
  const explicitAlias =
    targetAliasSet.has(normalizeSlug(candidate.slug)) ||
    candidateAliasSet.has(normalizeSlug(target.slug));
  const normalizedAlias = overlap(targetTokenSet, candidateTokenSet) >= 2;
  const targetPrimary = muscleFamily(target.primaryMuscle);
  const candidatePrimary = muscleFamily(candidate.primaryMuscle);
  const samePrimary = targetPrimary !== "" && targetPrimary === candidatePrimary;
  const targetEquipment = equipmentFamily(target.equipment);
  const candidateEquipment = equipmentFamily(candidate.equipment);
  const sameEquipment = targetEquipment !== "" && targetEquipment === candidateEquipment;
  const sameCategory = normalizeString(target.category) === normalizeString(candidate.category);
  const sameMovement = movementFamily(target) !== "" && movementFamily(target) === movementFamily(candidate);
  const alternativeLink =
    normalizeArray(target.alternatives).includes(candidate.slug) ||
    normalizeArray(candidate.alternatives).includes(target.slug);
  const metadataStrong = samePrimary && sameEquipment && (sameMovement || sameCategory);

  let score = 0;
  const reasons = [];

  if (exactSlug) {
    score += 0.55;
    reasons.push("slug esatto");
  }

  if (exactName) {
    score += 0.45;
    reasons.push("nome esatto");
  }

  if (explicitAlias) {
    score += 0.4;
    reasons.push("alias esplicito");
  }

  if (alternativeLink) {
    score += 0.12;
    reasons.push("link in alternatives");
  }

  score += tokenJaccard * 0.32;

  if (slugSimilarity >= 0.82) {
    score += 0.12;
    reasons.push("slug simile");
  }

  if (nameSimilarity >= 0.82) {
    score += 0.12;
    reasons.push("nome simile");
  }

  if (samePrimary) {
    score += 0.16;
    reasons.push("muscolo principale compatibile");
  }

  if (sameEquipment) {
    score += 0.16;
    reasons.push("attrezzatura compatibile");
  }

  if (sameCategory) {
    score += 0.08;
    reasons.push("categoria compatibile");
  }

  if (sameMovement) {
    score += 0.12;
    reasons.push("movimento compatibile");
  }

  const matchedBy = classifyMatchedBy({
    exactSlug,
    exactName,
    explicitAlias,
    alternativeLink,
    normalizedAlias,
    normalizedNameOverlap: Math.max(tokenJaccard, slugSimilarity, nameSimilarity),
    metadataStrong,
  });

  let confidence = "none";

  const technicallySafe = samePrimary && sameEquipment && (sameMovement || sameCategory);
  const safeAlias = explicitAlias && technicallySafe;
  const safeExact = exactSlug || (exactName && technicallySafe);
  const safeNormalized =
    tokenJaccard >= 0.72 &&
    slugSimilarity >= 0.78 &&
    technicallySafe &&
    overlap(targetTokenSet, candidateTokenSet) >= 2;

  if (safeExact || safeAlias || safeNormalized) {
    confidence = "high";
  } else if (
    samePrimary &&
    (sameEquipment || sameMovement) &&
    (tokenJaccard >= 0.55 || slugSimilarity >= 0.72 || nameSimilarity >= 0.76)
  ) {
    confidence = "medium";
  } else if (
    samePrimary &&
    (tokenJaccard >= 0.38 || slugSimilarity >= 0.64 || nameSimilarity >= 0.68)
  ) {
    confidence = "low";
  }

  if (
    confidence === "high" &&
    (!samePrimary || !sameEquipment || (!sameMovement && !sameCategory))
  ) {
    confidence = "medium";
  }

  if (
    ["leg-press", "hack-squat"].includes(candidate.slug) &&
    ["squat-corpo-libero", "squat-bilanciere", "front-squat"].includes(target.slug)
  ) {
    confidence = "low";
    reasons.push("esercizio diverso per natura biomeccanica");
  }

  if (
    ["push-up", "push-up-inclinati"].includes(target.slug) &&
    normalizeString(candidate.name).includes("bench press")
  ) {
    confidence = "low";
    reasons.push("push-up non equivalente a bench press");
  }

  if (
    target.slug === "lat-machine-avanti" &&
    normalizeString(candidate.name).includes("row")
  ) {
    confidence = "low";
    reasons.push("lat machine non equivalente a row");
  }

  return {
    score: Number(Math.min(score, 1).toFixed(4)),
    confidence,
    matchedBy,
    reason: buildReason(reasons),
    samePrimary,
    sameEquipment,
    sameCategory,
    sameMovement,
  };
}

function sortCandidates(left, right) {
  const order = ["high", "medium", "low", "none"];
  const confidenceDelta = order.indexOf(left.confidence) - order.indexOf(right.confidence);

  if (confidenceDelta !== 0) {
    return confidenceDelta;
  }

  if (right.score !== left.score) {
    return right.score - left.score;
  }

  return left.candidate.name.localeCompare(right.candidate.name, "it");
}

function escapePipe(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function csvValue(value) {
  return `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
}

async function loadAuditTargets() {
  const raw = JSON.parse(await readFile(AUDIT_REPORT_PATH, "utf8"));

  return new Set(
    raw.exercises
      .filter((exercise) => exercise.finalStatus !== "completo")
      .map((exercise) => exercise.id)
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const missingExerciseIds = await loadAuditTargets();

  const exercises = await prisma.exercise.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      primaryMuscle: true,
      secondaryMuscles: true,
      equipment: true,
      movementPattern: true,
      alternatives: true,
      externalSource: true,
      externalId: true,
      imageUrls: true,
      sourceMetadata: true,
      tags: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  const targets = exercises
    .filter((exercise) => missingExerciseIds.has(exercise.id))
    .filter((exercise) => normalizeArray(exercise.imageUrls).length === 0);

  const candidates = exercises
    .filter((exercise) => normalizeArray(exercise.imageUrls).length >= 2)
    .map((exercise) => ({
      ...exercise,
      imageUrls: normalizeArray(exercise.imageUrls).slice(0, 2),
    }));

  const reportRows = [];
  const updates = [];
  const summary = {
    analyzed: targets.length,
    high: 0,
    medium: 0,
    low: 0,
    none: 0,
    wouldApply: 0,
    applied: 0,
  };

  for (const target of targets) {
    const ranked = candidates
      .filter((candidate) => candidate.id !== target.id)
      .map((candidate) => ({
        candidate,
        ...scoreCandidate(target, candidate),
      }))
      .sort(sortCandidates);

    const best = ranked[0] ?? null;
    const confidence = best?.confidence ?? "none";

    summary[confidence] += 1;

    const isApprovedMedium = confidence === "medium" && args.includeMediumIds.has(target.id);
    const wouldApply = confidence === "high" || isApprovedMedium;
    const row = {
      missingExerciseId: target.id,
      missingExerciseName: target.name,
      candidateExerciseId: best?.candidate.id ?? "",
      candidateExerciseName: best?.candidate.name ?? "",
      confidence,
      reason: best?.reason ?? "nessun match prudente trovato",
      matchedBy: best?.matchedBy ?? "metadata",
      sourceImageUrls: best ? best.candidate.imageUrls : [],
      wouldApply,
      applied: false,
      notes: best
        ? [
            best.samePrimary ? "primary ok" : "primary no",
            best.sameEquipment ? "equipment ok" : "equipment no",
            best.sameCategory ? "category ok" : "category no",
            best.sameMovement ? "movement ok" : "movement no",
            `score=${best.score}`,
            isApprovedMedium ? "medium approvato manualmente" : null,
          ]
            .filter(Boolean)
            .join("; ")
        : "nessun candidato con compatibilita sufficiente",
    };

    if (wouldApply) {
      summary.wouldApply += 1;
    }

    if (args.apply && wouldApply && best) {
      await prisma.exercise.update({
        where: {
          id: target.id,
        },
        data: {
          imageUrls: best.candidate.imageUrls.slice(0, 2),
        },
      });

      row.applied = true;
      summary.applied += 1;
      updates.push({
        id: target.id,
        name: target.name,
        fromId: best.candidate.id,
        fromName: best.candidate.name,
      });
    }

    reportRows.push(row);
  }

  const markdown = [
    "# Backfill immagini esercizi da match interni",
    "",
    `Data report: ${REPORT_DATE}`,
    `Modalita: ${args.apply ? "apply" : "dry-run"}`,
    "",
    "## Riepilogo",
    "",
    `- Totale esercizi senza immagini analizzati: ${summary.analyzed}`,
    `- Match high: ${summary.high}`,
    `- Match medium: ${summary.medium}`,
    `- Match low: ${summary.low}`,
    `- No match: ${summary.none}`,
    `- Verrebbero aggiornati in dry-run: ${summary.wouldApply}`,
    `- Aggiornati in apply: ${summary.applied}`,
    "",
    "## Report",
    "",
    "| missingExerciseId | missingExerciseName | candidateExerciseId | candidateExerciseName | confidence | reason | matchedBy | sourceImageUrls | wouldApply | applied | notes |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...reportRows.map((row) =>
      `| ${row.missingExerciseId} | ${escapePipe(row.missingExerciseName)} | ${row.candidateExerciseId} | ${escapePipe(row.candidateExerciseName)} | ${row.confidence} | ${escapePipe(row.reason)} | ${row.matchedBy} | ${escapePipe(row.sourceImageUrls.join(" <br> "))} | ${row.wouldApply} | ${row.applied} | ${escapePipe(row.notes)} |`
    ),
    "",
  ].join("\n");

  const csv = [
    [
      "missingExerciseId",
      "missingExerciseName",
      "candidateExerciseId",
      "candidateExerciseName",
      "confidence",
      "reason",
      "matchedBy",
      "sourceImageUrls",
      "wouldApply",
      "applied",
      "notes",
    ].map(csvValue).join(","),
    ...reportRows.map((row) =>
      [
        row.missingExerciseId,
        row.missingExerciseName,
        row.candidateExerciseId,
        row.candidateExerciseName,
        row.confidence,
        row.reason,
        row.matchedBy,
        row.sourceImageUrls.join(" | "),
        row.wouldApply,
        row.applied,
        row.notes,
      ].map(csvValue).join(",")
    ),
  ].join("\n");

  const json = JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      reportDate: REPORT_DATE,
      mode: args.apply ? "apply" : "dry-run",
      summary,
      updates,
      rows: reportRows,
    },
    null,
    2
  );

  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(path.join(REPORT_DIR, `${REPORT_BASE}.md`), `${markdown}\n`);
  await writeFile(path.join(REPORT_DIR, `${REPORT_BASE}.csv`), `${csv}\n`);
  await writeFile(path.join(REPORT_DIR, `${REPORT_BASE}.json`), `${json}\n`);

  console.log(`Exercise media backfill internal (${args.apply ? "apply" : "dry-run"})`);
  console.log(`totale esercizi senza immagini analizzati: ${summary.analyzed}`);
  console.log(`match high: ${summary.high}`);
  console.log(`match medium: ${summary.medium}`);
  console.log(`match low: ${summary.low}`);
  console.log(`no match: ${summary.none}`);
  console.log(`quanti verrebbero aggiornati in dry-run: ${summary.wouldApply}`);
  console.log(`quanti aggiornati in apply: ${summary.applied}`);
}

main()
  .catch((error) => {
    console.error("EXERCISE_MEDIA_BACKFILL_INTERNAL_FAILED", {
      message: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
