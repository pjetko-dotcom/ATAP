/**
 * Threat Register Module
 * Manages the identification, assessment, and mitigation tracking of application threats.
 * Utilizes the STRIDE framework and standard Risk Matrix.
 * 
 * @module ThreatRegister
 */
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Search, Plus, Filter, ShieldAlert, Edit2, Trash2, X, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { HelpTooltip } from "./HelpTooltip";

type LikelihoodLevel = "Exceptionally" | "Unlikely" | "Probably" | "Frequently";
type ImpactLevel = "Minor" | "Moderate" | "Major" | "Critical";
type RiskLevel = "Very Low" | "Low" | "Medium" | "High" | "Critical";
type ThreatStatus = "Open" | "Mitigated" | "Remediated" | "Accepted";

interface Threat {
  id: string;
  title: string;
  description: string;
  stride: string;
  likelihood: LikelihoodLevel;
  impact: ImpactLevel;
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
    likelihood: "Probably",
    impact: "Major",
    risk: "High",
    status: "Open",
    mitigation: "V4.3.1 (HttpOnly cookies), V5.1.1 (Output encoding)"
  },
  {
    id: "TR-002",
    title: "Parameter Tampering on Checkout",
    description: "Manipulation of product prices during the checkout process via intercepting proxy.",
    stride: "Tampering",
    likelihood: "Probably",
    impact: "Major",
    risk: "High",
    status: "Mitigated",
    mitigation: "V5.1.4 (Server-side validation)"
  },
  {
    id: "TR-003",
    title: "Brute Force of Admin Login",
    description: "Automated credential stuffing against the administrative portal.",
    stride: "Spoofing",
    likelihood: "Frequently",
    impact: "Major",
    risk: "Critical",
    status: "Open",
    mitigation: "V2.2.1 (Anti-automation), V2.3.1 (MFA)"
  },
  {
    id: "TR-004",
    title: "Information Disclosure via Stack Traces",
    description: "Unhandled exceptions leaking internal network paths and database versions.",
    stride: "Information Disclosure",
    likelihood: "Exceptionally",
    impact: "Minor",
    risk: "Very Low",
    status: "Accepted",
    mitigation: "Risk accepted for internal dev environments. To be fixed in Prod."
  }
];

const riskStyles: Record<RiskLevel, string> = {
  "Very Low": "bg-green-50 text-green-700 border border-green-200",
  "Low": "bg-green-100 text-green-800 border border-green-300",
  "Medium": "bg-yellow-100 text-yellow-800 border border-yellow-300",
  "High": "bg-orange-100 text-orange-800 border border-orange-300",
  "Critical": "bg-red-100 text-red-800 border border-red-300"
};

const statusStyles: Record<ThreatStatus, string> = {
  Open: "bg-red-50 text-red-700 border-red-200",
  Mitigated: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Remediated: "bg-green-50 text-green-700 border-green-200",
  Accepted: "bg-slate-50 text-slate-600 border-slate-200"
};

// Standard 4x4 Risk Matrix Calculator
const calculateRisk = (likelihood: LikelihoodLevel, impact: ImpactLevel): RiskLevel => {
  const scoresLikelihood = { "Exceptionally": 1, "Unlikely": 2, "Probably": 3, "Frequently": 4 };
  const scoresImpact = { "Minor": 1, "Moderate": 2, "Major": 3, "Critical": 4 };
  const score = scoresLikelihood[likelihood] * scoresImpact[impact];
  
  if (score >= 12) return "Critical";
  if (score >= 8) return "High";
  if (score >= 4) return "Medium";
  if (score >= 2) return "Low";
  return "Very Low";
};

const RISK_CELL_STYLES: Record<RiskLevel, string> = {
  "Very Low": "bg-green-200 text-green-900 hover:bg-green-300",
  "Low": "bg-green-300 text-green-950 hover:bg-green-400",
  "Medium": "bg-yellow-200 text-yellow-950 hover:bg-yellow-300",
  "High": "bg-orange-300 text-orange-950 hover:bg-orange-400",
  "Critical": "bg-red-500 text-white hover:bg-red-600"
};

