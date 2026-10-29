import React, { useState, useMemo } from "react";
import { X, GitBranch, ArrowRight, Sparkles, History } from "lucide-react";
import { useAnalysisVersion } from "../context/AnalysisVersionContext";

export function NewVersionModal() {
  const { 
    currentWorkingVersion, 
    allVersions, 
    isNewVersionModalOpen, 
    setIsNewVersionModalOpen, 
    createNewVersion 
  } = useAnalysisVersion();

  // Compute smart version suggestions
  const { suggestedMinor, suggestedMajor } = useMemo(() => {
    const vStr = currentWorkingVersion || "1.0";
    const parts = vStr.split(".").map(p => parseInt(p, 10));
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return {
        suggestedMinor: `${parts[0]}.${parts[1] + 1}`,
        suggestedMajor: `${parts[0] + 1}.0`
      };
    }
    return {
      suggestedMinor: "1.1",
      suggestedMajor: "2.0"
    };
  }, [currentWorkingVersion]);

  const [selectedType, setSelectedType] = useState<"minor" | "major" | "custom">("minor");
  const [customVersion, setCustomVersion] = useState("");
  const [cloneFromVersion, setCloneFromVersion] = useState<string>(currentWorkingVersion || "1.0");
  const [changeSummary, setChangeSummary] = useState("Pravidelná revízia bezpečnostného stavu a zapracovanie dodatočných kontrol.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isNewVersionModalOpen) return null;

  const targetVersionNumber = selectedType === "minor" 
    ? suggestedMinor 
    : selectedType === "major" 
    ? suggestedMajor 
    : customVersion.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetVersionNumber) return;

    setIsSubmitting(true);
    try {
      createNewVersion(targetVersionNumber, {
        changeSummary: changeSummary.trim(),
        cloneFromVersion: cloneFromVersion !== currentWorkingVersion ? cloneFromVersion : undefined
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0">
              <GitBranch size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Vytvoriť novú verziu analýzy</h3>
              <p className="text-xs text-blue-100">Pokračovanie z predchádzajúceho stavu v{currentWorkingVersion}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsNewVersionModalOpen(false)}
            className="text-white/70 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Zvoľte typ novej verzie</label>
            <div className="grid grid-cols-2 gap-3">
              {/* Minor increment */}
              <button
                type="button"
                onClick={() => setSelectedType("minor")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedType === "minor"
                    ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Menšia revízia (Minor)</span>
                  <span className="text-xs font-extrabold text-blue-600">v{suggestedMinor}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Odporúčané pre bežné iterácie, dopĺňanie testov a priebežné úpravy stavu.
                </p>
              </button>

              {/* Major increment */}
              <button
                type="button"
                onClick={() => setSelectedType("major")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedType === "major"
                    ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Hlavná verzia (Major)</span>
                  <span className="text-xs font-extrabold text-indigo-600">v{suggestedMajor}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Pre zásadné architektonické zmeny, nový release alebo prepracovaný rozsah.
                </p>
              </button>
            </div>

            {/* Custom version toggle */}
            <div className="mt-2.5 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setSelectedType("custom")}
                className={`text-xs font-medium cursor-pointer underline ${
                  selectedType === "custom" ? "text-blue-700 font-bold" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Zadať vlastné číslo verzie...
              </button>
            </div>

            {selectedType === "custom" && (
              <div className="mt-2">
                <input 
                  type="text"
                  placeholder="napr. 1.2-rc1 alebo 2.1"
                  value={customVersion}
                  onChange={(e) => setCustomVersion(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            )}
          </div>

          {/* Clone source if multiple snapshots exist */}
          {allVersions.length > 1 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Vychádzať z verzie</label>
              <select
                value={cloneFromVersion}
                onChange={(e) => setCloneFromVersion(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none cursor-pointer"
              >
                <option value={currentWorkingVersion}>Aktuálny rozpracovaný stav (v{currentWorkingVersion})</option>
                {allVersions.map(v => (
                  <option key={v.version} value={v.version}>
                    v{v.version} ({v.label || "Archivovaný snapshot"} - {new Date(v.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Dôvod vytvorenia novej verzie (Zámer)</label>
            <textarea 
              rows={3}
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none resize-none"
              placeholder="Aké zmeny plánujete v tejto verzii zapracovať?"
              required
            />
          </div>

          {/* Visual transition reminder */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600">
            <span className="font-medium text-slate-500">Prechod:</span>
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <span className="px-2 py-0.5 bg-slate-200 rounded text-slate-700">v{currentWorkingVersion}</span>
              <ArrowRight size={14} className="text-blue-600" />
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-extrabold">v{targetVersionNumber} (Draft)</span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button 
              type="button"
              onClick={() => setIsNewVersionModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Zrušiť
            </button>
            <button 
              type="submit"
              disabled={isSubmitting || !targetVersionNumber}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm shadow-blue-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={15} />
              <span>{isSubmitting ? "Vytváram..." : `Vytvoriť verziu v${targetVersionNumber}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
