import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ExecutiveReportGaps } from "../components/ExecutiveReportModal";
import { asvsRequirements } from "../data/asvsData";
import { calculateAsvsCoverage } from "./asvsMetrics";
import { getExecutiveCoverage, getExecutiveReportData } from "./executiveReport";
import { getInitialThreatsForAnalysis, summarizeThreats } from "./threatModel";

function storage(values: Record<string, string> = {}): Pick<Storage, "getItem"> {
  return { getItem: key => values[key] ?? null };
}

test("merges partial saved ASVS data with canonical workspace requirements and scopes by saved level", () => {
  const [first, second, third] = asvsRequirements.filter(r => r.level <= 2);
  const saved = [
    { id: first.id, status: "Implemented", title: "stale", level: 99 },
    { id: second.id, status: "Partial", notes: "Evidence" },
    { id: third.id, status: "Missing" },
  ];
  const report = getExecutiveReportData(storage({
    atap_asvs_v5_a: JSON.stringify(saved),
    atap_asvs_target_level_a: "2",
    atap_threats_a: JSON.stringify([
      { status: "Open", risk: "High" },
      { status: "Open", risk: "Low" },
      { status: "Accepted", risk: "Critical" },
    ]),
  }), "a", 3);
  assert.equal(report.targetLevel, 2);
  assert.equal(report.scoped.length, asvsRequirements.filter(r => r.level <= 2).length);
  assert.equal(report.defaultCount, report.scoped.length - 3);
  assert.equal(report.scoped.find(r => r.id === first.id)?.title, first.title);
  assert.equal(report.scoped.find(r => r.id === second.id)?.notes, "Evidence");
  assert.deepEqual(getExecutiveCoverage(report.scoped), { evaluated: 3, score: 50, pending: 0 });
  assert.equal(getExecutiveCoverage(report.scoped).score, calculateAsvsCoverage(report.scoped));
  assert.deepEqual(report.threatSummary, { total: 3, open: 2, openHighOrCritical: 1, mitigated: 0 });
});

test("supports all levels, pending and an undefined score when no requirements were evaluated", () => {
  const report = getExecutiveReportData(storage({
    atap_asvs_v5_a: JSON.stringify([{ id: asvsRequirements[0].id, status: "Pending" }]),
    atap_asvs_target_level_a: "all",
    atap_threats_a: "[]",
  }), "a", 1);
  assert.equal(report.scoped.length, asvsRequirements.length);
  assert.deepEqual(getExecutiveCoverage(report.scoped), { evaluated: 0, score: null, pending: 1 });
  assert.deepEqual(getExecutiveCoverage([]), { evaluated: 0, score: null, pending: 0 });
});

test("discloses workspace defaults and demo threats rather than treating them as assessed data", () => {
  const report = getExecutiveReportData(storage(), "1", "2");
  assert.equal(report.defaultCount, report.scoped.length);
  assert.equal(report.usesDemoThreats, true);
  assert.deepEqual(report.threatSummary, summarizeThreats(getInitialThreatsForAnalysis("1")));
  const emptyThreats = getExecutiveReportData(storage({ atap_threats_1: "[]" }), "1", "2");
  assert.equal(emptyThreats.usesDemoThreats, false);
  assert.equal(emptyThreats.threatSummary.total, 0);
});

test("rejects malformed or unavailable stored inputs rather than producing a misleading report", () => {
  for (const values of [
    { atap_asvs_v5_a: "{" },
    { atap_asvs_v5_a: JSON.stringify([{ id: "V1.1.1", status: "unknown" }]) },
    { atap_asvs_v5_a: JSON.stringify([{ id: "V1.1.1" }, { id: "V1.1.1" }]) },
    { atap_threats_a: "{}" },
    { atap_threats_a: JSON.stringify([{ status: "Open", risk: "unknown" }]) },
    { atap_asvs_target_level_a: "4" },
  ]) {
    assert.throws(() => getExecutiveReportData(storage(values), "a", 2));
  }
  assert.throws(() => getExecutiveReportData({ getItem: () => { throw new Error("unavailable"); } }, "a", 2));
});

test("gap section renders a clear empty state and remains numbered in both languages", () => {
  for (const [language, heading, explanation] of [
    ["sk", "3. Vybrané nedostatky ASVS", "Neznamená to, že všetky požiadavky boli vyhodnotené alebo implementované."],
    ["en", "3. Selected ASVS gaps", "This does not mean that all requirements have been evaluated or implemented."],
  ] as const) {
    const markup = renderToStaticMarkup(createElement(ExecutiveReportGaps, { gaps: [], total: 0, language }));
    assert.ok(markup.includes(heading));
    assert.ok(markup.includes(explanation));
    assert.ok(markup.includes("Missing") && markup.includes("Partial"));
    assert.ok(!markup.includes("<table"));
  }
});

test("gap section still displays selected entries and the selection count", () => {
  for (const language of ["sk", "en"] as const) {
    const markup = renderToStaticMarkup(createElement(ExecutiveReportGaps, {
      gaps: [{ id: "V1.1.1", title: "Test", description: "Description", notes: "", status: "Missing" }],
      total: 9,
      language,
    }));
    assert.ok(markup.includes(language === "sk" ? "Zobrazených 1 z 9" : "Showing 1 of 9"));
    assert.ok(markup.includes("<table") && markup.includes("V1.1.1"));
    assert.ok(!markup.includes(language === "sk" ? "Neznamená to" : "This does not mean"));
  }
});
