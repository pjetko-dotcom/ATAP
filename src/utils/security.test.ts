import assert from "node:assert/strict";
import { after, afterEach, beforeEach, test } from "node:test";
import { MAX_BACKUP_SIZE, restoreBackup, validateBackup } from "./backupRestore";
import { sanitizeCsvCell } from "./csv";
import { generateFindingsFromAsvs } from "./findings";
import { computeVersionDiff } from "./versionDiff";
import { suggestThreatAsvsRequirements } from "./threatAsvs";
import { getContentSecurityPolicy } from "../../contentSecurityPolicy";
import { getCurrentUserName, parseActivityLogs, setCurrentUserName } from "./activityLog";
import { asvsRequirements } from "../data/asvsData";
import { AnalysisVersionSnapshot } from "../types/versioning";

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

test("generates findings only from current ASVS gaps and preserves matching statuses", () => {
  const requirements = [
    { ...asvsRequirements[0], id: "V1.1.1", title: "Missing control", level: 3, status: "Missing" as const },
    { ...asvsRequirements[1], id: "V1.1.2", title: "Partial control", level: 2, status: "Partial" as const },
    { ...asvsRequirements[2], id: "V1.1.3", title: "Implemented control", status: "Implemented" as const },
  ];
  const existing = [{
    id: "F-OLD",
    title: "Outdated title",
    description: "Outdated description",
    severity: "Low" as const,
    status: "In Progress" as const,
    asvsRef: "V1.1.2",
  }, {
    id: "F-STALE",
    title: "No longer a gap",
    description: "Old finding",
    severity: "High" as const,
    status: "Open" as const,
    asvsRef: "V9.9.9",
  }];

  assert.deepEqual(generateFindingsFromAsvs(requirements, existing), [
    {
      id: "F-V1.1.1",
      title: "Missing control",
      description: requirements[0].description,
      severity: "High",
      status: "Open",
      asvsRef: "V1.1.1",
    },
    {
      id: "F-OLD",
      title: "Partial control",
      description: requirements[1].description,
      severity: "Medium",
      status: "In Progress",
      asvsRef: "V1.1.2",
    },
  ]);
  assert.deepEqual(generateFindingsFromAsvs([], existing), []);
});

test("uses a stricter production CSP and development-only Vite allowances", () => {
  const productionPolicy = getContentSecurityPolicy(false);
  const developmentPolicy = getContentSecurityPolicy(true);
  assert.match(productionPolicy, /object-src 'none'/);
  assert.doesNotMatch(productionPolicy, /unsafe-eval|localhost/);
  assert.match(developmentPolicy, /unsafe-eval/);
  assert.match(developmentPolicy, /unsafe-inline/);
  assert.match(developmentPolicy, /ws:\/\/localhost:3000/);
  assert.match(developmentPolicy, /ws:\/\/127\.0\.0\.1:24678/);
  assert.doesNotMatch(getContentSecurityPolicy(false, false), /frame-ancestors/);
});

test("loads only well-formed local activity log entries", () => {
  const valid = JSON.stringify([{ id: "1", action: "Renamed project", user: "Local user", time: "Just now" }]);
  assert.equal(parseActivityLogs(valid).length, 1);
  assert.deepEqual(parseActivityLogs("{invalid"), []);
  assert.deepEqual(parseActivityLogs(JSON.stringify([{ id: 1, action: "Malformed" }])), []);
});

test("stores a trimmed local profile name and rejects blank names", () => {
  assert.equal(getCurrentUserName(), "Local user");
  setCurrentUserName("  Peter  ");
  assert.equal(getCurrentUserName(), "Peter");
  assert.throws(() => setCurrentUserName("   "), /cannot be empty/);
});

