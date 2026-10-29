/**
 * Analysis Layout Module
 * Provides the sub-layout specifically for an individual analysis workspace,
 * incorporating versioning controls (Finalize, Version Branching, Diff, History).
 * 
 * @module AnalysisLayout
 */
import React, { useState, useEffect } from "react";
import { Outlet, useParams } from "react-router-dom";
import { useAnalyses } from "../hooks/useAnalyses";
import { ASVSRequirement, asvsRequirements } from "../data/asvsData";
import { 
  Shield, Database, LayoutTemplate, Activity, DollarSign, Bell, 
  PanelRight, X, Pin, PinOff, ChevronLeft, Save, Check,
  GitBranch, Lock, History, Scale, Sparkles, ChevronDown, ArrowRight, Eye 
} from "lucide-react";
import { AnalysisVersionProvider, useAnalysisVersion } from "../context/AnalysisVersionContext";
import { FinalizeVersionModal } from "./FinalizeVersionModal";
import { NewVersionModal } from "./NewVersionModal";
import { VersionHistoryModal } from "./VersionHistoryModal";
import { VersionDiffModal } from "./VersionDiffModal";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { RenameProjectModal } from "./RenameProjectModal";
import { LOCAL_ACTIVITY_ACTOR } from "../utils/activityLog";

const COMPONENT_ICONS: Record<string, React.ComponentType<any>> = {
  "Frontend App": LayoutTemplate,
  "API Gateway": Shield,
  "Auth Service": Shield,
  "Main Database": Database,
  "Payment Gateway": DollarSign,
  "Notification Service": Bell,
};

const statusStyles: Record<string, string> = {
  "Implemented": "bg-green-100 text-green-700",
  "Partial": "bg-orange-100 text-orange-700",
  "Missing": "bg-red-100 text-red-700",
  "N/A": "bg-slate-100 text-slate-500",
};

export function AnalysisLayout() {
  return (
    <AnalysisVersionProvider>
      <AnalysisLayoutInner />
    </AnalysisVersionProvider>
  );
}

