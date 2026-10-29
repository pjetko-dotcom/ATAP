/**
 * Backup & Restore Utility
 * Handles full JSON export and restore for security analyses, architecture models,
 * ASVS requirement statuses, triage answers, audit logs, and version snapshots.
 * 
 * @module backupRestore
 */
import FileSaver from "file-saver";

const { saveAs } = FileSaver;

export interface ProjectBackupData {
  version: "1.0";
  exportedAt: string;
  project: Record<string, unknown>;
  asvsReqs?: unknown[];
  auditLogs?: unknown[];
  triageAnswers?: Record<string, boolean>;
  context?: Record<string, unknown>;
  targetLevel?: number | "all";
  architecture?: Record<string, unknown>;
  threats?: unknown[];
}

export interface FullBackupArchive {
  backupFormatVersion: "1.0";
  type: "atap_full_backup";
  exportedAt: string;
  projectsCount: number;
  projects: ProjectBackupData[];
}

/**
 * Collects all data for a single project into a structured JSON backup object.
 */
export function getProjectBackupObject(analysisId: string): ProjectBackupData | null {
  try {
    const rawAnalyses = localStorage.getItem("atap_analyses");
    if (!rawAnalyses) return null;
    const analyses = JSON.parse(rawAnalyses);
    const project = analyses.find((a: any) => a.id === analysisId);
    if (!project) return null;

    const asvsReqs = JSON.parse(localStorage.getItem(`atap_asvs_v5_${analysisId}`) || "null");
    const auditLogs = JSON.parse(localStorage.getItem(`atap_logs_v5_${analysisId}`) || "null");
    const triageAnswers = JSON.parse(localStorage.getItem(`atap_triage_v5_${analysisId}`) || "null");
    const context = JSON.parse(localStorage.getItem(`atap_context_${analysisId}`) || "null");
    const targetLevel = localStorage.getItem(`atap_asvs_target_level_${analysisId}`) || null;
    const architecture = JSON.parse(localStorage.getItem(`atap_architecture_${analysisId}`) || "null");
    const threats = JSON.parse(localStorage.getItem(`atap_threats_${analysisId}`) || "null");

    return {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      project,
      asvsReqs: asvsReqs || undefined,
      auditLogs: auditLogs || undefined,
      triageAnswers: triageAnswers || undefined,
      context: context || undefined,
      targetLevel: targetLevel ? (targetLevel === "all" ? "all" : parseInt(targetLevel, 10)) : undefined,
      architecture: architecture || undefined,
      threats: threats || undefined
    };
  } catch (err) {
    console.error("Failed to build project backup object:", err);
    return null;
  }
}

/**
 * Downloads a backup of a single project as a .json file.
 */
export function exportSingleProjectBackup(analysisId: string): boolean {
  const backup = getProjectBackupObject(analysisId);
  if (!backup) return false;

  const projectName = typeof backup.project.name === "string" ? backup.project.name : "project";
  const sanitizedName = projectName
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_");
  const fileName = `ATAP_backup_${sanitizedName}_v${backup.project.currentVersion || "1.0"}_${new Date().toISOString().split("T")[0]}.json`;

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
  saveAs(blob, fileName);
  return true;
}

/**
 * Collects all projects in local storage and downloads a full archive JSON file.
 */
export function exportAllProjectsBackup(): boolean {
  try {
    const rawAnalyses = localStorage.getItem("atap_analyses");
    if (!rawAnalyses) return false;
    const analyses = JSON.parse(rawAnalyses);
    if (!Array.isArray(analyses) || analyses.length === 0) return false;

    const projectBackups: ProjectBackupData[] = [];
    for (const a of analyses) {
      const projBackup = getProjectBackupObject(a.id);
      if (projBackup) {
        projectBackups.push(projBackup);
      }
    }

    const archive: FullBackupArchive = {
      backupFormatVersion: "1.0",
      type: "atap_full_backup",
      exportedAt: new Date().toISOString(),
      projectsCount: projectBackups.length,
      projects: projectBackups
    };

    const fileName = `ATAP_full_backup_${projectBackups.length}_projects_${new Date().toISOString().split("T")[0]}.json`;
    const blob = new Blob([JSON.stringify(archive, null, 2)], { type: "application/json;charset=utf-8" });
    saveAs(blob, fileName);
    return true;
  } catch (err) {
    console.error("Failed to export all projects:", err);
    return false;
  }
}

export interface RestoreResult {
  success: boolean;
  importedCount: number;
  projectNames: string[];
  error?: string;
}

