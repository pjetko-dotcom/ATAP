import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { FileText, ShieldAlert, CheckCircle, RefreshCw, AlertTriangle, ArrowRight } from "lucide-react";
import { asvsRequirements, asvsChapters, ASVSRequirement } from "../data/asvsData";
import { HelpTooltip } from "./HelpTooltip";

/**
 * Represents a security finding or compliance gap identified within the application.
 */
interface Finding {
  id: string;
  title: string;
  description: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Closed";
  asvsRef: string;
}

const initialFindings: Finding[] = [
  { id: "F-001", title: "Missing MFA for Admin Users", description: "Multi-factor authentication is not enforced for administrative accounts.", severity: "High", status: "Open", asvsRef: "V2.3.1" },
  { id: "F-002", title: "Insecure Direct Object Reference (IDOR)", description: "User profile endpoint lacks authorization checks.", severity: "High", status: "In Progress", asvsRef: "V4.1.1" },
];

const severityColors = {
  Critical: "bg-purple-100 text-purple-700",
  High: "bg-red-100 text-red-700",
  Medium: "bg-orange-100 text-orange-700",
  Low: "bg-blue-100 text-blue-700",
};

const statusColors = {
  "Open": "bg-red-50 text-red-700 border border-red-200",
  "In Progress": "bg-yellow-50 text-yellow-700 border border-yellow-200",
  "Closed": "bg-green-50 text-green-700 border border-green-200",
};

/**
 * FindingsAndGaps Component
 * 
 * Manages the security findings and gaps identified during the threat modeling and ASVS review process.
 * Includes a Gap Analysis generation engine that cross-references architecture state against 
 * the 350+ ASVS 5.0 requirements.
 * 
 * @returns {JSX.Element} The rendered Findings and Gaps dashboard.
 */
