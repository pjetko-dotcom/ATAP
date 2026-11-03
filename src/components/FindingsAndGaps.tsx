import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FileText, ShieldAlert, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { asvsRequirements, asvsChapters, ASVSRequirement } from "../data/asvsData";
import { HelpTooltip } from "./HelpTooltip";
import FileSaver from "file-saver";
import { sanitizeCsvCell } from "../utils/csv";
import { Finding, generateFindingsFromAsvs } from "../utils/findings";

const { saveAs } = FileSaver;

const severityColors = {
  Critical: "bg-purple-100 text-purple-700",
  High: "bg-red-100 text-red-700",
  Medium: "bg-orange-100 text-orange-700",
  Low: "bg-blue-100 text-blue-700",
};

const statusColors = {
  "Open": "bg-red-50 text-red-700 border border-red-200",
  "In Progress": "bg-yellow-50 text-yellow-700 border border-yellow-200",
  "Closed": "bg-green-50 text-green-700 border border-green-200",
};

function isFinding(value: unknown): value is Finding {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const finding = value as Record<string, unknown>;
  return typeof finding.id === "string" &&
    typeof finding.title === "string" &&
    typeof finding.description === "string" &&
    ["Critical", "High", "Medium", "Low"].includes(finding.severity as string) &&
    ["Open", "In Progress", "Closed"].includes(finding.status as string) &&
    typeof finding.asvsRef === "string";
}

function loadSavedFindings(key: string): Finding[] {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.every(isFinding)) {
      throw new Error("Stored findings have an invalid format.");
    }
    return parsed;
  } catch (error) {
    console.error(`Failed to load findings (${key}):`, error);
    return [];
  }
}

/**
 * FindingsAndGaps Component
 * 
 * Manages the security findings and gaps identified during the threat modeling and ASVS review process.
 * Generates findings only from ASVS requirements marked Missing or Partial.
 * 
 * @returns {JSX.Element} The rendered Findings and Gaps dashboard.
 */
