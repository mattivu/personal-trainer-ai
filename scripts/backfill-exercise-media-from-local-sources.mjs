import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  getMovementBucket,
  normalizeArray,
  normalizeObject,
  normalizeSlug,
  normalizeText,
} from "./exercise-media-coverage-helpers.mjs";

const prisma = new PrismaClient();

const REPORT_DATE = "2026-06-25";
const REPORT_DIR = path.join(process.cwd(), "reports");
const REPORT_BASE = `exercise-media-local-sources-${REPORT_DATE}`;
const REPORT_PATHS = {
  markdown: path.join(REPORT_DIR, `${REPORT_BASE}.md`),
  csv: path.join(REPORT_DIR, `${REPORT_BASE}.csv`),
  json: path.join(REPORT_DIR, `${REPORT_BASE}.json`),
};

const LOCAL_ASSET_ROOTS = ["public", "assets", "src/assets", "src/images", "static"];
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
const MIN_IMAGE_COUNT = 2;

const EXPLICIT_ALIAS_SLUGS = new Map([
  ["affondi", ["split-squat-statico", "lunges"]],
  ["camminata-treadmill", ["walking-treadmill", "treadmill-walking"]],
  ["camminata-treadmill", ["walking-treadmill", "treadmill-walking"]],
  ["ellittica", ["elliptical-trainer", "elliptical"]],
  ["stair-climber", ["stairmaster"]],
  ["jump-rope", ["rope-jumping"]],
  ["vogatore", ["rowing-stationary"]],
  ["back-extension", ["hyperextensions-back-extensions"]],
  ["lat-machine-avanti", ["front-lat-pulldown"]],
  ["croci-ai-cavi", ["cable-cross-over"]],
  ["pec-deck", ["pec-deck-flyes"]],
  ["neutral-grip-lat-pulldown", ["close-grip-front-lat-pulldown"]],
  ["upright-row", ["upright-barbell-row"]],
  ["adductor-machine", ["thigh-adductor"]],
  ["triceps-machine", ["machine-triceps-extension"]],
  ["curl-panca-scott", ["preacher-curl"]],
  ["reverse-curl", ["reverse-barbell-curl"]],
  ["french-press", ["lying-close-grip-barbell-triceps-extension-behind-the-head"]],
  ["skull-crusher", ["lying-close-grip-barbell-triceps-extension-behind-the-head"]],
]);

const GENERIC_TOKENS = new Set([
  "a",
  "ad",
  "ai",
  "al",
  "alla",
  "alle",
  "con",
  "da",
  "dei",
  "del",
  "della",
  "delle",
  "di",
  "e",
  "exercise",
  "esercizio",
  "il",
  "in",
  "la",
  "le",
  "per",
  "su",
  "the",
  "un",
  "una",
]);

