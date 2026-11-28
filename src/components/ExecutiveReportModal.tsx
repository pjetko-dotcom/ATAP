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
import { Printer, X, FileText } from "lucide-react";
import { ASVS_VERSION, asvsChapters, type ASVSRequirement } from "../data/asvsData";
import { getExecutiveCoverage, getExecutiveReportData } from "../utils/executiveReport";
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

interface ExecutiveReportGapsProps {
  gaps: readonly (Pick<ASVSRequirement, "id" | "title" | "description" | "notes"> & { status: string })[];
  total: number;
  language: ReportLanguage;
}

export function ExecutiveReportGaps({ gaps, total, language }: ExecutiveReportGapsProps) {
  const t = (sk: string, en: string) => reportText(language, sk, en);
  return (
    <div className="mb-8">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
        {t("3. Vybrané nedostatky ASVS", "3. Selected ASVS gaps")}
      </h2>
      {gaps.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
          {t("V zvolenom rozsahu nie sú žiadne požiadavky označené Missing alebo Partial. Neznamená to, že všetky požiadavky boli vyhodnotené alebo implementované.", "No requirements in the selected scope are marked Missing or Partial. This does not mean that all requirements have been evaluated or implemented.")}
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs text-slate-600">{t(`Zobrazených ${gaps.length} z ${total}. Poradie: Missing pred Partial, potom vyššia úroveň ASVS a ID; nejde o hodnotenie rizika.`, `Showing ${gaps.length} of ${total}. Ordered by Missing before Partial, then higher ASVS level and ID; this is not a risk ranking.`)}</p>
          <div className="border border-slate-200 rounded-xl overflow-hidden print:overflow-visible">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2.5 w-20">ID</th>
                  <th className="p-2.5 w-16 text-center">{t("Stav", "Status")}</th>
                  <th className="p-2.5">{t("Požiadavka", "Requirement")}</th>
                  <th className="p-2.5">{t("Poznámka", "Note")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gaps.map(gap => (
                  <tr key={gap.id} className="hover:bg-slate-50/50 print:break-inside-avoid">
                    <td className="p-2.5 font-bold text-slate-800 align-top">{gap.id}</td>
                    <td className="p-2.5 text-center align-top">
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${
                        gap.status === "Missing" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {gap.status === "Missing" ? t("Chýba", "Missing") : t("Čiastočne", "Partial")}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-700 align-top">
                      <strong className="block text-slate-800">{gap.title}</strong>
                      <span className="text-xs text-slate-600">{gap.description}</span>
                    </td>
                    <td className="p-2.5 text-slate-600 text-xs align-top whitespace-pre-wrap break-words">
                      {gap.notes || t("Poznámka nie je uvedená.", "No note provided.")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
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

  let data: ReturnType<typeof getExecutiveReportData>;
  try {
    data = getExecutiveReportData(localStorage, analysisId, asvsLevel);
  } catch {
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
        <div role="dialog" aria-modal="true" aria-labelledby="report-error-title" className="max-w-lg rounded-xl bg-white p-6 shadow-xl">
          <h2 id="report-error-title" className="font-bold text-slate-900">{t("Report sa nepodarilo načítať", "Could not load the report")}</h2>
          <p role="alert" className="mt-3 text-sm text-slate-700">{t("Údaje ASVS alebo hrozieb sú nedostupné alebo poškodené. Skontrolujte pracovný priestor a skúste to znova.", "ASVS or threat data is unavailable or invalid. Check the workspace and try again.")}</p>
          <button onClick={onClose} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">{t("Zavrieť", "Close")}</button>
        </div>
      </div>, document.body
    );
  }
  const { targetLevel: targetLevelNum, scoped: applicableReqs, threatSummary } = data;
  const targetLevelLabel = targetLevelNum === "all" ? t("Všetky úrovne (L1-L3)", "All levels (L1-L3)") : `L${targetLevelNum}`;

  // Computed metrics
  const totalScoped = applicableReqs.length;
  const implemented = applicableReqs.filter(r => r.status === "Implemented");
  const missing = applicableReqs.filter(r => r.status === "Missing");
  const partial = applicableReqs.filter(r => r.status === "Partial");
  const na = applicableReqs.filter(r => r.status === "N/A");

  const coverage = getExecutiveCoverage(applicableReqs);

  // Chapter statistics
  const chapterStats = asvsChapters.map(ch => {
    const chReqs = applicableReqs.filter(r => r.chapterId === ch.id);
    const chImplemented = chReqs.filter(r => r.status === "Implemented").length;
    return {
      id: ch.id,
      name: ch.name,
      total: chReqs.length,
      implemented: chImplemented,
      ...getExecutiveCoverage(chReqs)
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
      id="executive-report-print-root"
      lang={language}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto print:static print:block print:overflow-visible print:bg-white print:p-0"
      onClick={onClose}
    >
      <style>{`@media print {
        html, body { height: auto !important; overflow: visible !important; }
        body > :not(#executive-report-print-root) { display: none !important; }
      }`}</style>
      {/* Modal Container */}
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden my-auto print:block print:max-h-none print:max-w-none print:overflow-visible print:border-0 print:shadow-none"
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
                  {t("Dôverné / Bezpečnostné hodnotenie", "Confidential / Security assessment")}
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider rounded">
                  OWASP ASVS {ASVS_VERSION} ({targetLevelLabel})
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${
                  status === "Final" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}>
                  {t("Stav analýzy", "Analysis status")}: {status === "Draft" ? t("Rozpracovaná", "Draft") : status === "Final" ? t("Finálna", "Final") : status === "In Review" ? t("V kontrole", "In review") : status}
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
              <div>{t("Aktuálna verzia analýzy", "Current analysis version")}: <strong className="text-slate-800">v{currentVersion}</strong></div>
              <div>{t("Dátum vyhotovenia", "Report date")}: <strong className="text-slate-800">{new Date().toLocaleDateString(locale)}</strong></div>
              <div>{t("Garant systému", "System owner")}: <strong className="text-slate-800">{businessOwners || t("Neuvedený", "Not specified")}</strong></div>
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
                <p className="text-2xl font-extrabold mt-1 text-slate-800">
                  {coverage.score === null ? "—" : `${coverage.score}%`}
                </p>
                <span className="text-xs text-slate-500">{t("Partial = 0,5; Pending a N/A sú vylúčené", "Partial = 0.5; Pending and N/A excluded")} · {coverage.evaluated} {t("vyhodnotených", "evaluated")}</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{t("Splnené kontroly", "Implemented controls")}</span>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                  {implemented.length} <span className="text-xs font-normal text-slate-400">/ {totalScoped}</span>
                </p>
                <span className="text-[10px] text-slate-400">{na.length} {t("vylúčených", "excluded")} (N/A)</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{t("Nedostatky ASVS", "ASVS gaps")}</span>
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
              <p>{t(`V rozsahu ${targetLevelLabel} je ${totalScoped} požiadaviek: ${implemented.length} označených ako implementované, ${missing.length} chýbajúcich, ${partial.length} čiastočných, ${na.length} N/A a ${coverage.pending} nevyhodnotených.`, `In scope ${targetLevelLabel}: ${totalScoped} requirements, including ${implemented.length} marked implemented, ${missing.length} missing, ${partial.length} partial, ${na.length} N/A and ${coverage.pending} pending.`)}</p>
              <p className="mt-2">{t("Report používa aktuálne uložené údaje pracovnej verzie, nie zvolený archívny snapshot. Počty nedostatkov ASVS nezohľadňujú stav v registri zistení. Výstup nie je certifikáciou ani oficiálnym potvrdením OWASP.", "This report uses the current saved working data, not the selected archived snapshot. ASVS gap counts do not reflect finding register status. This output is not certification or official OWASP confirmation.")}</p>
              {data.defaultCount > 0 && <p className="mt-2 font-semibold">{t(`Pre ${data.defaultCount} požiadaviek v rozsahu nebol uložený stav; použitý je predvolený stav ASVS pracovného priestoru (N/A), nie výsledok overenia.`, `${data.defaultCount} in-scope requirements have no saved status; the ASVS workspace default (N/A) is used, not a verification result.`)}</p>}
              {data.usesDemoThreats && <p className="mt-2 font-semibold">{t("Register hrozieb používa predvolené ukážkové údaje.", "The threat register uses default demonstration data.")}</p>}
              <p className="mt-2">{t("Texty požiadaviek ASVS sú v angličtine; používateľské údaje a poznámky sa automaticky neprekladajú.", "ASVS requirement text is in English; user data and notes are not translated automatically.")}</p>
              <p className="mt-2">{t("Pomlčka znamená, že nie je žiadna vyhodnotená požiadavka; nejde o 0 % pokrytie.", "A dash means there are no evaluated requirements; it does not mean 0% coverage.")}</p>
            </div>
          </div>

          {/* Section 2: Chapter Breakdown */}
          <div className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              {t("2. Pokrytie po kapitolách ASVS (V1 – V17)", "2. ASVS coverage by chapter (V1 – V17)")}
            </h2>

            <div className="space-y-2">
              {chapterStats.map(stat => (
                <div key={stat.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/40 flex items-center justify-between gap-4 text-xs print:break-inside-avoid">
                  <div className="min-w-0">
                    <span className="font-bold text-slate-700">V{stat.id}: {stat.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-right shrink-0">
                    <span className="text-xs text-slate-600">
                      {stat.implemented}/{stat.total} {t("implementovaných / v rozsahu", "implemented / in scope")} · {stat.evaluated} {t("vyhodnotených", "evaluated")}
                    </span>
                    <span className="font-bold w-12 text-right text-slate-800">
                      {stat.score === null ? "—" : `${stat.score}%`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <ExecutiveReportGaps gaps={topGaps} total={missing.length + partial.length} language={language} />

          {/* Section 4: Sign-off & Approvals */}
          <div className="pt-8 border-t-2 border-slate-900 mt-12 print:break-inside-avoid">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">
              {t("4. Podpisy a schválenie", "4. Signatures and approval")}
            </h2>

            <div className="grid grid-cols-2 gap-8 text-xs">
              <div className="border border-slate-200 rounded-lg p-4 space-y-4">
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">{t("Vypracoval", "Prepared by")}</span>
                <div className="pt-8 border-b border-dashed border-slate-300"></div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>{t("Meno", "Name")}: ______________________</span>
                  <span>{t("Dátum", "Date")}: ______________________</span>
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