export function FindingsAndGaps() {
  const { id: analysisId } = useParams<{ id: string }>();
  const findingsStorageKey = `atap_findings_${analysisId || "default"}`;
  const [findingState, setFindingState] = useState(() => ({
    key: findingsStorageKey,
    items: loadSavedFindings(findingsStorageKey),
  }));
  const findings = findingState.key === findingsStorageKey ? findingState.items : [];
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    if (findingState.key !== findingsStorageKey) {
      setFindingState({
        key: findingsStorageKey,
        items: loadSavedFindings(findingsStorageKey),
      });
    }
  }, [findingsStorageKey, findingState.key]);

  useEffect(() => {
    if (findingState.key !== findingsStorageKey) return;
    try {
      localStorage.setItem(findingsStorageKey, JSON.stringify(findingState.items));
    } catch (error) {
      console.error("Failed to save findings:", error);
      setAnalysisError("Findings could not be saved in this browser.");
    }
  }, [findingState, findingsStorageKey]);

  const generateGapAnalysis = () => {
    setAnalysisError(null);
    const asvsKey = `atap_asvs_v5_${analysisId || "default"}`;
    let activeReqs: ASVSRequirement[] = asvsRequirements;

    try {
      const stored = localStorage.getItem(asvsKey) || localStorage.getItem(`atap_asvs_${analysisId || "default"}`);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (
          !Array.isArray(parsed) ||
          !parsed.every((item: unknown) =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as Record<string, unknown>).id === "string" &&
            typeof (item as Record<string, unknown>).title === "string" &&
            typeof (item as Record<string, unknown>).description === "string" &&
            typeof (item as Record<string, unknown>).level === "number" &&
            ["Implemented", "Partial", "Missing", "N/A"].includes((item as Record<string, unknown>).status as string)
          )
        ) {
          throw new Error("Stored ASVS requirements have an invalid format.");
        }
        activeReqs = parsed as ASVSRequirement[];
      }
    } catch (error) {
      console.error("Failed to read ASVS requirements for gap analysis:", error);
      setAnalysisError("ASVS requirements could not be read, so no findings were generated.");
      return;
    }

    setFindingState({
      key: findingsStorageKey,
      items: generateFindingsFromAsvs(activeReqs, findings),
    });
    setLastGenerated(new Date());
  };

  const exportFindingsReport = () => {
    setExportMessage(null);
    setExportError(null);

    try {
      const headers = ["ID", "Finding", "Description", "Severity", "Status", "ASVS Reference"];
      const rows = findings.map(finding => [
        finding.id,
        finding.title,
        finding.description,
        finding.severity,
        finding.status,
        finding.asvsRef,
      ].map(sanitizeCsvCell).join(","));
      const csv = `\uFEFF${headers.map(sanitizeCsvCell).join(",")}\n${rows.join("\n")}`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const safeAnalysisId = (analysisId || "analysis").replace(/[^A-Za-z0-9_-]/g, "_");
      saveAs(blob, `atap_findings_${safeAnalysisId}_${new Date().toISOString().slice(0, 10)}.csv`);
      setExportMessage("Findings report downloaded as CSV.");
    } catch (error) {
      console.error("Findings report export failed:", error);
      setExportError("Could not export the findings report. Please try again.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6 overflow-auto">
      {(exportMessage || exportError) && (
        <div
          role={exportError ? "alert" : "status"}
          className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
            exportError
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {exportError || exportMessage}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Findings & Gaps</h2>
          <p className="text-sm text-slate-500 mt-1">Track findings derived from ASVS controls marked Missing or Partial.</p>
        </div>
        <div className="flex items-center gap-3">
          {lastGenerated && (
            <span className="text-xs text-slate-500 font-medium hidden md:inline-block">
              Last generated: {lastGenerated.toLocaleTimeString()}
            </span>
          )}
          <div className="flex items-center gap-2">
            <button 
              onClick={generateGapAnalysis}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md shadow-sm transition-all bg-blue-600 text-white hover:bg-blue-700"
            >
              <ShieldAlert size={16} />
              Generate Gap Analysis
            </button>
            <HelpTooltip text="Creates findings from ASVS requirements marked Missing or Partial. It does not scan the architecture model." position="bottom" />
          </div>
          <button 
            type="button"
            onClick={exportFindingsReport}
            aria-label="Export findings report as CSV"
            title="Download findings report as CSV"
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-md shadow-sm hover:bg-slate-700 transition-colors"
          >
            <FileText size={16} />
            Export Report (.csv)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{findings.filter(f => f.severity === 'Critical' || f.severity === 'High').length}</p>
            <p className="text-xs font-semibold uppercase text-slate-500">Critical / High</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
            <ShieldAlert size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{findings.filter(f => f.status === 'Open').length}</p>
            <p className="text-xs font-semibold uppercase text-slate-500">Open Findings</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{findings.filter(f => f.status === 'Closed').length}</p>
            <p className="text-xs font-semibold uppercase text-slate-500">Remediated</p>
          </div>
        </div>
      </div>

      {(analysisError || (lastGenerated && findings.length === 0)) && (
        <div
          role={analysisError ? "alert" : "status"}
          className={`mb-6 rounded-lg border p-3 text-sm ${
            analysisError ? "border-red-200 bg-red-50 text-red-700" : "border-blue-200 bg-blue-50 text-blue-800"
          }`}
        >
          {analysisError || "No ASVS requirements are currently marked Missing or Partial."}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 min-h-0">
        <div className="overflow-auto h-full">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold sticky top-0 z-10 shadow-sm border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 w-24">ID</th>
                <th className="px-6 py-4">Finding & Description</th>
                <th className="px-6 py-4 w-32">
                  <div className="flex items-center">
                    Severity <HelpTooltip text="Derived from the ASVS requirement level. L3 = High, L2 = Medium, L1 = Low." position="bottom" />
                  </div>
                </th>
                <th className="px-6 py-4 w-32">Status</th>
                <th className="px-6 py-4 w-32">
                  <div className="flex items-center">
                    ASVS Ref <HelpTooltip text="The specific ASVS control that is missing or partially implemented." position="bottom" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {findings.map(finding => {
                const chapterNum = parseInt(finding.asvsRef.substring(1).split('.')[0]);
                const chapter = asvsChapters.find(c => c.id === chapterNum);
                
                return (
                  <tr key={finding.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 align-top">{finding.id}</td>
                    <td className="px-6 py-4 align-top">
                      <p className="font-bold text-slate-800 mb-1">{finding.title}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{finding.description}</p>
                      {chapter && (
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400 font-medium">
                          <ArrowRight size={10} />
                          <span>Chapter {chapter.id}: {chapter.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full inline-block ${severityColors[finding.severity]}`}>
                        {finding.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded inline-block ${statusColors[finding.status]}`}>
                        {finding.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 align-top font-bold">
                      {finding.asvsRef}
                    </td>
                  </tr>
                );
              })}
              {findings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <CheckCircle size={32} className="mx-auto mb-3 text-green-400" />
                    <p className="font-medium text-slate-700">No findings saved for this analysis</p>
                    <p className="text-sm mt-1">Run the ASVS gap analysis to create findings from Missing or Partial controls.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
