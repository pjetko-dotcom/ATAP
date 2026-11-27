/**
 * Analysis Layout Module
 * Provides the sub-layout specifically for an individual analysis workspace,
 * incorporating versioning controls (Finalize, Version Branching, Diff, History).
 * 
 * @module AnalysisLayout
 */
import React, { useState, useEffect } from "react";
import { Link, Outlet, useParams } from "react-router-dom";
import { useAnalyses } from "../hooks/useAnalyses";
import { ASVSRequirement, asvsRequirements } from "../data/asvsData";
import { 
  Shield, Database, LayoutTemplate, Activity, DollarSign, Bell, 
  PanelRight, X, Pin, PinOff, ChevronLeft, Save, Check,
  GitBranch, Lock, History, Scale, Sparkles, ChevronDown, ArrowRight, Eye, MoreHorizontal
} from "lucide-react";
import { AnalysisVersionProvider, useAnalysisVersion } from "../context/AnalysisVersionContext";
import { FinalizeVersionModal } from "./FinalizeVersionModal";
import { NewVersionModal } from "./NewVersionModal";
import { VersionHistoryModal } from "./VersionHistoryModal";
import { VersionDiffModal } from "./VersionDiffModal";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { RenameProjectModal } from "./RenameProjectModal";
import { getCurrentUserName } from "../utils/activityLog";
import { calculateAsvsCoverage } from "../utils/asvsMetrics";
import { useLanguage } from "../context/LanguageContext";

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
  const { t } = useLanguage();
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
  const [isHeaderActionsOpen, setIsHeaderActionsOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "error">("saved");
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [saveToastType, setSaveToastType] = useState<"success" | "error">("success");
  const [renameModalTarget, setRenameModalTarget] = useState<{ id: string; name: string } | null>(null);
  
  // Right panel hover/lock state
  const [isRightPanelLocked, setIsRightPanelLocked] = useState(() => {
    try {
      return localStorage.getItem(`atap_analysis_panel_locked_${currentAnalysis.id}`) === "true";
    } catch {
      return false;
    }
  });
  const [isRightPanelHovered, setIsRightPanelHovered] = useState(false);
  const isRightExpanded = isRightPanelLocked || isRightPanelHovered;

  useEffect(() => {
    try {
      setIsRightPanelLocked(localStorage.getItem(`atap_analysis_panel_locked_${currentAnalysis.id}`) === "true");
    } catch (error) {
      console.error("Failed to load analysis panel preference", error);
    }
  }, [currentAnalysis.id]);

  const toggleRightPanelLock = () => {
    const nextLocked = !isRightPanelLocked;
    setIsRightPanelLocked(nextLocked);
    try {
      localStorage.setItem(`atap_analysis_panel_locked_${currentAnalysis.id}`, String(nextLocked));
    } catch (error) {
      console.error("Failed to save analysis panel preference", error);
    }
  };

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

  useEffect(() => {
    const handleStorageEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string }>).detail;
      if (detail?.type === "storage-error") setSaveStatus("error");
      else setSaveStatus("saved");
    };
    window.addEventListener("storage_workspace_update", handleStorageEvent);
    return () => window.removeEventListener("storage_workspace_update", handleStorageEvent);
  }, []);

  useEffect(() => {
    if (!isHeaderActionsOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsHeaderActionsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isHeaderActionsOpen]);

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
    { id: "1", action: "Created Analysis Workspace", user: getCurrentUserName(), time: "Just now" }
  ]);

  const savedTargetLevel = isHistorical
    ? activeSnapshot?.data?.targetLevel
    : localStorage.getItem(`atap_asvs_target_level_${currentAnalysis.id}`);
  const progressLevel = savedTargetLevel === "all"
    ? "all"
    : Number(savedTargetLevel || activeSnapshot?.asvsLevel || currentAnalysis.asvsLevel);
  const assessmentLevel = progressLevel === "all"
    ? "all"
    : progressLevel === 1 || progressLevel === 2 || progressLevel === 3 ? progressLevel : 2;
  const scopedRequirements = displayReqs.filter(requirement =>
    assessmentLevel === "all" || requirement.level <= assessmentLevel
  );
  const evaluatedRequirements = scopedRequirements.filter(requirement =>
    ["Implemented", "Partial", "Missing"].includes(requirement.status)
  );
  const totalReqs = evaluatedRequirements.length;
  const implementedCount = evaluatedRequirements.filter(requirement => requirement.status === "Implemented").length;
  const progressPercentage = calculateAsvsCoverage(scopedRequirements);
  const contextData = (() => {
    try {
      return JSON.parse(localStorage.getItem(`atap_context_${currentAnalysis.id}`) || "{}");
    } catch {
      return {};
    }
  })();
  const architectureData = (() => {
    try {
      return JSON.parse(localStorage.getItem(`atap_architecture_${currentAnalysis.id}`) || "{}");
    } catch {
      return {};
    }
  })();
  const threatData = (() => {
    try {
      return JSON.parse(localStorage.getItem(`atap_threats_${currentAnalysis.id}`) || "[]");
    } catch {
      return [];
    }
  })();
  const progressSteps = [
    {
      label: t("Kontext", "Context"),
      path: "context",
      state: contextData?.businessPurpose ? "In progress" : "Not started",
    },
    {
      label: "DFD",
      path: "architecture",
      state: Array.isArray(architectureData?.components) && architectureData.components.length >= 2 ? "In progress" : "Not started",
    },
    {
      label: "STRIDE",
      path: "stride",
      state: Array.isArray(threatData) && threatData.length > 0 ? "In progress" : "Not started",
    },
    {
      label: "ASVS",
      path: "asvs",
      state: implementedCount > 0 ? (progressPercentage === 100 ? "Complete" : "In progress") : "Not started",
    },
    {
      label: t("Zistenia", "Findings"),
      path: "findings",
      state: evaluatedRequirements.some(requirement => requirement.status === "Missing" || requirement.status === "Partial") ? "Needs review" : "Not started",
    },
  ];

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
      user: getCurrentUserName(),
      time: "Just now"
    };

    const updatedLogs = [newLog, ...logs];
    localStorage.setItem(logsKey, JSON.stringify(updatedLogs));
    setNewNoteText("");
    setShowAddNote(false);
    
    window.dispatchEvent(new Event("storage_workspace_update"));
  };

  const handleSave = () => {
    try {
      localStorage.setItem(asvsKey, JSON.stringify(reqs));
      const saveLog = {
        id: Date.now().toString(),
        action: `Analýza úspešne uložená (ASVS L${currentAnalysis.asvsLevel}, v${currentWorkingVersion})`,
        user: getCurrentUserName(),
        time: "Práve teraz"
      };
      const updatedLogs = [saveLog, ...logs];
      localStorage.setItem(logsKey, JSON.stringify(updatedLogs));
      const updated = updateAnalysis(currentAnalysis.id, {
        status: currentAnalysis.status || "Draft",
        asvsLevel: currentAnalysis.asvsLevel || "2",
        currentVersion: currentWorkingVersion
      });
      if (!updated) throw new Error("Analysis metadata could not be saved.");

      setIsSaved(true);
      setSaveStatus("saved");
      setSaveToastType("success");
      setSaveToast(t(`Analýza "${currentAnalysis.name}" (v${currentWorkingVersion}) bola uložená v tomto zariadení.`, `Analysis "${currentAnalysis.name}" (v${currentWorkingVersion}) was saved on this device.`));
      window.dispatchEvent(new Event("storage"));
      setTimeout(() => setIsSaved(false), 2500);
      setTimeout(() => setSaveToast(null), 4000);
    } catch (error) {
      console.error("Failed to save workspace in layout", error);
      setIsSaved(false);
      setSaveStatus("error");
      setSaveToastType("error");
      setSaveToast(t("Uloženie zlyhalo. Skontrolujte úložisko zariadenia a skúste to znova.", "Saving failed. Check device storage and try again."));
      setTimeout(() => setSaveToast(null), 6000);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toast Notification */}
      {saveToast && (
        <div role={saveToastType === "error" ? "alert" : "status"} aria-live="polite" className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900/95 text-white text-xs font-semibold rounded-lg shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-3 backdrop-blur-sm">
          <div className={`p-1 rounded ${saveToastType === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-300"}`}>
            {saveToastType === "success" ? <Check size={16} /> : <X size={16} />}
          </div>
          <span>{saveToast}</span>
        </div>
      )}

      {/* Header */}
      <header className="min-h-16 bg-white border-b border-slate-200 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2 xl:gap-4 px-3 sm:px-4 md:px-8 py-2 xl:py-0 shrink-0 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0 w-full xl:w-auto xl:flex-1">
          
          {/* Version Pill & History Trigger */}
          <button 
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200/80 rounded-lg border border-slate-200 text-slate-800 transition-colors cursor-pointer"
            title={t("Kliknite pre zobrazenie histórie verzií alebo vytvorenie novej", "View version history or create a new version")}
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
              {isHistorical ? t("Archív", "Archive") : currentAnalysis.status || "Draft"}
            </span>
            <ChevronDown size={12} className="text-slate-400 ml-0.5" />
          </button>
          <span
            role="status"
            aria-live="polite"
            className={`hidden sm:inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold ${
              saveStatus === "saved" ? "bg-emerald-50 text-emerald-700" :
              saveStatus === "error" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            {saveStatus === "saved" ? t("Uložené", "Saved") : saveStatus === "error" ? t("Chyba úložiska", "Storage error") : t("Neuložené", "Unsaved")}
          </span>

          {/* Project Switcher & Inline Rename */}
          <ProjectSwitcher 
            currentAnalysis={currentAnalysis}
            onOpenRenameModal={(id, name) => setRenameModalTarget({ id, name })}
            containerClassName="w-full sm:w-auto sm:max-w-full"
          />
        </div>

        {/* Action Controls */}
        <div className="hidden xl:flex items-center gap-2 md:gap-2.5 shrink-0">
          
          {/* Diff Button */}
          <button 
            onClick={() => {
              const baselineVer = allVersions.length > 0 ? allVersions[0].version : "1.0";
              openDiffWithVersions(baselineVer, currentWorkingVersion);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
            title={t("Porovnať rozdiely medzi verziami (ASVS požiadavky, hrozby, kontext)", "Compare versions (ASVS requirements, threats, context)")}
          >
            <Scale size={14} className="text-blue-600" />
            <span className="hidden sm:inline">{t("Diff verzií", "Version diff")}</span>
          </button>

          {/* History Button */}
          <button 
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs cursor-pointer"
            title={t("Zobraziť časovú os verzií a kontrolných bodov", "View version and checkpoint timeline")}
          >
            <History size={14} className="text-slate-500" />
            <span className="hidden md:inline">{t("História", "History")}</span>
          </button>

          {/* Finalize Button (If currently in Draft) */}
          {currentAnalysis.status !== "Final" && !isHistorical && (
            <button 
              onClick={() => setIsFinalizeModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
              title={t("Uložiť a uzamknúť aktuálny stav ako finálnu verziu", "Save and lock the current state as a final version")}
            >
              <Lock size={14} className="text-emerald-600" />
              <span>{t("Uložiť ako Final", "Save as Final")}</span>
            </button>
          )}

          {/* New Version Button (If currently Final or in historical view) */}
          {(currentAnalysis.status === "Final" || isHistorical) && (
            <button 
              onClick={() => setIsNewVersionModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
              title={t("Vytvoriť novú verziu analýzy a pokračovať v práci", "Create a new analysis version and continue working")}
            >
              <Sparkles size={14} className="text-blue-600" />
              <span>{t("Nová verzia...", "New version...")}</span>
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
              aria-label={t("Uložiť aktuálnu analýzu", "Save current analysis")}
              title={t("Uložiť analýzu a aktuálny stav ASVS požiadaviek", "Save analysis and current ASVS requirements")}
            >
              {isSaved ? <Check size={16} /> : <Save size={16} />}
              <span>{isSaved ? t("Uložené", "Saved") : t("Uložiť teraz", "Save now")}</span>
            </button>
          )}

        </div>

        <div className="flex xl:hidden items-center justify-between w-full">
          <div className="relative">
            <button
              onClick={() => setIsHeaderActionsOpen(open => !open)}
              aria-expanded={isHeaderActionsOpen}
              aria-haspopup="menu"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg"
            >
              <MoreHorizontal size={16} />
              <span>{t("Viac", "More")}</span>
            </button>
            {isHeaderActionsOpen && (
              <>
                <button
                  type="button"
                  aria-label={t("Zavrieť ponuku akcií", "Close actions menu")}
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setIsHeaderActionsOpen(false)}
                />
                <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-xl" role="menu">
                  <button
                    onClick={() => { openDiffWithVersions(allVersions[0]?.version || "1.0", currentWorkingVersion); setIsHeaderActionsOpen(false); }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50"
                    role="menuitem"
                  >
                    {t("Porovnať verzie", "Compare versions")}
                  </button>
                  <button
                    onClick={() => { setIsHistoryModalOpen(true); setIsHeaderActionsOpen(false); }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50"
                    role="menuitem"
                  >
                    {t("História verzií", "Version history")}
                  </button>
                  {currentAnalysis.status !== "Final" && !isHistorical ? (
                    <button
                      onClick={() => { setIsFinalizeModalOpen(true); setIsHeaderActionsOpen(false); }}
                      className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50"
                      role="menuitem"
                    >
                      {t("Uložiť ako Final", "Save as Final")}
                    </button>
                  ) : (
                    <button
                      onClick={() => { setIsNewVersionModalOpen(true); setIsHeaderActionsOpen(false); }}
                      className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50"
                      role="menuitem"
                    >
                      {t("Vytvoriť novú verziu", "Create new version")}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <button
                onClick={handleSave}
                aria-label={t("Uložiť aktuálnu analýzu", "Save current analysis")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${
                  isSaved ? "bg-emerald-600 text-white" : "bg-blue-600 text-white"
                }`}
              >
                {isSaved ? <Check size={16} /> : <Save size={16} />}
                <span>{isSaved ? t("Uložené", "Saved") : t("Uložiť", "Save")}</span>
              </button>
            )}
            <button
              onClick={() => setIsInfoPanelOpen(!isInfoPanelOpen)}
              aria-label={t("Otvoriť kontextový panel", "Open context panel")}
              aria-expanded={isInfoPanelOpen}
              aria-controls="analysis-context-panel"
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-md"
            >
              <PanelRight size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Historical Read-only Banner */}
      {isHistorical && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 md:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 shrink-0">
          <div className="flex items-center gap-2">
            <Lock size={15} className="text-amber-600 shrink-0" />
            <span>
              {t("Prezeráte si archivovaný stav", "Viewing archived version")} <strong>v{viewingVersion}</strong> ({activeSnapshot?.label || "Final"}) {t("zo dňa", "dated")}{" "}
              <strong>{activeSnapshot ? new Date(activeSnapshot.createdAt).toLocaleDateString() : ""}</strong>. {t("Tento stav je iba na čítanie.", "This state is read-only.")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => openDiffWithVersions(viewingVersion, currentWorkingVersion)}
              className="px-2.5 py-1 bg-white border border-amber-300 text-amber-900 rounded-md font-bold hover:bg-amber-100/50 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <Scale size={13} className="text-blue-600" /> {t("Porovnať s aktívnou (Diff)", "Compare with active version")}
            </button>
            <button 
              onClick={resetToActiveVersion}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              {t("Návrat na aktívnu verziu", "Return to active version")} (v{currentWorkingVersion})
            </button>
          </div>
        </div>
      )}

      {/* Content Grid */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Workspace */}
        <section className="flex-1 p-3 sm:p-4 md:p-6 flex flex-col overflow-y-auto min-h-0 z-0 custom-scrollbar">
          <nav aria-label={t("Pokrok analýzy", "Analysis progress")} className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5 shrink-0">
            {progressSteps.map(step => (
              <Link
                key={step.path}
                to={`/analysis/${currentAnalysis.id}/${step.path}`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-xs hover:border-blue-300 hover:bg-blue-50"
              >
                <span className="block font-bold text-slate-800">{step.label}</span>
                <span className={`mt-1 block text-[10px] font-semibold ${
                  step.state === "Complete" ? "text-emerald-700" :
                  step.state === "Needs review" ? "text-amber-700" :
                  step.state === "In progress" ? "text-blue-700" : "text-slate-500"
                }`}>
                  {step.state === "Complete" ? t("Dokončené", "Complete") : step.state === "Needs review" ? t("Vyžaduje kontrolu", "Needs review") : step.state === "In progress" ? t("Prebieha", "In progress") : t("Nezačaté", "Not started")}
                </span>
              </Link>
            ))}
          </nav>
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
          id="analysis-context-panel"
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
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{t("Kontext a prepojenia", "Context & Trace")}</span>
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                  {isHistorical ? `v${viewingVersion}` : `v${currentWorkingVersion}`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {/* Desktop Lock Toggle */}
                <button
                  onClick={toggleRightPanelLock}
                  aria-label={isRightPanelLocked ? t("Odomknúť kontextový panel", "Unlock context panel") : t("Pripnúť kontextový panel", "Pin context panel")}
                  aria-pressed={isRightPanelLocked}
                  className={`hidden lg:flex p-1.5 rounded hover:bg-slate-200 transition-colors ${
                    isRightPanelLocked ? 'text-blue-600 bg-blue-50' : 'text-slate-400'
                  }`}
                  title={isRightPanelLocked ? t("Odomknúť panel", "Unlock Sidebar") : t("Pripnúť panel", "Lock Sidebar Open")}
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
                  <span className="text-xs font-semibold text-slate-600">{t("Priebeh overovania", "Verification Progress")}</span>
                  <span className="text-xs font-bold text-slate-900">{progressPercentage}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-green-500 h-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                  <span>{t("Splnené:", "Implemented:")} {implementedCount}</span>
                  <span>{t("Hodnotené:", "Evaluated:")} {totalReqs}</span>
                </div>
              </div>

              {/* Architecture Components (Traceability) */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{t("Komponenty systému", "System Components")}</h4>
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
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t("Auditná stopa", "Audit Trail")}</h4>
                  {!isReadOnly && (
                    <button
                      onClick={() => setShowAddNote(!showAddNote)}
                      className="text-[10px] text-blue-600 font-semibold hover:underline cursor-pointer"
                    >
                      {showAddNote ? t("Zrušiť", "Cancel") : t("+ Poznámka", "+ Note")}
                    </button>
                  )}
                </div>

                {showAddNote && !isReadOnly && (
                  <form onSubmit={handleAddCustomNote} className="mb-3 space-y-2">
                    <input
                      type="text"
                      placeholder={t("Pridať poznámku do auditu...", "Add an audit note...")}
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="w-full py-1 bg-blue-600 text-white rounded text-[11px] font-semibold hover:bg-blue-700"
                    >
                      {t("Zaznamenať do auditu", "Record in audit trail")}
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
            setSaveToastType("success");
            setSaveToast(t(`Projekt bol úspešne premenovaný na "${newName}".`, `Project renamed to "${newName}".`));
            setTimeout(() => setSaveToast(null), 3500);
          }}
        />
      )}
    </div>
  );
}
