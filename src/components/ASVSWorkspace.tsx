/**
 * ASVS Workspace Module
 * Handles the display, filtering, and management of ASVS (Application Security Verification Standard) requirements.
 * 
 * @module ASVSWorkspace
 */
import { useState } from "react";
import { ChevronDown, ChevronRight, Download, Settings } from "lucide-react";

/**
 * Mock data representing a subset of ASVS V4 access control requirements.
 * In a production environment, this data would be fetched from a backend API or database.
 * 
 * @type {Array<Object>}
 */
const initialRequirements = [
  {
    id: "V4.1.1",
    title: "Verify that the principle of least privilege exists...",
    description: "Users should only have permissions required for their role.",
    level: 1,
    status: "Implemented",
    traceability: [
      { id: "C-102", color: "bg-slate-100" }
    ],
    notes: ""
  },
  {
    id: "V4.1.2",
    title: "Verify that access control is enforced on a trusted system...",
    description: "Server-side validation of authorization logic.",
    level: 2,
    status: "Partial",
    traceability: [
      { id: "T-04", color: "bg-red-100 text-red-700" },
      { id: "C-205", color: "bg-slate-100" }
    ],
    notes: "Review AuthN middleware logic to fix the gap."
  },
  {
    id: "V4.1.3",
    title: "Verify that all API endpoints have appropriate authorization...",
    description: "",
    level: 2,
    status: "Missing",
    traceability: [
      { id: "F-09", color: "bg-red-100 text-red-700 uppercase font-bold" }
    ],
    notes: ""
  },
  {
    id: "V4.1.4",
    title: "Verify administrative interfaces are properly isolated...",
    description: "",
    level: 3,
    status: "N/A",
    traceability: [
      { id: "No Admin UI", color: "bg-transparent text-slate-400 italic" }
    ],
    notes: "No administrative interfaces exist within this bounded context."
  }
];

const statusStyles: Record<string, string> = {
  "Implemented": "bg-green-100 text-green-700",
  "Partial": "bg-orange-100 text-orange-700",
  "Missing": "bg-red-100 text-red-700",
  "N/A": "bg-slate-100 text-slate-500",
};

/**
 * ASVS Workspace Component.
 * Displays progress statistics, a search bar, a level filter, and a data table for ASVS requirements.
 * Allows analysts to track the status and traceability of security controls.
 * 
 * @returns {JSX.Element} The rendered ASVS workspace component.
 */
export function ASVSWorkspace() {
  const [reqs, setReqs] = useState(initialRequirements);
  const [searchQuery, setSearchQuery] = useState("");
  const [targetLevel, setTargetLevel] = useState<number | "all">(2);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 1. Dynamic Filtering
  const filteredRequirements = reqs.filter(req => {
    const matchesSearch = 
      req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.description.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesLevel = targetLevel === "all" || req.level <= targetLevel;
    
    return matchesSearch && matchesLevel;
  });

  // 1. Dynamic Progress Stats Computation
  const totalRelevant = filteredRequirements.filter(r => r.status !== "N/A").length;
  const implementedCount = filteredRequirements.filter(r => r.status === "Implemented").length;
  const coverage = totalRelevant > 0 ? Math.round((implementedCount / totalRelevant) * 100) : 0;
  const findingsCount = filteredRequirements.filter(r => r.status === "Missing" || r.status === "Partial").length;
  const notRelevantCount = filteredRequirements.filter(r => r.status === "N/A").length;

  // Row Expand Handler (4. Expandable Details)
  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  // Status/Note Updaters (2. Interactive Status)
  const updateStatus = (id: string, status: string) => {
    setReqs(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const updateNote = (id: string, notes: string) => {
    setReqs(prev => prev.map(r => r.id === id ? { ...r, notes } : r));
  };

  const handleBulkStatus = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value;
    if (!status) return;
    setReqs(prev => prev.map(r => selectedIds.has(r.id) ? { ...r, status } : r));
    setSelectedIds(new Set()); // Clear selection
    e.target.value = ""; // Reset dropdown
  };

  // 5. CSV Export Handler
  const handleExport = () => {
    const header = "ID,Requirement,Status,Notes\n";
    const csv = filteredRequirements.map(r => `"${r.id}","${r.title}","${r.status}","${(r.notes || '').replace(/"/g, '""')}"`).join("\n");
    const blob = new Blob([header + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asvs_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Dynamic Progress Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-bold mb-1">Coverage</p>
          <p className="text-2xl font-bold text-slate-800">{coverage}%</p>
          <div className="w-full bg-slate-100 h-1.5 mt-2 rounded-full">
            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${coverage}%` }}></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-bold mb-1">Findings</p>
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
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {/* Table Actions Toolbar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-slate-700 text-sm hidden sm:block">V4: Access Control Verification</h3>
            
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

          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Search requirement..." 
              className="px-3 py-1 text-xs border border-slate-200 rounded w-48"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
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
        <div className="overflow-auto">
          <table className="w-full text-left border-collapse">
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
                <th className="px-2 py-3 border-b border-slate-100 w-20">ID</th>
                <th className="px-6 py-3 border-b border-slate-100">Requirement</th>
                <th className="px-6 py-3 border-b border-slate-100 w-40">Status</th>
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
                      <td className="px-6 py-4">
                        {/* 2. Interactive Status Badges (Inline Select) */}
                        <div className="relative">
                          <select 
                            value={req.status}
                            onChange={(e) => updateStatus(req.id, e.target.value)}
                            className={`appearance-none pl-3 pr-6 py-1 ${statusStyles[req.status] || 'bg-slate-100 text-slate-700'} text-[10px] font-bold rounded-full uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer`}
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
                          {req.traceability.map((trace, i) => (
                            <span key={i} className={`text-[9px] ${trace.color} px-1.5 py-0.5 rounded`}>{trace.id}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                    
                    {/* 4. Expandable Rows for Evidence/Notes */}
                    {isExpanded && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={6} className="px-16 py-4 border-b border-slate-100">
                          <div className="flex gap-6">
                            <div className="flex-1">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Analysis Notes & Evidence</label>
                              <textarea 
                                value={req.notes}
                                onChange={(e) => updateNote(req.id, e.target.value)}
                                placeholder="Add justification, evidence links, or implementation details..."
                                className="w-full h-24 px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white resize-none"
                              />
                            </div>
                            <div className="w-64 pt-6">
                              <div className="p-3 bg-white border border-slate-200 rounded-md shadow-sm">
                                <h4 className="text-xs font-bold text-slate-700 mb-2">Linked Artifacts</h4>
                                <button className="w-full py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors">
                                  + Link JIRA Ticket
                                </button>
                                <button className="w-full py-1.5 mt-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors">
                                  + Upload Evidence
                                </button>
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
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 text-sm">
                    No requirements found matching "{searchQuery}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

