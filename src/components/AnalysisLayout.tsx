/**
 * Analysis Layout Module
 * Provides the sub-layout specifically for an individual analysis workspace.
 * 
 * @module AnalysisLayout
 */
import React, { useState, useEffect } from "react";
import { Outlet, useParams } from "react-router-dom";
import { useAnalyses } from "../hooks/useAnalyses";
import { ASVSRequirement } from "../data/asvsData";
import { Shield, Database, LayoutTemplate, Activity, DollarSign, Bell, PanelRight, X, Pin, PinOff, ChevronLeft } from "lucide-react";

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

/**
 * Analysis Layout Component.
 * Renders a 3-panel structure: a top header with actions, a main workspace area (`Outlet`),
 * and a right-side informational panel showing related assets and evidence logs.
 * 
 * @returns {JSX.Element} The rendered layout for an analysis view.
 */
export function AnalysisLayout() {
  const { id } = useParams<{id: string}>();
  const { analyses } = useAnalyses();
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  
  // Right panel hover/lock state
  const [isRightPanelLocked, setIsRightPanelLocked] = useState(false);
  const [isRightPanelHovered, setIsRightPanelHovered] = useState(false);
  const isRightExpanded = isRightPanelLocked || isRightPanelHovered;
  
  const currentAnalysis = analyses.find(a => a.id === id) || {
    name: "Retail Banking API v2.4",
    asvsLevel: "2",
    status: "Draft"
  };

  // Sync state reactively with workspace changes
  useEffect(() => {
    const handler = () => {
      setUpdateTrigger(prev => prev + 1);
    };
    window.addEventListener("storage_workspace_update", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("storage_workspace_update", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const asvsKey = `atap_asvs_v5_${id || "default"}`;
  const logsKey = `atap_logs_v5_${id || "default"}`;
  const activeKey = `atap_active_req_v5_${id || "default"}`;

  // Read current ASVS Requirements state
  let reqs: ASVSRequirement[] = [];
  try {
    const data = localStorage.getItem(asvsKey);
    if (data) {
      reqs = JSON.parse(data);
    }
  } catch (e) {
    console.error(e);
  }

  // Read currently active/selected requirement
  const activeReqId = localStorage.getItem(activeKey);
  const activeReq = reqs.find(r => r.id === activeReqId);

  // Read logs
  let logs: any[] = [];
  try {
    const data = localStorage.getItem(logsKey);
    if (data) {
      logs = JSON.parse(data);
    }
  } catch (e) {
    console.error(e);
  }

  const displayLogs = logs.length > 0 ? logs : [
    { id: "1", action: "Created Analysis Workspace", user: "Erik Novák", time: "Just now" }
  ];

  // Calculate dynamic component mappings count
  const defaultComponents = [
    { id: "Frontend App", type: "Web App" },
    { id: "API Gateway", type: "Gateway" },
    { id: "Auth Service", type: "Logic" },
    { id: "Main Database", type: "Database" },
    { id: "Payment Gateway", type: "Integration" },
    { id: "Notification Service", type: "Utility" },
  ];

  const componentMetrics = defaultComponents.map(comp => {
    const linkedReqs = reqs.filter(r => 
      r.traceability && r.traceability.some(t => t.id === comp.id)
    );
    const implementedCount = linkedReqs.filter(r => r.status === "Implemented").length;
    return {
      ...comp,
      count: linkedReqs.length,
      implementedCount,
      requirements: linkedReqs.map(r => r.id)
    };
  });

  const handleAddCustomNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const newLog = {
      id: Date.now().toString(),
      action: `Note added: "${newNoteText}"`,
      user: "Erik Novák",
      time: "Just now"
    };

    const updatedLogs = [newLog, ...logs];
    localStorage.setItem(logsKey, JSON.stringify(updatedLogs));
    setNewNoteText("");
    setShowAddNote(false);
    
    // Trigger update
    window.dispatchEvent(new Event("storage_workspace_update"));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 relative z-10">
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded uppercase">{currentAnalysis.status}</span>
          <h2 className="text-sm md:text-lg font-semibold text-slate-800 tracking-tight truncate max-w-[200px] sm:max-w-xs">{currentAnalysis.name}</h2>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button className="px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm border border-slate-200 rounded font-medium hover:bg-slate-50 hidden sm:block">Reviewer View</button>
          <button className="px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-blue-600 text-white rounded font-medium shadow-sm shadow-blue-200">Save</button>
          <button 
            onClick={() => setIsInfoPanelOpen(!isInfoPanelOpen)}
            className="lg:hidden p-1.5 md:p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
          >
            <PanelRight size={20} />
          </button>
        </div>
      </header>

      {/* Content Grid */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Workspace */}
        <section className="flex-1 p-4 md:p-8 flex flex-col overflow-y-auto z-0">
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
            
            {/* Desktop Header & Lock Toggle */}
            <div className="hidden lg:flex items-center h-12 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="w-12 shrink-0 flex items-center justify-center">
                <PanelRight size={20} className="text-slate-400" />
              </div>
              <div className={`flex-1 flex items-center justify-between pr-3 transition-opacity duration-300 ${isRightExpanded ? 'opacity-100' : 'opacity-0'}`}>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Analysis Info</span>
                <button 
                  onClick={() => setIsRightPanelLocked(!isRightPanelLocked)}
                  className={`p-1.5 rounded transition-colors ${isRightPanelLocked ? 'text-blue-600 bg-blue-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'}`}
                  title={isRightPanelLocked ? "Unlock Panel" : "Lock Panel"}
                >
                  {isRightPanelLocked ? <PinOff size={16} /> : <Pin size={16} />}
                </button>
              </div>
            </div>

            {/* Panel Content */}
            <div className={`p-6 space-y-6 overflow-y-auto flex-1 transition-opacity duration-300 ${isRightExpanded ? 'opacity-100' : 'lg:opacity-0'}`}>
              <div className="flex items-center justify-between lg:hidden -mt-2 -mx-2 mb-2">
                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Info Panel</h4>
                 <button onClick={() => setIsInfoPanelOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 cursor-pointer"><X size={18}/></button>
              </div>
              
              {/* Contextual Active Requirement Detail Card */}
              {activeReq && (
                <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-md font-mono">{activeReq.id}</span>
                    <span className={`px-2 py-0.5 ${statusStyles[activeReq.status] || "bg-slate-100 text-slate-600"} text-[9px] font-bold rounded-full uppercase`}>
                      {activeReq.status}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-800 line-clamp-2">{activeReq.title}</h5>
                  <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-3">{activeReq.description}</p>
                  
                  {/* Component Mapping */}
                  {activeReq.traceability && activeReq.traceability.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-blue-100/50">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Linked Components</p>
                      <div className="flex flex-wrap gap-1">
                        {activeReq.traceability.map((trace, i) => (
                          <span key={i} className={`text-[9px] font-medium ${trace.color} px-2 py-0.5 rounded-md`}>
                            {trace.id}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}


              {/* Global Progress */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">ASVS Progress</h4>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700">Total Implementation</span>
                    <span className="text-xs font-bold text-blue-600">
                      {Math.round((reqs.filter(r => r.status === 'Implemented').length / Math.max(1, reqs.filter(r => r.status !== 'N/A').length)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden flex">
                    <div 
                      className="bg-green-500 h-full transition-all duration-500"
                      style={{ width: `${(reqs.filter(r => r.status === 'Implemented').length / Math.max(1, reqs.filter(r => r.status !== 'N/A').length)) * 100}%` }}
                    />
                    <div 
                      className="bg-orange-400 h-full transition-all duration-500"
                      style={{ width: `${(reqs.filter(r => r.status === 'Partial').length / Math.max(1, reqs.filter(r => r.status !== 'N/A').length)) * 100}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-slate-600">{reqs.filter(r => r.status === 'Implemented').length} Implemented</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                      <span className="text-slate-600">{reqs.filter(r => r.status === 'Partial').length} Partial</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-slate-600">{reqs.filter(r => r.status === 'Missing').length} Missing</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                      <span className="text-slate-600">{reqs.filter(r => r.status === 'N/A').length} N/A</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Architectural Assets List */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Related Assets</h4>
                <div className="bg-blue-50/50 border border-blue-100 rounded p-2 mb-3">
                  <p className="text-[10px] text-blue-800 leading-relaxed">
                    <strong>Component Traceability:</strong> Link ASVS controls to these architectural components using the 'Traceability' dropdown in the workspace rows.
                  </p>
                </div>
                <div className="space-y-2">
                  {componentMetrics.map((comp) => {
                    const Icon = COMPONENT_ICONS[comp.id] || Shield;
                    return (
                      <div key={comp.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm shrink-0">
                            <Icon size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700 leading-tight">{comp.id}</p>
                            <p className="text-[9px] text-slate-400 uppercase tracking-tight mt-0.5">Type: {comp.type}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            comp.count > 0 
                              ? comp.implementedCount === comp.count
                                ? "bg-green-50 text-green-700 border border-green-100"
                                : "bg-blue-50 text-blue-700 border border-blue-100" 
                              : "bg-slate-100 text-slate-400"
                          }`}>
                            {comp.count > 0 ? `${comp.implementedCount}/${comp.count} Secure` : "0 controls"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Activity Log (Audit Trail) */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Recent Activity</h4>
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
    </div>
  );
}
