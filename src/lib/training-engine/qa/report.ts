import type { QaCheck } from "./validators";

export type ScenarioQaReport = {
  scenarioId: string;
  scenarioName: string;
  checks: QaCheck[];
};

export type TrainingEngineQaReport = {
  scenarios: ScenarioQaReport[];
  passed: number;
  warnings: number;
  failed: number;
  exitCode: 0 | 1;
};

function formatCheck(check: QaCheck) {
  return `* ${check.label}: ${check.status}${check.detail ? ` — ${check.detail}` : ""}`;
}

export function formatTrainingEngineQaReport(report: TrainingEngineQaReport) {
  const sections = ["Training Engine QA Report", ""];

  for (const scenario of report.scenarios) {
    const failures = scenario.checks.filter((check) => check.status === "FAIL");
    const warnings = scenario.checks.filter((check) => check.status === "WARN");
    const status = failures.length > 0 ? "FAIL" : warnings.length > 0 ? "WARN" : "PASS";

    sections.push(`Scenario: ${scenario.scenarioName}`);
    sections.push(`Status: ${status}`);
    sections.push("Checks:");

    for (const check of scenario.checks) {
      sections.push(formatCheck(check));
    }

    if (warnings.length > 0) {
      sections.push("Warnings:");
      for (const warning of warnings) {
        sections.push(`* ${warning.label}${warning.detail ? ` — ${warning.detail}` : ""}`);
      }
    }

    if (failures.length > 0) {
      sections.push("Failures:");
      for (const failure of failures) {
        sections.push(`* ${failure.label}${failure.detail ? ` — ${failure.detail}` : ""}`);
      }
    }

    sections.push("");
  }

  sections.push("Summary:");
  sections.push(`* scenarios: ${report.scenarios.length}`);
  sections.push(`* passed: ${report.passed}`);
  sections.push(`* warnings: ${report.warnings}`);
  sections.push(`* failed: ${report.failed}`);
  sections.push("");
  sections.push("Exit code:");
  sections.push(`* ${report.exitCode}`);

  return sections.join("\n");
}
