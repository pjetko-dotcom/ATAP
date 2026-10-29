import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { 
  FileSpreadsheet, 
  Download, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  ShieldCheck, 
  Sparkles,
  Check,
  Printer,
  Database,
  ArrowRight
} from "lucide-react";
import { asvsRequirements } from "../data/asvsData";
import { useWorkspaceState } from "../hooks/useWorkspaceState";
import { useAnalyses } from "../hooks/useAnalyses";
import { exportASVSToExcel, exportASVSToCSV } from "../utils/exportToExcel";
import { ExecutiveReportModal } from "./ExecutiveReportModal";
import { BackupRestoreModal } from "./BackupRestoreModal";

export function Export() {
  const { id: analysisId } = useParams<{ id: string }>();
  const { reqs } = useWorkspaceState(analysisId);
  const { analyses } = useAnalyses();

  const currentAnalysis = analyses.find(a => a.id === analysisId);
  const analysisName = currentAnalysis?.name || "Bezpečnostná analýza systému";
  const asvsLevel = currentAnalysis?.asvsLevel || "2";

  const [targetLevel, setTargetLevel] = useState<number | "all">("all");
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const [isExecutiveReportOpen, setIsExecutiveReportOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  const activeReqs = reqs.length > 0 ? reqs : asvsRequirements;

  // Filter preview calculation
  let previewList = [...activeReqs];
  if (targetLevel !== "all") {
    previewList = previewList.filter(r => r.level <= targetLevel);
  }
  if (onlyGaps) {
    previewList = previewList.filter(r => r.status === "Partial" || r.status === "Missing");
  }

  const totalCount = previewList.length;
  const implementedCount = previewList.filter(r => r.status === "Implemented").length;
  const gapsCount = previewList.filter(r => r.status === "Partial" || r.status === "Missing").length;
  const naCount = previewList.filter(r => r.status === "N/A").length;
  const pendingCount = previewList.filter(r => (r.status as string) !== "Implemented" && (r.status as string) !== "Partial" && (r.status as string) !== "Missing" && (r.status as string) !== "N/A").length;

  const handleDownloadExcel = async () => {
    setIsExportingExcel(true);
    setDownloadSuccess(null);
    try {
      await exportASVSToExcel(activeReqs, {
        analysisId,
        analysisName,
        targetLevel,
        onlyGaps
      });
      setDownloadSuccess("Súbor .xlsx bol úspešne vygenerovaný a stiahnutý.");
      setTimeout(() => setDownloadSuccess(null), 5000);
    } catch (err) {
      console.error("Export to Excel failed:", err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleDownloadCSV = () => {
    setDownloadSuccess(null);
    try {
      exportASVSToCSV(activeReqs, {
        analysisId,
        analysisName,
        targetLevel,
        onlyGaps
      });
      setDownloadSuccess("Súbor .csv bol úspešne vygenerovaný a stiahnutý.");
      setTimeout(() => setDownloadSuccess(null), 5000);
    } catch (err) {
      console.error("Export to CSV failed:", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 shrink-0">
              <Printer size={26} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Export & Bezpečnostné reporty</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Generujte exekutívne PDF reporty, podrobné audítorské Excel hárky alebo kompletné JSON zálohy pre {analysisName}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExecutiveReportOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Printer size={15} />
              <span>Exekutívny PDF Report</span>
            </button>
          </div>
        </div>

        {downloadSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
            <Check size={16} className="text-emerald-600 shrink-0" />
            <span className="font-medium">{downloadSuccess}</span>
          </div>
        )}

        {/* Executive Banner Highlight */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-2 py-0.5 bg-blue-500/30 text-blue-200 text-[10px] font-bold uppercase tracking-wider rounded border border-blue-400/30">
              Manažérsky výstup pre audítorov & CISO
            </span>
            <h2 className="text-lg font-bold">Oficiálna správa auditu OWASP ASVS (Tlač / PDF)</h2>
            <p className="text-xs text-blue-100 max-w-xl">
              Kompletné zhrnutie súladu po jednotlivých 14 kapitolách (V1–V14), prioritné bezpečnostné medzery (Gaps), STRIDE hrozby a podpisový formulár pre formálne schválenie.
            </p>
          </div>
          <button
            onClick={() => setIsExecutiveReportOpen(true)}
            className="px-4 py-2.5 bg-white hover:bg-blue-50 text-slate-900 rounded-lg text-xs font-bold shadow-sm flex items-center gap-2 shrink-0 transition-colors cursor-pointer"
          >
            <Printer size={16} className="text-blue-600" />
            <span>Zobraziť & Vytlačiť PDF</span>
          </button>
        </div>

        {/* Scope Filters */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Layers size={16} className="text-blue-600" />
            Nastavenie rozsahu tabuľkového exportu
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Cieľová úroveň ASVS (Level)
              </label>
              <select
                value={targetLevel}
                onChange={(e) => setTargetLevel(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">Všetky úrovne (Level 1, 2 a 3)</option>
                <option value={1}>Level 1 Only (Základná bezpečnostná hygiena)</option>
                <option value={2}>Level 2 (Štandard pre citlivé B2B/B2C aplikácie)</option>
                <option value={3}>Level 3 (Kritická infraštruktúra a bankovníctvo)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Filtrovanie podľa stavu
              </label>
              <div className="flex items-center h-10">
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyGaps}
                    onChange={(e) => setOnlyGaps(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                  />
                  <span>Exportovať <strong>iba otvorené bezpečnostné medzery</strong> (Partial / Missing)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Quick Metrics of the export */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Náhľad obsahu vygenerovaného súboru:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="text-base font-bold text-slate-800">{totalCount}</div>
                <div className="text-[10px] text-slate-500">Položiek spolu</div>
              </div>
              <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100">
                <div className="text-base font-bold text-emerald-700">{implementedCount}</div>
                <div className="text-[10px] text-emerald-600">Splnené (Implemented)</div>
              </div>
              <div className="bg-red-50/70 p-2.5 rounded-lg border border-red-100">
                <div className="text-base font-bold text-red-700">{gapsCount}</div>
                <div className="text-[10px] text-red-600">Medzery (Gaps)</div>
              </div>
              <div className="bg-slate-100/70 p-2.5 rounded-lg border border-slate-200">
                <div className="text-base font-bold text-slate-600">{naCount}</div>
                <div className="text-[10px] text-slate-500">Vylúčené (N/A)</div>
              </div>
              <div className="bg-blue-50/70 p-2.5 rounded-lg border border-blue-100">
                <div className="text-base font-bold text-blue-700">{pendingCount}</div>
                <div className="text-[10px] text-blue-600">Čakajúce (Pending)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Download Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* 1. XLSX Card */}
          <div className="bg-white p-6 rounded-xl border border-emerald-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
              Excel
            </div>

            <div>
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center mb-4">
                <FileSpreadsheet size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Microsoft Excel (.xlsx)</h3>
              <p className="text-xs text-slate-500 mb-4">
                Viac-hárkový zošit: Prehľad auditu, požiadavky s filtrami, metodika overenia a STRIDE hrozby.
              </p>

              <div className="space-y-1.5 mb-6 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>3 hárky vrátane KPI súhrnu</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>Farebné formátovanie stavov</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>Overovacie otázky SAST/DAST</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleDownloadExcel}
              disabled={isExportingExcel}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isExportingExcel ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Generujem Excel...</span>
                </>
              ) : (
                <>
                  <Download size={15} />
                  <span>Stiahnuť Excel (.xlsx)</span>
                </>
              )}
            </button>
          </div>

          {/* 2. CSV Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center mb-4">
                <FileText size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">CSV formát (.csv)</h3>
              <p className="text-xs text-slate-500 mb-4">
                Štandardný tabuľkový súbor vhodný pre strojové spracovanie, CI/CD skripty a Jira import.
              </p>

              <div className="space-y-1.5 mb-6 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-slate-500 shrink-0" />
                  <span>UTF-8 s BOM (SK diakritika)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-slate-500 shrink-0" />
                  <span>RFC 4180 kompatibilita</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-slate-500 shrink-0" />
                  <span>Okamžité stiahnutie</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleDownloadCSV}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Download size={15} />
              <span>Stiahnuť CSV (.csv)</span>
            </button>
          </div>

          {/* 3. JSON Backup & Restore Card */}
          <div className="bg-white p-6 rounded-xl border border-blue-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
              Backup / Restore
            </div>

            <div>
              <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center mb-4">
                <Database size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">JSON Záloha & Obnova</h3>
              <p className="text-xs text-slate-500 mb-4">
                Kompletná nezávislá záloha stavu projektu vrátane architektúry, audit logu a verzií.
              </p>

              <div className="space-y-1.5 mb-6 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-blue-600 shrink-0" />
                  <span>Obsahuje architektúru aj DFD toky</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-blue-600 shrink-0" />
                  <span>Úplný auditný log a verzie</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-blue-600 shrink-0" />
                  <span>Možnosť spätnej obnovy dát</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Database size={15} />
              <span>Spravovať zálohy (JSON)</span>
            </button>
          </div>

        </div>

      </div>

      {/* Executive Report Print Preview Modal */}
      {analysisId && (
        <ExecutiveReportModal
          isOpen={isExecutiveReportOpen}
          onClose={() => setIsExecutiveReportOpen(false)}
          analysisId={analysisId}
          analysisName={analysisName}
          asvsLevel={asvsLevel}
          currentVersion={currentAnalysis?.currentVersion || "1.0"}
          status={currentAnalysis?.status || "Draft"}
          businessOwners={currentAnalysis?.businessOwners || "Interný bezpečnostný tím"}
        />
      )}

      {/* Backup and Restore Modal */}
      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        currentAnalysisId={analysisId}
        currentAnalysisName={analysisName}
      />
    </div>
  );
}
