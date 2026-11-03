import { ASVSRequirement } from "../data/asvsData";

export interface Finding {
  id: string;
  title: string;
  description: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Closed";
  asvsRef: string;
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
