import fs from "node:fs";
import path from "node:path";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const cwd = process.cwd();

function resolveMaybeTs(basePath) {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    path.join(basePath, "index.ts"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return pathToFileURL(candidate).href;
    }
  }

  return pathToFileURL(basePath).href;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(
        resolveMaybeTs(path.join(cwd, "src", specifier.slice(2))),
        context
      );
    }

    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      context.parentURL?.startsWith("file:") &&
      !path.extname(specifier)
    ) {
      const parentPath = fileURLToPath(context.parentURL);
      return nextResolve(
        resolveMaybeTs(path.resolve(path.dirname(parentPath), specifier)),
        context
      );
    }

    return nextResolve(specifier, context);
  },
});

const qaModule = await import("../src/lib/training-engine/qa/training-engine-qa.ts");
const { report, text } = qaModule.runAndFormatTrainingEngineQa();

console.log(text);
process.exitCode = report.exitCode;
