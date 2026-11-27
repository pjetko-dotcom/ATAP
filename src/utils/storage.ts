export const STORAGE_EVENT = "storage_workspace_update";

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Failed to read local workspace key "${key}"`, error);
    return null;
  }
}

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Failed to write local workspace key "${key}"`, error);
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT, {
      detail: { type: "storage-error", key, message: "Lokálne úložisko je nedostupné alebo je jeho kvóta vyčerpaná." },
    }));
    return false;
  }
}

export function readJson<T>(key: string, fallback: T): T {
  const raw = safeGetItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Failed to parse local workspace key "${key}"`, error);
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  return safeSetItem(key, JSON.stringify(value));
}

export function notifyWorkspaceUpdate(): void {
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function createLocalId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function migrateWorkspaceSchema(): void {
  const schemaKey = "atap_workspace_schema";
  if (safeGetItem(schemaKey) === "1.1") return;

  try {
    const rawAnalyses = safeGetItem("atap_analyses");
    const analyses = rawAnalyses ? JSON.parse(rawAnalyses) : [];
    if (Array.isArray(analyses)) {
      for (const analysis of analyses) {
        if (!analysis || typeof analysis.id !== "string") continue;
        const legacyKey = `atap_asvs_${analysis.id}`;
        const currentKey = `atap_asvs_v5_${analysis.id}`;
        if (!safeGetItem(currentKey)) {
          const legacy = safeGetItem(legacyKey);
          if (legacy) safeSetItem(currentKey, legacy);
        }
      }
    }
  } catch (error) {
    console.error("Failed to migrate legacy workspace data", error);
  }

  safeSetItem(schemaKey, "1.1");
}
