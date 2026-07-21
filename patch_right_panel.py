import re

with open("src/components/AnalysisLayout.tsx", "r") as f:
    content = f.read()

# We want to add a Global Progress card before the Related Assets section
global_progress_html = """
              {/* Global Progress */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">ASVS Progress</h4>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700">Total Implementation</span>
                    <span className="text-xs font-bold text-blue-600">
                      {Math.round((reqs.filter(r => r.status === 'Implemented').length / Math.max(1, reqs.filter(r => r.status !== 'N/A').length)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden flex">
                    <div 
                      className="bg-green-500 h-full transition-all duration-500"
                      style={{ width: `${(reqs.filter(r => r.status === 'Implemented').length / Math.max(1, reqs.filter(r => r.status !== 'N/A').length)) * 100}%` }}
                    />
                    <div 
                      className="bg-orange-400 h-full transition-all duration-500"
                      style={{ width: `${(reqs.filter(r => r.status === 'Partial').length / Math.max(1, reqs.filter(r => r.status !== 'N/A').length)) * 100}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-slate-600">{reqs.filter(r => r.status === 'Implemented').length} Implemented</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                      <span className="text-slate-600">{reqs.filter(r => r.status === 'Partial').length} Partial</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-slate-600">{reqs.filter(r => r.status === 'Missing').length} Missing</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                      <span className="text-slate-600">{reqs.filter(r => r.status === 'N/A').length} N/A</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Architectural Assets List */}"""

content = content.replace("              {/* Architectural Assets List */}", global_progress_html)

with open("src/components/AnalysisLayout.tsx", "w") as f:
    f.write(content)
