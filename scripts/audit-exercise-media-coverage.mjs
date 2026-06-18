import {
  DEFAULT_PROGRAM_LIMIT,
  DEFAULT_TOP_LIMIT,
  getMissingMediaCoverage,
  parseIntegerArg,
  printCoverageReport,
  prisma,
} from "./exercise-media-coverage-helpers.mjs";

async function main() {
  const argv = process.argv.slice(2);
  const programLimit = parseIntegerArg(argv, "programs", DEFAULT_PROGRAM_LIMIT);
  const topLimit = parseIntegerArg(argv, "top", DEFAULT_TOP_LIMIT);
  const coverage = await getMissingMediaCoverage({ programLimit });

  printCoverageReport(coverage, topLimit);
}

main()
  .catch((error) => {
    console.error("EXERCISE_MEDIA_COVERAGE_AUDIT_FAILED", {
      message: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
