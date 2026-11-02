/**
 * Dashboard Module
 * Serves as the landing page showing high-level statistics and recent analyses.
 * 
 * @module Dashboard
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Pencil, ShieldAlert, CheckCircle, FileText, LayoutTemplate, Activity, Database, ArrowRight, Circle, CheckCircle2 } from "lucide-react";
import { useAnalyses } from "../hooks/useAnalyses";
import { RenameProjectModal } from "./RenameProjectModal";
import { BackupRestoreModal } from "./BackupRestoreModal";

interface AnalysisMetrics {
  totalOpenThreats: number;
  criticalRisks: number;
  openFindings: number;
  asvsCoverage: number;
}

interface ProgressStep {
  label: string;
  path: string;
  complete: boolean;
}

interface DashboardThreat {
  id?: string;
  status?: string;
  risk?: string;
}

interface DashboardRequirement {
  status?: string;
}

function readStoredValue<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch (error) {
    console.error(`Failed to read dashboard progress (${key})`, error);
    return fallback;
  }
}

function getAnalysisProgress(analysisId: string): ProgressStep[] {
  const context = readStoredValue<Record<string, unknown> | null>(`atap_context_${analysisId}`, null);
  const architecture = readStoredValue<{ components?: unknown[] } | null>(`atap_architecture_${analysisId}`, null);
  const threats = readStoredValue<Array<{ id?: string }> | null>(`atap_threats_${analysisId}`, null);
  const requirements = readStoredValue<DashboardRequirement[] | null>(`atap_asvs_v5_${analysisId}`, null)
    || readStoredValue<DashboardRequirement[] | null>(`atap_asvs_${analysisId}`, null);
  const relevantRequirements = requirements?.filter(requirement => requirement.status !== "N/A") ?? [];
  const gaps = relevantRequirements.some(requirement => requirement.status === "Missing" || requirement.status === "Partial");

  return [
    { label: "Kontext", path: "context", complete: !!context?.businessPurpose && !!context?.dataClassification },
    { label: "Architektúra", path: "architecture", complete: (architecture?.components?.length ?? 0) > 0 },
    { label: "STRIDE", path: "threats", complete: (threats?.length ?? 0) > 0 },
    {
      label: "ASVS",
      path: "asvs",
      complete: !!requirements?.length && requirements.every(requirement =>
        ["Implemented", "Partial", "Missing", "N/A"].includes(requirement.status || "")
      ),
    },
    { label: "Nálezy", path: "findings", complete: !!requirements && !gaps },
  ];
}

function getAnalysisMetrics(analysisId: string): AnalysisMetrics {
  // 1. Load threats
  const threatsKey = `atap_threats_${analysisId}`;
  const storedThreats = readStoredValue<DashboardThreat[] | null>(threatsKey, null);
  const threatsList = storedThreats || [
      { id: "TR-001", status: "Open", risk: "High" },
      { id: "TR-002", status: "Mitigated", risk: "High" },
      { id: "TR-003", status: "Open", risk: "Critical" },
      { id: "TR-004", status: "Accepted", risk: "Very Low" }
    ];
  const totalOpenThreats = threatsList.filter(t => t.status === "Open").length;
  const criticalRisks = threatsList.filter(t => t.status === "Open" && (t.risk === "Critical" || t.risk === "High")).length;

  // 2. Load ASVS Gaps & Coverage
  const asvsList = readStoredValue<DashboardRequirement[] | null>(`atap_asvs_v5_${analysisId}`, null)
    || readStoredValue<DashboardRequirement[]>(`atap_asvs_${analysisId}`, []);
  
  // Calculate coverage
  const totalRelevant = asvsList.filter(r => r.status !== "N/A").length;
  const implementedCount = asvsList.filter(r => r.status === "Implemented").length;
  const asvsCoverage = totalRelevant > 0 ? Math.round((implementedCount / totalRelevant) * 100) : 0;

  // Calculate gaps (Missing or Partial)
  const openFindings = asvsList.filter(r => r.status === "Missing" || r.status === "Partial").length;

  return {
    totalOpenThreats,
    criticalRisks,
    openFindings,
    asvsCoverage
  };
}

/**
 * Dashboard Component.
 * Provides a summary view of active analyses, open findings, and critical risks.
 * 
 * @returns {JSX.Element} The rendered dashboard component.
 */
