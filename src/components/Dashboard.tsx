/**
 * Dashboard Module
 * Serves as the landing page showing high-level statistics and recent analyses.
 * 
 * @module Dashboard
 */
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

/**
 * Dashboard Component.
 * Provides a summary view of active analyses, open findings, and critical risks.
 * Includes a quick-access table for recent workspaces and a button to create a new analysis.
 * 
 * @returns {JSX.Element} The rendered dashboard component.
 */
export function Dashboard() {
  return (
    <div className="flex flex-col h-full">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
        <h2 className="text-lg font-semibold text-slate-800 tracking-tight">Dashboard</h2>
        <Link to="/analysis/new" className="px-4 py-2 text-sm bg-blue-600 text-white rounded font-medium shadow-sm shadow-blue-200 flex items-center gap-2">
          <Plus size={16} />
          New Analysis
        </Link>
      </header>
      <div className="flex-1 p-8">
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Active Analyses</h3>
            <p className="text-3xl font-bold text-slate-800 mt-2">1</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Open Findings</h3>
            <p className="text-3xl font-bold text-slate-800 mt-2">12</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Critical Risks</h3>
            <p className="text-3xl font-bold text-red-600 mt-2">8</p>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <Link to="/analysis/1/asvs" className="font-medium text-blue-600 hover:underline">Retail Banking API v2.4</Link>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">L2</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded uppercase">Draft</span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">64.2%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
