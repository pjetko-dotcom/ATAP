import re

with open('src/components/AnalysisLayout.tsx', 'r') as f:
    content = f.read()

# 1. Imports
if 'Pin' not in content:
    content = content.replace('X } from "lucide-react";', 'X, Pin, PinOff, ChevronLeft } from "lucide-react";')

# 2. State for the Right Panel
state_str = """  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  
  // Right panel hover/lock state
  const [isRightPanelLocked, setIsRightPanelLocked] = useState(false);
  const [isRightPanelHovered, setIsRightPanelHovered] = useState(false);
  const isRightExpanded = isRightPanelLocked || isRightPanelHovered;"""
  
content = re.sub(r'  const \[isInfoPanelOpen, setIsInfoPanelOpen\] = useState\(false\);', state_str, content)

# 3. Replace the Content Grid Section
# We'll replace everything from '{/* Right Info Panel Mobile Overlay */}' to the end of the section

grid_regex = r'        \{\/\* Right Info Panel Mobile Overlay \*\/\}([\s\S]*?)      </div>'

new_right_panel = """        {/* Right Info Panel Mobile Overlay */}
        {isInfoPanelOpen && (
          <div 
            className="absolute inset-0 bg-black/20 z-20 lg:hidden"
            onClick={() => setIsInfoPanelOpen(false)}
          />
        )}

        {/* Desktop Sidebar Spacer (reserves space in normal flow) */}
        <div className={`hidden lg:block shrink-0 transition-all duration-300 ${isRightPanelLocked ? 'w-80' : 'w-12'}`} />

        {/* Right Info Panel */}
        <section 
          onMouseEnter={() => setIsRightPanelHovered(true)}
          onMouseLeave={() => setIsRightPanelHovered(false)}
          className={`
            absolute inset-y-0 right-0 z-30 bg-white flex flex-col overflow-hidden border-l border-slate-200 transform transition-all duration-300 ease-in-out
            ${isInfoPanelOpen ? "translate-x-0 w-80 shadow-2xl" : "translate-x-full lg:translate-x-0"}
            ${isRightExpanded ? 'lg:w-80 lg:shadow-2xl' : 'lg:w-12 lg:shadow-none'}
          `}
        >
          {/* Inner wrapper to prevent squishing content when width is animating */}
          <div className="w-80 h-full flex flex-col">
            
            {/* Desktop Header & Lock Toggle */}
            <div className="hidden lg:flex items-center h-12 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="w-12 shrink-0 flex items-center justify-center">
                <PanelRight size={20} className="text-slate-400" />
              </div>
              <div className={`flex-1 flex items-center justify-between pr-3 transition-opacity duration-300 ${isRightExpanded ? 'opacity-100' : 'opacity-0'}`}>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Analysis Info</span>
                <button 
                  onClick={() => setIsRightPanelLocked(!isRightPanelLocked)}
                  className={`p-1.5 rounded transition-colors ${isRightPanelLocked ? 'text-blue-600 bg-blue-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'}`}
                  title={isRightPanelLocked ? "Unlock Panel" : "Lock Panel"}
                >
                  {isRightPanelLocked ? <PinOff size={16} /> : <Pin size={16} />}
                </button>
              </div>
            </div>

            {/* Panel Content */}
            <div className={`p-6 space-y-6 overflow-y-auto flex-1 transition-opacity duration-300 ${isRightExpanded ? 'opacity-100' : 'lg:opacity-0'}`}>
              <div className="flex items-center justify-between lg:hidden -mt-2 -mx-2 mb-2">
                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Info Panel</h4>
                 <button onClick={() => setIsInfoPanelOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 cursor-pointer"><X size={18}/></button>
              </div>
              
              {/* Contextual Active Requirement Detail Card */}
              {activeReq && (
                <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-md font-mono">{activeReq.id}</span>
                    <span className={`px-2 py-0.5 ${statusStyles[activeReq.status] || "bg-slate-100 text-slate-600"} text-[9px] font-bold rounded-full uppercase`}>
                      {activeReq.status}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-800 line-clamp-2">{activeReq.title}</h5>
                  <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-3">{activeReq.description}</p>
                  
                  {/* Component Mapping */}
                  {activeReq.traceability && activeReq.traceability.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-blue-100/50">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Linked Components</p>
                      <div className="flex flex-wrap gap-1">
                        {activeReq.traceability.map((trace, i) => (
                          <span key={i} className={`text-[9px] font-medium ${trace.color} px-2 py-0.5 rounded-md`}>
                            {trace.id}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Architectural Assets List */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Related Assets</h4>
                <div className="bg-blue-50/50 border border-blue-100 rounded p-2 mb-3">
                  <p className="text-[10px] text-blue-800 leading-relaxed">
                    <strong>Traceability Matrix:</strong> Map ASVS controls to these assets in the workspace to track component-level compliance. Status updates here only reflect controls explicitly linked to an asset.
                  </p>
                </div>
                <div className="space-y-2">
                  {componentMetrics.map((comp) => {
                    const Icon = COMPONENT_ICONS[comp.id] || Shield;
                    return (
                      <div key={comp.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm shrink-0">
                            <Icon size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700 leading-tight">{comp.id}</p>
                            <p className="text-[9px] text-slate-400 uppercase tracking-tight mt-0.5">Type: {comp.type}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            comp.count > 0 
                              ? comp.implementedCount === comp.count
                                ? "bg-green-50 text-green-700 border border-green-100"
                                : "bg-blue-50 text-blue-700 border border-blue-100" 
                              : "bg-slate-100 text-slate-400"
                          }`}>
                            {comp.count > 0 ? `${comp.implementedCount}/${comp.count} Secure` : "0 controls"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>"""

content = re.sub(grid_regex, new_right_panel, content)

with open('src/components/AnalysisLayout.tsx', 'w') as f:
    f.write(content)

