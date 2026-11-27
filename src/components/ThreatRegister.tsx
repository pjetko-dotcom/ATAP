/**
 * Threat Register Module
 * Manages the identification, assessment, and mitigation tracking of application threats.
 * Utilizes the STRIDE framework and standard Risk Matrix.
 * 
 * @module ThreatRegister
 */
import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Search, Plus, Filter, ShieldAlert, Edit2, Trash2, X, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Link2 } from "lucide-react";
import { HelpTooltip } from "./HelpTooltip";
import { asvsRequirements } from "../data/asvsData";
import { suggestThreatAsvsRequirements } from "../utils/threatAsvs";
import {
  calculateThreatRisk as calculateRisk,
  getNextThreatId,
  getInitialThreatsForAnalysis,
  summarizeThreats,
  type ImpactLevel,
  type LikelihoodLevel,
  type RiskLevel,
  type Threat,
  type ThreatStatus
} from "../utils/threatModel";
import { safeSetItem, writeJson } from "../utils/storage";
import { useLanguage } from "../context/LanguageContext";
import type { ReportLanguage } from "../utils/reportLanguage";

const slovakThreatLabels: Record<string, string> = {
  "Open": "Otvorená", "Mitigated": "Zmiernená", "Remediated": "Odstránená", "Accepted": "Akceptovaná",
  "Very Low": "Veľmi nízke", "Low": "Nízke", "Medium": "Stredné", "High": "Vysoké", "Critical": "Kritické",
  "Minor": "Malý", "Moderate": "Stredný", "Major": "Významný",
  "Frequently": "Často", "Probably": "Pravdepodobne", "Unlikely": "Nepravdepodobne", "Exceptionally": "Výnimočne",
  "Spoofing": "Podvrhnutie identity", "Tampering": "Manipulácia", "Repudiation": "Popretie",
  "Information Disclosure": "Prezradenie informácií", "Denial of Service": "Odmietnutie služby", "Elevation of Privilege": "Zvýšenie oprávnení",
};

function threatLabel(value: string, language: ReportLanguage): string {
  return language === "sk" ? slovakThreatLabels[value] || value : value;
}

function getThreatAsvsReferences(threat: Threat): string[] {
  const references = threat.asvsRefs || (threat.mitigation.match(/V\d+(?:\.\d+)*/g) || []);
  return Array.from(new Set(references)).filter(id => asvsRequirements.some(requirement => requirement.id === id));
}

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

const RISK_CELL_STYLES: Record<RiskLevel, string> = {
  "Very Low": "bg-green-200 text-green-900 hover:bg-green-300",
  "Low": "bg-green-300 text-green-950 hover:bg-green-400",
  "Medium": "bg-yellow-200 text-yellow-950 hover:bg-yellow-300",
  "High": "bg-orange-300 text-orange-950 hover:bg-orange-400",
  "Critical": "bg-red-500 text-white hover:bg-red-600"
};

function RiskMatrix({ threats }: { threats: Threat[] }) {
  const { language, t } = useLanguage();
  const levels: LikelihoodLevel[] = ["Frequently", "Probably", "Unlikely", "Exceptionally"];
  const impacts: ImpactLevel[] = ["Minor", "Moderate", "Major", "Critical"];

  return (
    <div className="bg-white rounded-xl flex flex-col items-center justify-center h-full w-full">
      <div className="flex gap-1.5">
        {/* Y Axis Label */}
        <div className="flex flex-col items-center justify-center w-6 mr-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider -rotate-90 whitespace-nowrap">
            {t("Pravdepodobnosť", "Likelihood")}
          </span>
        </div>
        <div className="flex flex-col justify-between items-end py-2 pr-2 text-[10px] font-bold text-slate-400">
          <span>{t("Často", "Freq")}</span>
          <span>{t("Pravd.", "Prob")}</span>
          <span>{t("Nepravd.", "Unlk")}</span>
          <span>{t("Výn.", "Excp")}</span>
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
                      title={`${t("Pravdepodobnosť", "Likelihood")}: ${threatLabel(likelihood, language)}\n${t("Dopad", "Impact")}: ${threatLabel(impact, language)}\n${t("Riziko", "Risk")}: ${threatLabel(riskLevel, language)}\n${count} ${t("otvorených hrozieb", "Open Threats")}`}
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
            <span>{t("Malý", "Minor")}</span>
            <span>{t("Str.", "Mod")}</span>
            <span>{t("Význ.", "Maj")}</span>
            <span>{t("Krit.", "Crit")}</span>
          </div>
          <div className="text-center pt-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t("Obchodný dopad", "Business Impact")}
          </div>
        </div>
      </div>
    </div>
  );
}

