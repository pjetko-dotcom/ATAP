import assert from "node:assert/strict";
import { after, afterEach, beforeEach, test } from "node:test";
import FileSaver from "file-saver";
import {
  exportAllProjectsBackup,
  exportSingleProjectBackup,
  getProjectBackupObject,
  restoreBackup,
  validateBackup,
} from "./backupRestore";
import type { Finding } from "./findings";

class MemoryStorage {
  readonly data = new Map<string, string>();
  failOnceForKey: string | null = null;
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void {
    if (this.failOnceForKey === key) {
      this.failOnceForKey = null;
      throw new Error("quota");
    }
    this.data.set(key, String(value));
  }
  removeItem(key: string): void { this.data.delete(key); }
}

const storage = new MemoryStorage();
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalSaveAs = FileSaver.saveAs;
let blobs: Blob[];
let events: string[];
const findings: Finding[] = [
  { id: "F-1", title: "First", description: "Evidence", severity: "High", status: "Closed", asvsRef: "V1.1" },
  { id: "F-2", title: "Second", description: "", severity: "Low", status: "In Progress", asvsRef: "V1.2" },
  { id: "F-3", title: "Third", description: "", severity: "Critical", status: "Open", asvsRef: "" },
];

beforeEach(() => {
  blobs = [];
  events = [];
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  Object.defineProperty(globalThis, "window", {
    configurable: true, value: { dispatchEvent: (event: Event) => { events.push(event.type); return true; } },
  });
  Object.defineProperty(FileSaver, "saveAs", { configurable: true, value: (blob: Blob) => blobs.push(blob) });
});

afterEach(() => {
  storage.data.clear();
  storage.failOnceForKey = null;
  Object.defineProperty(FileSaver, "saveAs", { configurable: true, value: originalSaveAs });
});

after(() => {
  if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
  else Reflect.deleteProperty(globalThis, "localStorage");
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

function seedProjects(): void {
  storage.setItem("atap_analyses", JSON.stringify([{ id: "p1", name: "One" }, { id: "p2", name: "Two" }]));
  storage.setItem("atap_findings_p1", JSON.stringify(findings));
  storage.setItem("atap_findings_p2", "[]");
}

test("single project export and new-ID restore preserve findings and statuses", async () => {
  seedProjects();
  assert.equal(exportSingleProjectBackup("p1"), true);
  const json = await blobs[0].text();
  assert.equal(JSON.parse(json).version, "1.1");
  assert.deepEqual(JSON.parse(json).findings, findings);
  assert.equal(validateBackup(json), null);
  assert.equal(restoreBackup(json, "new_id").success, true);
  const imported = JSON.parse(storage.getItem("atap_analyses")!)[0];
  assert.notEqual(imported.id, "p1");
  assert.deepEqual(JSON.parse(storage.getItem(`atap_findings_${imported.id}`)!), findings);
  assert.deepEqual(JSON.parse(storage.getItem("atap_findings_p1")!), findings);
  assert.ok(events.includes("atap_backup_restored"));
});

test("full archive round-trips each project's findings and empty list on overwrite", async () => {
  seedProjects();
  assert.equal(exportAllProjectsBackup(), true);
  const json = await blobs[0].text();
  const archive = JSON.parse(json);
  assert.equal(archive.backupFormatVersion, "1.1");
  assert.deepEqual(archive.projects.map((project: { findings: Finding[] }) => project.findings), [findings, []]);
  storage.setItem("atap_findings_p1", "[]");
  storage.setItem("atap_findings_p2", JSON.stringify(findings));
  assert.equal(restoreBackup(json, "overwrite").importedCount, 2);
  assert.deepEqual(JSON.parse(storage.getItem("atap_findings_p1")!), findings);
  assert.deepEqual(JSON.parse(storage.getItem("atap_findings_p2")!), []);
  assert.equal(restoreBackup(json, "new_id").importedCount, 2);
  const clones = JSON.parse(storage.getItem("atap_analyses")!).filter((p: { id: string }) => p.id.startsWith("proj_"));
  assert.deepEqual(clones.map((p: { id: string }) => JSON.parse(storage.getItem(`atap_findings_${p.id}`)!)), [[], findings]);
});

test("legacy backups preserve existing findings on overwrite and do not invent findings for clones", () => {
  seedProjects();
  const legacy = { version: "1.0", project: { id: "p1", name: "One" } };
  const json = JSON.stringify({ type: "atap_full_backup", backupFormatVersion: "1.0", projects: [legacy] });
  assert.equal(restoreBackup(json, "overwrite").success, true);
  assert.deepEqual(JSON.parse(storage.getItem("atap_findings_p1")!), findings);
  assert.equal(restoreBackup(json, "new_id").success, true);
  const clone = JSON.parse(storage.getItem("atap_analyses")!)[0];
  assert.equal(storage.getItem(`atap_findings_${clone.id}`), null);
});

test("a new backup of a project without saved findings records an empty list", () => {
  storage.setItem("atap_analyses", JSON.stringify([{ id: "p1", name: "One" }]));
  const backup = getProjectBackupObject("p1")!;
  assert.deepEqual(backup.findings, []);
  storage.setItem("atap_findings_p1", JSON.stringify(findings));
  assert.equal(restoreBackup(JSON.stringify(backup), "overwrite").success, true);
  assert.deepEqual(JSON.parse(storage.getItem("atap_findings_p1")!), []);
});

test("invalid findings, unsafe keys, unknown versions and duplicate IDs are rejected before writes", () => {
  seedProjects();
  const before = [...storage.data];
  const base = { version: "1.1", project: { id: "p1", name: "One" }, findings };
  const invalid = [
    { ...base, findings: undefined },
    { ...base, findings: null },
    { ...base, findings: {} },
    { ...base, findings: [{ ...findings[0], status: "invalid" }] },
    { ...base, findings: [{ ...findings[0], severity: "invalid" }] },
    { ...base, findings: [{ ...findings[0], title: 1 }] },
    { ...base, findings: Array(10001).fill(findings[0]) },
    { ...base, version: "2.0" },
    { type: "atap_full_backup", backupFormatVersion: "2.0", projects: [base] },
    { type: "atap_full_backup", backupFormatVersion: "1.1", projects: [base, base] },
    { type: "atap_full_backup", backupFormatVersion: "1.1", projects: [base, { ...base, project: { id: "p2", name: "Two" }, findings: [null] }] },
    JSON.parse('{"version":"1.1","project":{"id":"p1","name":"One"},"findings":[{"id":"x","title":"x","description":"","severity":"Low","status":"Open","asvsRef":"","__proto__":{}}]}'),
  ];
  for (const value of invalid) {
    const json = JSON.stringify(value);
    assert.ok(validateBackup(json));
    assert.equal(restoreBackup(json, "overwrite").success, false);
    assert.deepEqual([...storage.data], before);
  }
});

test("export fails rather than omit corrupted findings or silently create a partial archive", () => {
  seedProjects();
  storage.setItem("atap_findings_p2", '{"invalid":true}');
  assert.equal(getProjectBackupObject("p2"), null);
  assert.equal(exportAllProjectsBackup(), false);
  assert.equal(blobs.length, 0);
});

test("failed overwrite rolls back findings together with other project data", () => {
  seedProjects();
  const before = [...storage.data];
  const backup = getProjectBackupObject("p1")!;
  backup.findings = [];
  storage.failOnceForKey = "atap_analyses";
  assert.equal(restoreBackup(JSON.stringify(backup), "overwrite").success, false);
  assert.deepEqual([...storage.data].sort(), before.sort());
  assert.deepEqual(events, []);
});
