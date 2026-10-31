/**
 * ASVS Workspace Module
 * Handles the display, filtering, scoping triage, and verification of OWASP ASVS 5.0 requirements.
 * 
 * @module ASVSWorkspace
 */
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { 
  Info, ChevronDown, 
  ChevronUp, 
  ChevronRight, 
  Download, 
  BookOpen, 
  X, 
  Lightbulb, 
  ShieldCheck, 
  Search, 
  Target, 
  Ban, 
  Check, 
  RotateCcw, 
  AlertCircle, 
  Sparkles,
  Layers,
  HelpCircle,
  FileSpreadsheet,
  FileText,
  SlidersHorizontal,
  Save,
  CheckCircle2
} from "lucide-react";
import { 
  asvsChapters, 
  asvsSections, 
  asvsTriageQuestions, 
  ASVSRequirement, 
  getRequirementsForTriage 
} from "../data/asvsData";
import { useWorkspaceState } from "../hooks/useWorkspaceState";
import { useAnalysisVersion } from "../context/AnalysisVersionContext";
import { HelpTooltip } from "./HelpTooltip";
import { VerificationHintTooltip } from "./VerificationHintTooltip";
import { getVerificationGuide } from "../utils/verificationGuide";
import { ASVSTriageModal } from "./ASVSTriageModal";
import { ProjectCategorizationModal } from "./ProjectCategorizationModal";
import { exportASVSToExcel, exportASVSToCSV } from "../utils/exportToExcel";
import { GitBranch, Scale, Lock as LockIcon } from "lucide-react";

const statusStyles: Record<string, string> = {
  "Implemented": "bg-green-100 text-green-700",
  "Partial": "bg-orange-100 text-orange-700",
  "Missing": "bg-red-100 text-red-700",
  "N/A": "bg-slate-100 text-slate-600",
};

type ASVSStatusFilter = "all" | "pending" | "Implemented" | "N/A" | "triaged" | "no_evidence";

interface ASVSViewPreferences {
  activeChapterId: number;
  activeSectionId: string | "all";
  searchQuery: string;
  statusFilter: ASVSStatusFilter;
}

const ASVS_VIEW_PREFERENCE_DEFAULTS: ASVSViewPreferences = {
  activeChapterId: 1,
  activeSectionId: "all",
  searchQuery: "",
  statusFilter: "all",
};

function readASVSViewPreferences(analysisId: string | undefined): ASVSViewPreferences {
  if (typeof localStorage === "undefined") return ASVS_VIEW_PREFERENCE_DEFAULTS;

  try {
    const stored = localStorage.getItem(`atap_asvs_view_v1_${analysisId || "default"}`);
    if (!stored) return ASVS_VIEW_PREFERENCE_DEFAULTS;
    const parsed: Partial<ASVSViewPreferences> = JSON.parse(stored);
    const chapterId = Number(parsed.activeChapterId);
    const statusFilters: ASVSStatusFilter[] = ["all", "pending", "Implemented", "N/A", "triaged", "no_evidence"];
    const activeChapterId = asvsChapters.some(chapter => chapter.id === chapterId) ? chapterId : 1;
    const activeSectionId = parsed.activeSectionId === "all" ||
      asvsSections.some(section => section.id === parsed.activeSectionId && section.chapterId === activeChapterId)
      ? parsed.activeSectionId || "all"
      : "all";

    return {
      activeChapterId,
      activeSectionId,
      searchQuery: typeof parsed.searchQuery === "string" ? parsed.searchQuery : "",
      statusFilter: statusFilters.includes(parsed.statusFilter as ASVSStatusFilter) ? parsed.statusFilter as ASVSStatusFilter : "all",
    };
  } catch (error) {
    console.error("Failed to load ASVS view preferences", error);
    return ASVS_VIEW_PREFERENCE_DEFAULTS;
  }
}

/**
 * ASVS Workspace Component.
 * Displays all 17 ASVS 5.0 chapters and 80 sections.
 * Features built-in Scoping Triage questionnaire to automatically mark non-applicable controls as N/A.
 */
