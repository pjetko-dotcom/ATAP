import { ASVSRequirement } from "../data/asvsData";
import { sanitizeCsvCell } from "./csv";
import { reportText, type ReportLanguage } from "./reportLanguage";

export interface Finding {
  id: string;
  title: string;
  description: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Closed";
  asvsRef: string;
}

export function isFinding(value: unknown): value is Finding {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const finding = value as Record<string, unknown>;
  return typeof finding.id === "string" &&
    typeof finding.title === "string" &&
    typeof finding.description === "string" &&
    ["Critical", "High", "Medium", "Low"].includes(finding.severity as string) &&
    ["Open", "In Progress", "Closed"].includes(finding.status as string) &&
    typeof finding.asvsRef === "string";
}

export function createFindingsCsv(findings: readonly Finding[], language: ReportLanguage): string {
  const headers = [
    "ID",
    reportText(language, "Zistenie", "Finding"),
    reportText(language, "Popis", "Description"),
    reportText(language, "Závažnosť", "Severity"),
    reportText(language, "Stav", "Status"),
    reportText(language, "Referencia ASVS", "ASVS Reference"),
  ];
  const rows = findings.map(finding => [
    finding.id, finding.title, finding.description, finding.severity, finding.status, finding.asvsRef,
  ].map(sanitizeCsvCell).join(","));
  return `\uFEFF${headers.map(sanitizeCsvCell).join(",")}\r\n${rows.join("\r\n")}`;
}

export function generateFindingsFromAsvs(
  requirements: ASVSRequirement[],
  existingFindings: Finding[]
): Finding[] {
  return requirements
    .filter(requirement => requirement.status === "Missing" || requirement.status === "Partial")
    .map(requirement => {
      const existing = existingFindings.find(finding => finding.asvsRef === requirement.id);

      return {
        id: existing?.id || `F-${requirement.id}`,
        title: requirement.title,
        description: requirement.description,
        severity: requirement.level === 3 ? "High" : requirement.level === 2 ? "Medium" : "Low",
        status: existing?.status || "Open",
        asvsRef: requirement.id,
      };
    });
}
