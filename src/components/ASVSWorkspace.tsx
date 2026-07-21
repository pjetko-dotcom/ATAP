/**
 * ASVS Workspace Module
 * Handles the display, filtering, and management of ASVS (Application Security Verification Standard) requirements.
 * 
 * @module ASVSWorkspace
 */
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ChevronDown, ChevronUp, ChevronRight, Download, BookOpen } from "lucide-react";
import { asvsChapters, ASVSRequirement } from "../data/asvsData";
import { useWorkspaceState } from "../hooks/useWorkspaceState";
import { HelpTooltip } from "./HelpTooltip";

const statusStyles: Record<string, string> = {
  "Implemented": "bg-green-100 text-green-700",
  "Partial": "bg-orange-100 text-orange-700",
  "Missing": "bg-red-100 text-red-700",
  "N/A": "bg-slate-100 text-slate-500",
};

/**
 * ASVS Workspace Component.
 * Displays progress statistics, a search bar, a level filter, and a data table for ASVS 5.0 requirements.
 * Integrates all 17 chapters and 350+ requirements, allowing analysts to track the status, 
 * traceability, and implementation notes of enterprise security controls.
 * Data state can be exported to CSV.
 * 
 * @returns {JSX.Element} The rendered ASVS workspace component.
 */
export function ASVSWorkspace() {
  const { id: analysisId } = useParams<{ id: string }>();
  const {
    reqs,
    updateRequirementStatus,
    updateRequirementNote,
    toggleRequirementTraceability,
    selectActiveRequirement,
    components: TRACE_COMPONENTS
  } = useWorkspaceState(analysisId);

  const [activeChapterId, setActiveChapterId] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [targetLevel, setTargetLevel] = useState<number | "all">(3);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  // 1. Dynamic Filtering based on selected chapter
  const filteredRequirements = reqs.filter(req => {
    const matchesChapter = req.chapterId === activeChapterId;
    const matchesSearch = 
      req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.description.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesLevel = targetLevel === "all" || req.level <= targetLevel;
    
    return matchesChapter && matchesSearch && matchesLevel;
  });

  const activeChapter = asvsChapters.find(c => c.id === activeChapterId);

  // 1. Dynamic Progress Stats Computation (Global, across all chapters)
  const totalRelevant = reqs.filter(r => r.status !== "N/A").length;
  const implementedCount = reqs.filter(r => r.status === "Implemented").length;
  const coverage = totalRelevant > 0 ? Math.round((implementedCount / totalRelevant) * 100) : 0;
  const findingsCount = reqs.filter(r => r.status === "Missing" || r.status === "Partial").length;
  const notRelevantCount = reqs.filter(r => r.status === "N/A").length;

  // Cleanup on unmount or navigation
  useEffect(() => {
    return () => {
      selectActiveRequirement(null);
    };
  }, []);

  // Row Expand Handler (4. Expandable Details)
  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        selectActiveRequirement(null);
      } else {
        next.add(id);
        selectActiveRequirement(id);
      }
      return next;
    });
  };

  // Selection Handlers (3. Bulk Actions)
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

  const handleBulkStatus = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value;
    if (!status) return;
    reqs.forEach(r => {
      if (selectedIds.has(r.id)) {
        updateRequirementStatus(r.id, status);
      }
    });
    setSelectedIds(new Set()); // Clear selection
    e.target.value = ""; // Reset dropdown
  };

  // 5. CSV Export Handler
  const handleExport = () => {
    const header = "ID,Chapter,Requirement,Status,Notes\n";
    const csv = reqs.map(r => {
      const chapterName = asvsChapters.find(c => c.id === r.chapterId)?.name || "";
      return `"${r.id}","${chapterName}","${r.title}","${r.status}","${(r.notes || '').replace(/"/g, '""')}"`;
    }).join("\n");
    const blob = new Blob([header + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asvs_export_full.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full gap-6">
      {/* Sidebar for Chapters */}
      <div className="w-64 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col hidden lg:flex h-full">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <BookOpen size={18} className="text-blue-600" />
          <h3 className="font-bold text-slate-800 text-sm">ASVS 5.0 Chapters</h3>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {asvsChapters.map(chapter => (
            <button
              key={chapter.id}
              onClick={() => setActiveChapterId(chapter.id)}
              className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${activeChapterId === chapter.id ? 'bg-blue-50 text-blue-700 font-bold border-r-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <span className="truncate pr-2">V{chapter.id}: {chapter.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Dynamic Progress Stats Toggle */}
        <div className="flex items-center justify-between mb-2 lg:hidden">
          <h3 className="text-sm font-bold text-slate-700">Workspace Summary</h3>
          <button 
            onClick={() => setIsSummaryOpen(!isSummaryOpen)}
            className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:text-blue-800"
          >
            {isSummaryOpen ? (
              <><ChevronUp size={14} /> Hide</>
            ) : (
              <><ChevronDown size={14} /> Show</>
            )}
          </button>
        </div>

        {/* Dynamic Progress Stats */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 ${isSummaryOpen ? 'block' : 'hidden lg:grid'}`}>
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Total Coverage</p>
            <p className="text-2xl font-bold text-slate-800">{coverage}%</p>
            <div className="w-full bg-slate-100 h-1.5 mt-2 rounded-full">
              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${coverage}%` }}></div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Global Findings</p>
            <p className="text-2xl font-bold text-red-600">{findingsCount}</p>
            <p className="text-[10px] text-slate-400 mt-1 uppercase">Partial or Missing</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Mitigated</p>
            <p className="text-2xl font-bold text-green-600">{implementedCount}</p>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tight">ASVS Controls Verified</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Not Relevant</p>
            <p className="text-2xl font-bold text-slate-400">{notRelevantCount}</p>
            <p className="text-[10px] text-slate-400 mt-1 uppercase">Justified Exceptions</p>
          </div>
        </div>

        {/* ASVS Table with Controls */}
        <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-0">
          {/* Table Actions Toolbar */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <h3 className="font-bold text-slate-700 text-sm hidden sm:block">V{activeChapter?.id}: {activeChapter?.name}</h3>
              
              {/* 3. Bulk Actions dropdown (only shows when items are selected) */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                  <span className="text-xs font-semibold text-blue-600">{selectedIds.size} selected</span>
                  <select 
                    onChange={handleBulkStatus}
                    className="px-2 py-1 text-xs border border-blue-200 bg-blue-50 text-blue-700 rounded font-medium focus:outline-none"
                    defaultValue=""
                  >
                    <option value="" disabled>Set Status...</option>
                    <option value="Implemented">Implemented</option>
                    <option value="Partial">Partial</option>
                    <option value="Missing">Missing</option>
                    <option value="N/A">Not Applicable</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-2 ml-auto">
              <input 
                type="text" 
                placeholder="Search requirement..." 
                className="px-3 py-1 text-xs border border-slate-200 rounded w-48"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="flex items-center gap-1.5">
                <select 
                  className="px-3 py-1 text-xs border border-slate-200 rounded"
                  value={targetLevel}
                  onChange={(e) => setTargetLevel(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))}
                >
                  <option value="all">All Levels</option>
                  <option value={1}>Level 1 Only</option>
                  <option value={2}>Level 2 (L1 + L2)</option>
                  <option value={3}>Level 3 (All)</option>
                </select>
                <HelpTooltip text="Filters requirements based on the application's risk profile. L1 is for basic apps, L2 for most apps, L3 for high value/critical apps." position="left" />
              </div>
              {/* 5. CSV Export */}
              <button 
                onClick={handleExport}
                className="px-3 py-1 flex items-center gap-1 text-xs bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors"
              >
                <Download size={14} /> Export
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div className="flex-1 overflow-auto relative">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 border-b border-slate-100 w-10 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-blue-600"
                      checked={filteredRequirements.length > 0 && selectedIds.size === filteredRequirements.length}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="px-2 py-3 border-b border-slate-100 w-10"></th>
                  <th className="px-2 py-3 border-b border-slate-100 w-20">
                    <div className="flex items-center">
                      ID <HelpTooltip text="The official OWASP ASVS 5.0 requirement identifier." position="bottom" />
                    </div>
                  </th>
                  <th className="px-6 py-3 border-b border-slate-100">
                    <div className="flex items-center">
                      Requirement <HelpTooltip text="The security control description and its level applicability." position="bottom" />
                    </div>
                  </th>
                  <th className="px-4 py-3 border-b border-slate-100 w-16 text-center">Lvl</th>
                  <th className="px-6 py-3 border-b border-slate-100 w-40">
                    <div className="flex items-center">
                      Status <HelpTooltip text="Set to Implemented, Partial, Missing, or N/A to track compliance." position="bottom" />
                    </div>
                  </th>
                  <th className="px-6 py-3 border-b border-slate-100 w-32">Traceability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredRequirements.map((req) => {
                  const isExpanded = expandedRows.has(req.id);
                  const isSelected = selectedIds.has(req.id);
                  
                  return (
                    <React.Fragment key={req.id}>
                      <tr className={`${isSelected ? 'bg-blue-50/30' : 'hover:bg-slate-50'} transition-colors`}>
                        <td className="px-4 py-4 text-center">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-blue-600"
                            checked={isSelected}
                            onChange={() => toggleSelection(req.id)}
                          />
                        </td>
                        <td className="px-2 py-4">
                          <button 
                            onClick={() => toggleRow(req.id)}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                          >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>
                        <td className="px-2 py-4 font-mono text-xs text-slate-400">{req.id}</td>
                        <td className="px-6 py-4 text-slate-700">
                          <p className="font-medium">{req.title}</p>
                          {req.description && <p className="text-xs text-slate-400 mt-1">{req.description}</p>}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                            {req.level}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {/* 2. Interactive Status Badges (Inline Select) */}
                          <div className="relative">
                            <select 
                              value={req.status}
                              onChange={(e) => updateRequirementStatus(req.id, e.target.value)}
                              className={`appearance-none pl-3 pr-6 py-1 ${statusStyles[req.status] || 'bg-slate-100 text-slate-700'} text-[10px] font-bold rounded-full uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer w-full max-w-[120px]`}
                            >
                              <option value="Implemented">Implemented</option>
                              <option value="Partial">Partial</option>
                              <option value="Missing">Missing</option>
                              <option value="N/A">N/A</option>
                            </select>
                            <ChevronDown size={12} className="absolute right-2 top-1.5 pointer-events-none opacity-50" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {req.traceability && req.traceability.length > 0 ? req.traceability.map((trace, i) => (
                              <span key={i} className={`text-[9px] ${trace.color} px-1.5 py-0.5 rounded`}>{trace.id}</span>
                            )) : <span className="text-xs text-slate-300">-</span>}
                          </div>
                        </td>
                      </tr>
                      
                      {/* 4. Expandable Rows for Evidence/Notes */}
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={7} className="px-16 py-4 border-b border-slate-100 shadow-inner">
                            <div className="flex gap-6">
                              <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Analysis Notes & Evidence</label>
                                <textarea 
                                  value={req.notes}
                                  onChange={(e) => updateRequirementNote(req.id, e.target.value)}
                                  placeholder="Add justification, evidence links, or implementation details..."
                                  className="w-full h-24 px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white resize-none"
                                />
                              </div>
                              <div className="w-64">
                                <div className="p-3 bg-white border border-slate-200 rounded-md shadow-sm">
                                  <h4 className="text-xs font-bold text-slate-700 mb-2">Linked Artifacts</h4>
                                  <button className="w-full py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors cursor-pointer">
                                    + Link JIRA Ticket
                                  </button>
                                  <button className="w-full py-1.5 mt-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer">
                                    + Upload Evidence
                                  </button>
                                </div>

                                <div className="p-3 bg-white border border-slate-200 rounded-md shadow-sm mt-3">
                                  <div className="flex items-center gap-1 mb-2">
                                    <h4 className="text-xs font-bold text-slate-700">Traceability Mapping</h4>
                                    <HelpTooltip text="Link this security requirement to specific architectural components that implement it." position="top" />
                                  </div>
                                  <p className="text-[10px] text-slate-400 mb-2">Select architectural components that implement this control:</p>
                                  <div className="flex flex-col gap-1.5">
                                    {TRACE_COMPONENTS.map((comp) => {
                                      const isLinked = (req.traceability || []).some(t => t.id === comp.id);
                                      return (
                                        <button
                                          key={comp.id}
                                          type="button"
                                          onClick={() => toggleRequirementTraceability(req.id, comp.id, comp.color)}
                                          className={`w-full flex items-center justify-between text-left px-2 py-1 rounded text-[11px] transition-all border cursor-pointer ${
                                            isLinked 
                                              ? "bg-blue-50 border-blue-200 text-blue-700 font-medium" 
                                              : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                                          }`}
                                        >
                                          <span>{comp.id}</span>
                                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                            isLinked ? "border-blue-500 bg-blue-500 text-white" : "border-slate-300 bg-white"
                                          }`}>
                                            {isLinked && <span className="text-[9px] font-bold">✓</span>}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredRequirements.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500 text-sm">
                      No requirements found matching "{searchQuery}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

