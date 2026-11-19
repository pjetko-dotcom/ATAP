export interface AsvsCoverageItem {
  level: number;
  status: string;
}

export function calculateAsvsCoverage(
  requirements: readonly AsvsCoverageItem[],
  targetLevel: number | "all" = "all"
): number {
  const evaluated = requirements.filter(requirement =>
    (targetLevel === "all" || requirement.level <= targetLevel) &&
    ["Implemented", "Partial", "Missing"].includes(requirement.status)
  );
  if (evaluated.length === 0) return 0;

  const implemented = evaluated.filter(requirement => requirement.status === "Implemented").length;
  const partial = evaluated.filter(requirement => requirement.status === "Partial").length;
  return Math.round(((implemented + partial * 0.5) / evaluated.length) * 100);
}