const TOKEN_SYNONYMS = new Map([
  ["abdominals", "addome"],
  ["abs", "addome"],
  ["adductor", "adduttori"],
  ["adductors", "adduttori"],
  ["affondi", "lunge"],
  ["airbike", "assault"],
  ["anca", "hip"],
  ["anche", "hip"],
  ["ankle", "caviglie"],
  ["assault", "bike"],
  ["back", "dorso"],
  ["band", "elastico"],
  ["barbell", "bilanciere"],
  ["battle", "rope"],
  ["bear", "crawl"],
  ["bench", "panca"],
  ["biceps", "bicipiti"],
  ["bike", "bike"],
  ["bird", "bird"],
  ["bodyweight", "corpo"],
  ["bridge", "bridge"],
  ["bulgarian", "bulgarian"],
  ["cable", "cavo"],
  ["calf", "polpacci"],
  ["carry", "carry"],
  ["cat", "cat"],
  ["chest", "petto"],
  ["clamshell", "clamshell"],
  ["climber", "climber"],
  ["core", "core"],
  ["cow", "cow"],
  ["crawl", "crawl"],
  ["croci", "fly"],
  ["crunch", "crunch"],
  ["curls", "curl"],
  ["cyclette", "bike"],
  ["deadlift", "stacco"],
  ["dog", "dog"],
  ["dorsali", "dorso"],
  ["dumbbell", "manubri"],
  ["elliptical", "ellittica"],
  ["extension", "extension"],
  ["extensions", "extension"],
  ["farmer", "farmer"],
  ["flyes", "fly"],
  ["fly", "fly"],
  ["frog", "frog"],
  ["frontali", "frontale"],
  ["glute", "glutei"],
  ["glutes", "glutei"],
  ["hammer", "hammer"],
  ["hamstring", "femorali"],
  ["hang", "hang"],
  ["heel", "heel"],
  ["hip", "hip"],
  ["hollow", "hollow"],
  ["hyperextension", "back"],
  ["incline", "inclinata"],
  ["jacks", "jack"],
  ["jumping", "jump"],
  ["knee", "ginocchio"],
  ["knee-raise", "raise"],
  ["landmine", "landmine"],
  ["lat", "lat"],
  ["lateral", "laterale"],
  ["laterali", "laterale"],
  ["leg", "gamba"],
  ["lunges", "lunge"],
  ["machine", "macchina"],
  ["manubrio", "manubri"],
  ["mobility", "mobilita"],
  ["mountain", "mountain"],
  ["oblique", "obliqui"],
  ["pec", "pec"],
  ["petto", "petto"],
  ["plank", "plank"],
  ["press", "press"],
  ["pulldown", "pulldown"],
  ["pullover", "pullover"],
  ["quad", "quadricipiti"],
  ["quadriceps", "quadricipiti"],
  ["raise", "raise"],
  ["raises", "raise"],
  ["rear", "posteriori"],
  ["rematore", "row"],
  ["reverse", "reverse"],
  ["romanian", "romanian"],
  ["rope", "rope"],
  ["row", "row"],
  ["rowing", "rower"],
  ["scapular", "scapole"],
  ["scott", "preacher"],
  ["shoulder", "spalle"],
  ["side", "laterale"],
  ["sit", "sit"],
  ["skull", "skull"],
  ["squat", "squat"],
  ["stair", "stair"],
  ["step", "step"],
  ["stretch", "stretch"],
  ["supportato", "supported"],
  ["tap", "tap"],
  ["thoracic", "toracica"],
  ["thrust", "thrust"],
  ["triceps", "tricipiti"],
  ["upright", "upright"],
  ["vogatore", "rower"],
  ["walk", "walk"],
  ["walking", "walk"],
  ["wall", "wall"],
  ["wheel", "wheel"],
]);

const MUSCLE_FAMILY_MAP = new Map([
  ["addome", "core"],
  ["adduttori", "adductors"],
  ["anche", "hips"],
  ["avambracci", "forearms"],
  ["bicipiti", "biceps"],
  ["cardio", "cardio"],
  ["caviglie", "ankles"],
  ["colonna toracica", "thoracic"],
  ["core", "core"],
  ["cuffia dei rotatori", "rotator_cuff"],
  ["deltoidi posteriori", "rear_delts"],
  ["dorsali", "back"],
  ["erettori spinali", "spinal_erectors"],
  ["femorali", "hamstrings"],
  ["flessori anca", "hip_flexors"],
  ["glutei", "glutes"],
  ["obliqui", "obliques"],
  ["petto", "chest"],
  ["polpacci", "calves"],
  ["presa", "grip"],
  ["quadricipiti", "quads"],
  ["scapole", "scapulae"],
  ["spalle", "shoulders"],
  ["tricipiti", "triceps"],
]);

const EQUIPMENT_FAMILY_MAP = new Map([
  ["ab wheel", "ab_wheel"],
  ["battle rope", "battle_rope"],
  ["bike", "bike"],
  ["bilanciere", "barbell"],
  ["box", "box"],
  ["corpo libero", "bodyweight"],
  ["corda", "rope"],
  ["cavi", "cable"],
  ["cyclette", "bike"],
  ["elastico", "band"],
  ["ellittica", "elliptical"],
  ["macchina", "machine"],
  ["manubri", "dumbbell"],
  ["nessuna", "bodyweight"],
  ["panca romana", "roman_chair"],
  ["parete", "wall"],
  ["tapis roulant", "treadmill"],
  ["vogatore", "rower"],
]);

