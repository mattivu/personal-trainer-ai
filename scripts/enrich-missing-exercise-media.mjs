import {
  DEFAULT_PROGRAM_LIMIT,
  DEFAULT_TOP_LIMIT,
  findFreeExerciseDbMediaMatch,
  getMissingMediaCoverage,
  getMovementBucket,
  hasImages,
  loadFreeExerciseDbMediaSources,
  normalizeArray,
  normalizeObject,
  parseIntegerArg,
  prisma,
} from "./exercise-media-coverage-helpers.mjs";

function buildSourceMetadata(currentMetadata, match) {
  return {
    ...normalizeObject(currentMetadata),
    mediaEnrichmentV2: {
      source: "free_exercise_db",
      matchedExerciseId: match.source.id,
      matchedSlug: match.source.slug,
      imageCount: normalizeArray(match.source.imageUrls).length,
      enrichedAt: new Date().toISOString(),
      reviewedBy: "media_coverage_v2",
      note:
        "Immagini aggiunte da esercizio free-exercise-db corrispondente senza modificare la logica dell'esercizio.",
    },
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const limit = parseIntegerArg(argv, "limit", DEFAULT_TOP_LIMIT);
  const programLimit = parseIntegerArg(argv, "programs", DEFAULT_PROGRAM_LIMIT);
  const coverage = await getMissingMediaCoverage({ programLimit });
  const targets = coverage.missingExercises.slice(0, limit);
  const sourceExercises = await loadFreeExerciseDbMediaSources();

  const summary = {
    analyzed: targets.length,
    enriched: 0,
    cardioEnriched: 0,
    notFound: 0,
    skippedForLicense: 0,
    errors: 0,
  };

  const enrichedRows = [];
  const notFoundRows = [];

  console.log("Exercise missing media enrichment");
  console.log(`programmi analizzati: ${coverage.analyzedPrograms}`);
  console.log(`target considerati: ${targets.length}`);

  for (const target of targets) {
    try {
      const currentExercise = await prisma.exercise.findUnique({
        where: {
          id: target.exerciseId,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrls: true,
          sourceMetadata: true,
        },
      });

      if (!currentExercise) {
        summary.notFound += 1;
        notFoundRows.push(`${target.name} | esercizio non piu presente`);
        continue;
      }

      if (hasImages(currentExercise.imageUrls)) {
        summary.notFound += 1;
        notFoundRows.push(`${target.name} | gia arricchito in precedenza`);
        continue;
      }

      const match = findFreeExerciseDbMediaMatch(target, sourceExercises);

      if (!match) {
        summary.notFound += 1;
        notFoundRows.push(`${target.name} | nessun match prudente trovato`);
        continue;
      }

      if (match.source.externalSource !== "free_exercise_db") {
        summary.skippedForLicense += 1;
        notFoundRows.push(`${target.name} | fonte non chiara`);
        continue;
      }

      const nextImageUrls = normalizeArray(match.source.imageUrls);

      await prisma.exercise.update({
        where: {
          id: currentExercise.id,
        },
        data: {
          imageUrls: nextImageUrls,
          sourceMetadata: buildSourceMetadata(currentExercise.sourceMetadata, match),
        },
      });

      summary.enriched += 1;

      if (getMovementBucket(target) === "cardio") {
        summary.cardioEnriched += 1;
      }

      enrichedRows.push(
        `${target.name} | match=${match.source.name} | slug=${match.source.slug} | reason=${match.reason} | images=${nextImageUrls.length}`
      );
    } catch (error) {
      summary.errors += 1;
      console.error("EXERCISE_MEDIA_ENRICHMENT_ERROR", {
        exerciseId: target.exerciseId,
        name: target.name,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log("");
  console.log("Esercizi arricchiti");
  if (enrichedRows.length === 0) {
    console.log("nessuno");
  } else {
    enrichedRows.forEach((row, index) => {
      console.log(`${index + 1}. ${row}`);
    });
  }

  console.log("");
  console.log("Esercizi non trovati o saltati");
  if (notFoundRows.length === 0) {
    console.log("nessuno");
  } else {
    notFoundRows.forEach((row, index) => {
      console.log(`${index + 1}. ${row}`);
    });
  }

  console.log("");
  console.log("Summary");
  console.log(`esercizi analizzati: ${summary.analyzed}`);
  console.log(`esercizi arricchiti: ${summary.enriched}`);
  console.log(`cardio arricchiti: ${summary.cardioEnriched}`);
  console.log(`esercizi non trovati: ${summary.notFound}`);
  console.log(`saltati per licenza/fonte non chiara: ${summary.skippedForLicense}`);
  console.log(`errori: ${summary.errors}`);
}

main()
  .catch((error) => {
    console.error("EXERCISE_MEDIA_ENRICHMENT_FAILED", {
      message: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
