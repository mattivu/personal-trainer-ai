#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const targetPaths = [
  "src/app",
  "src/components",
  "src/lib/ai",
  "src/lib/workout-execution.ts",
  "src/lib/workout-history.ts",
  "src/lib/weekly-review.ts",
  "src/lib/block-review.ts",
  "src/lib/nutrition",
  "src/lib/training-engine/generate-program.ts",
  "src/lib/training-engine/program-builder-v2.ts",
  "src/lib/training-engine/training-rules.ts",
  "src/lib/training-engine/training-strategy.ts",
];
const ignoredFiles = new Set(["src/lib/nutrition/food-estimator.ts"]);

const bannedTerms = [
  "Programma creato con Training Engine",
  "Training Engine",
  "Builder v2",
  "builder",
  "questionario v2",
  "questionario v2 normalizzato",
  "upper_lower",
  "push_pull_legs",
  "full_body",
  "body_part_split",
  "hybrid_specialization",
  "normalized",
  "normalizzato",
  "blueprint",
  "write-back",
  "adaptive engine",
  "sourceMetadata",
  "qualityStatus",
  "externalSource",
  "payload",
  "Prisma",
  "debug",
  "mock",
  "engine",
  "strategy",
  "strategia",
  "blocco",
  "log",
  "JSON",
  "API",
  "QA",
  "v2",
];

const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const ignoredLiteralPatterns = [
  /^\/api\//i,
  /^@\//,
  /^\.\//,
  /^@prisma/i,
  /^application\/json$/i,
  /^set-log-\$\{/i,
  /^[a-z_]+$/i,
  /^[a-z_]+\d+$/i,
  /^[a-z_]+_[a-z_]+$/i,
  /^\\b.*\\b$/,
  /\$\{/,
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function walk(entryPath) {
  const absolutePath = path.join(rootDir, entryPath);
  const stats = fs.statSync(absolutePath);

  if (stats.isDirectory()) {
    if (entryPath.includes(`${path.sep}api`) || entryPath.endsWith("api")) {
      return [];
    }
    const entries = fs.readdirSync(absolutePath, { withFileTypes: true });
    return entries.flatMap((entry) => walk(path.join(entryPath, entry.name)));
  }

  if (!allowedExtensions.has(path.extname(entryPath))) {
    return [];
  }

  if (ignoredFiles.has(entryPath)) {
    return [];
  }

  if (
    entryPath.includes(`${path.sep}qa${path.sep}`) ||
    entryPath.includes(`${path.sep}mock`) ||
    entryPath.includes(`${path.sep}__tests__${path.sep}`)
  ) {
    return [];
  }

  return [entryPath];
}

const files = targetPaths.flatMap((entryPath) => walk(entryPath));
const patterns = bannedTerms.map((term) => ({
  term,
  regex: new RegExp(`\\b${escapeRegExp(term)}\\b`, "i"),
}));

function extractStringLiterals(line) {
  return Array.from(line.matchAll(/(["'`])((?:\\.|(?!\1).)*)\1/g), (match) => match[2]);
}

function shouldIgnoreLiteral(literal) {
  return ignoredLiteralPatterns.some((pattern) => pattern.test(literal));
}

const findings = [];

for (const relativePath of files) {
  const absolutePath = path.join(rootDir, relativePath);
  const content = fs.readFileSync(absolutePath, "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const literals = extractStringLiterals(line).filter(
      (literal) => !shouldIgnoreLiteral(literal)
    );

    for (const literal of literals) {
      for (const pattern of patterns) {
        if (!pattern.regex.test(literal)) {
          continue;
        }

        findings.push({
          file: relativePath,
          line: index + 1,
          term: pattern.term,
          snippet: literal.trim(),
        });
      }
    }

  });
}

if (findings.length === 0) {
  console.log("Nessun termine sospetto trovato nei file controllati.");
  process.exit(0);
}

for (const finding of findings) {
  console.log(
    `${finding.file}:${finding.line} | ${finding.term} | ${finding.snippet}`
  );
}

process.exit(1);