test("compares removed ASVS requirements, threat details and version settings", () => {
  const requirement = asvsRequirements[0];
  const anotherRequirement = asvsRequirements[1];
  const threat = {
    id: "TR-1",
    title: "Test threat",
    description: "Original description",
    stride: "Spoofing",
    likelihood: "Unlikely",
    impact: "Moderate",
    risk: "Low",
    status: "Open",
    mitigation: "MFA",
    componentIds: ["api"],
    asvsRefs: [requirement.id],
  };
  const removedThreat = { ...threat, id: "TR-REMOVED" };
  const addedThreat = { ...threat, id: "TR-ADDED" };
  const baseSnapshot: AnalysisVersionSnapshot = {
    version: "1.0",
    createdAt: "2026-01-01T00:00:00.000Z",
    createdBy: "Test",
    status: "Final",
    asvsLevel: "2",
    metrics: { asvsCoverage: 0, totalOpenThreats: 1, criticalRisks: 0, openFindings: 0, totalImplemented: 0, totalReqs: 2 },
    data: {
      asvsReqs: [{ ...requirement, status: "Missing", notes: "old" }, anotherRequirement],
      threats: [threat, removedThreat],
      targetLevel: 2,
      systemType: "web",
      architecture: { components: [{ id: "api", name: "API" }], flows: [] },
    },
  };
  const nextSnapshot: AnalysisVersionSnapshot = {
    ...baseSnapshot,
    version: "2.0",
    data: {
      ...baseSnapshot.data,
      asvsReqs: [{ ...requirement, status: "Implemented", notes: "verified" }],
      threats: [{ ...threat, description: "Updated description", likelihood: "Probably", componentIds: ["gateway"] }, addedThreat],
      targetLevel: 3,
      systemType: "api",
      architecture: { components: [{ id: "gateway", name: "Gateway" }], flows: [] },
    },
  };

  const diff = computeVersionDiff(baseSnapshot, nextSnapshot);
  assert.ok(diff.asvsDiffs.some(item => item.id === anotherRequirement.id && item.changeType === "removed"));
  assert.ok(diff.asvsDiffs.some(item => item.id === requirement.id && item.changes?.some(change => change.field === "notes")));
  const threatDiff = diff.threatDiffs.find(item => item.id === threat.id);
  assert.ok(threatDiff?.changes?.some(change => change.field === "description"));
  assert.ok(threatDiff?.changes?.some(change => change.field === "likelihood"));
  assert.ok(threatDiff?.changes?.some(change => change.field === "componentIds"));
  assert.ok(diff.threatDiffs.some(item => item.id === "TR-REMOVED" && item.changeType === "removed" && item.changes?.some(change => change.field === "description")));
  assert.ok(diff.threatDiffs.some(item => item.id === "TR-ADDED" && item.changeType === "added"));
  assert.ok(diff.settingsDiffs.some(item => item.field === "targetLevel"));
  assert.ok(diff.settingsDiffs.some(item => item.field === "systemType"));
  assert.ok(diff.settingsDiffs.some(item => item.field === "architectureComponents"));
});

test("suggests ASVS controls from STRIDE threat details", () => {
  const injectionSuggestions = suggestThreatAsvsRequirements(
    "Tampering",
    "SQL injection in search",
    "An attacker injects SQL into a database query through the search input."
  );
  assert.ok(injectionSuggestions.some(suggestion => suggestion.id === "V1.2.4"));

  const bruteForceSuggestions = suggestThreatAsvsRequirements(
    "Spoofing",
    "Brute force against admin login",
    "Credential stuffing may compromise administrator accounts."
  );
  assert.ok(bruteForceSuggestions.some(suggestion => suggestion.sectionName.toLowerCase().includes("authentication")));
  assert.ok(bruteForceSuggestions.length <= 5);
  assert.deepEqual(suggestThreatAsvsRequirements("Spoofing", "", ""), []);
});

after(() => {
  if (originalLocalStorage === undefined) delete (globalThis as { localStorage?: Storage }).localStorage;
  else Object.defineProperty(globalThis, "localStorage", { configurable: true, value: originalLocalStorage });
  if (originalWindow === undefined) delete (globalThis as { window?: Window }).window;
  else Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
});
