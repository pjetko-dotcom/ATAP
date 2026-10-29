import assert from "node:assert/strict";
import { after, afterEach, beforeEach, test } from "node:test";
import { MAX_BACKUP_SIZE, restoreBackup, validateBackup } from "./backupRestore";
import { sanitizeCsvCell } from "./csv";
import { getContentSecurityPolicy } from "../../contentSecurityPolicy";
import { parseActivityLogs } from "./activityLog";

class MemoryStorage {
  private readonly data = new Map<string, string>();
  failOnceForKey: string | null = null;

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failOnceForKey === key) {
      this.failOnceForKey = null;
      throw new Error("storage quota exceeded");
    }
    this.data.set(key, String(value));
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }
}

const storage = new MemoryStorage();
const originalLocalStorage = globalThis.localStorage;
const originalWindow = globalThis.window;

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { dispatchEvent: () => true },
  });
});

afterEach(() => storage.clear());

function projectBackup(id = "project-1", name = "Security review") {
  return JSON.stringify({
    version: "1.0",
    exportedAt: "2026-10-29T00:00:00.000Z",
    project: { id, name, currentVersion: "1.0" },
    asvsReqs: [{ id: "V1.1.1", status: "Implemented" }],
    context: { businessPurpose: "constructor is ordinary project text" },
  });
}

test("validates and restores a project without treating text values as unsafe keys", () => {
  const json = projectBackup();
  assert.equal(validateBackup(json), null);

  const result = restoreBackup(json);
  assert.equal(result.success, true);
  assert.equal(result.importedCount, 1);
  const analyses = JSON.parse(storage.getItem("atap_analyses") ?? "[]");
  assert.equal(analyses[0].name, "Security review");
  const importedId = analyses[0].id;
  assert.match(importedId, /^proj_[0-9a-f-]{36}$/);
  assert.equal(storage.getItem(`atap_asvs_v5_${importedId}`), JSON.stringify([{ id: "V1.1.1", status: "Implemented" }]));
});

test("rejects prototype keys and malformed project data before writing", () => {
  const unsafe = '{"version":"1.0","project":{"id":"p1","name":"P","__proto__":{}}}';
  assert.ok(validateBackup(unsafe));
  assert.equal(restoreBackup(unsafe).success, false);
  assert.equal(storage.getItem("atap_analyses"), null);
  assert.ok(validateBackup("x".repeat(MAX_BACKUP_SIZE + 1)));
});

test("overwrite removes stale project data absent from the backup", () => {
  storage.setItem("atap_analyses", JSON.stringify([{ id: "project-1", name: "Old name" }]));
  storage.setItem("atap_threats_project-1", JSON.stringify([{ id: "stale" }]));

  const result = restoreBackup(projectBackup(), "overwrite");

  assert.equal(result.success, true);
  assert.equal(storage.getItem("atap_threats_project-1"), null);
  assert.equal(JSON.parse(storage.getItem("atap_analyses") ?? "[]")[0].name, "Security review");
});

test("rolls back all previously written values when storage fails", () => {
  storage.setItem("atap_analyses", JSON.stringify([{ id: "existing", name: "Existing" }]));
  storage.setItem("atap_asvs_v5_project-1", "previous ASVS");
  storage.failOnceForKey = "atap_context_project-1";

  const result = restoreBackup(projectBackup(), "overwrite");

  assert.equal(result.success, false);
  assert.match(result.error ?? "", /zmeny boli vrátené/);
  assert.equal(storage.getItem("atap_asvs_v5_project-1"), "previous ASVS");
  assert.deepEqual(JSON.parse(storage.getItem("atap_analyses") ?? "[]"), [{ id: "existing", name: "Existing" }]);
});

test("escapes CSV formulas and quotes every cell", () => {
  assert.equal(sanitizeCsvCell("=1+1"), "\"'=1+1\"");
  assert.equal(sanitizeCsvCell("\t@SUM(A1:A2)"), "\"'\t@SUM(A1:A2)\"");
  assert.equal(sanitizeCsvCell('text "with quotes"'), '"text ""with quotes"""');
  assert.equal(sanitizeCsvCell(3), '"3"');
});

test("uses a stricter production CSP and development-only Vite allowances", () => {
  const productionPolicy = getContentSecurityPolicy(false);
  const developmentPolicy = getContentSecurityPolicy(true);
  assert.match(productionPolicy, /object-src 'none'/);
  assert.doesNotMatch(productionPolicy, /unsafe-eval|localhost/);
  assert.match(developmentPolicy, /unsafe-eval/);
  assert.match(developmentPolicy, /ws:\/\/localhost:3000/);
});

test("loads only well-formed local activity log entries", () => {
  const valid = JSON.stringify([{ id: "1", action: "Renamed project", user: "Local user", time: "Just now" }]);
  assert.equal(parseActivityLogs(valid).length, 1);
  assert.deepEqual(parseActivityLogs("{invalid"), []);
  assert.deepEqual(parseActivityLogs(JSON.stringify([{ id: 1, action: "Malformed" }])), []);
});

after(() => {
  if (originalLocalStorage === undefined) delete (globalThis as { localStorage?: Storage }).localStorage;
  else Object.defineProperty(globalThis, "localStorage", { configurable: true, value: originalLocalStorage });
  if (originalWindow === undefined) delete (globalThis as { window?: Window }).window;
  else Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
});
