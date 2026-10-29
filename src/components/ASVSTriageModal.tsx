import React, { useState } from "react";
import {
  X,
  CheckCircle,
  HelpCircle,
  Shield,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Search,
  Layers,
  Check,
  Ban,
  SlidersHorizontal,
  CheckCircle2,
  ArrowRight,
  Info
} from "lucide-react";
import {
  asvsTriageQuestions,
  ASVSTriageQuestion,
  ASVSRequirement,
  getRequirementsForTriage
} from "../data/asvsData";

interface ASVSTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  triageAnswers: Record<string, boolean>;
  onSetAnswer: (questionId: string, isRelevant: boolean) => void;
  onResetAnswer: (questionId: string) => void;
  reqs: ASVSRequirement[];
  currentLevel?: string;
  onApplyLevel?: (level: string) => void;
  analysisId?: string;
  initialTab?: string;
}

export function ASVSTriageModal({
  isOpen,
  onClose,
  triageAnswers,
  onSetAnswer,
  onResetAnswer,
  reqs,
  currentLevel = "2",
  onApplyLevel,
  analysisId,
}: ASVSTriageModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterState, setFilterState] = useState<"all" | "unanswered" | "excluded" | "relevant">("all");
  const [expandedPreview, setExpandedPreview] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate chapter triage statistics
  const totalQuestions = asvsTriageQuestions.length;
  const answeredRelevant = asvsTriageQuestions.filter(q => triageAnswers[q.id] === true).length;
  const answeredExcluded = asvsTriageQuestions.filter(q => triageAnswers[q.id] === false).length;
  const unanswered = totalQuestions - answeredRelevant - answeredExcluded;

  // Total scoped-out requirements from triage
  const scopedOutReqCount = reqs.filter(r => r.triageReason).length;

  const filteredQuestions = asvsTriageQuestions.filter(q => {
    const matchesSearch = 
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const isAnswered = triageAnswers[q.id] !== undefined;
    const isRelevant = triageAnswers[q.id] === true;
    const isExcluded = triageAnswers[q.id] === false;

    if (filterState === "unanswered") return matchesSearch && !isAnswered;
    if (filterState === "excluded") return matchesSearch && isExcluded;
    if (filterState === "relevant") return matchesSearch && isRelevant;
    return matchesSearch;
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] sm:h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-6 flex items-start justify-between shrink-0">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Shield size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                ASVS 5.0 Triage & Scoping Sprievodca
                {scopedOutReqCount > 0 && (
                  <span className="text-xs font-normal px-2 py-0.5 bg-blue-500/30 text-blue-200 rounded-full border border-blue-400/30">
                    {scopedOutReqCount} kontrol označených ako N/A
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Technologická triáž pre vylúčenie nepoužitých oblastí (V1–V17).
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* CHAPTER TRIAGE (V1 to V17) */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Overview Stats Bar */}
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3 shrink-0">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-xs font-medium text-slate-600">
                <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                Nezodpovedané: <span className="font-bold text-slate-800">{unanswered}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg shadow-xs font-medium text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Zahrnuté v scope: <span className="font-bold text-emerald-900">{answeredRelevant}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg shadow-xs font-medium text-slate-600">
                <Ban size={12} className="text-slate-400" />
                Vylúčené (N/A): <span className="font-bold text-slate-800">{answeredExcluded}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
            {/* Sidebar Filters */}
            <div className="w-full md:w-64 bg-slate-50/50 border-b md:border-b-0 md:border-r border-slate-200 p-4 shrink-0 flex flex-col overflow-y-auto">
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                <input 
                  type="text"
                  placeholder="Hľadať technológiu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-white text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Stav zodpovedania</h4>
              <div className="space-y-1">
                {[
                  { id: "all", label: "Všetky otázky", count: totalQuestions },
                  { id: "unanswered", label: "Nezodpovedané", count: unanswered },
                  { id: "relevant", label: "Zahrnuté (Áno)", count: answeredRelevant },
                  { id: "excluded", label: "Vylúčené (Nie)", count: answeredExcluded }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilterState(f.id as any)}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                      filterState === f.id 
                        ? "bg-blue-50 text-blue-700 font-bold" 
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>{f.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                      filterState === f.id ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-500"
                    }`}>{f.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Questions List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar bg-white">
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  Nenašli sa žiadne triage otázky pre zvolený filter.
                </div>
              ) : (
                filteredQuestions.map((q) => {
                  const currentAnswer = triageAnswers[q.id];
                  const isRelevant = currentAnswer === true;
                  const isExcluded = currentAnswer === false;
                  const isAnswered = currentAnswer !== undefined;
                  const affectedIds = getRequirementsForTriage(q, reqs);
                  const isPreviewOpen = expandedPreview === q.id;

                  return (
                    <div 
                      key={q.id}
                      className={`border rounded-xl p-4 transition-all duration-150 ${
                        isExcluded 
                          ? "bg-slate-50/80 border-slate-300" 
                          : isRelevant 
                          ? "bg-emerald-50/30 border-emerald-200" 
                          : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            {q.chapterId && (
                              <span className="text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded border border-blue-200">
                                V{q.chapterId}
                              </span>
                            )}
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {q.category}
                            </span>
                            <span className="text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-medium border border-blue-100">
                              {q.affectsLabel}
                            </span>
                            {isExcluded && (
                              <span className="text-[11px] font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded flex items-center gap-1">
                                <Ban size={12} /> Vylúčené (N/A)
                              </span>
                            )}
                            {isRelevant && (
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                                <Check size={12} /> Zahrnuté v scope
                              </span>
                            )}
                          </div>
                          
                          <h3 className="text-sm font-bold text-slate-800 leading-snug">
                            {q.question}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {q.description}
                          </p>
                        </div>
                        
                        {/* Answer Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-start lg:self-center">
                          <button
                            onClick={() => onSetAnswer(q.id, true)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                              isRelevant 
                                ? "bg-emerald-600 text-white shadow-xs" 
                                : "bg-white text-slate-700 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50/50"
                            }`}
                            title="Aplikácia túto technológiu používa, kontroly zostávajú v scope"
                          >
                            <Check size={14} />
                            <span>Áno, relevantné</span>
                          </button>
                          
                          <button
                            onClick={() => onSetAnswer(q.id, false)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                              isExcluded 
                                ? "bg-slate-700 text-white shadow-xs" 
                                : "bg-white text-slate-700 border border-slate-200 hover:border-red-300 hover:text-red-700 hover:bg-red-50/50"
                            }`}
                            title="Aplikácia túto technológiu nepoužíva, označiť kontroly ako N/A"
                          >
                            <Ban size={14} />
                            <span>Nie, nepotrebné (N/A)</span>
                          </button>

                          {isAnswered && (
                            <button
                              onClick={() => onResetAnswer(q.id)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Resetovať odpoveď"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Toggle Preview of Affected Requirements */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button
                          onClick={() => setExpandedPreview(isPreviewOpen ? null : q.id)}
                          className="text-slate-500 hover:text-blue-600 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                        >
                          {isPreviewOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          <span>{isPreviewOpen ? "Skryť zoznam kontrol" : `Zobraziť ${affectedIds.length} dotknutých kontrol`}</span>
                        </button>
                        {isExcluded && (
                          <span className="text-[11px] text-slate-400 italic">
                            Všetky kontroly nižšie sú v analýze označené ako N/A
                          </span>
                        )}
                      </div>

                      {/* Requirements Preview Drawer */}
                      {isPreviewOpen && (
                        <div className="mt-2.5 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5 max-h-48 overflow-y-auto">
                          {affectedIds.map(id => {
                            const r = reqs.find(item => item.id === id);
                            return (
                              <div key={id} className="flex items-start gap-2 py-0.5">
                                <span className="font-mono font-bold text-slate-700 text-[11px] shrink-0 w-16">{id}</span>
                                <span className="text-slate-600 flex-1 leading-snug line-clamp-1">{r?.description}</span>
                                <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded font-semibold shrink-0">L{r?.level}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Vylúčenia technológií okamžite označia kontroly ako N/A s evidovaným dôvodom.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Hotovo, zavrieť
          </button>
        </div>
      </div>
    </div>
  );
}
