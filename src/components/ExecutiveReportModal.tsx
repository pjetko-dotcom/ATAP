/**
 * Executive Security & Compliance Report Modal
 * Generates an executive, print-ready security audit report with chapter-by-chapter
 * OWASP ASVS compliance breakdown, STRIDE threat status, critical findings, and sign-off block.
 * Optimized for browser printing / Save to PDF via standard print CSS.
 * 
 * @module ExecutiveReportModal
 */
import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Printer, 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  Layers, 
  CheckCircle2, 
  Activity,
  Calendar,
  UserCheck
} from "lucide-react";
import { ASVS_VERSION, asvsChapters, asvsRequirements, ASVSRequirement } from "../data/asvsData";
import { getInitialThreatsForAnalysis, summarizeThreats, type Threat } from "../utils/threatModel";
import { calculateAsvsCoverage } from "../utils/asvsMetrics";
import { reportText, type ReportLanguage } from "../utils/reportLanguage";

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisId: string;
  analysisName?: string;
  asvsLevel?: string | number;
  currentVersion?: string;
  status?: string;
  businessOwners?: string;
  language?: ReportLanguage;
}

export function ExecutiveReportModal({
  isOpen,
  onClose,
  analysisId,
  analysisName,
  asvsLevel = "2",
  currentVersion = "1.0",
  status = "Draft",
  businessOwners,
  language = "sk"
}: ExecutiveReportModalProps) {
  const t = (sk: string, en: string) => reportText(language, sk, en);
  const locale = language === "sk" ? "sk-SK" : "en-GB";
  const reportAnalysisName = analysisName || t("Bezpečnostná analýza systému", "System security assessment");
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Load requirements
  let reqs: ASVSRequirement[] = asvsRequirements;
  try {
    const raw = localStorage.getItem(`atap_asvs_v5_${analysisId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        reqs = parsed;
      }
    }
  } catch (e) {}

  // Filter to target level
  const storedTargetLevel = localStorage.getItem(`atap_asvs_target_level_${analysisId}`);
  const requestedLevel = typeof asvsLevel === "number" ? asvsLevel : parseInt(asvsLevel, 10) || 2;
  const targetLevelNum = storedTargetLevel === "all"
    ? "all"
    : storedTargetLevel && [1, 2, 3].includes(Number(storedTargetLevel))
      ? Number(storedTargetLevel)
      : requestedLevel;
  const targetLevelLabel = targetLevelNum === "all" ? t("Všetky úrovne (L1-L3)", "All levels (L1-L3)") : `L${targetLevelNum}`;
  const applicableReqs = reqs.filter(r => targetLevelNum === "all" || r.level <= targetLevelNum);

  // Load threats
  let threats: Threat[] = getInitialThreatsForAnalysis(analysisId);
  try {
    const rawThreats = localStorage.getItem(`atap_threats_${analysisId}`);
    if (rawThreats) {
      threats = JSON.parse(rawThreats);
    }
  } catch (error) {
    console.error("Failed to load report threats", error);
  }

  // Load context
  let context: any = {};
  try {
    const rawCtx = localStorage.getItem(`atap_context_${analysisId}`);
    if (rawCtx) {
      context = JSON.parse(rawCtx);
    }
  } catch (e) {}

  // Computed metrics
  const totalScoped = applicableReqs.length;
  const implemented = applicableReqs.filter(r => r.status === "Implemented");
  const missing = applicableReqs.filter(r => r.status === "Missing");
  const partial = applicableReqs.filter(r => r.status === "Partial");
  const na = applicableReqs.filter(r => r.status === "N/A");

  const complianceScore = calculateAsvsCoverage(applicableReqs);

  const threatSummary = summarizeThreats(threats);

  // Chapter statistics
  const chapterStats = asvsChapters.map(ch => {
    const chReqs = applicableReqs.filter(r => r.chapterId === ch.id);
    const chImplemented = chReqs.filter(r => r.status === "Implemented").length;
    const chPartial = chReqs.filter(r => r.status === "Partial").length;
    const chMissing = chReqs.filter(r => r.status === "Missing").length;
    const chNa = chReqs.filter(r => r.status === "N/A").length;
    const score = calculateAsvsCoverage(chReqs);

    return {
      id: ch.id,
      name: ch.name,
      total: chReqs.length,
      implemented: chImplemented,
      partial: chPartial,
      missing: chMissing,
      na: chNa,
      score
    };
  });

  const topGaps = [...missing, ...partial]
    .sort((a, b) =>
      (a.status === b.status ? 0 : a.status === "Missing" ? -1 : 1) ||
      b.level - a.level ||
      a.id.localeCompare(b.id, undefined, { numeric: true })
    )
    .slice(0, 8);

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="executive-report-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Control Bar (Hidden when printed) */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <FileText size={18} className="text-blue-400" />
            <span id="executive-report-title" className="truncate font-bold text-sm tracking-tight">{t("Exekutívny Security & Compliance Report", "Executive Security & Compliance Report")}</span>
            <span className="hidden sm:inline text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              {t("Náhľad pred tlačou / PDF", "Print / PDF preview")}
            </span>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-2.5 sm:px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">{t("Tlačiť / Uložiť ako PDF", "Print / Save as PDF")}</span>
              <span className="sm:hidden">{t("Tlačiť", "Print")}</span>
            </button>
            <button
              onClick={onClose}
              aria-label={t("Zavrieť náhľad reportu", "Close report preview")}
              title={t("Zavrieť náhľad", "Close preview")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-2.5 py-1.5 text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
              <span className="text-xs font-semibold">{t("Zavrieť", "Close")}</span>
            </button>
          </div>
        </div>

        {/* Printable Report Document Body */}
        <div className="p-8 sm:p-12 overflow-y-auto flex-1 bg-white text-slate-800 print:p-0 print:overflow-visible custom-scrollbar">
          
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-6 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                AVERT · Application Security Assessment Platform
              </p>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold uppercase tracking-wider rounded">
                  {t("Dôverné / Bezpečnostný audit", "Confidential / Security audit")}
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider rounded">
                  OWASP ASVS {ASVS_VERSION} ({targetLevelLabel})
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${
                  status === "Final" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}>
                  {t("Stav", "Status")}: {status}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {reportAnalysisName}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Architecture · STRIDE · Risk · ASVS · Reports
              </p>
            </div>

            <div className="text-left sm:text-right text-xs text-slate-500 space-y-0.5 shrink-0">
              <div>{t("Verzia správy", "Report version")}: <strong className="text-slate-800">v{currentVersion}</strong></div>
              <div>{t("Dátum vyhotovenia", "Report date")}: <strong className="text-slate-800">{new Date().toLocaleDateString(locale)}</strong></div>
              <div>{t("Garant systému", "System owner")}: <strong className="text-slate-800">{businessOwners || t("Interný bezpečnostný tím", "Internal security team")}</strong></div>
            </div>
          </div>

          {/* Section 1: Executive Summary & KPIs */}
          <div className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              {t("1. Manažérske zhrnutie & Kľúčové ukazovatele", "1. Executive summary & key indicators")}
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{t("Vážené pokrytie ASVS", "Weighted ASVS coverage")}</span>
                <p className={`text-2xl font-extrabold mt-1 ${
                  complianceScore >= 80 ? "text-emerald-600" : complianceScore >= 50 ? "text-amber-600" : "text-red-600"
                }`}>
                  {complianceScore}%
                </p>
                <span className="text-[10px] text-slate-400">{t("Partial = 0,5; Pending a N/A sa nezapočítavajú", "Partial = 0.5; Pending and N/A are excluded")}</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{t("Splnené kontroly", "Implemented controls")}</span>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                  {implemented.length} <span className="text-xs font-normal text-slate-400">/ {totalScoped}</span>
                </p>
                <span className="text-[10px] text-slate-400">{na.length} {t("vylúčených", "excluded")} (N/A)</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{t("Otvorené zistenia", "Open findings")}</span>
                <p className="text-2xl font-extrabold text-red-600 mt-1">
                  {missing.length + partial.length}
                </p>
                <span className="text-[10px] text-slate-400">{missing.length} {t("chýba", "missing")}, {partial.length} {t("čiastočne", "partial")}</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{t("STRIDE hrozby", "STRIDE threats")}</span>
                <p className="text-2xl font-extrabold text-purple-600 mt-1">
                  {threatSummary.open} <span className="text-xs font-normal text-slate-400">{t("otvorených", "open")}</span>
                </p>
                <span className="text-[10px] text-slate-400">{threatSummary.openHighOrCritical} {t("s vysokým/kritickým otvoreným rizikom", "with open high/critical risk")}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
              {language === "sk" ? <p>
                Predložená správa sumarizuje bezpečnostný stav systému <strong>{reportAnalysisName}</strong> voči medzinárodnému štandardu <strong>OWASP Application Security Verification Standard {ASVS_VERSION}</strong> v rozsahu <strong>{targetLevelLabel}</strong>. Z celkového počtu <strong>{totalScoped}</strong> vyhodnocovaných kontrol bolo <strong>{implemented.length}</strong> overených ako implementovaných, <strong>{missing.length + partial.length}</strong> evidovaných ako nedostatky vyžadujúce nápravu a <strong>{na.length}</strong> identifikovaných ako neaplikovateľné na základe aplikačného kontextu a triáže.
              </p> : <p>
                This report summarizes the security posture of <strong>{reportAnalysisName}</strong> against <strong>OWASP Application Security Verification Standard {ASVS_VERSION}</strong> at <strong>{targetLevelLabel}</strong>. Of <strong>{totalScoped}</strong> controls in scope, <strong>{implemented.length}</strong> were verified as implemented, <strong>{missing.length + partial.length}</strong> were recorded as gaps requiring remediation, and <strong>{na.length}</strong> were identified as not applicable based on the application context and triage.
              </p>}
            </div>
          </div>

          {/* Section 2: Chapter Breakdown */}
          <div className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              {t("2. Súlad po kapitolách štandardu (V1 – V17)", "2. Compliance by standard chapter (V1 – V17)")}
            </h2>

            <div className="space-y-2">
              {chapterStats.map(stat => (
                <div key={stat.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/40 flex items-center justify-between gap-4 text-xs">
                  <div className="w-48 sm:w-60 truncate">
                    <span className="font-bold text-slate-700">V{stat.id}: {stat.name}</span>
                  </div>

                  <div className="flex-1 max-w-xs hidden sm:block">
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
                      <div 
                        className={`h-full ${
                          stat.score >= 80 ? "bg-emerald-500" : stat.score >= 50 ? "bg-amber-500" : "bg-red-500"
                        }`}
                        style={{ width: `${stat.score}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right shrink-0">
                    <span className="text-[11px] text-slate-400">
                      {stat.implemented}/{stat.total - stat.na} {t("splnených", "implemented")}
                    </span>
                    <span className={`font-bold w-12 text-right ${
                      stat.score >= 80 ? "text-emerald-700" : stat.score >= 50 ? "text-amber-700" : "text-red-700"
                    }`}>
                      {stat.score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Critical Gaps & Findings */}
          {topGaps.length > 0 && (
            <div className="mb-8 page-break-inside-avoid">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                {t("3. Prioritné bezpečnostné nedostatky vyžadujúce nápravu", "3. Priority security gaps requiring remediation")}
              </h2>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5 w-20">ID</th>
                      <th className="p-2.5 w-16 text-center">{t("Stav", "Status")}</th>
                      <th className="p-2.5">{t("Požiadavka", "Requirement")}</th>
                      <th className="p-2.5">{t("Zistenie / Odporúčanie", "Finding / Recommendation")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topGaps.map(gap => (
                      <tr key={gap.id} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-bold text-slate-800 align-top">{gap.id}</td>
                        <td className="p-2.5 text-center align-top">
                          <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${
                            gap.status === "Missing" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {gap.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-700 align-top">
                          <strong className="block text-slate-800">{gap.title}</strong>
                          <span className="text-[11px] text-slate-500 line-clamp-2">{gap.description}</span>
                        </td>
                        <td className="p-2.5 text-slate-600 text-[11px] align-top">
                          {gap.notes || t("Vyžaduje implementáciu a dodanie overovacieho dôkazu (unit/integration testy).", "Requires implementation and verification evidence (unit/integration tests).")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 4: Sign-off & Approvals */}
          <div className="pt-8 border-t-2 border-slate-900 mt-12 page-break-inside-avoid">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">
              {t("4. Podpisy & Schválenie auditu", "4. Signatures & audit approval")}
            </h2>

            <div className="grid grid-cols-2 gap-8 text-xs">
              <div className="border border-slate-200 rounded-lg p-4 space-y-4">
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">{t("Vypracoval bezpečnostný audítor", "Prepared by security auditor")}</span>
                <div className="pt-8 border-b border-dashed border-slate-300"></div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>{t("Meno", "Name")}: ______________________</span>
                  <span>{t("Dátum", "Date")}: {new Date().toLocaleDateString(locale)}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-4 space-y-4">
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">{t("Schválil CISO / Vedúci bezpečnosti", "Approved by CISO / Head of security")}</span>
                <div className="pt-8 border-b border-dashed border-slate-300"></div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>{t("Meno", "Name")}: ______________________</span>
                  <span>{t("Dátum", "Date")}: ______________________</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}