export const MAX_BACKUP_SIZE = 25 * 1024 * 1024;
const MAX_PROJECTS_PER_BACKUP = 100;
const PROJECT_STORAGE_SUFFIXES = [
  "asvs_v5",
  "logs_v5",
  "triage_v5",
  "context",
  "asvs_target_level",
  "architecture",
  "threats",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function containsUnsafeKeys(value: unknown, depth = 0): boolean {
  if (depth > 50) return true;
  if (Array.isArray(value)) return value.some(item => containsUnsafeKeys(item, depth + 1));
  if (!isRecord(value)) return false;

  return Object.entries(value).some(([key, child]) =>
    key === "__proto__" || key === "constructor" || key === "prototype" ||
    containsUnsafeKeys(child, depth + 1)
  );
}

function isRecordArray(value: unknown, maxLength: number): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.length <= maxLength && value.every(isRecord);
}

function getBackupItems(parsed: unknown): { items: ProjectBackupData[] } | { error: string } {
  if (!isRecord(parsed) || containsUnsafeKeys(parsed)) {
    return { error: "Záloha obsahuje neplatnú alebo nebezpečnú štruktúru." };
  }

  let candidates: unknown[];
  if (parsed.type === "atap_full_backup" && parsed.backupFormatVersion === "1.0" && Array.isArray(parsed.projects)) {
    candidates = parsed.projects;
  } else if (parsed.version === "1.0" && isRecord(parsed.project)) {
    candidates = [parsed];
  } else {
    return { error: "Neplatný formát zálohy. Súbor neobsahuje platnú štruktúru ATAP projektu." };
  }

  if (candidates.length === 0 || candidates.length > MAX_PROJECTS_PER_BACKUP) {
    return { error: `Záloha musí obsahovať 1 až ${MAX_PROJECTS_PER_BACKUP} projektov.` };
  }

  const items: ProjectBackupData[] = [];
  for (const candidate of candidates) {
    if (!isRecord(candidate) || candidate.version !== "1.0" || !isRecord(candidate.project)) {
      return { error: "Záloha obsahuje projekt v nepodporovanom formáte." };
    }

    const project = candidate.project;
    if (
      typeof project.id !== "string" ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(project.id) ||
      typeof project.name !== "string" ||
      project.name.trim().length === 0 ||
      project.name.trim().length > 150
    ) {
      return { error: "Projekt v zálohe nemá platný identifikátor alebo názov." };
    }

    if (candidate.asvsReqs !== undefined && !isRecordArray(candidate.asvsReqs, 5000)) {
      return { error: "ASVS požiadavky v zálohe majú neplatný formát." };
    }
    if (candidate.auditLogs !== undefined && !isRecordArray(candidate.auditLogs, 50000)) {
      return { error: "Audit log v zálohe má neplatný formát." };
    }
    if (
      candidate.triageAnswers !== undefined &&
      (!isRecord(candidate.triageAnswers) || Object.values(candidate.triageAnswers).some(value => typeof value !== "boolean"))
    ) {
      return { error: "Triage odpovede v zálohe majú neplatný formát." };
    }
    if (candidate.context !== undefined && !isRecord(candidate.context)) {
      return { error: "Kontext projektu v zálohe má neplatný formát." };
    }
    if (
      candidate.targetLevel !== undefined &&
      candidate.targetLevel !== "all" &&
      !(typeof candidate.targetLevel === "number" && [1, 2, 3].includes(candidate.targetLevel))
    ) {
      return { error: "Cieľová ASVS úroveň v zálohe je neplatná." };
    }
    if (
      candidate.architecture !== undefined &&
      (!isRecord(candidate.architecture) ||
        (candidate.architecture.components !== undefined && !isRecordArray(candidate.architecture.components, 5000)) ||
        (candidate.architecture.flows !== undefined && !isRecordArray(candidate.architecture.flows, 10000)))
    ) {
      return { error: "Architektúra v zálohe má neplatný formát." };
    }
    if (candidate.threats !== undefined && !isRecordArray(candidate.threats, 10000)) {
      return { error: "Register hrozieb v zálohe má neplatný formát." };
    }

    items.push(candidate as unknown as ProjectBackupData);
  }

  return { items };
}

function parseBackup(jsonString: string): { items: ProjectBackupData[] } | { error: string } {
  if (!jsonString || jsonString.length > MAX_BACKUP_SIZE) {
    return { error: "Súbor zálohy je prázdny alebo presahuje maximálnu povolenú veľkosť (25 MB)." };
  }

  try {
    return getBackupItems(JSON.parse(jsonString) as unknown);
  } catch {
    return { error: "Súbor zálohy neobsahuje platný JSON." };
  }
}