export function Dashboard() {
  const { analyses, deleteAnalysis } = useAnalyses();
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Compute aggregated stats
  let totalOpenFindings = 0;
  let totalCriticalRisks = 0;

  const enrichedAnalyses = analyses.map(analysis => {
    const metrics = getAnalysisMetrics(analysis.id);
    const progress = getAnalysisProgress(analysis.id);
    totalOpenFindings += metrics.openFindings;
    totalCriticalRisks += metrics.criticalRisks;
    return {
      ...analysis,
      metrics,
      progress
    };
  });

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <LayoutTemplate size={20} className="text-blue-600" />
            Threat Modeling & Compliance Workspace
          </h2>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsBackupModalOpen(true)}
            className="px-3.5 py-2 text-sm bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            title="Exportovať alebo obnoviť projekty zo zálohy JSON"
          >
            <Database size={15} className="text-slate-500" />
            <span>Záloha & Obnova (JSON)</span>
          </button>
          <Link 
            to="/analysis/new" 
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            New Analysis
          </Link>
        </div>
      </header>

      <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Security Assessment Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Cross-reference software architecture designs with ASVS 5.0 compliance checklists and STRIDE threat registers.</p>
        </div>

        {analyses.length === 0 && (
          <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-blue-950">Začnite bezpečnostné hodnotenie</h2>
              <p className="mt-1 text-sm text-blue-800">Vytvorte prvú analýzu alebo použite sprievodcu so štartovacou šablónou.</p>
            </div>
            <Link to="/analysis/new" className="inline-flex items-center gap-2 self-start rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
              <Plus size={16} /> Vytvoriť analýzu <ArrowRight size={15} />
            </Link>
          </div>
        )}

        {/* Aggregated Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Active Workspaces</p>
              <p className="text-3xl font-extrabold text-slate-800 mt-2">{analyses.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <FileText size={24} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Open ASVS Compliance Gaps</p>
              <p className="text-3xl font-extrabold text-orange-600 mt-2">{totalOpenFindings || "-"}</p>
            </div>
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
              <ShieldAlert size={24} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Critical & High Risks</p>
              <p className="text-3xl font-extrabold text-red-600 mt-2">{totalCriticalRisks || "-"}</p>
            </div>
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0">
              <Activity size={24} />
            </div>
          </div>
        </div>

        {/* Recent Analyses list */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-800">Security Analyses / Projects</h3>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Workspace / Project</th>
                  <th className="px-6 py-4 w-28 text-center">ASVS Level</th>
                  <th className="px-6 py-4 w-32">Status</th>
                  <th className="px-6 py-4 w-48">ASVS Progress</th>
                  <th className="px-6 py-4 w-56">Analysis Progress</th>
                  <th className="px-6 py-4 w-40 text-center">Open Risks</th>
                  <th className="px-6 py-4 w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {enrichedAnalyses.map(analysis => (
                  <tr key={analysis.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link 
                        to={`/analysis/${analysis.id}/asvs`} 
                        className="font-bold text-blue-600 hover:text-blue-700 transition-colors hover:underline"
                      >
                        {analysis.name || 'Untitled Analysis'}
                      </Link>
                      <p className="text-xs text-slate-400 mt-0.5">Created on {new Date(analysis.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
                        L{analysis.asvsLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-200 text-[10px] font-bold rounded-md uppercase tracking-wide">
                        {analysis.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden shrink-0 border border-slate-200">
                          <div 
                            className="bg-green-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${analysis.metrics.asvsCoverage}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-600">{analysis.metrics.asvsCoverage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1" aria-label={`${analysis.progress.filter(step => step.complete).length} z 5 častí analýzy dokončených`}>
                        {analysis.progress.map(step => (
                          <Link
                            key={step.path}
                            to={`/analysis/${analysis.id}/${step.path}`}
                            title={`${step.label}: ${step.complete ? "dokončené" : "otvoriť"}`}
                            aria-label={`${step.label}: ${step.complete ? "dokončené" : "nedokončené"}, otvoriť`}
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${step.complete ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-300 hover:bg-blue-50 hover:text-blue-600"}`}
                          >
                            {step.complete ? <CheckCircle2 size={17} /> : <Circle size={16} />}
                          </Link>
                        ))}
                        <span className="ml-1 text-xs font-semibold text-slate-600">{analysis.progress.filter(step => step.complete).length}/5</span>
                      </div>
                      <Link
                        to={`/analysis/${analysis.id}/${analysis.progress.find(step => !step.complete)?.path || "export"}`}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:underline"
                      >
                        {analysis.progress.find(step => !step.complete)?.label
                          ? `Pokračovať: ${analysis.progress.find(step => !step.complete)?.label}`
                          : "Zobraziť report"}
                        <ArrowRight size={11} />
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {analysis.metrics.totalOpenThreats > 0 ? (
                        <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold bg-orange-50 text-orange-700 rounded-full border border-orange-200">
                          {analysis.metrics.totalOpenThreats} Open ({analysis.metrics.criticalRisks} Critical)
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">None logged</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => setRenameTarget({ id: analysis.id, name: analysis.name || 'Untitled Analysis' })}
                          className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors cursor-pointer inline-block"
                          title="Premenovať projekt"
                        >
                          <Pencil size={15} />
                        </button>
                        <button 
                          onClick={() => {
                            if(window.confirm('Are you sure you want to delete this analysis? This will permanently remove all associated threat registers and compliance state.')) {
                              deleteAnalysis(analysis.id);
                            }
                          }}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors cursor-pointer inline-block"
                          title="Zmazať projekt"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {enrichedAnalyses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      <CheckCircle size={40} className="mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-700">No active analyses found</p>
                      <p className="text-xs mt-1">Create a new security analysis workspace to get started.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Rename Project Modal */}
      {renameTarget && (
        <RenameProjectModal
          isOpen={!!renameTarget}
          analysisId={renameTarget.id}
          currentName={renameTarget.name}
          onClose={() => setRenameTarget(null)}
        />
      )}

      {/* Backup and Restore Modal */}
      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
    </div>
  );
}
