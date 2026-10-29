import React, { useState } from "react";
import { X, Lock, CheckCircle, ShieldCheck } from "lucide-react";
import { useAnalysisVersion } from "../context/AnalysisVersionContext";

export function FinalizeVersionModal() {
  const { 
    analysis, 
    currentWorkingVersion, 
    isFinalizeModalOpen, 
    setIsFinalizeModalOpen, 
    finalizeVersion 
  } = useAnalysisVersion();

  const [versionNumber, setVersionNumber] = useState(currentWorkingVersion || "1.0");
  const [label, setLabel] = useState(`Finálna verzia v${currentWorkingVersion || "1.0"}`);
  const [changeSummary, setChangeSummary] = useState("Ukončená a schválená bezpečnostná analýza. Všetky prioritné hrozby a požiadavky OWASP ASVS boli verifikované.");
  const [createdBy, setCreatedBy] = useState("Erik Novák");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isFinalizeModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      finalizeVersion({
        versionNumber: versionNumber.trim() || currentWorkingVersion,
        label: label.trim(),
        changeSummary: changeSummary.trim(),
        createdBy: createdBy.trim()
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Finalizovať verziu analýzy</h3>
              <p className="text-xs text-slate-300">Uloženie nemenného kontrolného bodu (Final Snapshot)</p>
            </div>
          </div>
          <button 
            onClick={() => setIsFinalizeModalOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 bg-blue-50/80 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-start gap-3">
            <Lock size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-950">Čo znamená finalizácia?</p>
              <p className="text-blue-800/90 mt-0.5 leading-relaxed">
                Aktuálny stav (ASVS požiadavky, register hrozieb, kontext a metriky) sa uzamkne ako nemenná verzia <strong>v{versionNumber}</strong>. 
                V prípade budúcich zmien budete môcť vytvoriť pokračujúcu verziu (napr. <strong>v1.1</strong>) a kedykoľvek porovnať rozdiely (Diff).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Číslo verzie</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">v</span>
                <input 
                  type="text" 
                  value={versionNumber}
                  onChange={(e) => setVersionNumber(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                  placeholder="1.0"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Schválil / Autor</label>
              <input 
                type="text" 
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                placeholder="Meno audítora / analytika"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Názov verzie / Míľnik</label>
            <input 
              type="text" 
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
              placeholder="napr. Schválená verzia pred nasadením do produkcie"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Zhrnutie a poznámky k verzii (Release Notes)</label>
            <textarea 
              rows={3}
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none resize-none"
              placeholder="Uveďte dôvod finalizácie alebo kľúčové závery auditu..."
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button 
              type="button"
              onClick={() => setIsFinalizeModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Zrušiť
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm shadow-blue-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              <CheckCircle size={15} />
              <span>{isSubmitting ? "Finalizujem..." : `Uložiť ako Final v${versionNumber}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