export function validateBackup(jsonString: string): string | null {
  const parsed = parseBackup(jsonString);
  return "error" in parsed ? parsed.error : null;
}

/**
 * Validates and restores backup JSON into localStorage.
 * Supports both single project backup and full archive.
 * @param jsonString Raw JSON string from uploaded file
 * @param mode 'new_id' (creates fresh clone ID) or 'overwrite' (replaces if matching ID exists)
 */
export function restoreBackup(jsonString: string, mode: 'new_id' | 'overwrite' = 'new_id'): RestoreResult {
  try {
    if (mode !== "new_id" && mode !== "overwrite") {
      return { success: false, importedCount: 0, projectNames: [], error: "Neplatný režim obnovy zálohy." };
    }

    const parsed = parseBackup(jsonString);
    if ("error" in parsed) {
      return { success: false, importedCount: 0, projectNames: [], error: parsed.error };
    }

    // Load existing analyses list
    const rawAnalyses = localStorage.getItem("atap_analyses");
    const parsedAnalyses: unknown = rawAnalyses ? JSON.parse(rawAnalyses) : [];
    if (!Array.isArray(parsedAnalyses) || !parsedAnalyses.every(isRecord)) {
      return { success: false, importedCount: 0, projectNames: [], error: "Existujúci zoznam projektov je poškodený; obnova bola zrušená." };
    }

    let currentAnalyses = parsedAnalyses;
    const restoredNames: string[] = [];
    const writes = new Map<string, string | null>();

    for (const item of parsed.items) {
      const origProj = item.project;
      let targetId = String(origProj.id);
      let targetName = String(origProj.name).trim();

      if (mode === 'new_id') {
        targetId = `proj_${crypto.randomUUID()}`;
        while (currentAnalyses.some(analysis => analysis.id === targetId)) {
          targetId = `proj_${crypto.randomUUID()}`;
        }
        const nameExists = currentAnalyses.some(
          analysis => typeof analysis.name === "string" && analysis.name.toLowerCase() === targetName.toLowerCase()
        );
        if (nameExists) {
          targetName = `${targetName.slice(0, 137)} (Obnovené)`;
        }
      }

      const newProjMeta = {
        ...origProj,
        id: targetId,
        name: targetName
      };

      // If overwrite mode, remove existing project metadata
      if (mode === 'overwrite') {
        currentAnalyses = currentAnalyses.filter(a => a.id !== targetId);
        for (const suffix of PROJECT_STORAGE_SUFFIXES) {
          writes.set(`atap_${suffix}_${targetId}`, null);
        }
      }
      currentAnalyses.unshift(newProjMeta);

      const projectData: Array<[string, unknown]> = [
        [`atap_asvs_v5_${targetId}`, item.asvsReqs],
        [`atap_logs_v5_${targetId}`, item.auditLogs],
        [`atap_triage_v5_${targetId}`, item.triageAnswers],
        [`atap_context_${targetId}`, item.context],
        [`atap_asvs_target_level_${targetId}`, item.targetLevel],
        [`atap_architecture_${targetId}`, item.architecture],
        [`atap_threats_${targetId}`, item.threats],
      ];
      for (const [key, value] of projectData) {
        if (value !== undefined) writes.set(key, JSON.stringify(value));
      }

      restoredNames.push(targetName);
    }

    writes.set("atap_analyses", JSON.stringify(currentAnalyses));

    const previousValues = new Map<string, string | null>();
    for (const key of writes.keys()) {
      previousValues.set(key, localStorage.getItem(key));
    }

    try {
      for (const [key, value] of writes) {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      }
    } catch (writeError) {
      let rollbackFailed = false;
      for (const [key, value] of [...previousValues].reverse()) {
        try {
          if (value === null) localStorage.removeItem(key);
          else localStorage.setItem(key, value);
        } catch {
          rollbackFailed = true;
        }
      }
      const reason = writeError instanceof Error ? writeError.message : String(writeError);
      return {
        success: false,
        importedCount: 0,
        projectNames: [],
        error: rollbackFailed
          ? `Obnova zlyhala (${reason}) a úplné vrátenie zmien sa nepodarilo. Skontrolujte úložisko a obnovte zálohu.`
          : `Obnova zlyhala (${reason}); zmeny boli vrátené.`,
      };
    }

    // Dispatch update events to reload all workspace hooks and views
    window.dispatchEvent(new Event("storage_workspace_update"));
    window.dispatchEvent(new Event("storage"));

    return {
      success: true,
      importedCount: restoredNames.length,
      projectNames: restoredNames
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      importedCount: 0,
      projectNames: [],
      error: `Chyba pri spracovaní JSON súboru: ${reason}`
    };
  }
}
