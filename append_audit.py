import re

with open("src/components/AnalysisLayout.tsx", "r") as f:
    content = f.read()

audit_trail_html = """              </div>

              {/* Activity Log (Audit Trail) */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Recent Activity</h4>
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  {displayLogs.slice(-5).reverse().map((log: any, index: number) => (
                    <div key={log.id || index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-4 h-4 rounded-full border border-white bg-slate-200 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
                      <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white p-3 rounded border border-slate-100 shadow-sm text-[10px]">
                        <p className="font-bold text-slate-700 mb-0.5">{log.action}</p>
                        <p className="text-slate-400">By {log.user || "System"} • {log.time || "Recently"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>"""

# Replace from the end of related assets to the end of the section
content = content.replace("""              </div>
            </div>
          </div>
        </section>
      </div>""", audit_trail_html)

with open("src/components/AnalysisLayout.tsx", "w") as f:
    f.write(content)
