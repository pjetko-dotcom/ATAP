import { asvsRequirements, type ASVSRequirement } from "../data/asvsData";
import { calculateAsvsCoverage } from "./asvsMetrics";
import { getInitialThreatsForAnalysis, summarizeThreats, type Threat } from "./threatModel";

type ReportRequirement = Omit<ASVSRequirement, "status"> & { status: ASVSRequirement["status"] | "Pending" };
type ReportThreat = Pick<Threat, "status" | "risk">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function loadRequirements(raw: string | null): { requirements: ReportRequirement[]; defaultIds: Set<string> } {
  if (!raw) return { requirements: asvsRequirements, defaultIds: new Set(asvsRequirements.map(r => r.id)) };
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Invalid ASVS data");
  const saved = new Map<string, Record<string, unknown>>();
  for (const item of parsed) {
    if (!isRecord(item) || typeof item.id !== "string" || saved.has(item.id) ||
      (item.status != null && item.status !== "" && !["Implemented", "Partial", "Missing", "N/A", "Pending"].includes(String(item.status))) ||
      (item.notes != null && typeof item.notes !== "string")) {
      throw new Error("Invalid ASVS requirement");
    }
    saved.set(item.id, item);
  }
  const defaultIds = new Set<string>();
  const requirements = asvsRequirements.map(requirement => {
    const item = saved.get(requirement.id);
    if (!item?.status) defaultIds.add(requirement.id);
    return {
      ...requirement,
      status: (item?.status || requirement.status) as ReportRequirement["status"],
      notes: (item?.notes || requirement.notes) as string,
    };
  });
  return { requirements, defaultIds };
}

function loadThreats(raw: string | null, analysisId: string): ReportThreat[] {
  if (!raw) return getInitialThreatsForAnalysis(analysisId);
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every(item =>
    isRecord(item) &&
    typeof item.status === "string" && ["Open", "Mitigated", "Remediated", "Accepted"].includes(item.status) &&
    typeof item.risk === "string" && ["Very Low", "Low", "Medium", "High", "Critical"].includes(item.risk)
  )) throw new Error("Invalid threat data");
  return parsed as ReportThreat[];
}

export function getExecutiveReportData(storage: Pick<Storage, "getItem">, analysisId: string, asvsLevel: string | number) {
  const { requirements: reqs, defaultIds } = loadRequirements(storage.getItem(`atap_asvs_v5_${analysisId}`));
  const storedLevel = storage.getItem(`atap_asvs_target_level_${analysisId}`);
  const fallbackLevel = Number(asvsLevel);
  const targetLevel = storedLevel === "all" ? "all" :
    storedLevel && ["1", "2", "3"].includes(storedLevel) ? Number(storedLevel) :
    [1, 2, 3].includes(fallbackLevel) ? fallbackLevel : 2;
  if (storedLevel && storedLevel !== "all" && !["1", "2", "3"].includes(storedLevel)) {
    throw new Error("Invalid ASVS target level");
  }
  const scoped = reqs.filter(r => targetLevel === "all" || r.level <= targetLevel);
  const rawThreats = storage.getItem(`atap_threats_${analysisId}`);
  const threatSummary = summarizeThreats(loadThreats(rawThreats, analysisId));
  return {
    targetLevel, scoped, threatSummary,
    defaultCount: scoped.filter(r => defaultIds.has(r.id)).length,
    usesDemoThreats: rawThreats === null && analysisId === "1",
  };
}

export function getExecutiveCoverage(requirements: readonly ReportRequirement[]) {
  const evaluated = requirements.filter(r => ["Implemented", "Partial", "Missing"].includes(r.status)).length;
  return {
    evaluated,
    score: evaluated ? calculateAsvsCoverage(requirements) : null,
    pending: requirements.filter(r => r.status === "Pending").length,
  };
}
