/**
 * Dashboard Module
 * Serves as the landing page showing high-level statistics and recent analyses.
 * 
 * @module Dashboard
 */
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { useAnalyses } from "../hooks/useAnalyses";

/**
 * Dashboard Component.
 * Provides a summary view of active analyses, open findings, and critical risks.
 * Includes a quick-access table for recent workspaces and a button to create a new analysis.
 * 
 * @returns {JSX.Element} The rendered dashboard component.
 */
export function Dashboard() {
  const { analyses, deleteAnalysis } = useAnalyses();

  return (
    <div className="flex flex-col h-full">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
        <h2 className="text-lg font-semibold text-slate-800 tracking-tight">Dashboard</h2>
        <Link to="/analysis/new" className="px-4 py-2 text-sm bg-blue-600 text-white rounded font-medium shadow-sm shadow-blue-200 flex items-center gap-2">
          <Plus size={16} />
          New Analysis
        </Link>
      </header>
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Active Analyses</h3>
            <p className="text-3xl font-bold text-slate-800 mt-2">{analyses.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Open Findings</h3>
            <p className="text-3xl font-bold text-slate-800 mt-2">-</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Critical Risks</h3>
            <p className="text-3xl font-bold text-red-600 mt-2">-</p>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Analyses</h3>
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Level</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Coverage</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {analyses.map(analysis => (
                <tr key={analysis.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <Link to={`/analysis/${analysis.id}/asvs`} className="font-medium text-blue-600 hover:underline">{analysis.name || 'Untitled Analysis'}</Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">L{analysis.asvsLevel}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded uppercase">{analysis.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">-</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => {
                        if(window.confirm('Are you sure you want to delete this analysis?')) {
                          deleteAnalysis(analysis.id);
                        }
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Delete Analysis"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {analyses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No analyses found. Create a new analysis to get started.
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
