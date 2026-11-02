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

    if (itemA && !itemB) {
      asvsDiffs.push({
        id,
        title: itemA.title,
        chapter: itemA.chapterId,
        section: itemA.sectionId,
        changeType: "removed",
        oldStatus: itemA.status,
        oldNotes: itemA.notes,
      });
      continue;
    }

    if (itemA && itemB) {
      const statusChanged = (itemA.status || "Missing") !== (itemB.status || "Missing");
      const notesChanged = (itemA.notes || "").trim() !== (itemB.notes || "").trim();
      const traceA = (itemA.traceability || []).map(t => t.id).sort();
      const traceB = (itemB.traceability || []).map(t => t.id).sort();
      const traceAValue = traceA.join(",");
      const traceBValue = traceB.join(",");
      const traceChanged = traceAValue !== traceBValue;
      const changes: ASVSDiffItem["changes"] = [];
      if (statusChanged) changes.push({ field: "status", label: "Stav", oldValue: itemA.status || "Pending", newValue: itemB.status || "Pending" });
      if (notesChanged) changes.push({ field: "notes", label: "Poznámky", oldValue: itemA.notes || "", newValue: itemB.notes || "" });
      if (traceChanged) changes.push({ field: "traceability", label: "Komponenty", oldValue: traceA.join(", ") || "Žiadne", newValue: traceB.join(", ") || "Žiadne" });
      if (itemA.title !== itemB.title) changes.push({ field: "title", label: "Názov", oldValue: itemA.title, newValue: itemB.title });
      if (itemA.description !== itemB.description) changes.push({ field: "description", label: "Popis", oldValue: itemA.description || "", newValue: itemB.description || "" });
      if (itemA.level !== itemB.level) changes.push({ field: "level", label: "Úroveň", oldValue: `L${itemA.level}`, newValue: `L${itemB.level}` });

      if (changes.length > 0) {
        asvsDiffs.push({
          id,
          title: itemB.title,
          chapter: itemB.chapterId,
          section: itemB.sectionId,
          changeType: statusChanged
            ? "status_changed"
            : traceChanged
            ? "traceability_changed"
            : notesChanged
            ? "notes_changed"
            : "details_changed",
          oldStatus: itemA.status,
          newStatus: itemB.status,
          oldNotes: itemA.notes,
          newNotes: itemB.notes,
          oldTraceability: traceA,
          newTraceability: traceB,
          changes,
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
        changes: [
          { field: "description", label: "Popis", oldValue: "—", newValue: tB.description || "—" },
          { field: "likelihood", label: "Pravdepodobnosť", oldValue: "—", newValue: tB.likelihood || "—" },
          { field: "impact", label: "Dopad", oldValue: "—", newValue: tB.impact || "—" },
          { field: "componentIds", label: "Komponenty", oldValue: "—", newValue: (tB.componentIds || []).join(", ") || "—" },
          { field: "asvsRefs", label: "ASVS kontroly", oldValue: "—", newValue: (tB.asvsRefs || []).join(", ") || "—" },
        ],
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
        changes: [
          { field: "description", label: "Popis", oldValue: tA.description || "—", newValue: "—" },
          { field: "likelihood", label: "Pravdepodobnosť", oldValue: tA.likelihood || "—", newValue: "—" },
          { field: "impact", label: "Dopad", oldValue: tA.impact || "—", newValue: "—" },
          { field: "componentIds", label: "Komponenty", oldValue: (tA.componentIds || []).join(", ") || "—", newValue: "—" },
          { field: "asvsRefs", label: "ASVS kontroly", oldValue: (tA.asvsRefs || []).join(", ") || "—", newValue: "—" },
        ],
      });
    } else if (tA && tB) {
      const comparable = (value: unknown) => Array.isArray(value)
        ? [...value].sort().join(", ")
        : String(value ?? "").trim();
      const threatFields: Array<{ field: keyof typeof tA; label: string }> = [
        { field: "title", label: "Názov" },
        { field: "description", label: "Popis" },
        { field: "stride", label: "STRIDE kategória" },
        { field: "likelihood", label: "Pravdepodobnosť" },
        { field: "impact", label: "Dopad" },
        { field: "status", label: "Stav" },
        { field: "risk", label: "Riziko" },
        { field: "mitigation", label: "Mitigácia" },
        { field: "componentIds", label: "Komponenty" },
        { field: "asvsRefs", label: "ASVS kontroly" },
      ];
      const changes = threatFields
        .filter(({ field }) => comparable(tA[field]) !== comparable(tB[field]))
        .map(({ field, label }) => ({
          field: String(field),
          label,
          oldValue: comparable(tA[field]) || "—",
          newValue: comparable(tB[field]) || "—",
        }));
      const statusChanged = tA.status !== tB.status;
      const riskChanged = tA.risk !== tB.risk;
      const mitigationChanged = (tA.mitigation || "").trim() !== (tB.mitigation || "").trim();

      if (changes.length > 0) {
        threatDiffs.push({
          id,
          title: tB.title,
          stride: tB.stride,
          changeType: statusChanged
            ? "status_changed"
            : riskChanged
            ? "risk_changed"
            : mitigationChanged
            ? "mitigation_changed"
            : "details_changed",
          oldStatus: tA.status,
          newStatus: tB.status,
          oldRisk: tA.risk,
          newRisk: tB.risk,
          oldMitigation: tA.mitigation,
          newMitigation: tB.mitigation,
          changes,
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
  const settingsDiffs: ContextDiffItem[] = [];

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

  const settingFields = [
    { field: "targetLevel", label: "Cieľová úroveň ASVS", oldValue: snapA.data?.targetLevel, newValue: snapB.data?.targetLevel },
    { field: "systemType", label: "Typ systému", oldValue: snapA.data?.systemType, newValue: snapB.data?.systemType },
    {
      field: "categorization",
      label: "Kategorizácia projektu",
      oldValue: snapA.data?.categorization,
      newValue: snapB.data?.categorization,
    },
    {
      field: "architectureComponents",
      label: "Architektonické komponenty",
      oldValue: (snapA.data?.architecture?.components || [])
        .map(component => `${component.id || "?"}: ${component.name || "Bez názvu"}`)
        .sort()
        .join("\n"),
      newValue: (snapB.data?.architecture?.components || [])
        .map(component => `${component.id || "?"}: ${component.name || "Bez názvu"}`)
        .sort()
        .join("\n"),
    },
    {
      field: "architectureFlows",
      label: "Dátové toky",
      oldValue: (snapA.data?.architecture?.flows || [])
        .map(flow => `${flow.id || "?"}: ${flow.from || "?"} → ${flow.to || "?"} (${flow.protocol || "bez protokolu"})`)
        .sort()
        .join("\n"),
      newValue: (snapB.data?.architecture?.flows || [])
        .map(flow => `${flow.id || "?"}: ${flow.from || "?"} → ${flow.to || "?"} (${flow.protocol || "bez protokolu"})`)
        .sort()
        .join("\n"),
    },
  ];
  for (const setting of settingFields) {
    const serialize = (value: unknown) => value === undefined
      ? ""
      : typeof value === "string"
      ? value
      : JSON.stringify(value) || String(value);
    if (serialize(setting.oldValue) !== serialize(setting.newValue)) {
      settingsDiffs.push({
        field: setting.field,
        label: setting.label,
        oldValue: serialize(setting.oldValue) || "Nevyplnené",
        newValue: serialize(setting.newValue) || "Nevyplnené",
        isDifferent: true,
      });
    }
  }

  const totalChangesCount = asvsDiffs.length + threatDiffs.length + contextDiffs.length + settingsDiffs.length;

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
    settingsDiffs,
    totalChangesCount,
  };
}
