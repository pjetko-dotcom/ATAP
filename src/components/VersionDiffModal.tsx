import React, { useState, useMemo } from "react";
import { 
  X, 
  Scale, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  FileText, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Filter, 
  Copy, 
  Check, 
  ExternalLink 
} from "lucide-react";
import { useAnalysisVersion } from "../context/AnalysisVersionContext";
import { computeVersionDiff } from "../utils/versionDiff";
import { AnalysisVersionSnapshot } from "../types/versioning";
import { asvsRequirements } from "../data/asvsData";

export function VersionDiffModal() {
  const { 
    analysis, 
    currentWorkingVersion, 
    allVersions, 
    isDiffModalOpen, 
    setIsDiffModalOpen, 
    diffInitialVersions 
  } = useAnalysisVersion();

  // Helper to construct snapshot of current working state
  const currentWorkingSnapshot = useMemo((): AnalysisVersionSnapshot => {
    const asvsKey = `atap_asvs_v5_${analysis.id}`;
    const threatsKey = `atap_threats_${analysis.id}`;
    const contextKey = `atap_context_${analysis.id}`;
    const triageKey = `atap_triage_v5_${analysis.id}`;

    let reqsList = [...asvsRequirements];
    try {
      const stored = localStorage.getItem(asvsKey);
      if (stored) reqsList = JSON.parse(stored);
    } catch (e) {}

    let threatsList: any[] = [];
    try {
      const stored = localStorage.getItem(threatsKey);
      if (stored) threatsList = JSON.parse(stored);
    } catch (e) {}

    let contextData: any = null;
    try {
      const stored = localStorage.getItem(contextKey);
      if (stored) contextData = JSON.parse(stored);
    } catch (e) {}

    let triageAnswers: any = {};
    try {
      const stored = localStorage.getItem(triageKey);
      if (stored) triageAnswers = JSON.parse(stored);
    } catch (e) {}

    const totalRelevant = reqsList.filter((r: any) => r.status !== "N/A").length;
    const implementedCount = reqsList.filter((r: any) => r.status === "Implemented").length;
    const asvsCoverage = totalRelevant > 0 ? Math.round((implementedCount / totalRelevant) * 100) : 0;
    const openFindings = reqsList.filter((r: any) => r.status === "Missing" || r.status === "Partial").length;
    const totalOpenThreats = threatsList.filter((t: any) => t.status === "Open").length;
    const criticalRisks = threatsList.filter((t: any) => t.status === "Open" && (t.risk === "Critical" || t.risk === "High")).length;

    return {
      version: currentWorkingVersion,
      label: `Aktuálny rozpracovaný stav (${analysis.status || "Draft"})`,
      createdAt: new Date().toISOString(),
      createdBy: "Aktuálna relácia",
      status: (analysis.status as any) || "Draft",
      asvsLevel: analysis.asvsLevel || "2",
      metrics: {
        asvsCoverage,
        totalOpenThreats,
        criticalRisks,
        openFindings,
        totalImplemented: implementedCount,
        totalReqs: reqsList.length
      },
      data: {
        context: contextData,
        asvsReqs: reqsList,
        triageAnswers,
        threats: threatsList
      }
    };
  }, [analysis, currentWorkingVersion]);

  // Combine historical snapshots with current working snapshot
  const availableVersions = useMemo(() => {
    const list: AnalysisVersionSnapshot[] = [...allVersions];
    const hasWorkingInList = list.some(v => v.version === currentWorkingVersion);
    if (!hasWorkingInList) {
      list.push(currentWorkingSnapshot);
    }
    return list;
  }, [allVersions, currentWorkingSnapshot, currentWorkingVersion]);

  // Selected versions to compare
  const [versionAId, setVersionAId] = useState<string>(() => {
    return diffInitialVersions.versionA || (allVersions.length > 0 ? allVersions[0].version : "1.0");
  });
  const [versionBId, setVersionBId] = useState<string>(() => {
    return diffInitialVersions.versionB || currentWorkingVersion;
  });

  const [activeTab, setActiveTab] = useState<"asvs" | "threats" | "context">("asvs");
  const [asvsFilter, setAsvsFilter] = useState<"all" | "status" | "notes">("all");
  const [copied, setCopied] = useState(false);

  // Lookup snapshots
  const snapA = useMemo(() => {
    if (versionAId === currentWorkingVersion && !allVersions.some(v => v.version === versionAId && v.status === "Final")) {
      return currentWorkingSnapshot;
    }
    return availableVersions.find(v => v.version === versionAId) || availableVersions[0] || currentWorkingSnapshot;
  }, [versionAId, availableVersions, currentWorkingSnapshot, currentWorkingVersion, allVersions]);

  const snapB = useMemo(() => {
    if (versionBId === currentWorkingVersion && !allVersions.some(v => v.version === versionBId && v.status === "Final")) {
      return currentWorkingSnapshot;
    }
    return availableVersions.find(v => v.version === versionBId) || currentWorkingSnapshot;
  }, [versionBId, availableVersions, currentWorkingSnapshot, currentWorkingVersion, allVersions]);

  // Compute diff
  const diffResult = useMemo(() => {
    return computeVersionDiff(snapA, snapB);
  }, [snapA, snapB]);

  if (!isDiffModalOpen) return null;

  const filteredAsvsDiffs = diffResult.asvsDiffs.filter(item => {
    if (asvsFilter === "status") return item.changeType === "status_changed";
    if (asvsFilter === "notes") return item.changeType === "notes_changed" || item.changeType === "traceability_changed";
    return true;
  });

  const handleCopySummary = () => {
    const lines = [
      `Bezpečnostný Diff: Analýza "${analysis.name}"`,
      `Porovnanie verzie v${snapA.version} (${new Date(snapA.createdAt).toLocaleDateString()}) -> v${snapB.version} (${new Date(snapB.createdAt).toLocaleDateString()})`,
      `----------------------------------------`,
      `ASVS Level: L${diffResult.metricsDelta.levelA} -> L${diffResult.metricsDelta.levelB}`,
      `ASVS Pokrytie: ${snapA.metrics.asvsCoverage}% -> ${snapB.metrics.asvsCoverage}% (${diffResult.metricsDelta.asvsCoverageDelta >= 0 ? '+' : ''}${diffResult.metricsDelta.asvsCoverageDelta}%)`,
      `Splnené požiadavky: ${snapA.metrics.totalImplemented} -> ${snapB.metrics.totalImplemented} (${diffResult.metricsDelta.implementedDelta >= 0 ? '+' : ''}${diffResult.metricsDelta.implementedDelta})`,
      `Otvorené hrozby: ${snapA.metrics.totalOpenThreats} -> ${snapB.metrics.totalOpenThreats} (${diffResult.metricsDelta.openThreatsDelta >= 0 ? '+' : ''}${diffResult.metricsDelta.openThreatsDelta})`,
      `Kritické riziká: ${snapA.metrics.criticalRisks} -> ${snapB.metrics.criticalRisks} (${diffResult.metricsDelta.criticalRisksDelta >= 0 ? '+' : ''}${diffResult.metricsDelta.criticalRisksDelta})`,
      `Počet zmenených ASVS požiadaviek: ${diffResult.asvsDiffs.length}`,
      `Počet zmien v registri hrozieb: ${diffResult.threatDiffs.length}`,
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "Implemented":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "Partial":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "Missing":
        return "bg-red-100 text-red-800 border-red-300";
      case "N/A":
        return "bg-slate-100 text-slate-700 border-slate-300";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const getRiskColor = (risk?: string) => {
    switch (risk) {
      case "Critical":
        return "bg-red-100 text-red-800 border-red-300";
      case "High":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "Medium":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "Low":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
              <Scale size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Porovnanie verzií (Version Diff)
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded text-xs font-semibold">
                  {diffResult.totalChangesCount} zmien celkovo
                </span>
              </h3>
              <p className="text-xs text-slate-300">{analysis.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              title="Kopírovať súhrn rozdielov do schránky"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? "Skopírované!" : "Kopírovať diff"}</span>
            </button>
            <button 
              onClick={() => setIsDiffModalOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Version Pickers Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            {/* Version A */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Základ (A):</span>
              <select
                value={versionAId}
                onChange={(e) => setVersionAId(e.target.value)}
                className="px-2.5 py-1 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg shadow-2xs focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {availableVersions.map(v => (
                  <option key={`a-${v.version}`} value={v.version}>
                    v{v.version} ({v.status === "Final" ? "Final" : "Draft"} - {new Date(v.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <ArrowRight size={16} className="text-slate-400" />

            {/* Version B */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-blue-600 uppercase">Porovnať s (B):</span>
              <select
                value={versionBId}
                onChange={(e) => setVersionBId(e.target.value)}
                className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50/80 border border-blue-300 rounded-lg shadow-2xs focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {availableVersions.map(v => (
                  <option key={`b-${v.version}`} value={v.version}>
                    v{v.version} ({v.status === "Final" ? "Final" : "Draft"} - {new Date(v.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Dátum A: <strong>{new Date(snapA.createdAt).toLocaleDateString()}</strong> ➔ Dátum B: <strong>{new Date(snapB.createdAt).toLocaleDateString()}</strong>
          </div>
        </div>

        {/* Delta KPI Cards */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0">
          
          {/* ASVS Level */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ASVS Level</span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-slate-800 text-sm">
              <span>L{diffResult.metricsDelta.levelA}</span>
              <ArrowRight size={12} className="text-slate-400" />
              <span className="text-blue-700 font-extrabold">L{diffResult.metricsDelta.levelB}</span>
            </div>
          </div>

          {/* ASVS Coverage */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ASVS Pokrytie</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm font-bold text-slate-800">
                {snapA.metrics?.asvsCoverage ?? 0}% ➔ {snapB.metrics?.asvsCoverage ?? 0}%
              </span>
              <span className={`text-xs font-extrabold flex items-center ${
                diffResult.metricsDelta.asvsCoverageDelta > 0 
                  ? "text-emerald-600" 
                  : diffResult.metricsDelta.asvsCoverageDelta < 0 
                  ? "text-red-600" 
                  : "text-slate-400"
              }`}>
                {diffResult.metricsDelta.asvsCoverageDelta > 0 ? <TrendingUp size={13} className="mr-0.5" /> : null}
                {diffResult.metricsDelta.asvsCoverageDelta < 0 ? <TrendingDown size={13} className="mr-0.5" /> : null}
                {diffResult.metricsDelta.asvsCoverageDelta >= 0 ? `+${diffResult.metricsDelta.asvsCoverageDelta}%` : `${diffResult.metricsDelta.asvsCoverageDelta}%`}
              </span>
            </div>
          </div>

          {/* Implemented Reqs */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Splnené kontroly</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm font-bold text-slate-800">
                {snapA.metrics?.totalImplemented ?? 0} ➔ {snapB.metrics?.totalImplemented ?? 0}
              </span>
              <span className={`text-xs font-extrabold ${diffResult.metricsDelta.implementedDelta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {diffResult.metricsDelta.implementedDelta >= 0 ? `+${diffResult.metricsDelta.implementedDelta}` : diffResult.metricsDelta.implementedDelta}
              </span>
            </div>
          </div>

          {/* Open Threats */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Otvorené hrozby</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm font-bold text-slate-800">
                {snapA.metrics?.totalOpenThreats ?? 0} ➔ {snapB.metrics?.totalOpenThreats ?? 0}
              </span>
              <span className={`text-xs font-extrabold ${diffResult.metricsDelta.openThreatsDelta <= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {diffResult.metricsDelta.openThreatsDelta <= 0 ? `${diffResult.metricsDelta.openThreatsDelta}` : `+${diffResult.metricsDelta.openThreatsDelta}`}
              </span>
            </div>
          </div>

          {/* Critical Risks */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kritické riziká</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm font-bold text-slate-800">
                {snapA.metrics?.criticalRisks ?? 0} ➔ {snapB.metrics?.criticalRisks ?? 0}
              </span>
              <span className={`text-xs font-extrabold ${diffResult.metricsDelta.criticalRisksDelta <= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {diffResult.metricsDelta.criticalRisksDelta <= 0 ? `${diffResult.metricsDelta.criticalRisksDelta}` : `+${diffResult.metricsDelta.criticalRisksDelta}`}
              </span>
            </div>
          </div>

        </div>

        {/* Tabs */}
        <div className="px-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab("asvs")}
              className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === "asvs"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <ShieldCheck size={16} />
              <span>ASVS Požiadavky</span>
              <span className="ml-1 px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold">
                {diffResult.asvsDiffs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("threats")}
              className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === "threats"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <AlertTriangle size={16} />
              <span>Register hrozieb</span>
              <span className="ml-1 px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold">
                {diffResult.threatDiffs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("context")}
              className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === "context"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileText size={16} />
              <span>Kontext a štandardy</span>
              <span className="ml-1 px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold">
                {diffResult.contextDiffs.length}
              </span>
            </button>
          </div>

          {/* Sub-filters for ASVS */}
          {activeTab === "asvs" && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Filter:</span>
              <select
                value={asvsFilter}
                onChange={(e: any) => setAsvsFilter(e.target.value)}
                className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-md focus:outline-none cursor-pointer"
              >
                <option value="all">Všetky rozdiely ({diffResult.asvsDiffs.length})</option>
                <option value="status">Len zmeny stavu</option>
                <option value="notes">Len poznámky a trasovanie</option>
              </select>
            </div>
          )}
        </div>

        {/* Diff Content Area */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4 bg-slate-50/50">
          
          {/* TAB 1: ASVS DIFFS */}
          {activeTab === "asvs" && (
            <div className="space-y-3">
              {filteredAsvsDiffs.map(diff => (
                <div 
                  key={diff.id} 
                  className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-900 text-white font-mono text-xs font-bold rounded">
                          {diff.id}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">
                          Kapitola {diff.chapter} • Sekcia {diff.section}
                        </span>
                        {diff.changeType === "status_changed" && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-md uppercase tracking-wider">
                            Zmena stavu
                          </span>
                        )}
                        {diff.changeType === "notes_changed" && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded-md uppercase tracking-wider">
                            Zmena poznámky
                          </span>
                        )}
                        {diff.changeType === "traceability_changed" && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-md uppercase tracking-wider">
                            Zmena komponentov
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 mt-1">
                        {diff.title}
                      </h4>
                    </div>

                    {/* Status Comparison Badge */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${getStatusColor(diff.oldStatus)}`}>
                        {diff.oldStatus || "Missing"}
                      </span>
                      <ArrowRight size={14} className="text-slate-400" />
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-md border shadow-2xs ${getStatusColor(diff.newStatus)}`}>
                        {diff.newStatus || "Missing"}
                      </span>
                    </div>
                  </div>

                  {/* Notes Comparison if changed */}
                  {(diff.oldNotes || diff.newNotes) && diff.oldNotes !== diff.newNotes && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                      <div className="p-2.5 bg-red-50/50 border border-red-100 rounded-lg">
                        <span className="text-[10px] font-bold text-red-500 uppercase block mb-0.5">Predchádzajúca poznámka (v{snapA.version}):</span>
                        <p className="text-slate-700 italic">{diff.oldNotes || "<Žiadna poznámka>"}</p>
                      </div>
                      <div className="p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase block mb-0.5">Nová poznámka (v{snapB.version}):</span>
                        <p className="text-slate-800 font-medium">{diff.newNotes || "<Žiadna poznámka>"}</p>
                      </div>
                    </div>
                  )}

                  {/* Traceability components comparison if changed */}
                  {diff.oldTraceability && diff.newTraceability && (
                    <div className="pt-2 border-t border-slate-100 text-xs flex items-center gap-2">
                      <span className="text-slate-400 font-semibold">Komponenty:</span>
                      <span className="text-slate-600">[{diff.oldTraceability.join(", ") || "None"}]</span>
                      <ArrowRight size={12} className="text-slate-400" />
                      <span className="text-blue-700 font-bold">[{diff.newTraceability.join(", ") || "None"}]</span>
                    </div>
                  )}
                </div>
              ))}

              {filteredAsvsDiffs.length === 0 && (
                <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
                  <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
                  <p className="font-bold text-slate-800">Žiadne rozdiely v ASVS požiadavkách</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Medzi verziou v{snapA.version} a v{snapB.version} neboli nájdené žiadne zmeny v požiadavkách podľa zvoleného filtra.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: THREATS DIFF */}
          {activeTab === "threats" && (
            <div className="space-y-3">
              {diffResult.threatDiffs.map(td => (
                <div key={td.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-900 text-white font-mono text-xs font-bold rounded">
                          {td.id}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          STRIDE: {td.stride}
                        </span>
                        {td.changeType === "added" && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded uppercase">
                            + Nová hrozba
                          </span>
                        )}
                        {td.changeType === "removed" && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded uppercase">
                            - Odstránená
                          </span>
                        )}
                        {td.changeType === "status_changed" && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded uppercase">
                            Zmena stavu
                          </span>
                        )}
                        {td.changeType === "risk_changed" && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded uppercase">
                            Zmena rizika
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 mt-1">
                        {td.title}
                      </h4>
                    </div>

                    {/* Status & Risk transition */}
                    <div className="flex items-center gap-2 shrink-0 text-xs">
                      {td.oldStatus && td.newStatus && td.oldStatus !== td.newStatus && (
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-bold">{td.oldStatus}</span>
                          <ArrowRight size={12} className="text-slate-400" />
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">{td.newStatus}</span>
                        </div>
                      )}

                      {td.oldRisk && td.newRisk && td.oldRisk !== td.newRisk && (
                        <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-200">
                          <span className={`px-2 py-0.5 rounded font-bold ${getRiskColor(td.oldRisk)}`}>{td.oldRisk}</span>
                          <ArrowRight size={12} className="text-slate-400" />
                          <span className={`px-2 py-0.5 rounded font-bold ${getRiskColor(td.newRisk)}`}>{td.newRisk}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mitigations comparison */}
                  {(td.oldMitigation || td.newMitigation) && td.oldMitigation !== td.newMitigation && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                      <div className="p-2 bg-slate-50 rounded border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Predtým:</span>
                        <p className="text-slate-700">{td.oldMitigation || "<Bez mitigácie>"}</p>
                      </div>
                      <div className="p-2 bg-blue-50/60 rounded border border-blue-200">
                        <span className="text-[10px] font-bold text-blue-700 uppercase block mb-0.5">Nové bezpečnostné opatrenie:</span>
                        <p className="text-blue-950 font-medium">{td.newMitigation || "<Bez mitigácie>"}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {diffResult.threatDiffs.length === 0 && (
                <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
                  <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
                  <p className="font-bold text-slate-800">Žiadne rozdiely v registri hrozieb</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Medzi verziou v{snapA.version} a v{snapB.version} sú hrozby a ich mitigácie identické.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CONTEXT DIFF */}
          {activeTab === "context" && (
            <div className="space-y-3">
              {diffResult.contextDiffs.map(cd => (
                <div key={cd.field} className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {cd.label}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-red-50/50 border border-red-100 rounded-lg">
                      <span className="text-[10px] font-bold text-red-500 uppercase block mb-1">Pôvodná hodnota (v{snapA.version}):</span>
                      <p className="font-semibold text-slate-800">
                        {Array.isArray(cd.oldValue) ? cd.oldValue.join(", ") : String(cd.oldValue || "<Nevyplnené>")}
                      </p>
                    </div>

                    <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Nová hodnota (v{snapB.version}):</span>
                      <p className="font-bold text-emerald-950">
                        {Array.isArray(cd.newValue) ? cd.newValue.join(", ") : String(cd.newValue || "<Nevyplnené>")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {diffResult.contextDiffs.length === 0 && (
                <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
                  <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
                  <p className="font-bold text-slate-800">Kontext a rozsah sú zhodné</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Klasifikácia dát, štandardy zhody a typy používateľov sa medzi týmito verziami nezmenili.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Porovnáva sa <strong>v{snapA.version}</strong> s <strong>v{snapB.version}</strong>.
          </div>
          <button
            onClick={() => setIsDiffModalOpen(false)}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Zatvoriť diff
          </button>
        </div>

      </div>
    </div>
  );
}
