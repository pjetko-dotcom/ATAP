import React, { useEffect, useState } from "react";
import { X, Lock, CheckCircle, ShieldCheck } from "lucide-react";
import { useAnalysisVersion } from "../context/AnalysisVersionContext";
import { getCurrentUserName } from "../utils/activityLog";
import { useLanguage } from "../context/LanguageContext";

export function FinalizeVersionModal() {
  const { t } = useLanguage();
  const { 
    analysis, 
    currentWorkingVersion, 
    isFinalizeModalOpen, 
    setIsFinalizeModalOpen, 
    finalizeVersion 
  } = useAnalysisVersion();

  const [versionNumber, setVersionNumber] = useState(currentWorkingVersion || "1.0");
  const [label, setLabel] = useState(() => t(`Finálna verzia v${currentWorkingVersion || "1.0"}`, `Final version v${currentWorkingVersion || "1.0"}`));
  const [changeSummary, setChangeSummary] = useState(() => t("Ukončená a schválená bezpečnostná analýza. Všetky prioritné hrozby a požiadavky OWASP ASVS boli verifikované.", "Security analysis completed and approved. All priority threats and OWASP ASVS requirements have been verified."));
  const [createdBy, setCreatedBy] = useState(getCurrentUserName);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isFinalizeModalOpen) setCreatedBy(getCurrentUserName());
  }, [isFinalizeModalOpen]);

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
              <h3 className="text-base font-bold text-white tracking-tight">{t("Finalizovať verziu analýzy", "Finalize analysis version")}</h3>
              <p className="text-xs text-slate-300">{t("Uloženie nemenného kontrolného bodu (Final Snapshot)", "Save an immutable checkpoint (Final Snapshot)")}</p>
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
              <p className="font-semibold text-blue-950">{t("Čo znamená finalizácia?", "What does finalization mean?")}</p>
              <p className="text-blue-800/90 mt-0.5 leading-relaxed">
                {t("Aktuálny stav (ASVS požiadavky, register hrozieb, kontext a metriky) sa uzamkne ako nemenná verzia", "The current state (ASVS requirements, threat register, context and metrics) will be locked as immutable version")} <strong>v{versionNumber}</strong>.{" "}
                {t("Pri budúcich zmenách môžete vytvoriť pokračujúcu verziu (napr. v1.1) a porovnať rozdiely.", "For future changes, you can create a subsequent version (e.g. v1.1) and compare differences.")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t("Číslo verzie", "Version number")}</label>
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
              <label className="block text-xs font-bold text-slate-700 mb-1">{t("Zadaný autor (neoverené)", "Entered author (unverified)")}</label>
              <input 
                type="text" 
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                placeholder={t("Meno autora", "Author name")}
                required
              />
              <p className="mt-1 text-xs text-amber-700">{t("Meno sa ukladá lokálne a nie je overené prihlásením.", "The name is stored locally and is not authenticated.")}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{t("Názov verzie / Míľnik", "Version name / Milestone")}</label>
            <input 
              type="text" 
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
              placeholder={t("napr. Schválená verzia pred nasadením do produkcie", "e.g. Approved version before production deployment")}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{t("Zhrnutie a poznámky k verzii", "Summary and release notes")}</label>
            <textarea 
              rows={3}
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none resize-none"
              placeholder={t("Uveďte dôvod finalizácie alebo kľúčové závery auditu...", "Enter the reason for finalization or key audit findings...")}
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button 
              type="button"
              onClick={() => setIsFinalizeModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              {t("Zrušiť", "Cancel")}
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm shadow-blue-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              <CheckCircle size={15} />
              <span>{isSubmitting ? t("Finalizujem...", "Finalizing...") : t(`Uložiť ako Final v${versionNumber}`, `Save as Final v${versionNumber}`)}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
