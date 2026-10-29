import React, { useState } from "react";
import { X, CheckCircle2, Shield, Info, HelpCircle, ArrowRight, RotateCcw, AlertTriangle } from "lucide-react";
import {
  projectCategorizationQuestions,
  evaluateProjectCategorization,
  CategorizationEvaluationResult
} from "../data/projectCategorizationData";

interface ProjectCategorizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: string;
  onApplyLevel: (level: string) => void;
  analysisId?: string;
}

export function ProjectCategorizationModal({
  isOpen,
  onClose,
  currentLevel,
  onApplyLevel,
  analysisId
}: ProjectCategorizationModalProps) {
  const storageKey = `atap_project_categorization_${analysisId || "default"}`;

  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [activeTab, setActiveTab] = useState<"questions" | "result">("questions");

  if (!isOpen) return null;

  const handleSelectOption = (questionId: string, optionId: string) => {
    const updated = { ...answers, [questionId]: optionId };
    setAnswers(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save categorization answers", e);
    }
  };

  const handleReset = () => {
    setAnswers({});
    localStorage.removeItem(storageKey);
    setActiveTab("questions");
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = projectCategorizationQuestions.length;
  const isFullyAnswered = answeredCount === totalQuestions;

  const evaluation: CategorizationEvaluationResult = evaluateProjectCategorization(answers);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-lg text-white">
              <Shield size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Kategorizácia projektu pre určenie ASVS Levelu</h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 bg-blue-500/30 text-blue-200 rounded-md border border-blue-400/30">
                  {answeredCount} z {totalQuestions} zodpovedaných
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                5 kľúčových oblastí na určenie optimálnej úrovne overenia bezpečnosti (ASVS L1, L2 alebo L3)
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

        {/* Navigation Tabs & Banner */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("questions")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === "questions"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Otázky kategorizácie ({answeredCount}/{totalQuestions})
            </button>
            <button
              onClick={() => setActiveTab("result")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "result"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-blue-700 border border-blue-200 hover:bg-blue-50"
              }`}
            >
              <span>Vyhodnotenie & Odporúčanie</span>
              <span className="px-1.5 py-0.2 bg-white/20 rounded font-bold">
                L{evaluation.recommendedLevel}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1 rounded hover:bg-slate-200 transition-colors"
              title="Resetovať odpovede kategorizácie"
            >
              <RotateCcw size={13} />
              <span>Resetovať</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "questions" ? (
            <div className="space-y-6">
              {/* Guidance Box */}
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-lg flex items-start gap-2.5">
                <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 leading-relaxed">
                  <strong>Ako otázky použiť:</strong> Pozitívne odpovede na otázky v prvých troch blokoch (citlivé dáta, vysoká kritickosť, regulácia) posúvajú projekt smerom k L2 alebo L3. Ak projekt spracúva len verejné dáta a nemá špeciálne regulačné nároky, L1 je takmer vždy postačujúca a nákladovo efektívna voľba. L3 je vyhradené len pre aplikácie, kde by zlyhanie malo katastrofálne následky.
                </div>
              </div>

              {/* Questions List */}
              {projectCategorizationQuestions.map((q) => {
                const currentAnswer = answers[q.id];

                return (
                  <div
                    key={q.id}
                    className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                        {q.blockTitle}
                      </span>
                      {currentAnswer ? (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Zodpovedané
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          Čaká na výber
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-800 mb-2">
                      {q.question}
                    </h3>

                    {/* Sub-questions bullet points */}
                    <div className="mb-4 bg-slate-50/80 rounded-lg p-3 border border-slate-100 space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Hodnotiace podotázky:
                      </span>
                      {q.subQuestions.map((sub, sIdx) => (
                        <div key={sIdx} className="text-xs text-slate-600 flex items-start gap-1.5">
                          <span className="text-blue-500 font-bold">•</span>
                          <span>{sub}</span>
                        </div>
                      ))}
                    </div>

                    {/* Options Selection */}
                    <div className="space-y-2">
                      {q.options.map((opt) => {
                        const isSelected = currentAnswer === opt.id;
                        return (
                          <div
                            key={opt.id}
                            onClick={() => handleSelectOption(q.id, opt.id)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                              isSelected
                                ? "border-blue-500 bg-blue-50/50 shadow-xs"
                                : "border-slate-200 hover:border-slate-300 bg-white"
                            }`}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              checked={isSelected}
                              onChange={() => handleSelectOption(q.id, opt.id)}
                              className="mt-1 text-blue-600 focus:ring-blue-500 shrink-0"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className={`text-xs font-bold ${isSelected ? "text-blue-900" : "text-slate-800"}`}>
                                  {opt.label}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                    opt.suggestedLevel === "3"
                                      ? "bg-purple-50 text-purple-700 border-purple-200"
                                      : opt.suggestedLevel === "2"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-slate-100 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  Indikuje ASVS L{opt.suggestedLevel}
                                </span>
                              </div>
                              {opt.description && (
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {opt.description}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Result Tab */
            <div className="space-y-6">
              <div className="p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-xl shadow-lg border border-slate-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center font-black text-xl text-blue-400">
                    L{evaluation.recommendedLevel}
                  </div>
                  <div>
                    <span className="text-xs uppercase font-bold text-blue-400 tracking-wider">
                      Odporúčaná cieľová úroveň pre váš projekt
                    </span>
                    <h3 className="text-lg font-bold">{evaluation.levelName}</h3>
                  </div>
                </div>

                <p className="text-xs text-slate-300 mt-3 leading-relaxed border-t border-slate-700/80 pt-3">
                  {evaluation.guidanceText}
                </p>
              </div>

              {/* Rationale Cards */}
              <div className="border border-slate-200 rounded-xl p-5 bg-white">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Zdôvodnenie odporúčania na základe odpovedí
                </h4>
                <div className="space-y-2">
                  {evaluation.rationale.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.2" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Banner to Apply */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">
                    Použiť odporúčanú úroveň pre túto analýzu?
                  </h4>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Aktuálne nastavený level: <strong>Level {currentLevel}</strong>. Zmena nastaví filter a ciele v ASVS Workspace na <strong>Level {evaluation.recommendedLevel}</strong>.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onApplyLevel(evaluation.recommendedLevel);
                    onClose();
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
                >
                  <CheckCircle2 size={14} />
                  <span>Nastaviť Level {evaluation.recommendedLevel}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {activeTab === "questions" ? (
              <span>Tip: Po vyplnení otázok prejdite na Vyhodnotenie.</span>
            ) : (
              <span>Vyhodnotenie je automaticky aktualizované po každej zmene odpovede.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeTab === "questions" ? (
              <button
                onClick={() => setActiveTab("result")}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <span>Zobraziť vyhodnotenie</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={() => setActiveTab("questions")}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Späť na otázky
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