export function ASVSWorkspace() {
  const { id: analysisId } = useParams<{ id: string }>();
  const {
    reqs,
    targetLevel,
    setTargetLevel,
    saveWorkspace,
    hasStorageError,
    triageAnswers,
    setTriageAnswer,
    resetTriageAnswer,
    updateRequirementStatus,
    batchUpdateRequirementStatus,
    batchUpdateRequirementNotes,
    updateRequirementNote,
    toggleRequirementTraceability,
    selectActiveRequirement,
    components: TRACE_COMPONENTS
  } = useWorkspaceState(analysisId);

  let versionCtx: any = null;
  try {
    versionCtx = useAnalysisVersion();
  } catch (e) {}

  const isHistorical = versionCtx?.isHistorical || false;
  const isReadOnly = versionCtx?.isReadOnly || false;
  const activeSnapshot = versionCtx?.activeSnapshot;
  const effectiveReqs = (isHistorical && activeSnapshot?.data?.asvsReqs) ? activeSnapshot.data.asvsReqs : reqs;

  const [activeChapterId, setActiveChapterId] = useState<number>(() => readASVSViewPreferences(analysisId).activeChapterId);
  const [activeSectionId, setActiveSectionId] = useState<string | "all">(() => readASVSViewPreferences(analysisId).activeSectionId);
  const [searchQuery, setSearchQuery] = useState(() => readASVSViewPreferences(analysisId).searchQuery);
  const [saveResult, setSaveResult] = useState<"success" | "error" | null>(null);
  const [viewPreferenceError, setViewPreferenceError] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ASVSStatusFilter>(() => readASVSViewPreferences(analysisId).statusFilter);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isChaptersOpen, setIsChaptersOpen] = useState(false);
  const [isChapterTriageOpen, setIsChapterTriageOpen] = useState(false);
  const [expandedTriageQuestionId, setExpandedTriageQuestionId] = useState<string | null>(null);
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);
  const [triageModalInitialTab, setTriageModalInitialTab] = useState<"chapters" | "categorization">("chapters");
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const [isCategorizationModalOpen, setIsCategorizationModalOpen] = useState(false);

  // Bulk actions modal states
  const [isBulkNoteModalOpen, setIsBulkNoteModalOpen] = useState(false);
  const [bulkNoteText, setBulkNoteText] = useState("");
  const [isBulkNaModalOpen, setIsBulkNaModalOpen] = useState(false);
  const [bulkNaReason, setBulkNaReason] = useState("");

  useEffect(() => {
    const preferences = readASVSViewPreferences(analysisId);
    setActiveChapterId(preferences.activeChapterId);
    setActiveSectionId(preferences.activeSectionId);
    setSearchQuery(preferences.searchQuery);
    setStatusFilter(preferences.statusFilter);
  }, [analysisId]);

  const saveViewPreferences = (updates: Partial<ASVSViewPreferences>) => {
    const key = `atap_asvs_view_v1_${analysisId || "default"}`;
    const preferences = { ...readASVSViewPreferences(analysisId), ...updates };
    try {
      localStorage.setItem(key, JSON.stringify(preferences));
      setViewPreferenceError(false);
    } catch (error) {
      console.error("Failed to save ASVS view preferences", error);
      setViewPreferenceError(true);
    }
  };

  // When changing chapter, reset section filter
  const handleSelectChapter = (cid: number) => {
    setActiveChapterId(cid);
    setActiveSectionId("all");
    saveViewPreferences({ activeChapterId: cid, activeSectionId: "all" });
    setIsChaptersOpen(false);
  };

  const handleSelectSection = (sectionId: string | "all") => {
    setActiveSectionId(sectionId);
    saveViewPreferences({ activeSectionId: sectionId });
    setIsChaptersOpen(false);
  };

  const handleStatusFilterChange = (filter: ASVSStatusFilter) => {
    setStatusFilter(filter);
    saveViewPreferences({ statusFilter: filter });
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    saveViewPreferences({ searchQuery: query });
  };

  const clearViewFilters = () => {
    setActiveSectionId("all");
    setSearchQuery("");
    setStatusFilter("all");
    saveViewPreferences({ activeSectionId: "all", searchQuery: "", statusFilter: "all" });
  };

  // Dynamic Filtering based on selected chapter, section, search, level, and status
  const filteredRequirements = effectiveReqs.filter(req => {
    const matchesChapter = req.chapterId === activeChapterId;
    const matchesSection = activeSectionId === "all" || req.sectionId === activeSectionId;
    const matchesSearch = 
      req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.sectionName && req.sectionName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      req.description.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesLevel = targetLevel === "all" || req.level <= targetLevel;

    let matchesStatus = true;
    if (statusFilter === "pending") {
      matchesStatus = req.status === "Missing" || req.status === "Partial";
    } else if (statusFilter === "triaged") {
      matchesStatus = !!req.triageReason;
    } else if (statusFilter === "no_evidence") {
      matchesStatus = req.status !== "N/A" && (!req.notes || req.notes.trim() === "");
    } else if (statusFilter !== "all") {
      matchesStatus = req.status === statusFilter;
    }
    
    return matchesChapter && matchesSection && matchesSearch && matchesLevel && matchesStatus;
  });
  const requirementsBeforeStatusFilter = effectiveReqs.filter(req => {
    const matchesChapter = req.chapterId === activeChapterId;
    const matchesSection = activeSectionId === "all" || req.sectionId === activeSectionId;
    const matchesSearch =
      req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.sectionName && req.sectionName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      req.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = targetLevel === "all" || req.level <= targetLevel;
    return matchesChapter && matchesSection && matchesSearch && matchesLevel;
  });
  const hasActiveViewFilters = activeSectionId !== "all" || !!searchQuery.trim() || statusFilter !== "all";

  const activeChapter = asvsChapters.find(c => c.id === activeChapterId);
  const chapterSections = asvsSections.filter(s => s.chapterId === activeChapterId);

  // Triage questions that affect the currently active chapter or its sections
  const chapterTriageQuestions = asvsTriageQuestions.filter(
    q => q.chapterId === activeChapterId || 
         (q.sectionId && q.sectionId.startsWith(`V${activeChapterId}.`)) ||
         (q.reqIds && q.reqIds.some(id => id.startsWith(`V${activeChapterId}.`)))
  );

  // If a specific section is selected, prioritize/show questions for this section if available, otherwise show all for chapter
  const currentChapterTriageQuestions = activeSectionId === "all"
    ? chapterTriageQuestions
    : chapterTriageQuestions.filter(q => 
         q.sectionId === activeSectionId ||
        (q.reqIds && q.reqIds.some(id => id.startsWith(activeSectionId + ".")))
      );
  const answeredTriageQuestionCount = currentChapterTriageQuestions.filter(
    question => triageAnswers[question.id] !== undefined
  ).length;

  // Dynamic Progress Stats Computation
  const totalRelevant = effectiveReqs.filter(r => r.status !== "N/A").length;
  const implementedCount = effectiveReqs.filter(r => r.status === "Implemented").length;
  const coverage = totalRelevant > 0 ? Math.round((implementedCount / totalRelevant) * 100) : 0;
  const findingsCount = effectiveReqs.filter(r => r.status === "Missing" || r.status === "Partial").length;
  const notRelevantCount = effectiveReqs.filter(r => r.status === "N/A").length;
  const triagedExcludedCount = effectiveReqs.filter(r => !!r.triageReason).length;

  useEffect(() => {
    return () => {
      // Clean up active requirement safely on unmount
      if (analysisId) {
        localStorage.removeItem(`atap_active_req_v5_${analysisId}`);
        setTimeout(() => {
          window.dispatchEvent(new Event("storage_workspace_update"));
        }, 0);
      }
    };
  }, [analysisId]);

  const toggleRow = (id: string) => {
    const isCurrentlyExpanded = expandedRows.has(id);
    if (isCurrentlyExpanded) {
      selectActiveRequirement(null);
    } else {
      selectActiveRequirement(id);
    }
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredRequirements.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRequirements.map(r => r.id)));
    }
  };

  const handleBulkStatusDirect = (status: string, reason?: string) => {
    if (selectedIds.size === 0) return;
    const selectedArray: string[] = Array.from(selectedIds);
    batchUpdateRequirementStatus(selectedArray, status, reason);
    setSelectedIds(new Set());
    setExportNotice(`Hromadne nastavený stav "${status}" pre ${selectedArray.length} požiadaviek.`);
    setTimeout(() => setExportNotice(null), 3500);
  };

  const handleApplyBulkNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.size === 0 || !bulkNoteText.trim()) return;
    const selectedArray: string[] = Array.from(selectedIds);
    batchUpdateRequirementNotes(selectedArray, bulkNoteText);
    setIsBulkNoteModalOpen(false);
    setBulkNoteText("");
    setSelectedIds(new Set());
    setExportNotice(`Poznámka / dôkaz bol úspešne pridaný ku ${selectedArray.length} požiadavkám.`);
    setTimeout(() => setExportNotice(null), 3500);
  };

  const handleApplyBulkNa = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.size === 0) return;
    const selectedArray: string[] = Array.from(selectedIds);
    batchUpdateRequirementStatus(selectedArray, "N/A", bulkNaReason.trim() || "Vylúčené z rozsahu aplikácie");
    setIsBulkNaModalOpen(false);
    setBulkNaReason("");
    setSelectedIds(new Set());
    setExportNotice(`${selectedArray.length} požiadaviek bolo označených ako N/A s odôvodnením.`);
    setTimeout(() => setExportNotice(null), 3500);
  };

  const handleSelectAllInChapter = () => {
    setSelectedIds(new Set(filteredRequirements.map(r => r.id)));
  };

  const handleBulkStatus = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value;
    if (!status) return;
    handleBulkStatusDirect(status);
    e.target.value = "";
  };

  const handleBatchMarkVisible = (status: "Implemented" | "N/A") => {
    const ids = filteredRequirements.map(r => r.id);
    batchUpdateRequirementStatus(ids, status);
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    setExportNotice(null);
    try {
      await exportASVSToExcel(reqs, {
        analysisId,
        targetLevel
      });
      setExportNotice("Excel (.xlsx) bol úspešne stiahnutý.");
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error("Export to Excel failed:", err);
    } finally {
      setIsExportingExcel(false);
      setIsExportMenuOpen(false);
    }
  };

  const handleExportCSV = () => {
    setExportNotice(null);
    try {
      exportASVSToCSV(reqs, {
        analysisId,
        targetLevel
      });
      setExportNotice("CSV (.csv) bol úspešne stiahnutý.");
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error("Export to CSV failed:", err);
    } finally {
      setIsExportMenuOpen(false);
    }
  };

  return (
    <div className="flex h-full gap-4 relative min-h-0">
      {/* Triage & Scoping Modal */}
      <ASVSTriageModal 
        isOpen={isTriageModalOpen}
        onClose={() => setIsTriageModalOpen(false)}
        triageAnswers={triageAnswers}
        onSetAnswer={setTriageAnswer}
        onResetAnswer={resetTriageAnswer}
        reqs={reqs}
        currentLevel={targetLevel.toString()}
        onApplyLevel={(lvl) => setTargetLevel(parseInt(lvl, 10))}
        analysisId={analysisId}
        initialTab={triageModalInitialTab}
      />


      <ProjectCategorizationModal
        isOpen={isCategorizationModalOpen}
        onClose={() => setIsCategorizationModalOpen(false)}
        currentLevel={targetLevel.toString()}
        onApplyLevel={(lvl) => setTargetLevel(parseInt(lvl, 10))}
        analysisId={analysisId}
      />
      {/* Mobile Chapters Overlay */}
      {isChaptersOpen && (
        <div 
          className="fixed inset-x-0 top-[122px] bottom-0 bg-slate-900/50 z-40 md:top-16 xl:hidden"
          onClick={() => setIsChaptersOpen(false)}
        />
      )}

      {/* Sidebar for Chapters & Sections */}
      <div id="asvs-chapter-sidebar" className={`
        ${isChaptersOpen 
          ? "fixed inset-x-0 top-[122px] bottom-0 z-50 w-80 max-w-[85vw] shadow-2xl flex md:top-16"
          : "hidden xl:flex"
        }
        xl:static xl:z-auto xl:w-72 xl:shadow-xs bg-white border border-slate-200 rounded-lg flex flex-col h-full max-h-[calc(100vh-140px)] xl:sticky xl:top-0 shrink-0 min-h-0 overflow-hidden
      `}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-blue-600 shrink-0" />
            <div>
              <h3 className="font-bold text-slate-800 text-sm">ASVS 5.0 Chapters</h3>
              <p className="text-[10px] text-slate-400">17 Chapters • 345 Requirements</p>
            </div>
          </div>
          <button 
            onClick={() => setIsChaptersOpen(false)} 
            className="xl:hidden p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 cursor-pointer"
            title="Zavrieť kapitoly"
          >
            <X size={16} />
          </button>
        </div>

        {/* Chapters list */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto py-2 custom-scrollbar divide-y divide-slate-50">
          {asvsChapters.map(chapter => {
            const isSelected = activeChapterId === chapter.id;
            const chapterReqs = reqs.filter(r => r.chapterId === chapter.id);
            const totalChapter = chapterReqs.length;
            const naChapter = chapterReqs.filter(r => r.status === "N/A").length;
            const implementedChapter = chapterReqs.filter(r => r.status === "Implemented").length;
            const isFullyScopedOut = totalChapter > 0 && naChapter === totalChapter;

            return (
              <div key={chapter.id} className="py-0.5">
                <button
                  onClick={() => handleSelectChapter(chapter.id)}
                  aria-current={isSelected ? "page" : undefined}
                  title={`V${chapter.id}: ${chapter.name}`}
                  className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between min-w-full cursor-pointer ${
                    isSelected 
                      ? 'bg-blue-50 text-blue-700 font-bold border-r-2 border-blue-600' 
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 pr-2 whitespace-nowrap">
                    <span className="font-mono text-[11px] text-slate-600 shrink-0">V{chapter.id}</span>
                    <span className="text-xs">{chapter.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-auto pl-2">
                    {isFullyScopedOut ? (
                      <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-semibold" title="Všetky kontroly označené ako N/A">
                        N/A
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-600 font-medium">
                        {implementedChapter}/{totalChapter}
                      </span>
                    )}
                  </div>
                </button>

                {/* Sub-sections if chapter is active */}
                {isSelected && chapterSections.length > 1 && (
                  <div className="bg-slate-50/70 py-1.5 px-3 pl-6 space-y-0.5 border-y border-slate-100/80">
                    <button
                      onClick={() => handleSelectSection("all")}
                      aria-pressed={activeSectionId === "all"}
                      className={`w-full text-left px-2 py-1 text-[11px] rounded transition-colors flex items-center justify-between min-w-full cursor-pointer ${
                        activeSectionId === "all" ? "bg-blue-100/70 text-blue-800 font-bold" : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span className="whitespace-nowrap pr-2">Všetky sekcie ({chapterSections.length})</span>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-auto">{chapterReqs.length}</span>
                    </button>
                    {chapterSections.map(sec => {
                      const secReqs = chapterReqs.filter(r => r.sectionId === sec.id);
                      return (
                        <button
                          key={sec.id}
                          onClick={() => handleSelectSection(sec.id)}
                          aria-pressed={activeSectionId === sec.id}
                          title={`${sec.id}: ${sec.name}`}
                          className={`w-full text-left px-2 py-1 text-[11px] rounded transition-colors flex items-center justify-between min-w-full cursor-pointer ${
                            activeSectionId === sec.id ? "bg-blue-100/70 text-blue-800 font-bold" : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <span className="whitespace-nowrap pr-2">{sec.id}: {sec.name}</span>
                          <span className="text-[10px] text-slate-400 shrink-0 ml-auto">{secReqs.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full min-w-0 min-h-0">
        {/* Dynamic Progress Stats Toggle on Mobile */}
        <div className="flex items-center justify-between mb-2 xl:hidden">
          <button 
            onClick={() => setIsChaptersOpen(true)}
            aria-expanded={isChaptersOpen}
            aria-controls="asvs-chapter-sidebar"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-slate-200 rounded-md text-slate-700 bg-white"
          >
            <BookOpen size={14} className="text-blue-600" />
            <span>Kapitoly (V{activeChapter?.id})</span>
          </button>
          
          <button 
            onClick={() => setIsSummaryOpen(!isSummaryOpen)}
            className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:text-blue-800"
          >
            {isSummaryOpen ? <><ChevronUp size={14} /> Skryť prehľad</> : <><ChevronDown size={14} /> Zobraziť prehľad</>}
          </button>
        </div>

        
        {/* Global Workspace Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Project Categorization Button */}
            <button
              onClick={() => setIsCategorizationModalOpen(true)}
              className="px-3 py-1.5 flex items-center gap-1.5 text-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md font-semibold transition-colors cursor-pointer shadow-xs"
              title="Kategorizácia projektu pre určenie ASVS Levelu (L1-L3)"
            >
              <SlidersHorizontal size={14} className="text-blue-600" />
              <span>Kategorizácia projektu</span>
            </button>
            
            {/* Target Level Selector */}
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">ASVS Level:</span>
              <select 
                id="workspace-asvs-level-select"
                aria-label="Filtrovať podľa cieľovej úrovne ASVS"
                className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md focus:outline-none cursor-pointer"
                value={targetLevel}
                onChange={(e) => setTargetLevel(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))}
              >
                <option value="all">Všetky (L1-L3)</option>
                <option value={1}>L1 (Základ)</option>
                <option value={2}>L2 (Štandard)</option>
                <option value={3}>L3 (Vysoká ochrana)</option>
              </select>
            </div>

            {/* Quick Save / Read-Only indicator in ASVS Workspace */}
            {isReadOnly ? (
              <div 
                className="px-2.5 py-1.5 flex items-center gap-1.5 text-xs font-semibold rounded-md bg-amber-50 text-amber-800 border border-amber-200"
                title={`Verzia v${versionCtx?.viewingVersion || "1.0"} je archivovaná a uzamknutá iba na čítanie.`}
              >
                <LockIcon size={13} className="text-amber-600" />
                <span>Iba na čítanie (v{versionCtx?.viewingVersion})</span>
              </div>
            ) : (
              <button
                id="workspace-save-btn"
                onClick={() => {
                  const succeeded = saveWorkspace();
                  setSaveResult(succeeded ? "success" : "error");
                  if (succeeded) setTimeout(() => setSaveResult(null), 3000);
                }}
                aria-label="Uložiť aktuálny stav analýzy"
                className={`px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold rounded-md transition-all shadow-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  saveResult === "success"
                    ? "bg-emerald-600 text-white"
                    : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-300"
                }`}
                title="Uložiť aktuálny stav analýzy a zaznamenať uloženie"
              >
                {saveResult === "success" ? <Check size={14} className="text-white" /> : <Save size={14} className="text-blue-600" />}
                <span>{saveResult === "success" ? "Uložené" : "Uložiť teraz"}</span>
              </button>
            )}
            {/* Diff Button */}
            {versionCtx && (
              <button
                onClick={() => {
                  const baseV = versionCtx.allVersions?.length > 0 ? versionCtx.allVersions[0].version : "1.0";
                  versionCtx.openDiffWithVersions(baseV, versionCtx.currentWorkingVersion);
                }}
                className="px-2.5 py-1.5 flex items-center gap-1 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md transition-all shadow-xs cursor-pointer"
                title="Porovnať rozdiely medzi verziami (Diff)"
              >
                <Scale size={13} className="text-blue-600" />
                <span className="hidden sm:inline">Diff</span>
              </button>
            )}

            {/* Triage Wizard Button */}
            <button
              onClick={() => {
                setTriageModalInitialTab("chapters");
                setIsTriageModalOpen(true);
              }}
              className="px-3 py-1.5 flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold transition-colors cursor-pointer shadow-xs ml-1"
              title="Otvoriť sprievodcu scopingom a technologickou triážou (V1-V17)"
            >
              <Target size={14} />
              <span>Technologická triáž</span>
              {triagedExcludedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-blue-800 text-[10px] rounded-full">
                  {triagedExcludedCount} N/A
                </span>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search size={14} className="absolute left-3 top-2 text-slate-400 pointer-events-none" />
              <input 
                type="text" 
                aria-label="Hľadať ASVS požiadavky"
                placeholder="Hľadať požiadavku, kód, text..." 
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            
            {/* Export Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                disabled={isExportingExcel}
                className="px-3 py-1.5 flex items-center gap-1.5 text-xs bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50 shadow-xs whitespace-nowrap"
              >
                {isExportingExcel ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Generujem...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet size={14} className="text-emerald-400" />
                    <span>Export</span>
                    <ChevronDown size={12} className="opacity-75" />
                  </>
                )}
              </button>
              {isExportMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsExportMenuOpen(false)} />
                  <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-40 py-1 text-xs divide-y divide-slate-100">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Formát exportu
                    </div>
                    <button
                      onClick={handleExportExcel}
                      className="w-full text-left px-3 py-2.5 hover:bg-emerald-50/60 flex items-start gap-2.5 text-slate-700 transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          Excel (.xlsx)
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">Odporúčané</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Súhrn, KPI, farebné stavy, 14 kapitol a STRIDE hrozby</div>
                      </div>
                    </button>
                    <button
                      onClick={handleExportCSV}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-start gap-2.5 text-slate-700 transition-colors cursor-pointer"
                    >
                      <FileText size={16} className="text-slate-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-800">CSV tabuľka (.csv)</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">UTF-8 s BOM pre tabuľkové procesory a skripty</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="w-full flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-[11px] text-slate-500" aria-live="polite">
            {!isReadOnly && (
              <span role={hasStorageError || saveResult === "error" ? "alert" : "status"}>
                {hasStorageError || saveResult === "error"
                  ? "Ukladanie zlyhalo. Skontrolujte úložisko a skúste to znova."
                  : "Priebežné zmeny sa ukladajú automaticky v tomto zariadení."}
              </span>
            )}
            {viewPreferenceError && (
              <span role="alert" className="text-red-700">
                Nastavenia filtrov sa nepodarilo uložiť.
              </span>
            )}
            <span>
              Zobrazených {filteredRequirements.length} z {requirementsBeforeStatusFilter.length} požiadaviek
              {targetLevel !== "all" ? ` (úroveň L${targetLevel})` : ""}
            </span>
            {hasActiveViewFilters && (
              <button
                type="button"
                onClick={clearViewFilters}
                className="font-semibold text-blue-700 hover:text-blue-900 underline underline-offset-2"
              >
                Vymazať filtre sekcie, stavu a hľadania
              </button>
            )}
          </div>
        </div>
{/* Dynamic Progress Stats */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 ${isSummaryOpen ? 'grid' : 'hidden xl:grid'}`}>
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
            <p className="text-[11px] text-slate-500 uppercase font-bold mb-0.5">Pokrytie požiadaviek</p>
            <p className="text-2xl font-bold text-slate-800">{coverage}%</p>
            <div className="w-full bg-slate-100 h-1.5 mt-2 rounded-full">
              <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${coverage}%` }}></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{implementedCount} z {totalRelevant} relevantných</p>
          </div>
          
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
            <p className="text-[11px] text-slate-500 uppercase font-bold mb-0.5">Otvorené nálezy (Gaps)</p>
            <p className="text-2xl font-bold text-red-600">{findingsCount}</p>
            <p className="text-[10px] text-slate-400 mt-1 uppercase">Partial alebo Missing</p>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
            <p className="text-[11px] text-slate-500 uppercase font-bold mb-0.5">Splnené (Mitigated)</p>
            <p className="text-2xl font-bold text-green-600">{implementedCount}</p>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tight">Overené bezpečnostné kontroly</p>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-slate-500 uppercase font-bold mb-0.5">Nepotrebné (N/A)</p>
              {triagedExcludedCount > 0 && (
                <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-semibold border border-blue-200">
                  {triagedExcludedCount} triáž
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-slate-500">{notRelevantCount}</p>
            <p className="text-[10px] text-slate-400 mt-1 uppercase">Označené ako N/A / Scoped Out</p>
          </div>
        </div>

        {/* Contextual Chapter Triage Banners */}
        {currentChapterTriageQuestions.length > 0 && (
          <section className="mb-4 rounded-lg border border-slate-200 bg-white shadow-xs">
            <button
              type="button"
              onClick={() => setIsChapterTriageOpen(open => !open)}
              aria-expanded={isChapterTriageOpen}
              aria-controls="chapter-triage-questions"
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-slate-50 rounded-lg transition-colors"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Target size={15} className="shrink-0 text-blue-600" />
                <span className="text-xs font-semibold text-slate-800">
                  Triage pre V{activeChapterId}
                </span>
                <span className="text-[11px] text-slate-500">
                  {answeredTriageQuestionCount}/{currentChapterTriageQuestions.length} zodpovedané
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-blue-700">
                {isChapterTriageOpen ? "Skryť triage" : "Zobraziť triage"}
                {isChapterTriageOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </button>
            <div
              id="chapter-triage-questions"
              hidden={!isChapterTriageOpen}
              className="space-y-2.5 border-t border-slate-100 p-2.5"
            >
                {currentChapterTriageQuestions.map((triageQ) => {
              const answer = triageAnswers[triageQ.id];
              return (
                <div
                  key={triageQ.id}
                  className={`border rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-2 shadow-xs transition-colors ${
                    answer === false
                      ? "bg-slate-50/90 border-slate-300"
                      : answer === true
                        ? "bg-emerald-50/40 border-emerald-200"
                        : "bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border-blue-200"
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                        answer === false
                          ? "bg-slate-600 text-white"
                          : answer === true
                            ? "bg-emerald-600 text-white"
                            : "bg-blue-600 text-white"
                      }`}
                    >
                      <Target size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 bg-blue-100 px-1.5 py-0.2 rounded">
                          Triage otázka pre V{activeChapterId}
                        </span>
                        {triageQ.sectionId && (
                          <span className="text-[10px] font-bold text-slate-700 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                            Sekcia {triageQ.sectionId}
                          </span>
                        )}
                        <span className="text-xs text-blue-900 font-semibold">
                          {triageQ.category}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">({triageQ.affectsLabel})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedTriageQuestionId(expandedTriageQuestionId === triageQ.id ? null : triageQ.id)}
                        aria-expanded={expandedTriageQuestionId === triageQ.id}
                        className="mt-1 flex w-full items-start justify-between gap-2 text-left text-xs font-medium text-slate-700"
                      >
                        <span>{triageQ.question}</span>
                        {expandedTriageQuestionId === triageQ.id
                          ? <ChevronUp size={14} className="shrink-0" />
                          : <ChevronDown size={14} className="shrink-0" />}
                      </button>
                      {expandedTriageQuestionId === triageQ.id && (
                        <p className="text-[11px] text-slate-500 mt-1">{triageQ.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0 self-end md:self-center">
                    {answer === false ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-300 flex items-center gap-1 shadow-xs">
                          <Ban size={13} className="text-slate-500" /> Kontroly označené ako N/A
                        </span>
                        <button
                          onClick={() => resetTriageAnswer(triageQ.id)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-md transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                          title="Resetovať odpoveď"
                        >
                          <RotateCcw size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setTriageAnswer(triageQ.id, true)}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                            answer === true
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-white text-slate-700 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                          }`}
                        >
                          <Check size={13} />
                          <span>Relevantné</span>
                        </button>
                        <button
                          onClick={() => setTriageAnswer(triageQ.id, false)}
                          className="px-3 py-1 text-xs font-semibold rounded-md bg-white text-slate-700 border border-slate-200 hover:border-red-300 hover:text-red-700 hover:bg-red-50/50 transition-colors cursor-pointer flex items-center gap-1"
                          title="Označiť celú oblasť ako nepotrebnú (N/A)"
                        >
                          <Ban size={13} />
                          <span>Nie je relevantné (N/A)</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
                })}
            </div>
          </section>
        )}

        {/* ASVS Table with Controls */}
        <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col overflow-hidden min-h-0">
          
          {/* Table Actions Toolbar */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 flex-wrap gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-800 text-sm">V{activeChapter?.id}: {activeChapter?.name}</span>
                {activeSectionId !== "all" && (
                  <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-medium">
                    Sekcia {activeSectionId}
                  </span>
                )}
              </div>
              
              {/* Quick Status Filters */}
              <div role="group" aria-label="Filtrovať požiadavky podľa stavu" className="flex items-center bg-slate-200/60 p-0.5 rounded-lg text-[11px] font-medium flex-wrap gap-0.5">
                <button
                  onClick={() => handleStatusFilterChange("all")}
                  aria-pressed={statusFilter === "all"}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${statusFilter === "all" ? "bg-white text-slate-800 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Všetky
                </button>
                <button
                  onClick={() => handleStatusFilterChange("pending")}
                  aria-pressed={statusFilter === "pending"}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${statusFilter === "pending" ? "bg-white text-red-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Gaps ({reqs.filter(r => r.chapterId === activeChapterId && (r.status === "Missing" || r.status === "Partial")).length})
                </button>
                <button
                  onClick={() => handleStatusFilterChange("Implemented")}
                  aria-pressed={statusFilter === "Implemented"}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${statusFilter === "Implemented" ? "bg-white text-green-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Splnené
                </button>
                <button
                  onClick={() => handleStatusFilterChange("N/A")}
                  aria-pressed={statusFilter === "N/A"}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${statusFilter === "N/A" ? "bg-white text-slate-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                >
                  N/A
                </button>
                <button
                  onClick={() => handleStatusFilterChange("triaged")}
                  aria-pressed={statusFilter === "triaged"}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${statusFilter === "triaged" ? "bg-white text-blue-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                  title="Zobraziť kontroly vylúčené pomocou triage otázok"
                >
                  Triáž
                </button>
                <button
                  onClick={() => handleStatusFilterChange("no_evidence")}
                  aria-pressed={statusFilter === "no_evidence"}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${statusFilter === "no_evidence" ? "bg-white text-purple-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                  title="Zobraziť kontroly bez vyplneného dôkazu alebo poznámky"
                >
                  Bez dôkazu ({reqs.filter(r => r.chapterId === activeChapterId && r.status !== "N/A" && (!r.notes || r.notes.trim() === "")).length})
                </button>
              </div>

              {/* Quick Batch Section Presets */}
              <div className="hidden xl:flex items-center gap-1.5 border-l border-slate-200 pl-3">
                <button
                  onClick={() => handleBatchMarkVisible("Implemented")}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-green-50 text-green-700 hover:bg-green-100 rounded border border-green-200 transition-colors cursor-pointer"
                  title="Označiť všetky zobrazené požiadavky ako Implemented"
                >
                  <ShieldCheck size={13} />
                  <span>Schváliť zobrazené</span>
                </button>
                <button
                  onClick={() => handleBatchMarkVisible("N/A")}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 rounded border border-slate-200 transition-colors cursor-pointer"
                  title="Označiť všetky zobrazené požiadavky ako N/A"
                >
                  <span>Nastaviť N/A</span>
                </button>
                <button
                  onClick={handleSelectAllInChapter}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 transition-colors cursor-pointer"
                  title="Označiť všetky zobrazené požiadavky pre hromadnú akciu"
                >
                  <span>Označiť zobrazené ({filteredRequirements.length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Dedicated High-Utility Bulk Actions Bar */}
          {selectedIds.size > 0 && (
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-5 py-2.5 flex items-center justify-between gap-3 shadow-md border-b border-blue-900 flex-wrap animate-in slide-in-from-top-1 duration-150">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-extrabold shadow-xs">
                  {selectedIds.size}
                </span>
                <span className="text-xs font-bold text-white tracking-tight">
                  {selectedIds.size === 1 ? "požiadavka označená" : selectedIds.size < 5 ? "požiadavky označené" : "požiadaviek označených"}
                </span>
                <span className="text-[11px] text-blue-300 hidden md:inline">• Hromadná zmena:</span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => handleBulkStatusDirect("Implemented")}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                  title="Nastaviť vybrané ako Implemented"
                >
                  <ShieldCheck size={13} />
                  <span>Implemented</span>
                </button>
                <button
                  onClick={() => handleBulkStatusDirect("Partial")}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded shadow-xs transition-colors cursor-pointer"
                  title="Nastaviť vybrané ako Partial"
                >
                  <span>Partial</span>
                </button>
                <button
                  onClick={() => handleBulkStatusDirect("Missing")}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded shadow-xs transition-colors cursor-pointer"
                  title="Nastaviť vybrané ako Missing"
                >
                  <span>Missing</span>
                </button>
                <button
                  onClick={() => {
                    setBulkNaReason("Vylúčené z rozsahu aplikácie");
                    setIsBulkNaModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded shadow-xs transition-colors cursor-pointer"
                  title="Nastaviť vybrané ako N/A s odôvodnením"
                >
                  <span>N/A...</span>
                </button>

                <div className="h-4 w-px bg-blue-800 mx-1 hidden sm:block"></div>

                <button
                  onClick={() => setIsBulkNoteModalOpen(true)}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                  title="Pripojiť spoločnú poznámku alebo dôkaz ku všetkým vybraným"
                >
                  <FileText size={13} />
                  <span>Doplniť dôkaz / poznámku</span>
                </button>

                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
                  title="Zrušiť výber"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          )}
          {/* Export notification toast if active */}
          {exportNotice && (
            <div className="mx-4 mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-1.5">
              <Check size={14} className="text-emerald-600 shrink-0" />
              <span>{exportNotice}</span>
            </div>
          )}
          {/* Data Table */}
          <div className="flex-1 overflow-auto relative custom-scrollbar">
            <div className="hidden xl:block">
            <table className="w-full text-left border-collapse min-w-[920px]">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold sticky top-0 z-10 shadow-xs">
                <tr>
                  <th className="px-3 py-2.5 border-b border-slate-100 w-10 text-center">
                    <input 
                      type="checkbox" 
                      aria-label="Označiť všetky zobrazené požiadavky"
                      className="rounded border-slate-300 text-blue-600 cursor-pointer"
                      checked={filteredRequirements.length > 0 && selectedIds.size === filteredRequirements.length}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="px-3 py-2.5 border-b border-slate-100 w-16">ID</th>
                  <th className="px-3 py-2.5 border-b border-slate-100 w-14 text-center">Level</th>
                  <th className="px-4 py-2.5 border-b border-slate-100 min-w-[340px] lg:min-w-[420px]">Požiadavka</th>
                  <th className="px-3 py-2.5 border-b border-slate-100 w-40">Stav (Status)</th>
                  <th className="px-3 py-2.5 border-b border-slate-100 w-52 hidden md:table-cell">Poznámka / Dôkaz</th>
                  <th className="px-3 py-2.5 border-b border-slate-100 w-24 text-center">Akcie</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {filteredRequirements.map((req, index) => {
                  const isSelected = selectedIds.has(req.id);
                  const isExpanded = expandedRows.has(req.id);
                  const currentSection = asvsSections.find(s => s.id === req.sectionId);
                  
                  const previousReq = index > 0 ? filteredRequirements[index - 1] : null;
                  const showSectionHeader = !previousReq || previousReq.sectionId !== req.sectionId;

                  const getRowStyle = () => {
                    if (req.triageReason) return "opacity-60 bg-slate-50";
                    switch (req.status) {
                      case "Implemented": return "bg-green-50/20";
                      case "Partial": return "bg-orange-50/20";
                      case "Missing": return "bg-red-50/20";
                      case "N/A": return "opacity-60 bg-slate-50";
                      default: return "";
                    }
                  };

                  return (
                    <React.Fragment key={req.id}>
                      {showSectionHeader && (
                        <tr className="bg-slate-100/80 border-t border-b border-slate-200">
                          <td colSpan={7} className="px-6 py-2.5 font-bold text-xs text-slate-800">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                                  {req.sectionId}
                                </span>
                                <span>{currentSection?.name || req.sectionName || req.title}</span>
                              </div>
                              <span className="text-[11px] font-normal text-slate-500">
                                {reqs.filter(r => r.sectionId === req.sectionId).length} požiadaviek
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr className={`${isSelected ? 'bg-blue-50/30' : 'hover:bg-slate-50/70'} transition-colors ${getRowStyle()}`}>
                        <td className="px-3 py-2.5 text-center">
                          <input 
                            type="checkbox" 
                            aria-label={`Označiť ${req.id}`}
                            className="rounded border-slate-300 text-blue-600 cursor-pointer"
                            checked={isSelected}
                            onChange={() => toggleSelection(req.id)}
                          />
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
                          {req.id}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-center">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            req.level === 1 ? 'bg-slate-200 text-slate-700' :
                            req.level === 2 ? 'bg-blue-100 text-blue-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            L{req.level}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 min-w-[340px] lg:min-w-[420px]">
                          <div className="text-slate-800 text-xs leading-relaxed">{req.description}</div>
                          {req.triageReason && (
                            <div className="mt-1 flex items-start gap-1.5 text-[11px] text-blue-700 bg-blue-50/60 p-1.5 rounded border border-blue-100">
                              <Info size={13} className="shrink-0 mt-0.5" />
                              <span><strong>Vylúčené technológiou:</strong> {req.triageReason}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <select 
                            aria-label={`Stav požiadavky ${req.id}`}
                            className={`w-full px-2 py-1.5 text-xs font-semibold rounded-md border appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-colors ${
                              req.status === "Implemented" ? "bg-green-50 border-green-200 text-green-700" :
                              req.status === "Partial" ? "bg-orange-50 border-orange-200 text-orange-700" :
                              req.status === "Missing" ? "bg-red-50 border-red-200 text-red-700" :
                              req.status === "N/A" ? "bg-slate-100 border-slate-200 text-slate-600" :
                              "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                            }`}
                            value={req.status || ""}
                            onChange={(e) => updateRequirementStatus(req.id, e.target.value)}
                            disabled={!!req.triageReason}
                          >
                            <option value="" disabled>Vyberte stav...</option>
                            <option value="Implemented">Implemented</option>
                            <option value="Partial">Partial</option>
                            <option value="Missing">Missing</option>
                            <option value="N/A">Not Applicable</option>
                          </select>
                        </td>
                        <td className="px-3 py-2.5 hidden md:table-cell">
                          <input 
                            type="text" 
                            aria-label={`Poznámka alebo dôkaz pre ${req.id}`}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white placeholder:text-slate-300 disabled:bg-slate-50 disabled:text-slate-400"
                            placeholder={req.triageReason ? "Vylúčené z analýzy" : "Pridať referenciu, link, dôkaz..."}
                            value={req.notes || ""}
                            onChange={(e) => updateRequirementNote(req.id, e.target.value)}
                            disabled={!!req.triageReason}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <button 
                            onClick={() => toggleRow(req.id)}
                            aria-expanded={isExpanded}
                            aria-controls={isExpanded ? `desktop-details-${req.id}` : undefined}
                            aria-label={`${isExpanded ? "Skryť" : "Zobraziť"} detail požiadavky ${req.id}`}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer w-full justify-center ${
                              isExpanded 
                                ? "bg-blue-100 text-blue-700" 
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {isExpanded ? (
                              <><ChevronUp size={14} /> Skryť</>
                            ) : (
                              <><ChevronDown size={14} /> Detail</>
                            )}
                          </button>
                        </td>
                      </tr>
                      
                      {/* Expanded Details Row */}
                      {isExpanded && (() => {
                        const guide = getVerificationGuide(req);
                        return (
                          <tr id={`desktop-details-${req.id}`} className="bg-slate-50/70 border-b border-slate-200 animate-in fade-in duration-150">
                            <td colSpan={7} className="px-0 py-0">
                              <div className="p-4 md:p-5 border-l-4 border-blue-500 mx-4 md:mx-6 my-3 bg-white shadow-xs rounded-r-lg border border-slate-200/80">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                  <div className="lg:col-span-2 space-y-4">
                                    {/* Metodika overenia */}
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                          <ShieldCheck size={14} className="text-blue-600" />
                                          Metodika overenia kontroly ({req.id})
                                        </h4>
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                          {guide.method}
                                        </span>
                                      </div>

                                      <div className="bg-blue-50/40 rounded-lg p-3.5 border border-blue-100 text-xs space-y-3">
                                        {/* Kľúčová otázka */}
                                        <div>
                                          <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block mb-1">
                                            Kľúčová otázka auditu:
                                          </span>
                                          <p className="font-semibold text-slate-800 text-xs leading-relaxed">
                                            {guide.keyQuestion}
                                          </p>
                                        </div>

                                        {/* Čo skontrolovať */}
                                        {guide.whatToInspect && guide.whatToInspect.length > 0 && (
                                          <div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                              Čo skontrolovať v kóde / konfigurácii:
                                            </span>
                                            <ul className="list-disc list-inside space-y-1 text-slate-700 text-xs">
                                              {guide.whatToInspect.map((item, idx) => (
                                                <li key={idx} className="leading-relaxed">
                                                  {item}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}

                                        {/* Príklad testu & Očakávaný dôkaz */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-blue-100">
                                          <div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                                              Testovací postup:
                                            </span>
                                            <p className="text-slate-600 text-[11px] leading-relaxed">
                                              {guide.exampleTest}
                                            </p>
                                          </div>
                                          <div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                                              Očakávaný dôkaz (Evidence):
                                            </span>
                                            <p className="text-slate-600 text-[11px] leading-relaxed">
                                              {guide.expectedEvidence}
                                            </p>
                                          </div>
                                        </div>

                                        {guide.owaspReference && (
                                          <div className="text-[11px] text-slate-500 pt-1 border-t border-blue-100 flex items-center gap-1">
                                            <span className="font-semibold">OWASP referencia:</span>
                                            <span>{guide.owaspReference}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Poznámka audítora na mobile */}
                                    <div className="md:hidden">
                                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Poznámka audítora</h4>
                                      <textarea 
                                        aria-label={`Poznámka audítora pre ${req.id}`}
                                        className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 min-h-[80px] resize-y"
                                        placeholder="Zadajte detaily zistenia, kroky k reprodukcii, alebo referenciu na zdrojový kód..."
                                        value={req.notes || ""}
                                        onChange={(e) => updateRequirementNote(req.id, e.target.value)}
                                        disabled={!!req.triageReason}
                                      />
                                    </div>
                                  </div>

                                  {/* Pravý stĺpec: Prepojenie na komponenty */}
                                  <div className="space-y-4 border-t lg:border-t-0 lg:border-l border-slate-200 lg:pl-5 pt-3 lg:pt-0">
                                    <div>
                                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Layers size={14} className="text-slate-500" />
                                        Prepojenie na komponenty
                                      </h4>
                                      <p className="text-[11px] text-slate-500 mb-2">
                                        Priraďte kontrolu ku komponentom architektúry:
                                      </p>
                                      <div className="space-y-1.5">
                                        {TRACE_COMPONENTS.map(comp => {
                                          const isLinked = req.traceability?.some(t => t.id === comp.id) || (req as any).traceComponents?.includes(comp.id);
                                          return (
                                            <button
                                              key={comp.id}
                                              type="button"
                                              onClick={() => toggleRequirementTraceability(req.id, comp.id, comp.color)}
                                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all border cursor-pointer w-full ${
                                                isLinked 
                                                  ? "bg-blue-50 border-blue-200 text-blue-700 font-medium shadow-2xs" 
                                                  : "bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100"
                                              }`}
                                            >
                                              <span className="truncate">{comp.id}</span>
                                              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ml-1.5 ${
                                                isLinked ? "border-blue-500 bg-blue-500 text-white" : "border-slate-300 bg-white"
                                              }`}>
                                                {isLinked && <Check size={11} strokeWidth={3} />}
                                              </div>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })()}
                    </React.Fragment>
                  );
                })}
                {filteredRequirements.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500 text-sm">
                      Nenašli sa žiadne požiadavky zodpovedajúce filtru alebo hľadanému výrazu "{searchQuery}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>

            <div className="xl:hidden divide-y divide-slate-200">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
                <label className="flex items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    aria-label="Označiť všetky zobrazené požiadavky"
                    className="rounded border-slate-300 text-blue-600"
                    checked={filteredRequirements.length > 0 && selectedIds.size === filteredRequirements.length}
                    onChange={toggleAll}
                  />
                  Označi všetky zobrazené
                </label>
                <span>{filteredRequirements.length} požiadaviek</span>
              </div>
              {filteredRequirements.map((req, index) => {
                const isSelected = selectedIds.has(req.id);
                const isExpanded = expandedRows.has(req.id);
                const showSectionHeader = index === 0 || filteredRequirements[index - 1].sectionId !== req.sectionId;
                const guide = isExpanded ? getVerificationGuide(req) : null;

                return (
                  <React.Fragment key={req.id}>
                    {showSectionHeader && (
                      <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700">
                        <span className="mr-2 rounded border border-blue-200 bg-blue-100 px-1.5 py-0.5 font-mono text-blue-800">{req.sectionId}</span>
                        {asvsSections.find(section => section.id === req.sectionId)?.name || req.sectionName || req.title}
                      </div>
                    )}
                    <article className={`p-4 ${isSelected ? "bg-blue-50/50" : "bg-white"} ${req.triageReason || req.status === "N/A" ? "opacity-75" : ""}`}>
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          aria-label={`Označi ${req.id}`}
                          className="mt-1 rounded border-slate-300 text-blue-600"
                          checked={isSelected}
                          onChange={() => toggleSelection(req.id)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-800">{req.id}</span>
                            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              req.level === 1 ? "bg-slate-200 text-slate-700" :
                              req.level === 2 ? "bg-blue-100 text-blue-800" :
                              "bg-purple-100 text-purple-800"
                            }`}>L{req.level}</span>
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-slate-800">{req.description}</p>
                          {req.triageReason && (
                            <p className="mt-2 rounded border border-blue-100 bg-blue-50 p-2 text-xs text-blue-800">
                              <strong>Vylúčené technológiou:</strong> {req.triageReason}
                            </p>
                          )}
                          <label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-slate-500" htmlFor={`mobile-status-${req.id}`}>Stav</label>
                          <select
                            id={`mobile-status-${req.id}`}
                            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium"
                            value={req.status || ""}
                            onChange={event => updateRequirementStatus(req.id, event.target.value)}
                            disabled={!!req.triageReason}
                          >
                            <option value="" disabled>Vyberte stav...</option>
                            <option value="Implemented">Implemented</option>
                            <option value="Partial">Partial</option>
                            <option value="Missing">Missing</option>
                            <option value="N/A">Not Applicable</option>
                          </select>
                          <label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-slate-500" htmlFor={`mobile-notes-${req.id}`}>Poznámka / dôkaz</label>
                          <input
                            id={`mobile-notes-${req.id}`}
                            type="text"
                            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                            placeholder={req.triageReason ? "Vylúčené z analýzy" : "Pridať referenciu, link alebo dôkaz"}
                            value={req.notes || ""}
                            onChange={event => updateRequirementNote(req.id, event.target.value)}
                            disabled={!!req.triageReason}
                          />
                          <button
                            type="button"
                            onClick={() => toggleRow(req.id)}
                            aria-expanded={isExpanded}
                            aria-controls={isExpanded ? `mobile-details-${req.id}` : undefined}
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {isExpanded ? "Skryť metodiku" : "Zobraziť metodiku"}
                          </button>
                          {guide && (
                            <div id={`mobile-details-${req.id}`} className="mt-3 space-y-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-xs">
                              <p className="font-bold text-blue-800">{guide.method}</p>
                              <div>
                                <p className="font-semibold text-slate-700">Kľúčová otázka</p>
                                <p className="mt-1 text-slate-600">{guide.keyQuestion}</p>
                              </div>
                              <div>
                                <p className="font-semibold text-slate-700">Čo overiť</p>
                                <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-600">
                                  {guide.whatToInspect.map(item => <li key={item}>{item}</li>)}
                                </ul>
                              </div>
                              <div>
                                <p className="font-semibold text-slate-700">Očakávaný dôkaz</p>
                                <p className="mt-1 text-slate-600">{guide.expectedEvidence}</p>
                              </div>
                              <div>
                                <p className="mb-1 font-semibold text-slate-700">Súvisiace komponenty</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {TRACE_COMPONENTS.map(component => {
                                    const isLinked = req.traceability?.some(trace => trace.id === component.id) || (req as any).traceComponents?.includes(component.id);
                                    return (
                                      <button
                                        key={component.id}
                                        type="button"
                                        onClick={() => toggleRequirementTraceability(req.id, component.id, component.color)}
                                        className={`flex items-center justify-between rounded border px-2 py-2 text-left ${isLinked ? "border-blue-300 bg-blue-100 text-blue-800" : "border-slate-200 bg-white text-slate-600"}`}
                                      >
                                        <span>{component.id}</span>
                                        {isLinked && <Check size={13} />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  </React.Fragment>
                );
              })}
              {filteredRequirements.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-slate-500">
                  Nenašli sa žiadne požiadavky pre aktuálne filtre.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Bulk Note / Evidence */}
      {isBulkNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">Hromadná poznámka / Dôkaz</h3>
              </div>
              <button 
                onClick={() => setIsBulkNoteModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Zadaný text bude pripojený ako implementačná poznámka ku všetkým <strong>{selectedIds.size}</strong> vybraným kontrolám.
            </p>

            <form onSubmit={handleApplyBulkNote} className="space-y-3">
              <div>
                <textarea
                  required
                  rows={4}
                  value={bulkNoteText}
                  onChange={e => setBulkNoteText(e.target.value)}
                  placeholder="napr. Overené statickou analýzou SonarQube a penetračným testom v2.4 (Odkaz na JIRA-4291)."
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkNoteModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Uložiť pre {selectedIds.size} kontrol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Bulk N/A Reason */}
      {isBulkNaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Ban size={18} className="text-slate-600" />
                <h3 className="font-bold text-slate-800 text-sm">Hromadné označenie N/A (Nepotrebné)</h3>
              </div>
              <button 
                onClick={() => setIsBulkNaModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Všetkých <strong>{selectedIds.size}</strong> vybraných požiadaviek bude označených ako <strong>N/A</strong> (Not Applicable / Mimo rozsah). Zadajte odôvodnenie pre audit:
            </p>

            <form onSubmit={handleApplyBulkNa} className="space-y-3">
              <div>
                <input
                  type="text"
                  required
                  value={bulkNaReason}
                  onChange={e => setBulkNaReason(e.target.value)}
                  placeholder="napr. Systém nepoužíva hardvérové kryptografické moduly (HSM)"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkNaModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Označiť ako N/A
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
