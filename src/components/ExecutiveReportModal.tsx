/**
 * Executive Security & Compliance Report Modal
 * Generates an executive, print-ready security audit report with chapter-by-chapter
 * OWASP ASVS compliance breakdown, STRIDE threat status, critical findings, and sign-off block.
 * Optimized for browser printing / Save to PDF via standard print CSS.
 * 
 * @module ExecutiveReportModal
 */
import React from "react";
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
import { asvsChapters, asvsRequirements, ASVSRequirement } from "../data/asvsData";

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisId: string;
  analysisName?: string;
  asvsLevel?: string | number;
  currentVersion?: string;
  status?: string;
  businessOwners?: string;
}

export function ExecutiveReportModal({
  isOpen,
  onClose,
  analysisId,
  analysisName = "Bezpečnostná analýza systému",
  asvsLevel = "2",
  currentVersion = "1.0",
  status = "Draft",
  businessOwners = "Interný bezpečnostný tím"
}: ExecutiveReportModalProps) {
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
  const targetLevelNum = typeof asvsLevel === "number" ? asvsLevel : parseInt(asvsLevel, 10) || 2;
  const applicableReqs = reqs.filter(r => r.level <= targetLevelNum);

  // Load threats
  let threats: any[] = [];
  try {
    const rawThreats = localStorage.getItem(`atap_threats_${analysisId}`);
    if (rawThreats) {
      threats = JSON.parse(rawThreats);
    }
  } catch (e) {}

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

  const evaluatedCount = implemented.length + missing.length + partial.length;
  const complianceScore = evaluatedCount > 0 
    ? Math.round(((implemented.length + partial.length * 0.5) / evaluatedCount) * 100)
    : 0;

  const openThreats = threats.filter(t => t.status === "Open");
  const criticalThreats = threats.filter(t => t.risk === "Critical" || t.risk === "High");

  // Chapter statistics
  const chapterStats = asvsChapters.map(ch => {
    const chReqs = applicableReqs.filter(r => r.chapterId === ch.id);
    const chImplemented = chReqs.filter(r => r.status === "Implemented").length;
    const chPartial = chReqs.filter(r => r.status === "Partial").length;
    const chMissing = chReqs.filter(r => r.status === "Missing").length;
    const chNa = chReqs.filter(r => r.status === "N/A").length;
    const chActive = chImplemented + chPartial + chMissing;
    const score = chActive > 0 ? Math.round(((chImplemented + chPartial * 0.5) / chActive) * 100) : 100;

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

  // Top critical gaps (Missing items prioritized)
  const topGaps = [...missing, ...partial].slice(0, 8);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      {/* Modal Container */}
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Control Bar (Hidden when printed) */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-blue-400" />
            <span className="font-bold text-sm tracking-tight">Exekutívny Security & Compliance Report</span>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              Náhľad pred tlačou / PDF
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Printer size={14} />
              <span>Tlačiť / Uložiť ako PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Report Document Body */}
        <div className="p-8 sm:p-12 overflow-y-auto flex-1 bg-white text-slate-800 print:p-0 print:overflow-visible custom-scrollbar">
          
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-6 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold uppercase tracking-wider rounded">
                  Dôverné / Bezpečnostný audit
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider rounded">
                  OWASP ASVS 4.0 (Level {asvsLevel})
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${
                  status === "Final" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}>
                  Stav: {status}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {analysisName}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Záverečná správa hodnotenia aplikačnej bezpečnosti a architektonických rizík
              </p>
            </div>

            <div className="text-left sm:text-right text-xs text-slate-500 space-y-0.5 shrink-0">
              <div>Verzia správy: <strong className="text-slate-800">v{currentVersion}</strong></div>
              <div>Dátum vyhotovenia: <strong className="text-slate-800">{new Date().toLocaleDateString("sk-SK")}</strong></div>
              <div>Garant systému: <strong className="text-slate-800">{businessOwners}</strong></div>
            </div>
          </div>

          {/* Section 1: Executive Summary & KPIs */}
          <div className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              1. Manažérske zhrnutie & Kľúčové ukazovatele
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Index súladu (ASVS)</span>
                <p className={`text-2xl font-extrabold mt-1 ${
                  complianceScore >= 80 ? "text-emerald-600" : complianceScore >= 50 ? "text-amber-600" : "text-red-600"
                }`}>
                  {complianceScore}%
                </p>
                <span className="text-[10px] text-slate-400">z relevantných požiadaviek L{asvsLevel}</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Splnené kontroly</span>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                  {implemented.length} <span className="text-xs font-normal text-slate-400">/ {totalScoped}</span>
                </p>
                <span className="text-[10px] text-slate-400">{na.length} vylúčených (N/A)</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Otvorené zistenia</span>
                <p className="text-2xl font-extrabold text-red-600 mt-1">
                  {missing.length + partial.length}
                </p>
                <span className="text-[10px] text-slate-400">{missing.length} chýba, {partial.length} čiastočne</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">STRIDE hrozby</span>
                <p className="text-2xl font-extrabold text-purple-600 mt-1">
                  {openThreats.length} <span className="text-xs font-normal text-slate-400">otvorených</span>
                </p>
                <span className="text-[10px] text-slate-400">{criticalThreats.length} s vysokým rizikom</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
              <p>
                Predložená správa sumarizuje bezpečnostný stav systému <strong>{analysisName}</strong> voči medzinárodnému štandardu <strong>OWASP Application Security Verification Standard 4.0</strong> na cieľovej úrovni <strong>L{asvsLevel}</strong>. Z celkového počtu <strong>{totalScoped}</strong> vyhodnocovaných kontrol bolo <strong>{implemented.length}</strong> overených ako implementovaných, <strong>{missing.length + partial.length}</strong> evidovaných ako zistenie (medzera) vyžadujúce nápravu a <strong>{na.length}</strong> identifikovaných ako neaplikovateľné na základe aplikačného kontextu a triáže.
              </p>
            </div>
          </div>

          {/* Section 2: Chapter Breakdown */}
          <div className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              2. Súlad po kapitolách štandardu (V1 – V14)
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
                      {stat.implemented}/{stat.total - stat.na} splnených
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
                3. Prioritné bezpečnostné medzery vyžadujúce nápravu
              </h2>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5 w-20">ID</th>
                      <th className="p-2.5 w-16 text-center">Stav</th>
                      <th className="p-2.5">Požiadavka</th>
                      <th className="p-2.5">Zistenie / Odporúčanie</th>
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
                          {gap.notes || "Vyžaduje implementáciu a dodanie overovacieho dôkazu (unit/integration testy)."}
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
              4. Podpisy & Schválenie auditu
            </h2>

            <div className="grid grid-cols-2 gap-8 text-xs">
              <div className="border border-slate-200 rounded-lg p-4 space-y-4">
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">Vypracoval bezpečnostný audítor</span>
                <div className="pt-8 border-b border-dashed border-slate-300"></div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Meno: Erik Novák</span>
                  <span>Dátum: {new Date().toLocaleDateString("sk-SK")}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-4 space-y-4">
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">Schválil CISO / Vedúci bezpečnosti</span>
                <div className="pt-8 border-b border-dashed border-slate-300"></div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Meno: ______________________</span>
                  <span>Dátum: ______________________</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
