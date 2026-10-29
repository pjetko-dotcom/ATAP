import React from "react";
import { X, History, Lock, CheckCircle2, GitBranch, ArrowRight, Eye, Sparkles, Scale } from "lucide-react";
import { useAnalysisVersion } from "../context/AnalysisVersionContext";

export function VersionHistoryModal() {
  const { 
    analysis, 
    currentWorkingVersion, 
    viewingVersion, 
    allVersions, 
    setViewingVersion,
    isHistoryModalOpen, 
    setIsHistoryModalOpen,
    setIsNewVersionModalOpen,
    openDiffWithVersions
  } = useAnalysisVersion();

  if (!isHistoryModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
              <History size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">História verzií a kontrolné body</h3>
              <p className="text-xs text-slate-300">Prehľad všetkých publikovaných stavov a aktívnych verzií projektu</p>
            </div>
          </div>
          <button 
            onClick={() => setIsHistoryModalOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          
          {/* Active working version card */}
          <div className={`p-4 rounded-xl border transition-all ${
            viewingVersion === currentWorkingVersion
              ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-blue-600 text-white text-xs font-extrabold rounded-md shadow-xs">
                    v{currentWorkingVersion}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                    analysis.status === "Final" 
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                      : "bg-amber-100 text-amber-800 border border-amber-200"
                  }`}>
                    {analysis.status === "Final" ? "FINAL (UZAMKNUTÉ)" : "DRAFT (AKTÍVNE ROZPRACOVANÉ)"}
                  </span>
                  {viewingVersion === currentWorkingVersion && (
                    <span className="text-xs text-blue-700 font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                      Aktuálne zobrazená
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-slate-800 mt-2">
                  {analysis.name}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Posledná úprava: {new Date(analysis.createdAt).toLocaleDateString()} • Cieľový ASVS Level: <strong>L{analysis.asvsLevel}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {allVersions.length > 0 && (
                  <button
                    onClick={() => {
                      setIsHistoryModalOpen(false);
                      openDiffWithVersions(allVersions[0].version, currentWorkingVersion);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                    title="Porovnať s prvou verziou"
                  >
                    <Scale size={14} className="text-blue-600" />
                    <span>Diff</span>
                  </button>
                )}
                {viewingVersion !== currentWorkingVersion && (
                  <button
                    onClick={() => {
                      setViewingVersion(currentWorkingVersion);
                      setIsHistoryModalOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                  >
                    <Eye size={14} />
                    <span>Zobraziť</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Historical finalized snapshots */}
          <div className="space-y-3 pt-2">
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Uložené a archivované verzie ({allVersions.length})
            </h5>

            {allVersions.map((snap) => {
              const isSelected = viewingVersion === snap.version;
              return (
                <div 
                  key={snap.version}
                  className={`p-4 rounded-xl border transition-all ${
                    isSelected 
                      ? "border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-slate-800 text-white text-xs font-extrabold rounded-md">
                          v{snap.version}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-md uppercase tracking-wider flex items-center gap-1">
                          <Lock size={10} />
                          Final Snapshot
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {new Date(snap.createdAt).toLocaleDateString()} {new Date(snap.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-xs text-slate-400">• Autor: {snap.createdBy}</span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-800">
                        {snap.label || `Verzia v${snap.version}`}
                      </h4>
                      {snap.changeSummary && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-relaxed">
                          {snap.changeSummary}
                        </p>
                      )}

                      {/* Snap metrics */}
                      <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                        <span>ASVS Coverage: <strong className="text-slate-800">{snap.metrics?.asvsCoverage ?? 0}%</strong></span>
                        <span>•</span>
                        <span>Otvorené hrozby: <strong className="text-slate-800">{snap.metrics?.totalOpenThreats ?? 0}</strong></span>
                        <span>•</span>
                        <span>Kritické: <strong className="text-red-600">{snap.metrics?.criticalRisks ?? 0}</strong></span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setIsHistoryModalOpen(false);
                          openDiffWithVersions(snap.version, currentWorkingVersion);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                        title="Porovnať s aktuálnou verziou"
                      >
                        <Scale size={13} className="text-blue-600" />
                        <span>Diff</span>
                      </button>

                      <button
                        onClick={() => {
                          setViewingVersion(snap.version);
                          setIsHistoryModalOpen(false);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs ${
                          isSelected
                            ? "bg-amber-600 text-white"
                            : "bg-slate-800 hover:bg-slate-900 text-white"
                        }`}
                        title="Prepnúť do stavu tejto verzie (iba na čítanie)"
                      >
                        <Eye size={13} />
                        <span>{isSelected ? "Zobrazená" : "Zobraziť stav"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {allVersions.length === 0 && (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500">
                <Lock size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700">Zatiaľ žiadna verzia nebola uložená ako Final</p>
                <p className="text-xs text-slate-400 mt-1">
                  Použite tlačidlo &quot;Uložiť ako Final&quot; na vytvorenie nemenného kontrolného bodu.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button 
            type="button"
            onClick={() => setIsHistoryModalOpen(false)}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Zavrieť
          </button>
          
          <button
            onClick={() => {
              setIsHistoryModalOpen(false);
              setIsNewVersionModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <GitBranch size={15} />
            <span>Vytvoriť novú verziu...</span>
          </button>
        </div>
      </div>
    </div>
  );
}
