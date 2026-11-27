/**
 * Helper to compute diffs between two versions of an analysis.
 */
import { AnalysisVersionSnapshot, VersionDiffResult, ASVSDiffItem, ThreatDiffItem, ContextDiffItem } from "../types/versioning";
import { reportText, type ReportLanguage } from "./reportLanguage";

export function computeVersionDiff(
  snapA: AnalysisVersionSnapshot,
  snapB: AnalysisVersionSnapshot,
  language: ReportLanguage = "sk"
): VersionDiffResult {
  const t = (sk: string, en: string) => reportText(language, sk, en);
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
      if (statusChanged) changes.push({ field: "status", label: t("Stav", "Status"), oldValue: itemA.status || "Pending", newValue: itemB.status || "Pending" });
      if (notesChanged) changes.push({ field: "notes", label: t("Poznámky", "Notes"), oldValue: itemA.notes || "", newValue: itemB.notes || "" });
      if (traceChanged) changes.push({ field: "traceability", label: t("Komponenty", "Components"), oldValue: traceA.join(", ") || t("Žiadne", "None"), newValue: traceB.join(", ") || t("Žiadne", "None") });
      if (itemA.title !== itemB.title) changes.push({ field: "title", label: t("Názov", "Title"), oldValue: itemA.title, newValue: itemB.title });
      if (itemA.description !== itemB.description) changes.push({ field: "description", label: t("Popis", "Description"), oldValue: itemA.description || "", newValue: itemB.description || "" });
      if (itemA.level !== itemB.level) changes.push({ field: "level", label: t("Úroveň", "Level"), oldValue: `L${itemA.level}`, newValue: `L${itemB.level}` });

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
          { field: "description", label: t("Popis", "Description"), oldValue: "—", newValue: tB.description || "—" },
          { field: "likelihood", label: t("Pravdepodobnosť", "Likelihood"), oldValue: "—", newValue: tB.likelihood || "—" },
          { field: "impact", label: t("Dopad", "Impact"), oldValue: "—", newValue: tB.impact || "—" },
          { field: "componentIds", label: t("Komponenty", "Components"), oldValue: "—", newValue: (tB.componentIds || []).join(", ") || "—" },
          { field: "asvsRefs", label: t("ASVS kontroly", "ASVS controls"), oldValue: "—", newValue: (tB.asvsRefs || []).join(", ") || "—" },
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
          { field: "description", label: t("Popis", "Description"), oldValue: tA.description || "—", newValue: "—" },
          { field: "likelihood", label: t("Pravdepodobnosť", "Likelihood"), oldValue: tA.likelihood || "—", newValue: "—" },
          { field: "impact", label: t("Dopad", "Impact"), oldValue: tA.impact || "—", newValue: "—" },
          { field: "componentIds", label: t("Komponenty", "Components"), oldValue: (tA.componentIds || []).join(", ") || "—", newValue: "—" },
          { field: "asvsRefs", label: t("ASVS kontroly", "ASVS controls"), oldValue: (tA.asvsRefs || []).join(", ") || "—", newValue: "—" },
        ],
      });
    } else if (tA && tB) {
      const comparable = (value: unknown) => Array.isArray(value)
        ? [...value].sort().join(", ")
        : String(value ?? "").trim();
      const threatFields: Array<{ field: keyof typeof tA; label: string }> = [
        { field: "title", label: t("Názov", "Title") },
        { field: "description", label: t("Popis", "Description") },
        { field: "stride", label: t("STRIDE kategória", "STRIDE category") },
        { field: "likelihood", label: t("Pravdepodobnosť", "Likelihood") },
        { field: "impact", label: t("Dopad", "Impact") },
        { field: "status", label: t("Stav", "Status") },
        { field: "risk", label: t("Riziko", "Risk") },
        { field: "mitigation", label: t("Mitigácia", "Mitigation") },
        { field: "componentIds", label: t("Komponenty", "Components") },
        { field: "asvsRefs", label: t("ASVS kontroly", "ASVS controls") },
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
    { key: "businessPurpose", label: t("Obchodný účel", "Business Purpose") },
    { key: "dataClassification", label: t("Klasifikácia dát", "Data Classification") },
    { key: "complianceRequirements", label: t("Štandardy súladu", "Compliance Standards") },
    { key: "userTypes", label: t("Používateľské roly a typy", "User Roles & Types") },
    { key: "internetFacing", label: t("Prístup z internetu", "Internet Facing") },
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
    { field: "targetLevel", label: t("Cieľová úroveň ASVS", "Target ASVS level"), oldValue: snapA.data?.targetLevel, newValue: snapB.data?.targetLevel },
    { field: "systemType", label: t("Typ systému", "System type"), oldValue: snapA.data?.systemType, newValue: snapB.data?.systemType },
    {
      field: "categorization",
      label: t("Kategorizácia projektu", "Project categorization"),
      oldValue: snapA.data?.categorization,
      newValue: snapB.data?.categorization,
    },
    {
      field: "architectureComponents",
      label: t("Architektonické komponenty", "Architecture components"),
      oldValue: (snapA.data?.architecture?.components || [])
        .map(component => `${component.id || "?"}: ${component.name || t("Bez názvu", "Unnamed")}`)
        .sort()
        .join("\n"),
      newValue: (snapB.data?.architecture?.components || [])
        .map(component => `${component.id || "?"}: ${component.name || t("Bez názvu", "Unnamed")}`)
        .sort()
        .join("\n"),
      oldComparable: (snapA.data?.architecture?.components || []).map(component => JSON.stringify([component.id, component.name])).sort().join("\n"),
      newComparable: (snapB.data?.architecture?.components || []).map(component => JSON.stringify([component.id, component.name])).sort().join("\n"),
    },
    {
      field: "architectureFlows",
      label: t("Dátové toky", "Data flows"),
      oldValue: (snapA.data?.architecture?.flows || [])
        .map(flow => `${flow.id || "?"}: ${flow.from || "?"} → ${flow.to || "?"} (${flow.protocol || t("bez protokolu", "no protocol")})`)
        .sort()
        .join("\n"),
      newValue: (snapB.data?.architecture?.flows || [])
        .map(flow => `${flow.id || "?"}: ${flow.from || "?"} → ${flow.to || "?"} (${flow.protocol || t("bez protokolu", "no protocol")})`)
        .sort()
        .join("\n"),
      oldComparable: (snapA.data?.architecture?.flows || []).map(flow => JSON.stringify([flow.id, flow.from, flow.to, flow.protocol])).sort().join("\n"),
      newComparable: (snapB.data?.architecture?.flows || []).map(flow => JSON.stringify([flow.id, flow.from, flow.to, flow.protocol])).sort().join("\n"),
    },
  ];
  for (const setting of settingFields) {
    const serialize = (value: unknown) => value === undefined
      ? ""
      : typeof value === "string"
      ? value
      : JSON.stringify(value) || String(value);
    const oldComparable = "oldComparable" in setting ? setting.oldComparable : setting.oldValue;
    const newComparable = "newComparable" in setting ? setting.newComparable : setting.newValue;
    if (serialize(oldComparable) !== serialize(newComparable)) {
      settingsDiffs.push({
        field: setting.field,
        label: setting.label,
        oldValue: serialize(setting.oldValue) || t("Nevyplnené", "Not set"),
        newValue: serialize(setting.newValue) || t("Nevyplnené", "Not set"),
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