function RiskMatrix({ threats }: { threats: Threat[] }) {
  const levels: LikelihoodLevel[] = ["Frequently", "Probably", "Unlikely", "Exceptionally"];
  const impacts: ImpactLevel[] = ["Minor", "Moderate", "Major", "Critical"];

  return (
    <div className="bg-white rounded-xl flex flex-col items-center justify-center h-full w-full">
      <div className="flex gap-1.5">
        {/* Y Axis Label */}
        <div className="flex flex-col items-center justify-center w-6 mr-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider -rotate-90 whitespace-nowrap">
            Likelihood
          </span>
        </div>
        <div className="flex flex-col justify-between items-end py-2 pr-2 text-[10px] font-bold text-slate-400">
          <span>Freq</span>
          <span>Prob</span>
          <span>Unlk</span>
          <span>Excp</span>
        </div>
        
        {/* Matrix Grid */}
        <div className="flex flex-col">
          <div className="grid grid-cols-4 gap-1.5">
            {levels.map((likelihood) => (
              <React.Fragment key={likelihood}>
                {impacts.map((impact) => {
                  const riskLevel = calculateRisk(likelihood, impact);
                  const cellThreats = threats.filter(t => t.likelihood === likelihood && t.impact === impact && t.status !== "Accepted" && t.status !== "Mitigated" && t.status !== "Remediated");
                  const count = cellThreats.length;
                  
                  return (
                    <div 
                      key={`${likelihood}-${impact}`}
                      className={`w-9 h-9 md:w-11 md:h-11 flex flex-col items-center justify-center rounded transition-all cursor-help ${RISK_CELL_STYLES[riskLevel]} ${count > 0 ? 'ring-2 ring-slate-900/30 shadow-md font-extrabold scale-105 z-10' : 'opacity-60 hover:opacity-100'}`}
                      title={`Likelihood: ${likelihood}\nImpact: ${impact}\nRisk: ${riskLevel}\n${count} Open Threats`}
                    >
                      <span className="text-xs">{count > 0 ? count : ""}</span>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          {/* X Axis Label */}
          <div className="flex justify-between items-center pt-3 text-[10px] font-bold text-slate-400">
            <span>Minor</span>
            <span>Mod</span>
            <span>Maj</span>
            <span>Crit</span>
          </div>
          <div className="text-center pt-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Business Impact
          </div>
        </div>
      </div>
    </div>
  );
}

function EvaluationCriteriaGuide() {
  const [activeTab, setActiveTab] = useState<"impact" | "likelihood">("impact");
  const [expandedCriteria, setExpandedCriteria] = useState<string | null>("Critical");

  const toggleCriteria = (id: string) => {
    setExpandedCriteria(expandedCriteria === id ? null : id);
  };

  const impactDetails = [
    {
      grade: "Critical",
      color: "border-red-200 bg-red-50 text-red-900",
      pill: "bg-red-500 text-white",
      quant: "Exceeds 100 mil. EUR",
      qual: "The consequences of the risk may jeopardize the existence of the institution and consequently affect the entire group.",
      reputational: "Permanent negative media reports (including social media) for more than 20 days and/or dramatic reduction of counterpart confidence.",
      compliance: [
        "Potential withdrawal of a license as a regular sanction",
        "Criminal sanctions against companies / employees with an international dimension",
        "Massive loss of client confidence",
        "Recurrence factor: Standard would be high risk, but since the entity had a similar problem in the past, the impact is elevated to Critical."
      ]
    },
    {
      grade: "Major",
      color: "border-orange-200 bg-orange-50 text-orange-900",
      pill: "bg-orange-400 text-slate-900",
      quant: "≥ 10 mil. EUR and < 100 mil. EUR",
      qual: "The consequences of the risk may jeopardize the achievement of the objectives of the entire institution.",
      reputational: "Permanent negative media reports (including social media) for more than 7 days and/or significant decrease in counterpart trust.",
      compliance: [
        "Infringement of the law with criminal sanctions",
        "Criminal offense of a company or manager / employee",
        "Possible limitation of the bank license",
        "High fine on the controller side",
        "Loss of client confidence on a large scale"
      ]
    },
    {
      grade: "Moderate",
      color: "border-yellow-200 bg-yellow-50 text-yellow-900",
      pill: "bg-yellow-300 text-yellow-900",
      quant: "≥ 1 mil. EUR and < 10 mil. EUR",
      qual: "The consequences of the risk may jeopardize the achievement of the objectives of the process. This may result in financial or reputational impact relevant to the process.",
      reputational: "Permanent negative media reports (including social media) for more than 2 days and/or slightly reducing counterpart confidence.",
      compliance: [
        "Infringement of the Civil Penalty Act",
        "The threat of withdrawal of a bank license is only potential",
        "The regulator's penalties correspond to a qualitative financial impact",
        "Loss of low-trust clients"
      ]
    },
    {
      grade: "Minor",
      color: "border-green-200 bg-green-50 text-green-900",
      pill: "bg-green-200 text-green-900",
      quant: "Less than 1 mil. EUR",
      qual: "The consequences of the risk may jeopardize the achievement of the objectives of the process. The financial or reputational impact is manageable.",
      reputational: "Permanent negative media reports (including social media) for less than 2 days and/or minimal decrease of counterpart trust.",
      compliance: [
        "Standard requirements are not strictly adhered to, but standard practice is applied and tolerated by the regulator.",
        "The regulator's penalties correspond to a qualitative financial impact",
        "No impact on client trust"
      ]
    }
  ];

  const likelihoodDetails = [
    {
      grade: "Frequently",
      color: "border-red-200 bg-red-50 text-red-900",
      pill: "bg-red-500 text-white",
      freq: "> 0.5 expected frequency / year",
      desc: "It may occur more than once every 2 years. Probability of occurrence for 1 year is greater than 50%."
    },
    {
      grade: "Probably",
      color: "border-orange-200 bg-orange-50 text-orange-900",
      pill: "bg-orange-400 text-slate-900",
      freq: "Between 0.2 and 0.5 expected frequency / year",
      desc: "It may occur once every 2 - 5 years. Probability of occurrence for 1 year is between 20% and 50%."
    },
    {
      grade: "Unlikely",
      color: "border-yellow-200 bg-yellow-50 text-yellow-900",
      pill: "bg-yellow-300 text-yellow-900",
      freq: "Between 0.04 and 0.2 expected frequency / year",
      desc: "It may occur once every 5 - 25 years. Probability of occurrence in 1 year is between 4% and 20%."
    },
    {
      grade: "Exceptionally",
      color: "border-green-200 bg-green-50 text-green-900",
      pill: "bg-green-200 text-green-900",
      freq: "< 0.04 expected frequency / year",
      desc: "It may occur less than once every 25 years. Probability of occurrence in 1 year is less than 4%."
    }
  ];

  return (
    <div className="flex flex-col h-full min-h-[240px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-2 mb-3 gap-2 flex-shrink-0">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Evaluation Reference Manual</h3>
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => { setActiveTab("impact"); setExpandedCriteria("Critical"); }}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${activeTab === "impact" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            Impact
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("likelihood"); setExpandedCriteria("Frequently"); }}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${activeTab === "likelihood" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            Likelihood
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[175px] space-y-2 pr-1">
        {activeTab === "impact" ? (
          impactDetails.map((imp) => {
            const isExpanded = expandedCriteria === imp.grade;
            return (
              <div key={imp.grade} className={`border rounded-lg transition-all overflow-hidden ${imp.color}`}>
                <button
                  type="button"
                  onClick={() => toggleCriteria(imp.grade)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:opacity-90 transition-opacity font-bold text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${imp.pill}`}>
                      {imp.grade}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      {imp.quant}
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-slate-200/50 space-y-2 text-[11px] bg-white/50">
                    <div>
                      <span className="font-bold block text-[9px] uppercase text-slate-400 tracking-wider">Qualitative Financial Impact</span>
                      <p className="mt-0.5 text-slate-700 leading-relaxed font-medium">{imp.qual}</p>
                    </div>
                    <div>
                      <span className="font-bold block text-[9px] uppercase text-slate-400 tracking-wider">Reputational Impact</span>
                      <p className="mt-0.5 text-slate-700 leading-relaxed font-medium">{imp.reputational}</p>
                    </div>
                    <div>
                      <span className="font-bold block text-[9px] uppercase text-slate-400 tracking-wider">Impact on Compliance</span>
                      <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-700 font-medium">
                        {imp.compliance.map((item, i) => (
                          <li key={i} className="leading-relaxed">{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          likelihoodDetails.map((lh) => {
            const isExpanded = expandedCriteria === lh.grade;
            return (
              <div key={lh.grade} className={`border rounded-lg transition-all overflow-hidden ${lh.color}`}>
                <button
                  type="button"
                  onClick={() => toggleCriteria(lh.grade)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:opacity-90 transition-opacity font-bold text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${lh.pill}`}>
                      {lh.grade}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      {lh.freq}
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1.5 border-t border-slate-200/50 text-[11px] bg-white/50 space-y-1">
                    <span className="font-bold block text-[9px] uppercase text-slate-400 tracking-wider">Probability & Period</span>
                    <p className="text-slate-700 leading-relaxed font-medium">{lh.desc}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
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

  // Collapsible State for Stats & Risk Matrix
  const [isSummaryExpanded, setIsSummaryExpanded] = useState<boolean>(() => {
    const saved = localStorage.getItem("atap_threats_summary_expanded");
    return saved !== "false";
  });

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
    
    const likelihood = formData.get("likelihood") as LikelihoodLevel;
    const impact = formData.get("impact") as ImpactLevel;
    
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
      {/* Overview Toggle Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm mb-4 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <ShieldAlert className="text-blue-600" size={18} />
          <h2 className="text-sm font-bold text-slate-800">Threat Landscape & Risk Matrix</h2>
          <span className="text-xs text-slate-400 font-medium hidden md:inline-block">• {threats.length} logged, {totalOpen} open</span>
        </div>
        <button
          onClick={() => {
            const next = !isSummaryExpanded;
            setIsSummaryExpanded(next);
            localStorage.setItem("atap_threats_summary_expanded", String(next));
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
        >
          {isSummaryExpanded ? (
            <>
              <ChevronUp size={14} />
              <span>Hide Dashboard & Matrix</span>
            </>
          ) : (
            <>
              <ChevronDown size={14} />
              <span>Show Dashboard & Matrix</span>
            </>
          )}
        </button>
      </div>

      {/* Top Section: Stats & Matrix & Guide */}
      {isSummaryExpanded && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6 flex-shrink-0">
          {/* Left Column: Stats & Matrix */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

            {/* Matrix Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center min-h-[220px]">
              <RiskMatrix threats={threats} />
            </div>
          </div>

          {/* Right Column: Evaluation Help Guide */}
          <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <EvaluationCriteriaGuide />
          </div>
        </div>
      )}

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
                      defaultValue={editingThreat?.likelihood || "Probably"}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm bg-white"
                    >
                      <option value="Exceptionally">Exceptionally (&lt; 0.04)</option>
                      <option value="Unlikely">Unlikely (0.04 - 0.2)</option>
                      <option value="Probably">Probably (0.2 - 0.5)</option>
                      <option value="Frequently">Frequently (&gt; 0.5)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Business Impact</label>
                    <select 
                      name="impact"
                      required
                      defaultValue={editingThreat?.impact || "Moderate"}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm bg-white"
                    >
                      <option value="Minor">Minor (&lt; 1M EUR)</option>
                      <option value="Moderate">Moderate (1M - 10M EUR)</option>
                      <option value="Major">Major (10M - 100M EUR)</option>
                      <option value="Critical">Critical (&gt; 100M EUR)</option>
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