function AnalysisLayoutInner() {
  const { id } = useParams<{id: string}>();
  const { updateAnalysis } = useAnalyses();
  const {
    analysis: currentAnalysis,
    currentWorkingVersion,
    viewingVersion,
    isHistorical,
    isReadOnly,
    activeSnapshot,
    allVersions,
    resetToActiveVersion,
    setIsFinalizeModalOpen,
    setIsNewVersionModalOpen,
    setIsHistoryModalOpen,
    openDiffWithVersions
  } = useAnalysisVersion();

  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [renameModalTarget, setRenameModalTarget] = useState<{ id: string; name: string } | null>(null);
  
  // Right panel hover/lock state
  const [isRightPanelLocked, setIsRightPanelLocked] = useState(false);
  const [isRightPanelHovered, setIsRightPanelHovered] = useState(false);
  const isRightExpanded = isRightPanelLocked || isRightPanelHovered;

  // Sync state reactively with workspace changes safely without setState during render
  useEffect(() => {
    let timeoutId: any = null;
    const handler = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setUpdateTrigger(prev => prev + 1);
      }, 50);
    };

    window.addEventListener("storage_workspace_update", handler);
    window.addEventListener("storage", handler);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener("storage_workspace_update", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  // Keys
  const asvsKey = `atap_asvs_v5_${currentAnalysis.id}`;
  const logsKey = `atap_logs_v5_${currentAnalysis.id}`;

  // Read reqs and logs synchronously on render
  let reqs: ASVSRequirement[] = asvsRequirements;
  try {
    const stored = localStorage.getItem(asvsKey);
    if (stored) {
      reqs = JSON.parse(stored);
    }
  } catch (e) {}

  let logs: any[] = [];
  try {
    const stored = localStorage.getItem(logsKey);
    if (stored) {
      logs = JSON.parse(stored);
    }
  } catch (e) {}

  // If viewing historical snapshot, use snapshot data for sidebar
  const displayReqs = isHistorical && activeSnapshot?.data?.asvsReqs ? activeSnapshot.data.asvsReqs : reqs;
  const displayLogs = isHistorical && activeSnapshot?.data?.logs ? activeSnapshot.data.logs : (logs.length > 0 ? logs : [
    { id: "1", action: "Created Analysis Workspace", user: LOCAL_ACTIVITY_ACTOR, time: "Just now" }
  ]);

  const totalReqs = displayReqs.length;
  const implementedCount = displayReqs.filter(r => r.status === "Implemented").length;
  const progressPercentage = totalReqs > 0 ? Math.round((implementedCount / totalReqs) * 100) : 0;

  // Components mapping for Right Sidebar
  const componentsList = [
    { id: "Frontend App", name: "Frontend App", type: "Client Application", status: "Active" },
    { id: "API Gateway", name: "API Gateway", type: "Gateway / Reverse Proxy", status: "Active" },
    { id: "Auth Service", name: "Auth Service", type: "OAuth2 / OIDC Provider", status: "Active" },
    { id: "Main Database", name: "Main Database", type: "PostgreSQL Database", status: "Active" },
    { id: "Payment Gateway", name: "Payment Gateway", type: "External Provider", status: "Active" },
    { id: "Notification Service", name: "Notification Service", type: "Message Queue / Worker", status: "Active" },
  ].map(comp => {
    const linkedReqs = displayReqs.filter(r => 
      r.traceability && r.traceability.some(t => t.id === comp.id)
    );
    const impCount = linkedReqs.filter(r => r.status === "Implemented").length;
    return {
      ...comp,
      count: linkedReqs.length,
      implementedCount: impCount,
      requirements: linkedReqs.map(r => r.id)
    };
  });

  const handleAddCustomNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const newLog = {
      id: Date.now().toString(),
      action: `Note added: "${newNoteText}"`,
      user: LOCAL_ACTIVITY_ACTOR,
      time: "Just now"
    };

    const updatedLogs = [newLog, ...logs];
    localStorage.setItem(logsKey, JSON.stringify(updatedLogs));
    setNewNoteText("");
    setShowAddNote(false);
    
    window.dispatchEvent(new Event("storage_workspace_update"));
  };

  const handleSave = () => {
    // 1. Save workspace requirements and logs to localStorage
    try {
      localStorage.setItem(asvsKey, JSON.stringify(reqs));
      
      const saveLog = {
        id: Date.now().toString(),
        action: `Analýza úspešne uložená (ASVS L${currentAnalysis.asvsLevel}, v${currentWorkingVersion})`,
        user: LOCAL_ACTIVITY_ACTOR,
        time: "Práve teraz"
      };
      const updatedLogs = [saveLog, ...logs];
      localStorage.setItem(logsKey, JSON.stringify(updatedLogs));
    } catch (e) {
      console.error("Failed to save workspace in layout", e);
    }

    // 2. Persist analysis update
    updateAnalysis(currentAnalysis.id, {
      status: currentAnalysis.status || "Draft",
      asvsLevel: currentAnalysis.asvsLevel || "2",
      currentVersion: currentWorkingVersion
    });

    // 3. UI feedback
    setIsSaved(true);
    setSaveToast(`Analýza "${currentAnalysis.name}" (v${currentWorkingVersion}) bola úspešne uložená.`);
    setTimeout(() => setIsSaved(false), 2500);
    setTimeout(() => setSaveToast(null), 4000);

    // 4. Trigger global sync
    window.dispatchEvent(new Event("storage_workspace_update"));
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900/95 text-white text-xs font-semibold rounded-lg shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-3 backdrop-blur-sm">
          <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded">
            <Check size={16} />
          </div>
          <span>{saveToast}</span>
        </div>
      )}

      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          
          {/* Version Pill & History Trigger */}
          <button 
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200/80 rounded-lg border border-slate-200 text-slate-800 transition-colors cursor-pointer"
            title="Kliknite pre zobrazenie histórie verzií alebo vytvorenie novej"
          >
            <GitBranch size={13} className="text-blue-600" />
            <span className="text-xs font-extrabold">v{viewingVersion}</span>
            <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded uppercase tracking-wider ${
              isHistorical 
                ? "bg-purple-100 text-purple-800" 
                : currentAnalysis.status === "Final" 
                ? "bg-emerald-100 text-emerald-800" 
                : "bg-amber-100 text-amber-800"
            }`}>
              {isHistorical ? "Archív" : currentAnalysis.status || "Draft"}
            </span>
            <ChevronDown size={12} className="text-slate-400 ml-0.5" />
          </button>

          {/* Project Switcher & Inline Rename */}
          <ProjectSwitcher 
            currentAnalysis={currentAnalysis}
            onOpenRenameModal={(id, name) => setRenameModalTarget({ id, name })}
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 md:gap-2.5">
          
          {/* Diff Button */}
          <button 
            onClick={() => {
              const baselineVer = allVersions.length > 0 ? allVersions[0].version : "1.0";
              openDiffWithVersions(baselineVer, currentWorkingVersion);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="Porovnať rozdiely medzi verziami (ASVS požiadavky, hrozby, kontext)"
          >
            <Scale size={14} className="text-blue-600" />
            <span className="hidden sm:inline">Diff verzií</span>
          </button>

          {/* History Button */}
          <button 
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="Zobraziť časovú os verzií a kontrolných bodov"
          >
            <History size={14} className="text-slate-500" />
            <span className="hidden md:inline">História</span>
          </button>

          {/* Finalize Button (If currently in Draft) */}
          {currentAnalysis.status !== "Final" && !isHistorical && (
            <button 
              onClick={() => setIsFinalizeModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
              title="Uložiť a uzamknúť aktuálny stav ako finálnu verziu"
            >
              <Lock size={14} className="text-emerald-600" />
              <span>Uložiť ako Final</span>
            </button>
          )}

          {/* New Version Button (If currently Final or in historical view) */}
          {(currentAnalysis.status === "Final" || isHistorical) && (
            <button 
              onClick={() => setIsNewVersionModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
              title="Vytvoriť novú verziu analýzy a pokračovať v práci"
            >
              <Sparkles size={14} className="text-blue-600" />
              <span>Nová verzia...</span>
            </button>
          )}

          {/* Save Button (Regular draft save) */}
          {!isReadOnly && (
            <button 
              id="header-save-btn"
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-semibold rounded-lg transition-all shadow-sm cursor-pointer ${
                isSaved 
                  ? "bg-emerald-600 text-white shadow-emerald-200" 
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200"
              }`}
              title="Uložiť analýzu a aktuálny stav ASVS požiadaviek"
            >
              {isSaved ? <Check size={16} /> : <Save size={16} />}
              <span>{isSaved ? "Uložené!" : "Save"}</span>
            </button>
          )}

          <button 
            onClick={() => setIsInfoPanelOpen(!isInfoPanelOpen)}
            className="lg:hidden p-1.5 md:p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
          >
            <PanelRight size={20} />
          </button>
        </div>
      </header>

      {/* Historical Read-only Banner */}
      {isHistorical && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 md:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 shrink-0">
          <div className="flex items-center gap-2">
            <Lock size={15} className="text-amber-600 shrink-0" />
            <span>
              Prezeráte si archivovaný stav <strong>v{viewingVersion}</strong> ({activeSnapshot?.label || "Final"}) zo dňa{" "}
              <strong>{activeSnapshot ? new Date(activeSnapshot.createdAt).toLocaleDateString() : ""}</strong>. Tento stav je iba na čítanie.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => openDiffWithVersions(viewingVersion, currentWorkingVersion)}
              className="px-2.5 py-1 bg-white border border-amber-300 text-amber-900 rounded-md font-bold hover:bg-amber-100/50 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <Scale size={13} className="text-blue-600" /> Porovnať s aktívnou (Diff)
            </button>
            <button 
              onClick={resetToActiveVersion}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              Návrat na aktívnu verziu (v{currentWorkingVersion})
            </button>
          </div>
        </div>
      )}

      {/* Content Grid */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Workspace */}
        <section className="flex-1 p-3 sm:p-4 md:p-6 flex flex-col overflow-y-auto min-h-0 z-0 custom-scrollbar">
          <Outlet />
        </section>

        {/* Right Info Panel Mobile Overlay */}
        {isInfoPanelOpen && (
          <div 
            className="absolute inset-0 bg-black/20 z-20 lg:hidden"
            onClick={() => setIsInfoPanelOpen(false)}
          />
        )}

        {/* Desktop Sidebar Spacer (reserves space in normal flow) */}
        <div className={`hidden lg:block shrink-0 transition-all duration-300 ${isRightPanelLocked ? 'w-80' : 'w-12'}`} />

        {/* Right Info Panel */}
        <section 
          onMouseEnter={() => setIsRightPanelHovered(true)}
          onMouseLeave={() => setIsRightPanelHovered(false)}
          className={`
            absolute inset-y-0 right-0 z-30 bg-white flex flex-col overflow-hidden border-l border-slate-200 transform transition-all duration-300 ease-in-out
            ${isInfoPanelOpen ? "translate-x-0 w-80 shadow-2xl" : "translate-x-full lg:translate-x-0"}
            ${isRightExpanded ? 'lg:w-80 lg:shadow-2xl' : 'lg:w-12 lg:shadow-none'}
          `}
        >
          {/* Inner wrapper to prevent squishing content when width is animating */}
          <div className="w-80 h-full flex flex-col">
            
            {/* Right Panel Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Context &amp; Trace</span>
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                  {isHistorical ? `v${viewingVersion}` : `v${currentWorkingVersion}`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {/* Desktop Lock Toggle */}
                <button
                  onClick={() => setIsRightPanelLocked(!isRightPanelLocked)}
                  className={`hidden lg:flex p-1.5 rounded hover:bg-slate-200 transition-colors ${
                    isRightPanelLocked ? 'text-blue-600 bg-blue-50' : 'text-slate-400'
                  }`}
                  title={isRightPanelLocked ? "Unlock Sidebar" : "Lock Sidebar Open"}
                >
                  {isRightPanelLocked ? <Pin size={16} /> : <PinOff size={16} />}
                </button>
                {/* Mobile Close Button */}
                <button 
                  onClick={() => setIsInfoPanelOpen(false)}
                  className="lg:hidden p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Right Panel Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              
              {/* Progress Summary Card */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600">Verification Progress</span>
                  <span className="text-xs font-bold text-slate-900">{progressPercentage}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-green-500 h-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                  <span>Implemented: {implementedCount}</span>
                  <span>Total: {totalReqs}</span>
                </div>
              </div>

              {/* Architecture Components (Traceability) */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">System Components</h4>
                <div className="space-y-2">
                  {componentsList.map(comp => {
                    const IconComponent = COMPONENT_ICONS[comp.name] || Shield;
                    return (
                      <div key={comp.id} className="p-2.5 rounded border border-slate-200 hover:border-slate-300 transition-colors bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-slate-100 rounded text-slate-600">
                              <IconComponent size={14} />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-800">{comp.name}</p>
                              <p className="text-[10px] text-slate-400">{comp.type}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                            {comp.implementedCount}/{comp.count}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Activity Log (Audit Trail) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Audit Trail</h4>
                  {!isReadOnly && (
                    <button
                      onClick={() => setShowAddNote(!showAddNote)}
                      className="text-[10px] text-blue-600 font-semibold hover:underline cursor-pointer"
                    >
                      {showAddNote ? "Zrušiť" : "+ Poznámka"}
                    </button>
                  )}
                </div>

                {showAddNote && !isReadOnly && (
                  <form onSubmit={handleAddCustomNote} className="mb-3 space-y-2">
                    <input
                      type="text"
                      placeholder="Pridať poznámku do auditu..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="w-full py-1 bg-slate-800 text-white rounded text-[11px] font-semibold hover:bg-slate-900"
                    >
                      Zaznamenať do auditu
                    </button>
                  </form>
                )}

                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  {displayLogs.slice(-5).reverse().map((log: any, index: number) => (
                    <div key={log.id || index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-4 h-4 rounded-full border border-white bg-slate-200 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
                      <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white p-3 rounded border border-slate-100 shadow-sm text-[10px]">
                        <p className="font-bold text-slate-700 mb-0.5">{log.action}</p>
                        <p className="text-slate-400">By {log.user || "System"} • {log.time || "Recently"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Versioning Modals */}
      <FinalizeVersionModal />
      <NewVersionModal />
      <VersionHistoryModal />
      <VersionDiffModal />

      {/* Rename Project Modal */}
      {renameModalTarget && (
        <RenameProjectModal
          isOpen={!!renameModalTarget}
          analysisId={renameModalTarget.id}
          currentName={renameModalTarget.name}
          onClose={() => setRenameModalTarget(null)}
          onRenamed={(newName) => {
            setSaveToast(`Projekt bol úspešne premenovaný na "${newName}".`);
            setTimeout(() => setSaveToast(null), 3500);
          }}
        />
      )}
    </div>
  );
}
