/**
 * Backup & Restore Utility
 * Handles full JSON export and restore for security analyses, architecture models,
 * ASVS requirement statuses, triage answers, audit logs, and version snapshots.
 * 
 * @module backupRestore
 */
import { saveAs } from "file-saver";

export interface ProjectBackupData {
  version: "1.0";
  exportedAt: string;
  project: any;
  asvsReqs?: any[];
  auditLogs?: any[];
  triageAnswers?: Record<string, boolean>;
  context?: any;
  targetLevel?: number | "all";
  architecture?: any;
  threats?: any[];
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

  const sanitizedName = (backup.project.name || "project")
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

/**
 * Validates and restores backup JSON into localStorage.
 * Supports both single project backup and full archive.
 * @param jsonString Raw JSON string from uploaded file
 * @param mode 'new_id' (creates fresh clone ID) or 'overwrite' (replaces if matching ID exists)
 */
export function restoreBackup(jsonString: string, mode: 'new_id' | 'overwrite' = 'new_id'): RestoreResult {
  try {
    // Security: Check payload size to prevent browser freeze/memory DoS (max 25MB)
    if (!jsonString || jsonString.length > 25 * 1024 * 1024) {
      return {
        success: false,
        importedCount: 0,
        projectNames: [],
        error: "Súbor zálohy je prázdny alebo presahuje maximálnu povolenú veľkosť (25 MB)."
      };
    }

    // Security: Prototype pollution guard
    if (jsonString.includes('"__proto__"') || jsonString.includes('"constructor"') || jsonString.includes('"prototype"')) {
      return {
        success: false,
        importedCount: 0,
        projectNames: [],
        error: "Bezpečnostné varovanie: Záloha obsahuje podozrivé kľúče objektov (Prototype Pollution guard)."
      };
    }

    const parsed = JSON.parse(jsonString);

    let itemsToRestore: ProjectBackupData[] = [];

    if (parsed.type === "atap_full_backup" && Array.isArray(parsed.projects)) {
      itemsToRestore = parsed.projects;
    } else if (parsed.project && parsed.version) {
      itemsToRestore = [parsed as ProjectBackupData];
    } else {
      return {
        success: false,
        importedCount: 0,
        projectNames: [],
        error: "Neplatný formát zálohy. Súbor neobsahuje platnú štruktúru ATAP projektu."
      };
    }

    if (itemsToRestore.length === 0) {
      return {
        success: false,
        importedCount: 0,
        projectNames: [],
        error: "Záloha neobsahuje žiadne projekty na obnovu."
      };
    }

    // Load existing analyses list
    const rawAnalyses = localStorage.getItem("atap_analyses");
    let currentAnalyses: any[] = rawAnalyses ? JSON.parse(rawAnalyses) : [];
    if (!Array.isArray(currentAnalyses)) currentAnalyses = [];

    const restoredNames: string[] = [];

    for (const item of itemsToRestore) {
      const origProj = item.project;
      if (!origProj || !origProj.name || typeof origProj.name !== "string") continue;

      let targetId = String(origProj.id || "").replace(/[^a-zA-Z0-9_-]/g, "");
      let targetName = String(origProj.name).trim().slice(0, 150);

      if (mode === 'new_id') {
        targetId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        // Check if name already exists, add (Obnovené) suffix if needed
        const nameExists = currentAnalyses.some(a => a.name.toLowerCase() === origProj.name.toLowerCase());
        if (nameExists) {
          targetName = `${origProj.name} (Obnovené)`;
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
      }
      currentAnalyses.unshift(newProjMeta);

      // Restore specific storage items
      if (item.asvsReqs) {
        localStorage.setItem(`atap_asvs_v5_${targetId}`, JSON.stringify(item.asvsReqs));
      }
      if (item.auditLogs) {
        localStorage.setItem(`atap_logs_v5_${targetId}`, JSON.stringify(item.auditLogs));
      }
      if (item.triageAnswers) {
        localStorage.setItem(`atap_triage_v5_${targetId}`, JSON.stringify(item.triageAnswers));
      }
      if (item.context) {
        localStorage.setItem(`atap_context_${targetId}`, JSON.stringify(item.context));
      }
      if (item.targetLevel !== undefined) {
        localStorage.setItem(`atap_asvs_target_level_${targetId}`, String(item.targetLevel));
      }
      if (item.architecture) {
        localStorage.setItem(`atap_architecture_${targetId}`, JSON.stringify(item.architecture));
      }
      if (item.threats) {
        localStorage.setItem(`atap_threats_${targetId}`, JSON.stringify(item.threats));
      }

      restoredNames.push(targetName);
    }

    // Save updated analyses list
    localStorage.setItem("atap_analyses", JSON.stringify(currentAnalyses));

    // Dispatch update events to reload all workspace hooks and views
    window.dispatchEvent(new Event("storage_workspace_update"));
    window.dispatchEvent(new Event("storage"));

    return {
      success: true,
      importedCount: restoredNames.length,
      projectNames: restoredNames
    };
  } catch (err: any) {
    return {
      success: false,
      importedCount: 0,
      projectNames: [],
      error: `Chyba pri spracovaní JSON súboru: ${err.message || String(err)}`
    };
  }
}
