/**
 * Analysis Layout Module
 * Provides the sub-layout specifically for an individual analysis workspace.
 * 
 * @module AnalysisLayout
 */
import { Outlet } from "react-router-dom";

/**
 * Analysis Layout Component.
 * Renders a 3-panel structure: a top header with actions, a main workspace area (`Outlet`),
 * and a right-side informational panel showing related assets and evidence logs.
 * 
 * @returns {JSX.Element} The rendered layout for an analysis view.
 */
export function AnalysisLayout() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0">
        <div className="flex items-center gap-4">
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded uppercase">Draft</span>
          <h2 className="text-lg font-semibold text-slate-800 tracking-tight">Retail Banking API v2.4 (Level L2)</h2>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-sm border border-slate-200 rounded font-medium hover:bg-slate-50 hidden sm:block">Reviewer View</button>
          <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded font-medium shadow-sm shadow-blue-200">Save Analysis</button>
        </div>
      </header>

      {/* Content Grid */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 overflow-hidden">
        {/* Workspace */}
        <section className="lg:col-span-8 xl:col-span-9 p-4 md:p-8 flex flex-col overflow-y-auto">
          <Outlet />
        </section>

        {/* Right Info Panel */}
        <section className="lg:col-span-4 xl:col-span-3 border-t lg:border-t-0 lg:border-l border-slate-200 bg-white flex flex-col overflow-y-auto">
          <div className="p-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">Related Assets</h4>
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <p className="text-xs font-bold text-slate-600">C-205: AuthN Middleware</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase">Component Type: Logic</p>
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <p className="text-[11px] text-blue-600 font-medium cursor-pointer underline">View Data Flows (4)</p>
                </div>
              </div>
              <div className="p-3 bg-red-50/50 rounded border border-red-100">
                <p className="text-xs font-bold text-red-800">T-04: Privilege Escalation</p>
                <p className="text-[10px] text-red-400 mt-1 uppercase">Category: STRIDE - Elevation</p>
                <p className="text-[11px] text-slate-600 mt-2">Actor: Authenticated User. Scenario: Manipulating JWT claims to gain Admin role.</p>
              </div>
            </div>

            <h4 className="text-xs font-bold text-slate-400 uppercase mt-12 mb-4 tracking-widest">Evidence & Logs</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-1 bg-blue-500 h-8 rounded"></div>
                <div>
                  <p className="text-xs font-medium text-slate-700 italic">"Evidence uploaded: screenshot_auth_check.png"</p>
                  <p className="text-[10px] text-slate-400">Today at 14:22 by E. Novák</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1 bg-slate-300 h-8 rounded"></div>
                <div>
                  <p className="text-xs font-medium text-slate-700 italic">"Requirement marked as N/A: No admin UI exists in this scope."</p>
                  <p className="text-[10px] text-slate-400">Today at 11:05 by J. Smith</p>
                </div>
              </div>
            </div>

            <button className="w-full mt-12 py-3 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-200 transition-colors">Add Analysis Note</button>
          </div>
        </section>
      </div>
    </div>
  );
}