const MOVEMENT_ALIAS_MAP = new Map([
  ["cardio", "cardio"],
  ["carry", "carry"],
  ["core", "core"],
  ["core_anti_extension", "core_anti_extension"],
  ["core_anti_rotation", "core_anti_rotation"],
  ["core_flexion", "core_flexion"],
  ["elbow_extension", "elbow_extension"],
  ["elbow_flexion", "elbow_flexion"],
  ["hinge", "hinge"],
  ["hip_extension", "hip_extension"],
  ["horizontal_pull", "horizontal_pull"],
  ["horizontal_push", "horizontal_push"],
  ["knee_flexion", "knee_flexion"],
  ["lunge", "lunge"],
  ["mobility", "mobility"],
  ["shoulder_abduction", "shoulder_abduction"],
  ["squat", "squat"],
  ["vertical_pull", "vertical_pull"],
  ["vertical_push", "vertical_push"],
]);

const DISALLOWED_MATCHERS = [
  {
    reason: "variante inclinata diversa da variante standard",
    test: (target, candidate) =>
      hasWordMismatch(target, candidate, "inclinata") || hasWordMismatch(target, candidate, "incline"),
  },
  {
    reason: "attrezzo cavo diverso da preacher",
    test: (target, candidate) =>
      hasAny(target, ["cavo", "cable"]) &&
      hasAny(candidate, ["preacher", "scott"]) &&
      hasAny(target, ["curl"]) &&
      hasAny(candidate, ["curl"]),
  },
  {
    reason: "attrezzo manubri diverso da bilanciere",
    test: (target, candidate) =>
      hasWordMismatch(target, candidate, "manubri") || hasWordMismatch(target, candidate, "bilanciere"),
  },
  {
    reason: "variante macchina diversa da libero",
    test: (target, candidate) =>
      (equipmentFamily(target.equipment) === "machine" && equipmentFamily(candidate.equipment) === "bodyweight") ||
      (equipmentFamily(target.equipment) === "bodyweight" && equipmentFamily(candidate.equipment) === "machine"),
  },
  {
    reason: "squat diverso da leg press",
    test: (target, candidate) =>
      (normalizeSlug(target.slug).includes("squat") && normalizeSlug(candidate.slug).includes("leg-press")) ||
      (normalizeSlug(candidate.slug).includes("squat") && normalizeSlug(target.slug).includes("leg-press")),
  },
  {
    reason: "push-up inclinato non equivale a push-up standard",
    test: (target, candidate) =>
      [target.slug, candidate.slug].some((value) => normalizeSlug(value) === "push-up-inclinati") &&
      [target.slug, candidate.slug].some((value) => normalizeSlug(value) === "push-up"),
  },
  {
    reason: "rematore basso diverso da rematore manubrio",
    test: (target, candidate) =>
      [target.slug, candidate.slug].some((value) => normalizeSlug(value) === "pulley-basso") &&
      [target.slug, candidate.slug].some((value) => normalizeSlug(value) === "rematore-con-manubrio"),
  },
  {
    reason: "curl cavo diverso da preacher curl",
    test: (target, candidate) =>
      [target.slug, candidate.slug].some((value) => normalizeSlug(value) === "curl-cavo") &&
      [target.slug, candidate.slug].some((value) => normalizeSlug(value).includes("preacher")),
  },
];

function parseArgs(argv) {
  const allowlistArg = argv.find((arg) => arg.startsWith("--allowlist="));
  return {
    apply: argv.includes("--apply"),
    allowlistPath: allowlistArg ? path.resolve(process.cwd(), allowlistArg.slice("--allowlist=".length)) : null,
  };
}

function normalizeString(value) {
  return normalizeText(value)
    .replace(/[()/_.,]+/g, " ")
    .replace(/-+/g, " ")
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

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function tokenize(...values) {
  return uniqueStrings(
    values
      .filter(Boolean)
      .join(" ")
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .map(normalizeText)
      .map(singularize)
      .map((token) => TOKEN_SYNONYMS.get(token) ?? token)
      .filter((token) => token.length >= 2 && !GENERIC_TOKENS.has(token))
  );
}

function toSet(values) {
  return new Set(values);
}

function overlapCount(left, right) {
  let overlap = 0;
  for (const value of left) {
    if (right.has(value)) {
      overlap += 1;
    }
  }
  return overlap;
}

function jaccard(left, right) {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }
  return overlapCount(left, right) / new Set([...left, ...right]).size;
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
  const direct = normalizeString(exercise.movementPattern);
  if (MOVEMENT_ALIAS_MAP.has(direct)) {
    return MOVEMENT_ALIAS_MAP.get(direct);
  }

  const fallback = normalizeString(getMovementBucket(exercise));
  return MOVEMENT_ALIAS_MAP.get(fallback) ?? fallback;
}