function EvaluationCriteriaGuide() {
  const { language, t } = useLanguage();
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
      quant: t("Viac ako 100 mil. EUR", "Exceeds 100 mil. EUR"),
      qual: t("Následky rizika môžu ohroziť existenciu inštitúcie a následne ovplyvniť celú skupinu.", "The consequences of the risk may jeopardize the existence of the institution and consequently affect the entire group."),
      reputational: t("Trvalé negatívne mediálne správy vrátane sociálnych médií viac ako 20 dní a/alebo dramatický pokles dôvery protistrán.", "Permanent negative media reports (including social media) for more than 20 days and/or dramatic reduction of counterpart confidence."),
      compliance: [
        t("Možné odobratie licencie ako bežná sankcia", "Potential withdrawal of a license as a regular sanction"),
        t("Trestné sankcie voči spoločnostiam alebo zamestnancom s medzinárodným dosahom", "Criminal sanctions against companies / employees with an international dimension"),
        t("Masívna strata dôvery klientov", "Massive loss of client confidence"),
        t("Opakovaný výskyt: bežne by šlo o vysoké riziko, ale pre podobný problém v minulosti sa dopad zvyšuje na kritický.", "Recurrence factor: Standard would be high risk, but since the entity had a similar problem in the past, the impact is elevated to Critical.")
      ]
    },
    {
      grade: "Major",
      color: "border-orange-200 bg-orange-50 text-orange-900",
      pill: "bg-orange-400 text-slate-900",
      quant: "≥ 10 mil. EUR and < 100 mil. EUR",
      qual: t("Následky rizika môžu ohroziť dosiahnutie cieľov celej inštitúcie.", "The consequences of the risk may jeopardize the achievement of the objectives of the entire institution."),
      reputational: t("Trvalé negatívne mediálne správy vrátane sociálnych médií viac ako 7 dní a/alebo významný pokles dôvery protistrán.", "Permanent negative media reports (including social media) for more than 7 days and/or significant decrease in counterpart trust."),
      compliance: [
        t("Porušenie zákona s trestnými sankciami", "Infringement of the law with criminal sanctions"),
        t("Trestný čin spoločnosti, manažéra alebo zamestnanca", "Criminal offense of a company or manager / employee"),
        t("Možné obmedzenie bankovej licencie", "Possible limitation of the bank license"),
        t("Vysoká pokuta na strane prevádzkovateľa", "High fine on the controller side"),
        t("Rozsiahla strata dôvery klientov", "Loss of client confidence on a large scale")
      ]
    },
    {
      grade: "Moderate",
      color: "border-yellow-200 bg-yellow-50 text-yellow-900",
      pill: "bg-yellow-300 text-yellow-900",
      quant: "≥ 1 mil. EUR and < 10 mil. EUR",
      qual: t("Následky rizika môžu ohroziť dosiahnutie cieľov procesu a viesť k finančnému alebo reputačnému dopadu na proces.", "The consequences of the risk may jeopardize the achievement of the objectives of the process. This may result in financial or reputational impact relevant to the process."),
      reputational: t("Trvalé negatívne mediálne správy vrátane sociálnych médií viac ako 2 dni a/alebo mierny pokles dôvery protistrán.", "Permanent negative media reports (including social media) for more than 2 days and/or slightly reducing counterpart confidence."),
      compliance: [
        t("Porušenie zákona s občianskoprávnou sankciou", "Infringement of the Civil Penalty Act"),
        t("Hrozba odobratia bankovej licencie je iba potenciálna", "The threat of withdrawal of a bank license is only potential"),
        t("Sankcie regulátora zodpovedajú kvalitatívnemu finančnému dopadu", "The regulator's penalties correspond to a qualitative financial impact"),
        t("Strata klientov s nízkou dôverou", "Loss of low-trust clients")
      ]
    },
    {
      grade: "Minor",
      color: "border-green-200 bg-green-50 text-green-900",
      pill: "bg-green-200 text-green-900",
      quant: t("Menej ako 1 mil. EUR", "Less than 1 mil. EUR"),
      qual: t("Následky rizika môžu ohroziť dosiahnutie cieľov procesu. Finančný alebo reputačný dopad je zvládnuteľný.", "The consequences of the risk may jeopardize the achievement of the objectives of the process. The financial or reputational impact is manageable."),
      reputational: t("Trvalé negatívne mediálne správy vrátane sociálnych médií menej ako 2 dni a/alebo minimálny pokles dôvery protistrán.", "Permanent negative media reports (including social media) for less than 2 days and/or minimal decrease of counterpart trust."),
      compliance: [
        t("Štandardné požiadavky nie sú striktne dodržané, ale používa sa bežná prax tolerovaná regulátorom.", "Standard requirements are not strictly adhered to, but standard practice is applied and tolerated by the regulator."),
        t("Sankcie regulátora zodpovedajú kvalitatívnemu finančnému dopadu", "The regulator's penalties correspond to a qualitative financial impact"),
        t("Bez dopadu na dôveru klientov", "No impact on client trust")
      ]
    }
  ];

  const likelihoodDetails = [
    {
      grade: "Frequently",
      color: "border-red-200 bg-red-50 text-red-900",
      pill: "bg-red-500 text-white",
      freq: t("> 0,5 očakávaná frekvencia / rok", "> 0.5 expected frequency / year"),
      desc: t("Môže nastať viac než raz za 2 roky. Pravdepodobnosť výskytu za rok je viac ako 50 %.", "It may occur more than once every 2 years. Probability of occurrence for 1 year is greater than 50%.")
    },
    {
      grade: "Probably",
      color: "border-orange-200 bg-orange-50 text-orange-900",
      pill: "bg-orange-400 text-slate-900",
      freq: t("Očakávaná frekvencia 0,2 až 0,5 / rok", "Between 0.2 and 0.5 expected frequency / year"),
      desc: t("Môže nastať raz za 2 až 5 rokov. Pravdepodobnosť výskytu za rok je 20 až 50 %.", "It may occur once every 2 - 5 years. Probability of occurrence for 1 year is between 20% and 50%.")
    },
    {
      grade: "Unlikely",
      color: "border-yellow-200 bg-yellow-50 text-yellow-900",
      pill: "bg-yellow-300 text-yellow-900",
      freq: t("Očakávaná frekvencia 0,04 až 0,2 / rok", "Between 0.04 and 0.2 expected frequency / year"),
      desc: t("Môže nastať raz za 5 až 25 rokov. Pravdepodobnosť výskytu za rok je 4 až 20 %.", "It may occur once every 5 - 25 years. Probability of occurrence in 1 year is between 4% and 20%.")
    },
    {
      grade: "Exceptionally",
      color: "border-green-200 bg-green-50 text-green-900",
      pill: "bg-green-200 text-green-900",
      freq: t("< 0,04 očakávaná frekvencia / rok", "< 0.04 expected frequency / year"),
      desc: t("Môže nastať menej než raz za 25 rokov. Pravdepodobnosť výskytu za rok je menej ako 4 %.", "It may occur less than once every 25 years. Probability of occurrence in 1 year is less than 4%.")
    }
  ];

  return (
    <div className="flex flex-col h-full min-h-[240px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-2 mb-3 gap-2 flex-shrink-0">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{t("Referenčná príručka hodnotenia", "Evaluation Reference Manual")}</h3>
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => { setActiveTab("impact"); setExpandedCriteria("Critical"); }}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${activeTab === "impact" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            {t("Dopad", "Impact")}
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("likelihood"); setExpandedCriteria("Frequently"); }}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${activeTab === "likelihood" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            {t("Pravdepodobnosť", "Likelihood")}
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
                      {threatLabel(imp.grade, language)}
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
                      <span className="font-bold block text-[9px] uppercase text-slate-400 tracking-wider">{t("Kvalitatívny finančný dopad", "Qualitative Financial Impact")}</span>
                      <p className="mt-0.5 text-slate-700 leading-relaxed font-medium">{imp.qual}</p>
                    </div>
                    <div>
                      <span className="font-bold block text-[9px] uppercase text-slate-400 tracking-wider">{t("Dopad na reputáciu", "Reputational Impact")}</span>
                      <p className="mt-0.5 text-slate-700 leading-relaxed font-medium">{imp.reputational}</p>
                    </div>
                    <div>
                      <span className="font-bold block text-[9px] uppercase text-slate-400 tracking-wider">{t("Dopad na súlad", "Impact on Compliance")}</span>
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
                      {threatLabel(lh.grade, language)}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      {lh.freq}
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1.5 border-t border-slate-200/50 text-[11px] bg-white/50 space-y-1">
                    <span className="font-bold block text-[9px] uppercase text-slate-400 tracking-wider">{t("Pravdepodobnosť a obdobie", "Probability & Period")}</span>
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
  const { language, t } = useLanguage();
  const { id: analysisId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const requestedThreat = searchParams.get("search");
  const storageKey = `atap_threats_${analysisId || "default"}`;
  const [availableComponents] = useState<Array<{ id: string; name: string }>>(() => {
    try {
      const saved = localStorage.getItem(`atap_architecture_${analysisId || "default"}`);
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed?.components)
        ? parsed.components.filter((component: unknown): component is { id: string; name: string } =>
            !!component && typeof component === "object" &&
            typeof (component as { id?: unknown }).id === "string" &&
            typeof (component as { name?: unknown }).name === "string"
          )
        : [];
    } catch (error) {
      console.error("Failed to load architecture components for threat links", error);
      return [];
    }
  });

  const [threats, setThreats] = useState<Threat[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error("Failed to load threat register", error);
        return [];
      }
    }
    return getInitialThreatsForAnalysis(analysisId);
  });

  useEffect(() => {
    writeJson(storageKey, threats);
  }, [threats, storageKey]);

  const [searchQuery, setSearchQuery] = useState(requestedThreat || "");
  const [statusFilter, setStatusFilter] = useState<ThreatStatus | "All">("All");
  const [strideFilter, setStrideFilter] = useState<string | "All">("All");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "All">("All");
  const [unreviewedOnly, setUnreviewedOnly] = useState(false);
  const [selectedThreatIds, setSelectedThreatIds] = useState<string[]>([]);

  useEffect(() => {
    if (requestedThreat) setSearchQuery(requestedThreat);
  }, [requestedThreat]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingThreat, setEditingThreat] = useState<Threat | null>(null);
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>([]);
  const [asvsReferenceText, setAsvsReferenceText] = useState("");
  const [hasManualAsvsRefs, setHasManualAsvsRefs] = useState(false);
  const [threatTitle, setThreatTitle] = useState("");
  const [threatDescription, setThreatDescription] = useState("");
  const [threatStride, setThreatStride] = useState("Spoofing");
  const [threatLikelihood, setThreatLikelihood] = useState<LikelihoodLevel>("Probably");
  const [threatImpact, setThreatImpact] = useState<ImpactLevel>("Moderate");
  const suggestedAsvsRequirements = useMemo(
    () => suggestThreatAsvsRequirements(threatStride, threatTitle, threatDescription),
    [threatStride, threatTitle, threatDescription]
  );
  const enteredAsvsRefs = Array.from(new Set(asvsReferenceText.match(/V\d+(?:\.\d+)*/g) || []));
  const invalidAsvsRefs = enteredAsvsRefs.filter(id => !asvsRequirements.some(requirement => requirement.id === id));

  useEffect(() => {
    if (isModalOpen && !hasManualAsvsRefs) {
      setAsvsReferenceText(suggestedAsvsRequirements.map(requirement => requirement.id).join(", "));
    }
  }, [hasManualAsvsRefs, isModalOpen, suggestedAsvsRequirements]);

  // Collapsible State for Stats & Risk Matrix
  const [isSummaryExpanded, setIsSummaryExpanded] = useState<boolean>(() => {
    const saved = localStorage.getItem("atap_threats_summary_expanded");
    return saved !== "false";
  });

  // Stats
  const threatSummary = summarizeThreats(threats);

  // Filtering
  const filteredThreats = threats.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || t.status === statusFilter;
    const matchesStride = strideFilter === "All" || t.stride === strideFilter;
    const matchesRisk = riskFilter === "All" || t.risk === riskFilter;
    const matchesReview = !unreviewedOnly || (t.architectureFlowId && !t.architectureReviewed);
    return matchesSearch && matchesStatus && matchesStride && matchesRisk && matchesReview;
  });

  const handleDelete = (id: string) => {
    if(confirm(t("Naozaj chcete odstrániť túto hrozbu?", "Are you sure you want to delete this threat?"))) {
      setThreats(threats.filter(t => t.id !== id));
    }
  };

  const openAddModal = () => {
    setEditingThreat(null);
    setSelectedComponentIds([]);
    setThreatTitle("");
    setThreatDescription("");
    setThreatStride("Spoofing");
    setThreatLikelihood("Probably");
    setThreatImpact("Moderate");
    setAsvsReferenceText("");
    setHasManualAsvsRefs(false);
    setIsModalOpen(true);
  };

  const openEditModal = (threat: Threat) => {
    setEditingThreat(threat);
    setSelectedComponentIds(threat.componentIds || []);
    setThreatTitle(threat.title);
    setThreatDescription(threat.description);
    setThreatStride(threat.stride);
    setThreatLikelihood(threat.likelihood);
    setThreatImpact(threat.impact);
    setAsvsReferenceText((threat.asvsRefs || (threat.mitigation.match(/V\d+(?:\.\d+)*/g) || [])).join(", "));
    setHasManualAsvsRefs(true);
    setIsModalOpen(true);
  };

  const addSuggestedAsvsReferences = () => {
    setAsvsReferenceText(current => {
      const currentRefs = current.match(/V\d+(?:\.\d+)*/g) || [];
      return Array.from(new Set([
        ...currentRefs,
        ...suggestedAsvsRequirements.map(requirement => requirement.id),
      ])).join(", ");
    });
    setHasManualAsvsRefs(true);
  };

  const handleSaveThreat = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const likelihood = formData.get("likelihood") as LikelihoodLevel;
    const impact = formData.get("impact") as ImpactLevel;
    
    const newThreat: Threat = {
      id: editingThreat ? editingThreat.id : getNextThreatId(threats),
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      stride: formData.get("stride") as string,
      likelihood,
      impact,
      risk: calculateRisk(likelihood, impact),
      status: formData.get("status") as ThreatStatus,
      mitigation: formData.get("mitigation") as string,
      componentIds: selectedComponentIds.filter(id => availableComponents.some(component => component.id === id)),
      asvsRefs: Array.from(new Set(asvsReferenceText.match(/V\d+(?:\.\d+)*/g) || []))
        .filter(id => asvsRequirements.some(requirement => requirement.id === id)),
      architectureFlowId: editingThreat?.architectureFlowId,
      architectureFlowStride: editingThreat?.architectureFlowId ? formData.get("stride") as string : editingThreat?.architectureFlowStride,
      architectureReviewed: editingThreat?.architectureFlowId ? true : editingThreat?.architectureReviewed,
      architectureCustomized: editingThreat?.architectureFlowId ? true : editingThreat?.architectureCustomized,
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
          <h2 className="text-sm font-bold text-slate-800">{t("Prehľad hrozieb a matica rizík", "Threat Landscape & Risk Matrix")}</h2>
          <span className="text-xs text-slate-400 font-medium hidden md:inline-block">• {t(`${threatSummary.total} evidovaných, ${threatSummary.open} otvorených`, `${threatSummary.total} logged, ${threatSummary.open} open`)}</span>
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
              <span>{t("Skryť prehľad a maticu", "Hide Dashboard & Matrix")}</span>
            </>
          ) : (
            <>
              <ChevronDown size={14} />
              <span>{t("Zobraziť prehľad a maticu", "Show Dashboard & Matrix")}</span>
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
                  <p className="text-2xl font-bold text-slate-800">{threatSummary.openHighOrCritical}</p>
                  <p className="text-xs font-semibold uppercase text-slate-500">{t("Otvorené vysoké/kritické riziká", "Open High/Critical Risks")}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{threatSummary.open}</p>
                  <p className="text-xs font-semibold uppercase text-slate-500">{t("Otvorené hrozby celkom", "Total Open Threats")}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{threatSummary.mitigated}</p>
                  <p className="text-xs font-semibold uppercase text-slate-500">{t("Zmiernené hrozby", "Mitigated Threats")}</p>
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
                placeholder={t("Hľadať hrozby podľa ID alebo názvu...", "Search threats by ID or title...")}
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
                <option value="All">{t("Stav: všetky", "Status: All")}</option>
                {(["Open", "Mitigated", "Remediated", "Accepted"] as const).map(status => <option key={status} value={status}>{threatLabel(status, language)}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <select 
                className="text-sm border-none bg-transparent focus:outline-none text-slate-600 font-medium"
                value={strideFilter}
                onChange={(e) => setStrideFilter(e.target.value)}
              >
                <option value="All">{t("STRIDE: všetky", "STRIDE: All")}</option>
                {["Spoofing", "Tampering", "Repudiation", "Information Disclosure", "Denial of Service", "Elevation of Privilege"].map(category => <option key={category} value={category}>{threatLabel(category, language)}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <select 
                className="text-sm border-none bg-transparent focus:outline-none text-slate-600 font-medium"
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value as RiskLevel | "All")}
              >
                <option value="All">{t("Riziko: všetky", "Risk: All")}</option>
                {(["Critical", "High", "Medium", "Low", "Very Low"] as const).map(risk => <option key={risk} value={risk}>{threatLabel(risk, language)}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 border-l border-slate-200 pl-3 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={unreviewedOnly}
                onChange={event => setUnreviewedOnly(event.target.checked)}
              />
              {t("Iba na kontrolu", "Needs review only")}
            </label>
            {selectedThreatIds.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm(t(`Označiť ${selectedThreatIds.length} vybraných hrozieb ako skontrolované?`, `Mark ${selectedThreatIds.length} selected threats reviewed?`))) return;
                  setThreats(current => current.map(threat =>
                    selectedThreatIds.includes(threat.id) ? { ...threat, architectureReviewed: true } : threat
                  ));
                  setSelectedThreatIds([]);
                }}
                className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
              >
                {t(`Označiť ${selectedThreatIds.length} ako skontrolované`, `Mark ${selectedThreatIds.length} reviewed`)}
              </button>
            )}
          </div>
          
          <button 
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            {t("Pridať hrozbu", "Add Threat")}
          </button>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-3 py-3 border-b border-slate-100 w-10">
                  <input
                    type="checkbox"
                    aria-label={t("Vybrať všetky zobrazené hrozby", "Select all visible threats")}
                    checked={filteredThreats.length > 0 && filteredThreats.every(threat => selectedThreatIds.includes(threat.id))}
                    onChange={event => setSelectedThreatIds(event.target.checked ? filteredThreats.map(threat => threat.id) : [])}
                  />
                </th>
                <th className="px-6 py-3 border-b border-slate-100 w-24">ID</th>
                <th className="px-6 py-3 border-b border-slate-100 min-w-[250px]">{t("Detail hrozby", "Threat Details")}</th>
                <th className="px-6 py-3 border-b border-slate-100 w-32">
                  <div className="flex items-center">
                    STRIDE <HelpTooltip text={t("Podvrhnutie identity, manipulácia, popretie, prezradenie informácií, odmietnutie služby alebo zvýšenie oprávnení.", "Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, or Elevation of Privilege.")} position="bottom" />
                  </div>
                </th>
                <th className="px-6 py-3 border-b border-slate-100 w-32">
                  <div className="flex items-center">
                    {t("Úroveň rizika", "Risk Level")} <HelpTooltip text={t("Vypočíta sa z pravdepodobnosti a dopadu.", "Calculated based on Likelihood and Impact.")} position="bottom" />
                  </div>
                </th>
                <th className="px-6 py-3 border-b border-slate-100 w-48">{t("Mitigácia (ASVS)", "Mitigation (ASVS)")}</th>
                <th className="px-6 py-3 border-b border-slate-100 w-32">{t("Stav", "Status")}</th>
                <th className="px-6 py-3 border-b border-slate-100 w-20 text-right">{t("Akcie", "Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredThreats.map((threat) => (
                <tr key={threat.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-3 py-4">
                    <input
                      type="checkbox"
                      aria-label={t(`Vybrať hrozbu ${threat.id}`, `Select threat ${threat.id}`)}
                      checked={selectedThreatIds.includes(threat.id)}
                      onChange={event => setSelectedThreatIds(current =>
                        event.target.checked ? [...current, threat.id] : current.filter(id => id !== threat.id)
                      )}
                    />
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-400 font-medium">{threat.id}</td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800">{threat.title}</p>
                    {threat.architectureFlowId && (
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <span title={t("Automaticky vytvorený návrh scenára podľa toku cez hranicu trust zón. Overte jeho relevantnosť.", "Automatically generated scenario based on a cross-boundary flow. Verify its relevance.")} className="inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                          {t("Architektúra", "Architecture")}
                        </span>
                        {threat.architectureCustomized && (
                          <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">{t("Upravené", "Customized")}</span>
                        )}
                        {threat.architectureReviewed ? (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">{t("Skontrolované", "Reviewed")}</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setThreats(current => current.map(item =>
                              item.id === threat.id ? { ...item, architectureReviewed: true } : item
                            ))}
                            title={t("Označiť STRIDE návrh ako skontrolovaný", "Mark STRIDE suggestion reviewed")}
                            className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 hover:bg-amber-100"
                          >
                            {t("Vyžaduje kontrolu · Označiť", "Needs review · Mark reviewed")}
                          </button>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{threat.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-slate-600">{threatLabel(threat.stride, language)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full tracking-wide ${riskStyles[threat.risk]}`}>
                      {threatLabel(threat.risk, language)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-600 font-mono truncate max-w-[180px]" title={threat.mitigation}>
                      {threat.mitigation || t("Nepriradená", "None assigned")}
                    </p>
                    {(threat.componentIds?.length || threat.asvsRefs?.length) ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(threat.componentIds || []).map(componentId => (
                          <Link key={componentId} to={`/analysis/${analysisId}/architecture?component=${encodeURIComponent(componentId)}`} className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 hover:bg-blue-100">
                            <Link2 size={10} />{availableComponents.find(component => component.id === componentId)?.name || componentId}
                          </Link>
                        ))}
                        {getThreatAsvsReferences(threat).map(reference => (
                          <Link
                            key={reference}
                            to={`/analysis/${analysisId}/asvs?chapter=${asvsRequirements.find(requirement => requirement.id === reference)?.chapterId || 1}&search=${encodeURIComponent(reference)}`}
                            title={t(`Otvoriť ASVS požiadavku ${reference}`, `Open ASVS requirement ${reference}`)}
                            className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 hover:bg-indigo-100"
                          >
                            {reference}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded border ${statusStyles[threat.status]}`}>
                      {threatLabel(threat.status, language)}
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
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <ShieldAlert size={48} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm font-medium">{t("Nenašli sa žiadne hrozby.", "No threats found.")}</p>
                    <p className="text-xs mt-1">{t("Upravte filtre alebo pridajte novú hrozbu.", "Adjust your filters or add a new threat to get started.")}</p>
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
                {editingThreat ? t("Upraviť hrozbu", "Edit Threat") : t("Zaznamenať novú hrozbu", "Log New Threat")}
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
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{t("Názov hrozby", "Threat Title")}</label>
                  <input 
                    name="title"
                    type="text" 
                    required
                    value={threatTitle}
                    onChange={event => setThreatTitle(event.target.value)}
                    placeholder={t("napr. SQL injection v prihlasovacom formulári", "e.g. SQL Injection in Login form")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{t("Popis", "Description")}</label>
                  <textarea 
                    name="description"
                    required
                    value={threatDescription}
                    onChange={event => setThreatDescription(event.target.value)}
                    placeholder={t("Opíšte realizáciu hrozby a jej dopad...", "Describe how the threat is executed and its impact...")}
                    className="w-full h-24 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{t("Kategória STRIDE", "STRIDE Category")}</label>
                    <select 
                      name="stride"
                      required
                      value={threatStride}
                      onChange={event => setThreatStride(event.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm bg-white"
                    >
                      {["Spoofing", "Tampering", "Repudiation", "Information Disclosure", "Denial of Service", "Elevation of Privilege"].map(category => <option key={category} value={category}>{threatLabel(category, language)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{t("Stav", "Status")}</label>
                    <select 
                      name="status"
                      required
                      defaultValue={editingThreat?.status || "Open"}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm bg-white"
                    >
                      {(["Open", "Mitigated", "Remediated", "Accepted"] as const).map(status => <option key={status} value={status}>{threatLabel(status, language)}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{t("Pravdepodobnosť", "Likelihood")}</label>
                    <select 
                      name="likelihood"
                      required
                      value={threatLikelihood}
                      onChange={event => setThreatLikelihood(event.target.value as LikelihoodLevel)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm bg-white"
                    >
                      <option value="Exceptionally">{threatLabel("Exceptionally", language)} (&lt; 0.04)</option>
                      <option value="Unlikely">{threatLabel("Unlikely", language)} (0.04 - 0.2)</option>
                      <option value="Probably">{threatLabel("Probably", language)} (0.2 - 0.5)</option>
                      <option value="Frequently">{threatLabel("Frequently", language)} (&gt; 0.5)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{t("Obchodný dopad", "Business Impact")}</label>
                    <select 
                      name="impact"
                      required
                      value={threatImpact}
                      onChange={event => setThreatImpact(event.target.value as ImpactLevel)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm bg-white"
                    >
                      <option value="Minor">{threatLabel("Minor", language)} (&lt; 1M EUR)</option>
                      <option value="Moderate">{threatLabel("Moderate", language)} (1M - 10M EUR)</option>
                      <option value="Major">{threatLabel("Major", language)} (10M - 100M EUR)</option>
                      <option value="Critical">{threatLabel("Critical", language)} (&gt; 100M EUR)</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2" role="status" aria-live="polite">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t("Aktuálna úroveň rizika", "Current risk level")}</p>
                        <p className="mt-0.5 text-xs text-slate-600">{t("Pravdepodobnosť × Dopad", "Likelihood × Impact")}</p>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${riskStyles[calculateRisk(threatLikelihood, threatImpact)]}`}>
                        {threatLabel(calculateRisk(threatLikelihood, threatImpact), language)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 flex items-center text-sm font-semibold text-slate-700">
                    {t("Plán mitigácie / Poznámky", "Mitigation Plan / Notes")}
                    <HelpTooltip text={t("Zadajte plánované opatrenie alebo poznámky ako text. Prepojenia na ASVS požiadavky sa spravujú samostatne nižšie.", "Enter the planned remediation or notes in plain text. ASVS requirement links are managed separately below.")} position="right" />
                  </label>
                  <input 
                    name="mitigation"
                    type="text" 
                    defaultValue={editingThreat?.mitigation}
                    placeholder={t("napr. Vynútiť MFA a obmedziť počet pokusov o prihlásenie", "e.g. Enforce MFA and rate-limit login attempts")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                  />
                  <p className="mt-1 text-xs text-slate-500">{t("ASVS kontroly sa navrhujú a prepájajú samostatne nižšie.", "ASVS controls are suggested and linked separately below.")}</p>
                </div>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-semibold text-slate-700">{t("Prepojené architektonické komponenty", "Linked architecture components")}</legend>
                  {availableComponents.length ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3">
                      {availableComponents.map(component => (
                        <label key={component.id} className="flex items-center gap-2 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={selectedComponentIds.includes(component.id)}
                            onChange={event => setSelectedComponentIds(current =>
                              event.target.checked
                                ? [...current, component.id]
                                : current.filter(id => id !== component.id)
                            )}
                          />
                          <span>{component.name}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">{t("Najprv pridajte komponenty v časti Architektúra.", "First add components in Architecture.")}</p>
                  )}
                </fieldset>
                <div>
                  <label htmlFor="threat-asvs-references" className="mb-1 flex items-center text-sm font-semibold text-slate-700">
                    {t("Prepojené ASVS požiadavky", "Linked ASVS requirements")}
                    <HelpTooltip text={t("Pre novú hrozbu sa navrhne až päť ASVS kontrol podľa kategórie STRIDE, názvu a popisu. Ide o heuristické návrhy, nie overené zistenia. ID skontrolujte a upravte ručne; úpravou sa zastaví automatická náhrada. Použite „Pridať návrhy“ na doplnenie bez odstránenia existujúcich prepojení.", "For a new threat, up to five ASVS controls are suggested from its STRIDE category, title and description. These are heuristic suggestions, not verified findings. Review and edit the IDs manually; editing existing links stops automatic replacement. Use “Add suggestions” to append suggestions without removing your links.")} position="top" />
                  </label>
                  <input
                    id="threat-asvs-references"
                    list="threat-asvs-reference-list"
                    value={asvsReferenceText}
                    onChange={event => {
                      setAsvsReferenceText(event.target.value);
                      setHasManualAsvsRefs(true);
                    }}
                    placeholder="V2.3.1, V5.1.1"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-mono"
                  />
                  <datalist id="threat-asvs-reference-list">
                    {asvsRequirements.map(requirement => <option key={requirement.id} value={requirement.id}>{requirement.title}</option>)}
                  </datalist>
                  <p className="mt-1 text-xs text-slate-500">
                    {hasManualAsvsRefs
                      ? t("Prepojenia upravte ručne alebo pridajte automatické návrhy.", "Edit links manually or add automatic suggestions.")
                      : t("Návrhy sa priebežne vyberajú podľa STRIDE kategórie, názvu a opisu hrozby. Môžete ich upraviť.", "Suggestions are updated from the STRIDE category, title and description. You can edit them.")}
                  </p>
                  {invalidAsvsRefs.length > 0 && <p role="status" className="mt-1 text-xs text-amber-700">{t("Neznáme ID sa neuložia:", "Unknown IDs will not be saved:")} {invalidAsvsRefs.join(", ")}</p>}
                  {suggestedAsvsRequirements.length > 0 && (
                    <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold text-slate-700">
                          {t("Automatické návrhy z ASVS", "Automatic ASVS suggestions")}{hasManualAsvsRefs ? t(" (možno pridať)", " (can be added)") : t(" (automaticky vybrané)", " (automatically selected)")}
                        </p>
                        {hasManualAsvsRefs && (
                          <button
                            type="button"
                            onClick={addSuggestedAsvsReferences}
                            className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                          >
                            {t("Pridať návrhy", "Add suggestions")}
                          </button>
                        )}
                      </div>
                      <ul className="mt-1.5 space-y-1">
                        {suggestedAsvsRequirements.map(requirement => (
                          <li key={requirement.id} className="text-[11px] text-slate-600">
                            <span className="font-mono font-semibold text-blue-800">{requirement.id}</span>
                            <span className="ml-1 text-slate-400">{requirement.sectionName}:</span>
                            <span className="ml-1 text-slate-600 line-clamp-2" title={requirement.description}>{requirement.description}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                {t("Zrušiť", "Cancel")}
              </button>
              <button 
                type="submit"
                form="threat-form"
                className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                {editingThreat ? t("Uložiť zmeny", "Save Changes") : t("Zaznamenať hrozbu", "Log Threat")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