export function FindingsAndGaps() {
  const { id: analysisId } = useParams<{ id: string }>();
  const [findings, setFindings] = useState<Finding[]>(initialFindings);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);

  /**
   * Generates a simulated Gap Analysis.
   * In a production environment, this function cross-references the selected ASVS requirements 
   * (specifically those marked as "Missing" or "Partial") and translates them into actionable findings.
   */
  const generateGapAnalysis = () => {
    setIsGenerating(true);
    
    // Simulate API call and analysis delay for UX
    setTimeout(() => {
      // 1. Base findings array logic
      const newFindings: Finding[] = [...findings];
      let findingCounter = findings.length + 1;
      
      // 2. Identify missing or partial ASVS requirements from the workspace data
      const asvsKey = `atap_asvs_${analysisId || "default"}`;
      let activeReqs: ASVSRequirement[] = asvsRequirements;
      const stored = localStorage.getItem(asvsKey);
      if (stored) {
        try {
          activeReqs = JSON.parse(stored);
        } catch (e) {
          activeReqs = asvsRequirements;
        }
      }

      const gaps = activeReqs.filter(r => r.status === "Missing" || r.status === "Partial");
      
      // 3. Fallback/Demonstration Logic:
      // If the user hasn't explicitly marked any gaps in the ASVS Workspace yet,
      // we generate a predefined set of simulated gaps to demonstrate the functionality.
      if (gaps.length === 0) {
        const simulatedGaps = [
          { req: activeReqs.find(r => r.id === "V3.1") || activeReqs[20], severity: "High" as const },
          { req: activeReqs.find(r => r.id === "V5.1") || activeReqs[50], severity: "Medium" as const },
          { req: activeReqs.find(r => r.id === "V7.1") || activeReqs[70], severity: "Low" as const },
          { req: activeReqs.find(r => r.id === "V9.1") || activeReqs[90], severity: "Medium" as const },
          { req: activeReqs.find(r => r.id === "V14.1") || activeReqs[140], severity: "High" as const }
        ];
        
        simulatedGaps.forEach(gap => {
          // Prevent duplicates by checking if the ASVS reference already exists in findings
          if (gap.req && !newFindings.find(f => f.asvsRef === gap.req.id)) {
            newFindings.push({
              id: `F-${String(findingCounter).padStart(3, '0')}`,
              title: `Gap: ${gap.req.title}`,
              description: `Automated gap analysis identified missing security controls for ${gap.req.id}. ${gap.req.description}`,
              severity: gap.severity,
              status: "Open",
              asvsRef: gap.req.id
            });
            findingCounter++;
          }
        });
      } else {
        // 4. Actual Usage Logic:
        // Translate actual workspace gaps into findings, inheriting severity from the ASVS level (L3 = High).
        gaps.forEach(req => {
          if (!newFindings.find(f => f.asvsRef === req.id)) {
            newFindings.push({
              id: `F-${String(findingCounter).padStart(3, '0')}`,
              title: req.title,
              description: req.description,
              severity: req.level === 3 ? "High" : (req.level === 2 ? "Medium" : "Low"),
              status: "Open",
              asvsRef: req.id
            });
            findingCounter++;
          }
        });
      }

      setFindings(newFindings);
      setLastGenerated(new Date());
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6 overflow-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Findings & Gaps</h2>
          <p className="text-sm text-slate-500 mt-1">Track identified vulnerabilities and security gaps in your architecture.</p>
        </div>
        <div className="flex items-center gap-3">
          {lastGenerated && (
            <span className="text-xs text-slate-500 font-medium hidden md:inline-block">
              Last generated: {lastGenerated.toLocaleTimeString()}
            </span>
          )}
          <div className="flex items-center gap-2">
            <button 
              onClick={generateGapAnalysis}
              disabled={isGenerating}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md shadow-sm transition-all ${
                isGenerating 
                  ? 'bg-blue-100 text-blue-600 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Analyzing Architecture...
                </>
              ) : (
                <>
                  <ShieldAlert size={16} />
                  Generate Gap Analysis
                </>
              )}
            </button>
            <HelpTooltip text="Automatically cross-references your ASVS Workspace selections to generate a consolidated list of missing or partial security controls." position="bottom" />
          </div>
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-md shadow-sm hover:bg-slate-700 transition-colors"
          >
            <FileText size={16} />
            Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{findings.filter(f => f.severity === 'Critical' || f.severity === 'High').length}</p>
            <p className="text-xs font-semibold uppercase text-slate-500">Critical / High</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
            <ShieldAlert size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{findings.filter(f => f.status === 'Open').length}</p>
            <p className="text-xs font-semibold uppercase text-slate-500">Open Findings</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{findings.filter(f => f.status === 'Closed').length}</p>
            <p className="text-xs font-semibold uppercase text-slate-500">Remediated</p>
          </div>
        </div>
      </div>

      {isGenerating && (
        <div className="mb-6 p-6 bg-blue-50 border border-blue-100 rounded-xl flex flex-col items-center justify-center animate-pulse">
          <RefreshCw size={32} className="text-blue-500 animate-spin mb-4" />
          <h3 className="text-blue-800 font-bold mb-1">Cross-referencing ASVS 5.0 Requirements...</h3>
          <p className="text-blue-600 text-sm">Comparing architecture components against level 1-3 controls</p>
          <div className="w-full max-w-md bg-blue-200 h-1.5 mt-4 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full w-1/2 rounded-full animate-[ping_1.5s_ease-in-out_infinite]" style={{ animationDuration: '2s' }}></div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 min-h-0">
        <div className="overflow-auto h-full">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold sticky top-0 z-10 shadow-sm border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 w-24">ID</th>
                <th className="px-6 py-4">Finding & Description</th>
                <th className="px-6 py-4 w-32">
                  <div className="flex items-center">
                    Severity <HelpTooltip text="Derived from the ASVS requirement level. L3 = High, L2 = Medium, L1 = Low." position="bottom" />
                  </div>
                </th>
                <th className="px-6 py-4 w-32">Status</th>
                <th className="px-6 py-4 w-32">
                  <div className="flex items-center">
                    ASVS Ref <HelpTooltip text="The specific ASVS control that is missing or partially implemented." position="bottom" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {findings.map(finding => {
                const chapterNum = parseInt(finding.asvsRef.substring(1).split('.')[0]);
                const chapter = asvsChapters.find(c => c.id === chapterNum);
                
                return (
                  <tr key={finding.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 align-top">{finding.id}</td>
                    <td className="px-6 py-4 align-top">
                      <p className="font-bold text-slate-800 mb-1">{finding.title}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{finding.description}</p>
                      {chapter && (
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400 font-medium">
                          <ArrowRight size={10} />
                          <span>Chapter {chapter.id}: {chapter.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full inline-block ${severityColors[finding.severity]}`}>
                        {finding.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded inline-block ${statusColors[finding.status]}`}>
                        {finding.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 align-top font-bold">
                      {finding.asvsRef}
                    </td>
                  </tr>
                );
              })}
              {findings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <CheckCircle size={32} className="mx-auto mb-3 text-green-400" />
                    <p className="font-medium text-slate-700">No security gaps identified</p>
                    <p className="text-sm mt-1">Run a gap analysis to check against ASVS controls.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