function buildAliasValues(exercise) {
  const metadata = normalizeObject(exercise.sourceMetadata);
  const mediaEnrichment = normalizeObject(metadata.mediaEnrichment);
  const mediaEnrichmentV2 = normalizeObject(metadata.mediaEnrichmentV2);
  const explicitAliases = EXPLICIT_ALIAS_SLUGS.get(normalizeSlug(exercise.slug)) ?? [];

  return uniqueStrings([
    exercise.slug,
    normalizeSlug(exercise.name),
    exercise.externalId,
    typeof mediaEnrichment.externalId === "string" ? mediaEnrichment.externalId : null,
    typeof mediaEnrichmentV2.matchedSlug === "string" ? mediaEnrichmentV2.matchedSlug : null,
    ...explicitAliases,
  ]);
}

function hasAny(exercise, words) {
  const haystack = [
    normalizeString(exercise.name),
    normalizeString(exercise.slug),
    normalizeString(exercise.equipment),
    normalizeString(exercise.movementPattern),
  ].join(" ");

  return words.some((word) => haystack.includes(normalizeString(word)));
}

function hasWordMismatch(target, candidate, word) {
  const normalizedWord = normalizeString(word);
  const targetHas = hasAny(target, [normalizedWord]);
  const candidateHas = hasAny(candidate, [normalizedWord]);
  return targetHas !== candidateHas;
}

function candidateSourceType(candidate) {
  if (candidate.sourceType === "local_asset") {
    return "local_asset";
  }

  if (candidate.externalSource === "free_exercise_db") {
    return "imported_dataset";
  }

  return "internal_db";
}

function isTechnicallySafe(target, candidate) {
  return DISALLOWED_MATCHERS.every((matcher) => !matcher.test(target, candidate));
}

function buildLocalAssetAliases(relativePath) {
  const fileName = path.basename(relativePath, path.extname(relativePath));
  return uniqueStrings([
    normalizeSlug(fileName),
    normalizeSlug(relativePath.replace(/[\\/]/g, "-")),
  ]);
}

async function walkDirectory(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkDirectory(fullPath)));
      continue;
    }

    if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

async function loadLocalAssetCandidates() {
  const roots = [];
  const candidates = [];

  for (const root of LOCAL_ASSET_ROOTS) {
    const absoluteRoot = path.join(process.cwd(), root);
    try {
      const rootStats = await stat(absoluteRoot);
      if (!rootStats.isDirectory()) {
        continue;
      }

      roots.push(root);
      const files = await walkDirectory(absoluteRoot);
      const grouped = new Map();

      for (const file of files) {
        const relativePath = path.relative(process.cwd(), file);
        const fileNameKey = normalizeSlug(path.basename(file, path.extname(file)));
        if (!grouped.has(fileNameKey)) {
          grouped.set(fileNameKey, []);
        }
        grouped.get(fileNameKey).push(relativePath);
      }

      for (const [key, imagePaths] of grouped.entries()) {
        if (imagePaths.length < MIN_IMAGE_COUNT) {
          continue;
        }

        candidates.push({
          id: `asset:${key}`,
          exerciseId: null,
          name: path.basename(imagePaths[0], path.extname(imagePaths[0])),
          slug: key,
          category: "local_asset",
          primaryMuscle: "",
          equipment: "",
          movementPattern: "",
          externalSource: null,
          externalId: null,
          imageUrls: imagePaths.slice(0, 2),
          sourceMetadata: null,
          alternatives: [],
          tags: [],
          sourceType: "local_asset",
          aliasValues: buildLocalAssetAliases(imagePaths[0]),
        });
      }
    } catch {
      continue;
    }
  }

  return {
    roots,
    candidates,
  };
}

