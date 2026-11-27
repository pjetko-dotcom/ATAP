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
import type { ReportLanguage } from "../utils/reportLanguage";
import { LanguageFlag } from "./LanguageFlag";
import { useLanguage } from "../context/LanguageContext";

export function Export() {
  const { t } = useLanguage();
  const { id: analysisId } = useParams<{ id: string }>();
  const { reqs } = useWorkspaceState(analysisId);
  const { analyses } = useAnalyses();
  const [reportLanguage, setReportLanguage] = useState<ReportLanguage>("sk");

  const currentAnalysis = analyses.find(a => a.id === analysisId);
  const analysisName = currentAnalysis?.name || (reportLanguage === "sk" ? "Bezpečnostná analýza systému" : "System security assessment");
  const asvsLevel = currentAnalysis?.asvsLevel || "2";

  const [targetLevel, setTargetLevel] = useState<number | "all">("all");
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [excelSections, setExcelSections] = useState({ summary: true, requirements: true, threats: true });
  const [excelDensity, setExcelDensity] = useState<"comfortable" | "compact">("comfortable");
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

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
    setExportError(null);
    try {
      await exportASVSToExcel(activeReqs, {
        analysisId,
        analysisName,
        targetLevel,
        onlyGaps,
        includeSummary: excelSections.summary,
        includeRequirements: excelSections.requirements,
        includeThreats: excelSections.threats,
        density: excelDensity,
        language: reportLanguage,
      });
      setDownloadSuccess(t("Súbor .xlsx bol úspešne vygenerovaný a stiahnutý.", "The .xlsx file was generated and downloaded."));
      setTimeout(() => setDownloadSuccess(null), 5000);
    } catch (err) {
      console.error("Export to Excel failed:", err);
      setExportError(t("Excel súbor sa nepodarilo vytvoriť. Skontrolujte rozsah a skúste to znova.", "Could not create the Excel file. Check the scope and try again."));
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleDownloadCSV = () => {
    setDownloadSuccess(null);
    setExportError(null);
    try {
      exportASVSToCSV(activeReqs, {
        analysisId,
        analysisName,
        targetLevel,
        onlyGaps,
        language: reportLanguage
      });
      setDownloadSuccess(t("Súbor .csv bol úspešne vygenerovaný a stiahnutý.", "The .csv file was generated and downloaded."));
      setTimeout(() => setDownloadSuccess(null), 5000);
    } catch (err) {
      console.error("Export to CSV failed:", err);
      setExportError(t("CSV súbor sa nepodarilo vytvoriť. Skúste to znova.", "Could not create the CSV file. Try again."));
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
              <h1 className="text-xl font-bold text-slate-800">{t("Export a bezpečnostné reporty", "Export & Security reports")}</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {t("Generujte exekutívne PDF reporty, podrobné audítorské Excel hárky alebo kompletné JSON zálohy pre", "Generate executive PDF reports, detailed audit Excel sheets, or complete JSON backups for")} {analysisName}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExecutiveReportOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Printer size={15} />
              <span>{t("Exekutívny PDF Report", "Executive PDF Report")}</span>
            </button>
          </div>
        </div>

        {downloadSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
            <Check size={16} className="text-emerald-600 shrink-0" />
            <span className="font-medium">{downloadSuccess}</span>
          </div>
        )}
        {exportError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-800">{exportError}</div>}

        {/* Executive Banner Highlight */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-2 py-0.5 bg-blue-500/30 text-blue-200 text-[10px] font-bold uppercase tracking-wider rounded border border-blue-400/30">
              {t("Manažérsky výstup pre audítorov a CISO", "Executive output for auditors and CISOs")}
            </span>
            <h2 className="text-lg font-bold">{t("Report hodnotenia OWASP ASVS (Tlač / PDF)", "OWASP ASVS assessment report (Print / PDF)")}</h2>
            <p className="text-xs text-blue-100 max-w-xl">
              {t("Súhrn pokrytia všetkých 17 kapitol (V1–V17), prioritné nedostatky, STRIDE hrozby a priestor na schválenie audítorom. Report je výstup aplikácie, nie certifikácia ani oficiálne potvrdenie OWASP.", "Coverage summary for all 17 chapters (V1–V17), priority gaps, STRIDE threats, and auditor sign-off. This report is an application output, not an OWASP certification or official attestation.")}
            </p>
          </div>
          <button
            onClick={() => setIsExecutiveReportOpen(true)}
            className="px-4 py-2.5 bg-white hover:bg-blue-50 text-slate-900 rounded-lg text-xs font-bold shadow-sm flex items-center gap-2 shrink-0 transition-colors cursor-pointer"
          >
            <Printer size={16} className="text-blue-600" />
            <span>{t("Zobraziť a vytlačiť PDF", "View & print PDF")}</span>
          </button>
        </div>

        {/* Scope Filters */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <label htmlFor="report-language" className="block text-xs font-semibold text-slate-600 mb-1.5">{t("Jazyk reportu", "Report language")}</label>
            <div className="flex items-center gap-2">
              <LanguageFlag language={reportLanguage} />
              <select id="report-language" value={reportLanguage} onChange={event => setReportLanguage(event.target.value === "en" ? "en" : "sk")} className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-700">
                <option value="sk">Slovenčina</option>
                <option value="en">English</option>
              </select>
            </div>
            <p className="mt-1 text-xs text-slate-500">{t("Údaje projektu a niektoré generované texty sa automaticky neprekladajú.", "Project data and some generated text are not translated automatically.")}</p>
          </div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Layers size={16} className="text-blue-600" />
            {t("Nastavenie rozsahu tabuľkového exportu", "Spreadsheet export scope")}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {t("Cieľová úroveň ASVS", "Target ASVS level")}
              </label>
              <select
                value={targetLevel}
                onChange={(e) => setTargetLevel(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">{t("Všetky úrovne (Level 1, 2 a 3)", "All levels (Level 1, 2 and 3)")}</option>
                <option value={1}>{t("Level 1 (Základná bezpečnostná hygiena)", "Level 1 (Basic security hygiene)")}</option>
                <option value={2}>{t("Level 2 (Štandard pre citlivé B2B/B2C aplikácie)", "Level 2 (Standard for sensitive B2B/B2C applications)")}</option>
                <option value={3}>{t("Level 3 (Kritická infraštruktúra a bankovníctvo)", "Level 3 (Critical infrastructure and banking)")}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {t("Filtrovanie podľa stavu", "Filter by status")}
              </label>
              <div className="flex items-center h-10">
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyGaps}
                    onChange={(e) => setOnlyGaps(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                  />
                  <span>{t("Exportovať iba otvorené bezpečnostné nedostatky", "Export only open security gaps")} (Partial / Missing)</span>
                </label>
              </div>
            </div>
          </div>

          <fieldset className="border-t border-slate-100 pt-4">
            <legend className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("Sekcie zošita Excel (najviac tri hárky)", "Excel workbook sections (up to three sheets)")}</legend>
            <p className="mt-1 text-[11px] text-slate-500">
              {t("Hárok STRIDE sa vytvorí iba vtedy, ak register obsahuje hrozby. Pri exporte iba nedostatkov zostáva súhrn vypočítaný z celého zvoleného rozsahu.", "The STRIDE sheet is created only when the register contains threats. When exporting gaps only, the summary still covers the entire selected scope.")}
            </p>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { key: "summary", label: t("Súhrn auditu", "Audit summary"), description: t("KPI a prehľad kapitol", "KPIs and chapter overview") },
                { key: "requirements", label: t("ASVS požiadavky", "ASVS requirements"), description: t("Detailný zoznam kontrol", "Detailed list of controls") },
                { key: "threats", label: t("STRIDE hrozby", "STRIDE threats"), description: t("Register hrozieb, ak je k dispozícii", "Threat register, if available") },
              ].map(section => (
                <label key={section.key} className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-xs">
                  <input
                    type="checkbox"
                    checked={excelSections[section.key as keyof typeof excelSections]}
                    onChange={event => setExcelSections(current => ({ ...current, [section.key]: event.target.checked }))}
                    className="mt-0.5"
                  />
                  <span><strong className="block text-slate-700">{section.label}</strong><span className="text-slate-500">{section.description}</span></span>
                </label>
              ))}
            </div>
            {!excelSections.summary && !excelSections.requirements && !excelSections.threats && (
              <p role="alert" className="mt-2 text-xs font-medium text-red-700">{t("Vyberte aspoň jednu sekciu zošita.", "Select at least one workbook section.")}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label htmlFor="excel-density" className="text-xs font-semibold text-slate-600">{t("Hustota riadkov", "Row density")}</label>
              <select id="excel-density" value={excelDensity} onChange={event => setExcelDensity(event.target.value as "comfortable" | "compact")} className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700">
                <option value="comfortable">{t("Čitateľná (vyššie riadky)", "Comfortable (taller rows)")}</option>
                <option value="compact">{t("Kompaktná (viac údajov na stránke)", "Compact (more data per page)")}</option>
              </select>
            </div>
          </fieldset>

          {/* Quick Metrics of the export */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {t("Náhľad obsahu vygenerovaného súboru:", "Preview of generated file contents:")}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="text-base font-bold text-slate-800">{totalCount}</div>
                <div className="text-[10px] text-slate-500">{t("Položiek spolu", "Total items")}</div>
              </div>
              <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100">
                <div className="text-base font-bold text-emerald-700">{implementedCount}</div>
                <div className="text-[10px] text-emerald-600">{t("Splnené (Implemented)", "Implemented")}</div>
              </div>
              <div className="bg-red-50/70 p-2.5 rounded-lg border border-red-100">
                <div className="text-base font-bold text-red-700">{gapsCount}</div>
                <div className="text-[10px] text-red-600">{t("Nedostatky (Gaps)", "Gaps")}</div>
              </div>
              <div className="bg-slate-100/70 p-2.5 rounded-lg border border-slate-200">
                <div className="text-base font-bold text-slate-600">{naCount}</div>
                <div className="text-[10px] text-slate-500">{t("Vylúčené (N/A)", "Excluded (N/A)")}</div>
              </div>
              <div className="bg-blue-50/70 p-2.5 rounded-lg border border-blue-100">
                <div className="text-base font-bold text-blue-700">{pendingCount}</div>
                <div className="text-[10px] text-blue-600">{t("Čakajúce (Pending)", "Pending")}</div>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600">
                  {t("Ukážka riadkov podľa zvoleného rozsahu", "Preview of rows in the selected scope")}{previewList.length > 4 ? t(" · prvé 4 položky", " · first 4 items") : ""}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[540px] text-left text-xs">
                    <thead className="text-[10px] uppercase text-slate-500">
                      <tr><th className="px-3 py-2">ID</th><th className="px-3 py-2">{t("Požiadavka", "Requirement")}</th><th className="px-3 py-2">Level</th><th className="px-3 py-2">{t("Stav", "Status")}</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewList.slice(0, 4).map(requirement => (
                        <tr key={requirement.id}>
                          <td className="px-3 py-2 font-mono text-slate-600">{requirement.id}</td>
                          <td className="max-w-sm truncate px-3 py-2 text-slate-700">{requirement.title}</td>
                          <td className="px-3 py-2 text-slate-600">L{requirement.level}</td>
                          <td className="px-3 py-2 text-slate-600">{requirement.status || "Pending"}</td>
                        </tr>
                      ))}
                      {previewList.length === 0 && <tr><td colSpan={4} className="px-3 py-5 text-center text-slate-500">{t("Pre tento filter nie sú žiadne riadky.", "No rows match this filter.")}</td></tr>}
                    </tbody>
                  </table>
                </div>
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
                {t("Viac-hárkový zošit: Prehľad auditu, požiadavky s filtrami, metodika overenia a STRIDE hrozby.", "Multi-sheet workbook: audit overview, filterable requirements, verification guidance and STRIDE threats.")}
              </p>

              <div className="space-y-1.5 mb-6 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>{t("3 hárky vrátane KPI súhrnu", "3 sheets including KPI summary")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>{t("Farebné formátovanie stavov", "Colour-coded statuses")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>{t("Overovacie otázky SAST/DAST", "SAST/DAST verification questions")}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleDownloadExcel}
              disabled={isExportingExcel || !Object.values(excelSections).some(Boolean)}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isExportingExcel ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>{t("Generujem Excel...", "Generating Excel...")}</span>
                </>
              ) : (
                <>
                  <Download size={15} />
                  <span>{t("Stiahnuť Excel (.xlsx)", "Download Excel (.xlsx)")}</span>
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
              <h3 className="text-base font-bold text-slate-800 mb-1">{t("CSV formát (.csv)", "CSV format (.csv)")}</h3>
              <p className="text-xs text-slate-500 mb-4">
                {t("Štandardný tabuľkový súbor vhodný pre strojové spracovanie, CI/CD skripty a Jira import.", "Standard tabular file suitable for machine processing, CI/CD scripts and Jira import.")}
              </p>

              <div className="space-y-1.5 mb-6 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-slate-500 shrink-0" />
                  <span>{t("UTF-8 s BOM (SK diakritika)", "UTF-8 with BOM")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-slate-500 shrink-0" />
                  <span>{t("RFC 4180 kompatibilita", "RFC 4180 compatibility")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-slate-500 shrink-0" />
                  <span>{t("Okamžité stiahnutie", "Instant download")}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleDownloadCSV}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Download size={15} />
              <span>{t("Stiahnuť CSV (.csv)", "Download CSV (.csv)")}</span>
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
              <h3 className="text-base font-bold text-slate-800 mb-1">{t("JSON záloha a obnova", "JSON Backup & Restore")}</h3>
              <p className="text-xs text-slate-500 mb-4">
                {t("Kompletná nezávislá záloha stavu projektu vrátane architektúry, audit logu a verzií.", "Complete independent project backup including architecture, audit log and versions.")}
              </p>

              <div className="space-y-1.5 mb-6 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-blue-600 shrink-0" />
                  <span>{t("Obsahuje architektúru aj DFD toky", "Includes architecture and DFD flows")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-blue-600 shrink-0" />
                  <span>{t("Úplný auditný log a verzie", "Complete audit log and versions")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-blue-600 shrink-0" />
                  <span>{t("Možnosť spätnej obnovy dát", "Data can be restored")}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Database size={15} />
              <span>{t("Spravovať zálohy (JSON)", "Manage backups (JSON)")}</span>
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
          businessOwners={currentAnalysis?.businessOwners}
          language={reportLanguage}
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
