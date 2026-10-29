import re

with open("src/components/ASVSWorkspace.tsx", "r") as f:
    content = f.read()

# 1. Extract the Global Tools from the Table Actions Toolbar
# Let's find the `ml-auto` div in the Table Actions Toolbar
start_idx = content.find('<div className="flex items-center gap-2 ml-auto flex-wrap">')
end_idx = content.find('</div>\n            </div>\n          </div>\n          {/* Export notification')
if start_idx == -1 or end_idx == -1:
    print("Could not find the ml-auto block inside Table Actions Toolbar")

global_tools_block = content[start_idx:end_idx]

# Remove it from the original location
content = content[:start_idx] + content[end_idx:]

# 2. Insert it before `Dynamic Progress Stats`
stats_start_idx = content.find('{/* Dynamic Progress Stats */}')
if stats_start_idx != -1:
    new_header = """
        {/* Global Workspace Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Project Categorization Button */}
            <button
              onClick={() => setIsCategorizationModalOpen(true)}
              className="px-3 py-1.5 flex items-center gap-1.5 text-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md font-semibold transition-colors cursor-pointer shadow-xs"
              title="Kategorizácia projektu pre určenie ASVS Levelu (L1-L3)"
            >
              <SlidersHorizontal size={14} className="text-blue-600" />
              <span>Kategorizácia projektu</span>
            </button>
            
            {/* Target Level Selector */}
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">ASVS Level:</span>
              <select 
                className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md focus:outline-none cursor-pointer"
                value={targetLevel}
                onChange={(e) => setTargetLevel(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))}
              >
                <option value="all">Všetky (L1-L3)</option>
                <option value={1}>L1 (Základ)</option>
                <option value={2}>L2 (Štandard)</option>
                <option value={3}>L3 (Vysoká ochrana)</option>
              </select>
            </div>

            {/* Triage Wizard Button */}
            <button
              onClick={() => {
                setTriageModalInitialTab("chapters");
                setIsTriageModalOpen(true);
              }}
              className="px-3 py-1.5 flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold transition-colors cursor-pointer shadow-xs ml-1"
              title="Otvoriť sprievodcu scopingom a technologickou triážou (V1-V17)"
            >
              <Target size={14} />
              <span>Technologická triáž</span>
              {triagedExcludedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-blue-800 text-[10px] rounded-full">
                  {triagedExcludedCount} N/A
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search size={14} className="absolute left-3 top-2 text-slate-400 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Hľadať požiadavku, kód, text..." 
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Export Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                disabled={isExportingExcel}
                className="px-3 py-1.5 flex items-center gap-1.5 text-xs bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50 shadow-xs whitespace-nowrap"
              >
                {isExportingExcel ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Generujem...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet size={14} className="text-emerald-400" />
                    <span>Export</span>
                    <ChevronDown size={12} className="opacity-75" />
                  </>
                )}
              </button>
              {isExportMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsExportMenuOpen(false)} />
                  <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-40 py-1 text-xs divide-y divide-slate-100">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Formát exportu
                    </div>
                    <button
                      onClick={handleExportExcel}
                      className="w-full text-left px-3 py-2.5 hover:bg-emerald-50/60 flex items-start gap-2.5 text-slate-700 transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          Excel (.xlsx)
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">Odporúčané</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Súhrn, KPI, farebné stavy, 14 kapitol a STRIDE hrozby</div>
                      </div>
                    </button>
                    <button
                      onClick={handleExportCSV}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-start gap-2.5 text-slate-700 transition-colors cursor-pointer"
                    >
                      <FileText size={16} className="text-slate-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-800">CSV tabuľka (.csv)</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">UTF-8 s BOM pre tabuľkové procesory a skripty</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
"""
    content = content[:stats_start_idx] + new_header + content[stats_start_idx:]

# 3. Add ProjectCategorizationModal to the return block
if "<ProjectCategorizationModal" not in content:
    idx = content.find("      {/* Mobile Chapters Overlay */}")
    if idx != -1:
        modal_str = """
      <ProjectCategorizationModal
        isOpen={isCategorizationModalOpen}
        onClose={() => setIsCategorizationModalOpen(false)}
        currentLevel={targetLevel.toString()}
        onApplyLevel={(lvl) => setTargetLevel(parseInt(lvl, 10))}
        analysisId={analysisId}
      />
"""
        content = content[:idx] + modal_str + content[idx:]

with open("src/components/ASVSWorkspace.tsx", "w") as f:
    f.write(content)