async function loadAllowlist(allowlistPath) {
  if (!allowlistPath) {
    return new Set();
  }

  const raw = JSON.parse(await readFile(allowlistPath, "utf8"));
  const values = Array.isArray(raw) ? raw : normalizeArray(raw.matches);
  return new Set(
    values
      .map((value) => {
        if (typeof value === "number") {
          return String(value);
        }

        if (typeof value === "string") {
          return value.trim();
        }

        if (value && typeof value === "object" && Number.isInteger(value.missingExerciseId)) {
          const left = String(value.missingExerciseId);
          const right =
            Number.isInteger(value.candidateExerciseId) || typeof value.candidateExerciseId === "string"
              ? String(value.candidateExerciseId)
              : "";
          return right ? `${left}:${right}` : left;
        }

        return "";
      })
      .filter(Boolean)
  );
}

function buildPairKeys(target, candidate) {
  const targetId = String(target.id);
  const candidateId = String(candidate.exerciseId ?? candidate.id ?? "");
  return [targetId, candidateId ? `${targetId}:${candidateId}` : null].filter(Boolean);
}

function classifyMatchedBy(context) {
  if (context.exactSlug || context.exactName) {
    return "exact";
  }

  if (context.explicitAlias || context.alternativeLink) {
    return "alias";
  }

  if (context.sameMovement && context.sameEquipment && context.samePrimary) {
    return "metadata";
  }

  return "fuzzy";
}

function buildReason(parts) {
  return parts.filter(Boolean).join("; ");
}

function scoreCandidate(target, candidate) {
  const targetAliases = buildAliasValues(target);
  const candidateAliases = candidate.aliasValues ?? buildAliasValues(candidate);
  const targetAliasSet = new Set(targetAliases.map((value) => normalizeSlug(value)));
  const candidateAliasSet = new Set(candidateAliases.map((value) => normalizeSlug(value)));
  const targetTokenSet = toSet(buildTokens(target.name, target.slug, ...targetAliases));
  const candidateTokenSet = toSet(buildTokens(candidate.name, candidate.slug, ...candidateAliases));
  const tokenJaccard = jaccard(targetTokenSet, candidateTokenSet);
  const nameSimilarity = similarity(target.name, candidate.name);
  const slugSimilarity = similarity(target.slug, candidate.slug);
  const exactSlug = normalizeSlug(target.slug) === normalizeSlug(candidate.slug);
  const exactName = normalizeString(target.name) === normalizeString(candidate.name);
  const explicitAlias =
    targetAliasSet.has(normalizeSlug(candidate.slug)) ||
    candidateAliasSet.has(normalizeSlug(target.slug));
  const targetAlternatives = new Set(normalizeArray(target.alternatives).map(normalizeSlug));
  const candidateAlternatives = new Set(normalizeArray(candidate.alternatives).map(normalizeSlug));
  const alternativeLink =
    targetAlternatives.has(normalizeSlug(candidate.slug)) ||
    candidateAlternatives.has(normalizeSlug(target.slug));
  const targetPrimary = muscleFamily(target.primaryMuscle);
  const candidatePrimary = muscleFamily(candidate.primaryMuscle);
  const samePrimary = targetPrimary !== "" && targetPrimary === candidatePrimary;
  const targetEquipment = equipmentFamily(target.equipment);
  const candidateEquipment = equipmentFamily(candidate.equipment);
  const sameEquipment = targetEquipment !== "" && targetEquipment === candidateEquipment;
  const sameCategory = normalizeString(target.category) === normalizeString(candidate.category);
  const sameMovement = movementFamily(target) !== "" && movementFamily(target) === movementFamily(candidate);
  const imageCount = normalizeArray(candidate.imageUrls).length;
  const overlap = overlapCount(targetTokenSet, candidateTokenSet);
  const sourceType = candidateSourceType(candidate);
  const technicallySafe = isTechnicallySafe(target, candidate);
  const targetBucket = getMovementBucket(target);
  const candidateBucket = getMovementBucket(candidate);

  let score = 0;
  const reasons = [];
  const notes = [];

  if (exactSlug) {
    score += 0.55;
    reasons.push("slug esatto");
  }

  if (exactName) {
    score += 0.45;
    reasons.push("nome esatto");
  }

  if (explicitAlias) {
    score += 0.36;
    reasons.push("alias esplicito");
  }

  if (alternativeLink) {
    score += 0.12;
    reasons.push("alternativa interna collegata");
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
    score += 0.14;
    reasons.push("movimento compatibile");
  }

  score += tokenJaccard * 0.28;

  if (nameSimilarity >= 0.84) {
    score += 0.1;
    reasons.push("nome simile");
  }

  if (slugSimilarity >= 0.84) {
    score += 0.1;
    reasons.push("slug simile");
  }

  if (imageCount >= MIN_IMAGE_COUNT) {
    reasons.push("2 immagini disponibili");
  }

  if (!technicallySafe) {
    const violation = DISALLOWED_MATCHERS.find((matcher) => matcher.test(target, candidate));
    if (violation) {
      notes.push(violation.reason);
    }
  }

  let confidence = "none";

  const cardioExact =
    technicallySafe &&
    targetBucket === "cardio" &&
    candidateBucket === "cardio" &&
    imageCount >= MIN_IMAGE_COUNT &&
    (exactSlug || exactName || explicitAlias);

  const mobilityExact =
    technicallySafe &&
    targetBucket === "mobility" &&
    candidateBucket === "mobility" &&
    imageCount >= MIN_IMAGE_COUNT &&
    (exactSlug || exactName || explicitAlias);

  const highMatch =
    cardioExact ||
    mobilityExact ||
    (
      technicallySafe &&
      imageCount >= MIN_IMAGE_COUNT &&
      samePrimary &&
      (
        exactSlug ||
        exactName ||
        (explicitAlias && !alternativeLink && (sameMovement || sameCategory) && (sameEquipment || sameCategory)) ||
        (sameEquipment &&
          sameMovement &&
          overlap >= 2 &&
          tokenJaccard >= 0.62 &&
          Math.max(nameSimilarity, slugSimilarity) >= 0.78)
      )
    );

  const mediumMatch =
    technicallySafe &&
    imageCount >= MIN_IMAGE_COUNT &&
    samePrimary &&
    (sameMovement || sameEquipment || alternativeLink) &&
    (overlap >= 1 || tokenJaccard >= 0.4 || nameSimilarity >= 0.72 || slugSimilarity >= 0.72);

  const lowMatch =
    technicallySafe &&
    imageCount >= MIN_IMAGE_COUNT &&
    samePrimary &&
    (tokenJaccard >= 0.28 || nameSimilarity >= 0.66 || slugSimilarity >= 0.66);

  if (highMatch) {
    confidence = "high";
  } else if (mediumMatch) {
    confidence = "medium";
  } else if (lowMatch) {
    confidence = "low";
  }

  return {
    candidate,
    confidence,
    score: Number(Math.min(score, 1).toFixed(4)),
    reason: buildReason(reasons),
    matchedBy: classifyMatchedBy({
      exactSlug,
      exactName,
      explicitAlias,
      alternativeLink,
      sameMovement,
      sameEquipment,
      samePrimary,
    }),
    samePrimary,
    sameEquipment,
    sameCategory,
    sameMovement,
    sourceType,
    notes,
  };
}

