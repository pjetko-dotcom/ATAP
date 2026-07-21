/**
 * Threat Register Module
 * Manages the identification, assessment, and mitigation tracking of application threats.
 * Utilizes the STRIDE framework and standard Risk Matrix.
 * 
 * @module ThreatRegister
 */
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Search, Plus, Filter, ShieldAlert, Edit2, Trash2, X, AlertTriangle, CheckCircle } from "lucide-react";
import { HelpTooltip } from "./HelpTooltip";

type ScaleLevel = "Very Low" | "Low" | "Medium" | "High" | "Very High";
type RiskLevel = "Very Low" | "Low" | "Medium" | "High" | "Critical";
type ThreatStatus = "Open" | "Mitigated" | "Remediated" | "Accepted";

interface Threat {
  id: string;
  title: string;
  description: string;
  stride: string;
  likelihood: ScaleLevel;
  impact: ScaleLevel;
  risk: RiskLevel;
  status: ThreatStatus;
  mitigation: string;
}

const initialThreats: Threat[] = [
  {
    id: "TR-001",
    title: "Session Hijacking via XSS",
    description: "An attacker could steal session cookies if XSS vulnerabilities exist in the user profile inputs.",
    stride: "Elevation of Privilege",
    likelihood: "Medium",
    impact: "High",
    risk: "High",
    status: "Open",
    mitigation: "V4.3.1 (HttpOnly cookies), V5.1.1 (Output encoding)"
  },
  {
    id: "TR-002",
    title: "Parameter Tampering on Checkout",
    description: "Manipulation of product prices during the checkout process via intercepting proxy.",
    stride: "Tampering",
    likelihood: "Medium",
    impact: "High",
    risk: "High",
    status: "Mitigated",
    mitigation: "V5.1.4 (Server-side validation)"
  },
  {
    id: "TR-003",
    title: "Brute Force of Admin Login",
    description: "Automated credential stuffing against the administrative portal.",
    stride: "Spoofing",
    likelihood: "Very High",
    impact: "High",
    risk: "Critical",
    status: "Open",
    mitigation: "V2.2.1 (Anti-automation), V2.3.1 (MFA)"
  },
  {
    id: "TR-004",
    title: "Information Disclosure via Stack Traces",
    description: "Unhandled exceptions leaking internal network paths and database versions.",
    stride: "Information Disclosure",
    likelihood: "Very Low",
    impact: "Low",
    risk: "Very Low",
    status: "Accepted",
    mitigation: "Risk accepted for internal dev environments. To be fixed in Prod."
  }
];

const riskStyles: Record<RiskLevel, string> = {
  "Very Low": "bg-slate-100 text-slate-700",
  "Low": "bg-blue-100 text-blue-700",
  "Medium": "bg-orange-100 text-orange-700",
  "High": "bg-red-100 text-red-700",
  "Critical": "bg-purple-100 text-purple-700"
};

const statusStyles: Record<ThreatStatus, string> = {
  Open: "bg-red-50 text-red-700 border-red-200",
  Mitigated: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Remediated: "bg-green-50 text-green-700 border-green-200",
  Accepted: "bg-slate-50 text-slate-600 border-slate-200"
};

// Standard 5x5 Risk Matrix Calculator
const calculateRisk = (likelihood: ScaleLevel, impact: ScaleLevel): RiskLevel => {
  const scores = { "Very Low": 1, "Low": 2, "Medium": 3, "High": 4, "Very High": 5 };
  const score = scores[likelihood] * scores[impact];
  
  if (score >= 16) return "Critical";
  if (score >= 10) return "High";
  if (score >= 5) return "Medium";
  if (score >= 3) return "Low";
  return "Very Low";
};

const RISK_CELL_STYLES: Record<RiskLevel, string> = {
  "Very Low": "bg-slate-100 text-slate-600 hover:bg-slate-200",
  "Low": "bg-blue-100 text-blue-700 hover:bg-blue-200",
  "Medium": "bg-orange-100 text-orange-700 hover:bg-orange-200",
  "High": "bg-red-100 text-red-700 hover:bg-red-200",
  "Critical": "bg-purple-100 text-purple-700 hover:bg-purple-200"
};

