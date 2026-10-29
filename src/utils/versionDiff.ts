/**
 * Helper to compute diffs between two versions of an analysis.
 */
import { AnalysisVersionSnapshot, VersionDiffResult, ASVSDiffItem, ThreatDiffItem, ContextDiffItem } from "../types/versioning";

export function computeVersionDiff(
  snapA: AnalysisVersionSnapshot,
  snapB: AnalysisVersionSnapshot
): VersionDiffResult {
  // 1. Metrics Delta
  const metricsDelta = {
    asvsCoverageDelta: (snapB.metrics?.asvsCoverage ?? 0) - (snapA.metrics?.asvsCoverage ?? 0),
    openThreatsDelta: (snapB.metrics?.totalOpenThreats ?? 0) - (snapA.metrics?.totalOpenThreats ?? 0),
    criticalRisksDelta: (snapB.metrics?.criticalRisks ?? 0) - (snapA.metrics?.criticalRisks ?? 0),
    openFindingsDelta: (snapB.metrics?.openFindings ?? 0) - (snapA.metrics?.openFindings ?? 0),
    implementedDelta: (snapB.metrics?.totalImplemented ?? 0) - (snapA.metrics?.totalImplemented ?? 0),
    levelA: snapA.asvsLevel || "2",
    levelB: snapB.asvsLevel || "2",
  };

  // 2. ASVS Requirements Diff
  const reqsA = snapA.data?.asvsReqs || [];
  const reqsB = snapB.data?.asvsReqs || [];
  const reqMapA = new Map(reqsA.map(r => [r.id, r]));
  const reqMapB = new Map(reqsB.map(r => [r.id, r]));

  const allReqIds = Array.from(new Set([...reqMapA.keys(), ...reqMapB.keys()]));
  const asvsDiffs: ASVSDiffItem[] = [];

  for (const id of allReqIds) {
    const itemA = reqMapA.get(id);
    const itemB = reqMapB.get(id);

    if (!itemA && itemB) {
      asvsDiffs.push({
        id,
        title: itemB.title,
        chapter: itemB.chapterId,
        section: itemB.sectionId,
        changeType: "added",
        newStatus: itemB.status,
        newNotes: itemB.notes,
      });
      continue;
    }

    if (itemA && itemB) {
      const statusChanged = (itemA.status || "Missing") !== (itemB.status || "Missing");
      const notesChanged = (itemA.notes || "").trim() !== (itemB.notes || "").trim();
      const traceA = (itemA.traceability || []).map(t => t.id).sort().join(",");
      const traceB = (itemB.traceability || []).map(t => t.id).sort().join(",");
      const traceChanged = traceA !== traceB;

      if (statusChanged || notesChanged || traceChanged) {
        asvsDiffs.push({
          id,
          title: itemB.title,
          chapter: itemB.chapterId,
          section: itemB.sectionId,
          changeType: statusChanged
            ? "status_changed"
            : traceChanged
            ? "traceability_changed"
            : "notes_changed",
          oldStatus: itemA.status,
          newStatus: itemB.status,
          oldNotes: itemA.notes,
          newNotes: itemB.notes,
          oldTraceability: (itemA.traceability || []).map(t => t.id),
          newTraceability: (itemB.traceability || []).map(t => t.id),
        });
      }
    }
  }

  // 3. Threat Register Diff
  const threatsA = snapA.data?.threats || [];
  const threatsB = snapB.data?.threats || [];
  const threatMapA = new Map(threatsA.map(t => [t.id, t]));
  const threatMapB = new Map(threatsB.map(t => [t.id, t]));

  const allThreatIds = Array.from(new Set([...threatMapA.keys(), ...threatMapB.keys()]));
  const threatDiffs: ThreatDiffItem[] = [];

  for (const id of allThreatIds) {
    const tA = threatMapA.get(id);
    const tB = threatMapB.get(id);

    if (!tA && tB) {
      threatDiffs.push({
        id,
        title: tB.title,
        stride: tB.stride,
        changeType: "added",
        newStatus: tB.status,
        newRisk: tB.risk,
        newMitigation: tB.mitigation,
      });
    } else if (tA && !tB) {
      threatDiffs.push({
        id,
        title: tA.title,
        stride: tA.stride,
        changeType: "removed",
        oldStatus: tA.status,
        oldRisk: tA.risk,
        oldMitigation: tA.mitigation,
      });
    } else if (tA && tB) {
      const statusChanged = tA.status !== tB.status;
      const riskChanged = tA.risk !== tB.risk;
      const mitigationChanged = (tA.mitigation || "").trim() !== (tB.mitigation || "").trim();

      if (statusChanged || riskChanged || mitigationChanged) {
        threatDiffs.push({
          id,
          title: tB.title,
          stride: tB.stride,
          changeType: statusChanged
            ? "status_changed"
            : riskChanged
            ? "risk_changed"
            : "mitigation_changed",
          oldStatus: tA.status,
          newStatus: tB.status,
          oldRisk: tA.risk,
          newRisk: tB.risk,
          oldMitigation: tA.mitigation,
          newMitigation: tB.mitigation,
        });
      }
    }
  }

  // 4. Context Diff
  const ctxA = snapA.data?.context || {
    businessPurpose: "",
    dataClassification: "",
    complianceRequirements: [],
    userTypes: [],
    internetFacing: false,
  };
  const ctxB = snapB.data?.context || {
    businessPurpose: "",
    dataClassification: "",
    complianceRequirements: [],
    userTypes: [],
    internetFacing: false,
  };

  const contextFields = [
    { key: "businessPurpose", label: "Business Purpose" },
    { key: "dataClassification", label: "Data Classification" },
    { key: "complianceRequirements", label: "Compliance Standards" },
    { key: "userTypes", label: "User Roles & Types" },
    { key: "internetFacing", label: "Internet Facing" },
  ];

  const contextDiffs: ContextDiffItem[] = [];

  for (const f of contextFields) {
    const valA = (ctxA as any)[f.key];
    const valB = (ctxB as any)[f.key];

    let isDifferent = false;
    if (Array.isArray(valA) && Array.isArray(valB)) {
      const strA = [...valA].sort().join(", ");
      const strB = [...valB].sort().join(", ");
      isDifferent = strA !== strB;
    } else {
      isDifferent = valA !== valB;
    }

    if (isDifferent) {
      contextDiffs.push({
        field: f.key,
        label: f.label,
        oldValue: valA,
        newValue: valB,
        isDifferent: true,
      });
    }
  }

  const totalChangesCount = asvsDiffs.length + threatDiffs.length + contextDiffs.length;

  return {
    versionA: snapA.version,
    versionB: snapB.version,
    dateA: snapA.createdAt,
    dateB: snapB.createdAt,
    labelA: snapA.label,
    labelB: snapB.label,
    metricsDelta,
    asvsDiffs,
    threatDiffs,
    contextDiffs,
    totalChangesCount,
  };
}