function buildTokens(...values) {
  return tokenize(...values.map((value) => normalizeString(value)));
}

function sortCandidates(left, right) {
  const order = ["high", "medium", "low", "none"];
  const leftIndex = order.indexOf(left.confidence);
  const rightIndex = order.indexOf(right.confidence);

  if (leftIndex !== rightIndex) {
    return leftIndex - rightIndex;
  }

  if (right.score !== left.score) {
    return right.score - left.score;
  }

  return String(left.candidate.name).localeCompare(String(right.candidate.name), "it");
}

function escapePipe(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
}

function buildSourceRow(target, best, allowlist) {
  if (!best || best.confidence === "none") {
    return {
      sourceType: "none",
      confidence: "none",
      reason: "nessuna fonte interna o locale affidabile trovata",
      matchedBy: "none",
      wouldApply: false,
      notes: "nessun candidato con compatibilita sufficiente",
    };
  }

  const manualApproved = best.confidence === "medium" && buildPairKeys(target, best.candidate).some((key) => allowlist.has(key));
  const highSafe = best.confidence === "high" && best.sourceType !== "local_asset";
  const sourceType = best.confidence === "high" ? best.sourceType : "manual_review";

  return {
    sourceType,
    confidence: best.confidence,
    reason: best.reason,
    matchedBy: best.matchedBy,
    wouldApply: highSafe || manualApproved,
    notes: [
      best.samePrimary ? "primary ok" : "primary no",
      best.sameEquipment ? "equipment ok" : "equipment no",
      best.sameCategory ? "category ok" : "category no",
      best.sameMovement ? "movement ok" : "movement no",
      `score=${best.score}`,
      ...best.notes,
      manualApproved ? "allowlist approvata" : null,
    ]
      .filter(Boolean)
      .join("; "),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const allowlist = await loadAllowlist(args.allowlistPath);
  const assetInventory = await loadLocalAssetCandidates();

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

  const targets = exercises.filter((exercise) => normalizeArray(exercise.imageUrls).length === 0);
  const exerciseCandidates = exercises
    .filter((exercise) => normalizeArray(exercise.imageUrls).length >= MIN_IMAGE_COUNT)
    .map((exercise) => ({
      ...exercise,
      imageUrls: normalizeArray(exercise.imageUrls).slice(0, 2),
      aliasValues: buildAliasValues(exercise),
      sourceType: candidateSourceType(exercise),
    }));

  const allCandidates = [...exerciseCandidates, ...assetInventory.candidates];
  const rows = [];
  const summary = {
    analyzed: targets.length,
    high: 0,
    medium: 0,
    low: 0,
    none: 0,
    appliedHigh: 0,
    appliedMedium: 0,
    appliedTotal: 0,
    groupA: 0,
    groupB: 0,
    groupC: 0,
    groupD: 0,
    sourceTypes: {
      internal_db: 0,
      local_asset: 0,
      imported_dataset: 0,
      manual_review: 0,
      none: 0,
    },
  };

  for (const target of targets) {
    const best = allCandidates
      .filter((candidate) => candidate.exerciseId !== target.id && candidate.id !== target.id)
      .map((candidate) => scoreCandidate(target, candidate))
      .sort(sortCandidates)[0] ?? null;

    const classification = buildSourceRow(target, best, allowlist);
    summary[classification.confidence] += 1;
    summary.sourceTypes[classification.sourceType] += 1;

    if (classification.sourceType === "internal_db" && classification.confidence === "high") {
      summary.groupA += 1;
    } else if (
      ["imported_dataset", "local_asset"].includes(classification.sourceType) &&
      classification.confidence === "high"
    ) {
      summary.groupB += 1;
    } else if (classification.sourceType === "manual_review") {
      summary.groupC += 1;
    } else if (classification.sourceType === "none") {
      summary.groupD += 1;
    }

    const row = {
      missingExerciseId: target.id,
      missingExerciseName: target.name,
      sourceType: classification.sourceType,
      candidateExerciseId: best?.candidate.exerciseId ?? best?.candidate.id ?? "",
      candidateExerciseName: best?.candidate.name ?? "",
      sourceImageUrls: best ? normalizeArray(best.candidate.imageUrls).slice(0, 2) : [],
      confidence: classification.confidence,
      reason: classification.reason,
      matchedBy: classification.matchedBy,
      wouldApply: classification.wouldApply,
      applied: false,
      notes: classification.notes,
    };

    rows.push(row);
  }

  if (args.apply) {
    for (const row of rows) {
      if (!row.wouldApply || row.sourceImageUrls.length < MIN_IMAGE_COUNT) {
        continue;
      }

      const currentExercise = await prisma.exercise.findUnique({
        where: {
          id: row.missingExerciseId,
        },
        select: {
          id: true,
          name: true,
          imageUrls: true,
        },
      });

      if (!currentExercise) {
        row.notes = `${row.notes}; target non trovato in apply`;
        continue;
      }

      if (normalizeArray(currentExercise.imageUrls).length > 0) {
        row.notes = `${row.notes}; saltato: exercise gia completo o gia aggiornato`;
        row.wouldApply = false;
        continue;
      }

      await prisma.exercise.update({
        where: {
          id: row.missingExerciseId,
        },
        data: {
          imageUrls: row.sourceImageUrls.slice(0, 2),
        },
      });

      row.applied = true;
      summary.appliedTotal += 1;

      if (row.confidence === "high") {
        summary.appliedHigh += 1;
      } else if (row.confidence === "medium") {
        summary.appliedMedium += 1;
      }
    }
  }

  const markdown = [
    "# Backfill immagini esercizi da fonti locali/interne",
    "",
    `Data report: ${REPORT_DATE}`,
    `Modalita: ${args.apply ? "apply" : "dry-run"}`,
    "",
    "## Riepilogo",
    "",
    `- Esercizi senza immagini analizzati: ${summary.analyzed}`,
    `- Match high: ${summary.high}`,
    `- Match medium: ${summary.medium}`,
    `- Match low: ${summary.low}`,
    `- Nessun match: ${summary.none}`,
    `- High applicati: ${summary.appliedHigh}`,
    `- Medium allowlist applicati: ${summary.appliedMedium}`,
    `- Totale applicati: ${summary.appliedTotal}`,
    `- Gruppo A match interno sicuro: ${summary.groupA}`,
    `- Gruppo B match dataset/asset locale sicuro: ${summary.groupB}`,
    `- Gruppo C match da validare manualmente: ${summary.groupC}`,
    `- Gruppo D nessuna fonte disponibile: ${summary.groupD}`,
    "",
    "## Fonti locali rilevate",
    "",
    `- Directory asset scansionate con immagini: ${assetInventory.roots.length > 0 ? assetInventory.roots.join(", ") : "nessuna"}`,
    `- Candidati local_asset con almeno 2 immagini: ${assetInventory.candidates.length}`,
    "",
    "## Report completo",
    "",
    "| missingExerciseId | missingExerciseName | sourceType | candidateExerciseId | candidateExerciseName | sourceImageUrls | confidence | reason | matchedBy | wouldApply | applied | notes |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) =>
      `| ${row.missingExerciseId} | ${escapePipe(row.missingExerciseName)} | ${row.sourceType} | ${row.candidateExerciseId} | ${escapePipe(row.candidateExerciseName)} | ${escapePipe(row.sourceImageUrls.join(" <br> "))} | ${row.confidence} | ${escapePipe(row.reason)} | ${row.matchedBy} | ${row.wouldApply} | ${row.applied} | ${escapePipe(row.notes)} |`
    ),
    "",
  ].join("\n");

  const csv = [
    [
      "missingExerciseId",
      "missingExerciseName",
      "sourceType",
      "candidateExerciseId",
      "candidateExerciseName",
      "sourceImageUrls",
      "confidence",
      "reason",
      "matchedBy",
      "wouldApply",
      "applied",
      "notes",
    ].map(csvCell).join(","),
    ...rows.map((row) =>
      [
        row.missingExerciseId,
        row.missingExerciseName,
        row.sourceType,
        row.candidateExerciseId,
        row.candidateExerciseName,
        row.sourceImageUrls.join(" | "),
        row.confidence,
        row.reason,
        row.matchedBy,
        row.wouldApply,
        row.applied,
        row.notes,
      ].map(csvCell).join(",")
    ),
  ].join("\n");

  const json = JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      reportDate: REPORT_DATE,
      mode: args.apply ? "apply" : "dry-run",
      summary,
      localSourceInventory: {
        scannedRoots: assetInventory.roots,
        localAssetCandidates: assetInventory.candidates.length,
      },
      rows,
    },
    null,
    2
  );

  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(REPORT_PATHS.markdown, `${markdown}\n`);
  await writeFile(REPORT_PATHS.csv, `${csv}\n`);
  await writeFile(REPORT_PATHS.json, `${json}\n`);

  console.log(`Exercise media local sources (${args.apply ? "apply" : "dry-run"})`);
  console.log(`analizzati: ${summary.analyzed}`);
  console.log(`high: ${summary.high}`);
  console.log(`medium: ${summary.medium}`);
  console.log(`low: ${summary.low}`);
  console.log(`none: ${summary.none}`);
  console.log(`appliedHigh: ${summary.appliedHigh}`);
  console.log(`appliedMedium: ${summary.appliedMedium}`);
  console.log(`appliedTotal: ${summary.appliedTotal}`);
  console.log(`groupA: ${summary.groupA}`);
  console.log(`groupB: ${summary.groupB}`);
  console.log(`groupC: ${summary.groupC}`);
  console.log(`groupD: ${summary.groupD}`);
}

main()
  .catch((error) => {
    console.error("EXERCISE_MEDIA_LOCAL_SOURCES_FAILED", {
      message: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