function RiskMatrix({ threats }: { threats: Threat[] }) {
  const levels: ScaleLevel[] = ["Very High", "High", "Medium", "Low", "Very Low"];
  const impacts: ScaleLevel[] = ["Very Low", "Low", "Medium", "High", "Very High"];

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center h-full min-w-[300px]">
      <h3 className="text-sm font-bold text-slate-800 mb-6 w-full text-center">Risk Matrix</h3>
      <div className="flex gap-1">
        {/* Y Axis Label */}
        <div className="flex flex-col items-center justify-center w-6 mr-1">
          <span className="text-xs font-semibold text-slate-500 -rotate-90 whitespace-nowrap">
            Likelihood
          </span>
        </div>
        <div className="flex flex-col justify-between items-end py-2 pr-2">
          <span className="text-[10px] font-semibold text-slate-400 leading-none">High</span>
          <span className="text-[10px] font-semibold text-slate-400 leading-none">Low</span>
        </div>
        
        {/* Matrix Grid */}
        <div className="flex flex-col">
          <div className="grid grid-cols-5 gap-1">
            {levels.map((likelihood) => (
              <React.Fragment key={likelihood}>
                {impacts.map((impact) => {
                  const riskLevel = calculateRisk(likelihood, impact);
                  const cellThreats = threats.filter(t => t.likelihood === likelihood && t.impact === impact && t.status !== "Accepted" && t.status !== "Mitigated" && t.status !== "Remediated");
                  const count = cellThreats.length;
                  
                  return (
                    <div 
                      key={`${likelihood}-${impact}`}
                      className={`w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-sm transition-colors cursor-help ${RISK_CELL_STYLES[riskLevel]} ${count > 0 ? 'ring-1 ring-slate-900/10 shadow-sm font-bold text-slate-900 scale-105' : 'opacity-50 hover:opacity-100'}`}
                      title={`Likelihood: ${likelihood}, Impact: ${impact} - ${count} Open Threats`}
                    >
                      {count > 0 ? count : ""}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          {/* X Axis Label */}
          <div className="flex justify-between items-center pt-3">
            <span className="text-[10px] font-semibold text-slate-400">Low</span>
            <span className="text-xs font-semibold text-slate-500">Impact</span>
            <span className="text-[10px] font-semibold text-slate-400">High</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThreatRegister() {
  const { id: analysisId } = useParams<{ id: string }>();
  const storageKey = `atap_threats_${analysisId || "default"}`;

  const [threats, setThreats] = useState<Threat[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return initialThreats;
      }
    }
    return initialThreats;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(threats));
  }, [threats, storageKey]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ThreatStatus | "All">("All");
  const [strideFilter, setStrideFilter] = useState<string | "All">("All");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "All">("All");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingThreat, setEditingThreat] = useState<Threat | null>(null);

  // Stats
  const totalOpen = threats.filter(t => t.status === "Open").length;
  const highCriticalOpen = threats.filter(t => t.status === "Open" && (t.risk === "High" || t.risk === "Critical")).length;
  const mitigated = threats.filter(t => t.status === "Mitigated").length;

  // Filtering
  const filteredThreats = threats.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || t.status === statusFilter;
    const matchesStride = strideFilter === "All" || t.stride === strideFilter;
    const matchesRisk = riskFilter === "All" || t.risk === riskFilter;
    return matchesSearch && matchesStatus && matchesStride && matchesRisk;
  });

  const handleDelete = (id: string) => {
    if(confirm("Are you sure you want to delete this threat?")) {
      setThreats(threats.filter(t => t.id !== id));
    }
  };

  const openAddModal = () => {
    setEditingThreat(null);
    setIsModalOpen(true);
  };

  const openEditModal = (threat: Threat) => {
    setEditingThreat(threat);
    setIsModalOpen(true);
  };

  const handleSaveThreat = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const likelihood = formData.get("likelihood") as ScaleLevel;
    const impact = formData.get("impact") as ScaleLevel;
    
    const newThreat: Threat = {
      id: editingThreat ? editingThreat.id : `TR-${String(threats.length + 1).padStart(3, '0')}`,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      stride: formData.get("stride") as string,
      likelihood,
      impact,
      risk: calculateRisk(likelihood, impact),
      status: formData.get("status") as ThreatStatus,
      mitigation: formData.get("mitigation") as string,
    };

    if (editingThreat) {
      setThreats(threats.map(t => t.id === editingThreat.id ? newThreat : t));
    } else {
      setThreats([...threats, newThreat]);
    }
    
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Top Section: Stats & Matrix */}
      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        {/* Stats */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{highCriticalOpen}</p>
              <p className="text-xs font-semibold uppercase text-slate-500">Critical/High Risks</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0">
              <ShieldAlert size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalOpen}</p>
              <p className="text-xs font-semibold uppercase text-slate-500">Total Open Threats</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{mitigated}</p>
              <p className="text-xs font-semibold uppercase text-slate-500">Mitigated Threats</p>
            </div>
          </div>
        </div>

        {/* Matrix */}
        <div className="shrink-0 flex justify-center">
          <RiskMatrix threats={threats} />
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3 flex-1 min-w-[300px]">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search threats by ID or title..." 
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <Filter size={16} className="text-slate-400" />
              <select 
                className="text-sm border-none bg-transparent focus:outline-none text-slate-600 font-medium"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ThreatStatus | "All")}
              >
                <option value="All">Status: All</option>
                <option value="Open">Open</option>
                <option value="Mitigated">Mitigated</option>
                <option value="Remediated">Remediated</option>
                <option value="Accepted">Accepted</option>
              </select>
            </div>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <select 
                className="text-sm border-none bg-transparent focus:outline-none text-slate-600 font-medium"
                value={strideFilter}
                onChange={(e) => setStrideFilter(e.target.value)}
              >
                <option value="All">STRIDE: All</option>
                <option value="Spoofing">Spoofing</option>
                <option value="Tampering">Tampering</option>
                <option value="Repudiation">Repudiation</option>
                <option value="Information Disclosure">Information Disclosure</option>
                <option value="Denial of Service">Denial of Service</option>
                <option value="Elevation of Privilege">Elevation of Privilege</option>
              </select>
            </div>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <select 
                className="text-sm border-none bg-transparent focus:outline-none text-slate-600 font-medium"
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value as RiskLevel | "All")}
              >
                <option value="All">Risk: All</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
                <option value="Very Low">Very Low</option>
              </select>
            </div>
          </div>
          
          <button 
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Add Threat
          </button>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 border-b border-slate-100 w-24">ID</th>
                <th className="px-6 py-3 border-b border-slate-100 min-w-[250px]">Threat Details</th>
                <th className="px-6 py-3 border-b border-slate-100 w-32">
                  <div className="flex items-center">
                    STRIDE <HelpTooltip text="Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, or Elevation of Privilege." position="bottom" />
                  </div>
                </th>
                <th className="px-6 py-3 border-b border-slate-100 w-32">
                  <div className="flex items-center">
                    Risk Level <HelpTooltip text="Calculated based on Likelihood and Impact." position="bottom" />
                  </div>
                </th>
                <th className="px-6 py-3 border-b border-slate-100 w-48">Mitigation (ASVS)</th>
                <th className="px-6 py-3 border-b border-slate-100 w-32">Status</th>
                <th className="px-6 py-3 border-b border-slate-100 w-20 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredThreats.map((threat) => (
                <tr key={threat.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 font-mono text-xs text-slate-400 font-medium">{threat.id}</td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800">{threat.title}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{threat.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-slate-600">{threat.stride}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full tracking-wide ${riskStyles[threat.risk]}`}>
                      {threat.risk}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-600 font-mono truncate max-w-[180px]" title={threat.mitigation}>
                      {threat.mitigation || "None assigned"}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded border ${statusStyles[threat.status]}`}>
                      {threat.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(threat)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(threat.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredThreats.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <ShieldAlert size={48} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm font-medium">No threats found.</p>
                    <p className="text-xs mt-1">Adjust your filters or add a new threat to get started.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                {editingThreat ? "Edit Threat" : "Log New Threat"}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="threat-form" onSubmit={handleSaveThreat} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Threat Title</label>
                  <input 
                    name="title"
                    type="text" 
                    required
                    defaultValue={editingThreat?.title}
                    placeholder="e.g. SQL Injection in Login form" 
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                  <textarea 
                    name="description"
                    required
                    defaultValue={editingThreat?.description}
                    placeholder="Describe how the threat is executed and its impact..." 
                    className="w-full h-24 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">STRIDE Category</label>
                    <select 
                      name="stride"
                      required
                      defaultValue={editingThreat?.stride || "Spoofing"}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm bg-white"
                    >
                      <option value="Spoofing">Spoofing</option>
                      <option value="Tampering">Tampering</option>
                      <option value="Repudiation">Repudiation</option>
                      <option value="Information Disclosure">Information Disclosure</option>
                      <option value="Denial of Service">Denial of Service</option>
                      <option value="Elevation of Privilege">Elevation of Privilege</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                    <select 
                      name="status"
                      required
                      defaultValue={editingThreat?.status || "Open"}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm bg-white"
                    >
                      <option value="Open">Open</option>
                      <option value="Mitigated">Mitigated</option>
                      <option value="Remediated">Remediated</option>
                      <option value="Accepted">Accepted</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Likelihood</label>
                    <select 
                      name="likelihood"
                      required
                      defaultValue={editingThreat?.likelihood || "Medium"}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm bg-white"
                    >
                      <option value="Very Low">Very Low</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Very High">Very High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Business Impact</label>
                    <select 
                      name="impact"
                      required
                      defaultValue={editingThreat?.impact || "Medium"}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm bg-white"
                    >
                      <option value="Very Low">Very Low</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Very High">Very High</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">Risk level will be automatically calculated based on Likelihood and Impact.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Linked Mitigation (ASVS Controls)</label>
                  <input 
                    name="mitigation"
                    type="text" 
                    defaultValue={editingThreat?.mitigation}
                    placeholder="e.g. V2.1.1, V5.3.2" 
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-mono"
                  />
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                form="threat-form"
                className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                {editingThreat ? "Save Changes" : "Log Threat"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
