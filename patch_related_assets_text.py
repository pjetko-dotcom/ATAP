import re

with open("src/components/AnalysisLayout.tsx", "r") as f:
    content = f.read()

old_text = """                <div className="bg-blue-50/50 border border-blue-100 rounded p-2 mb-3">
                  <p className="text-[10px] text-blue-800 leading-relaxed">
                    <strong>Traceability Matrix:</strong> Map ASVS controls to these assets in the workspace to track component-level compliance. Status updates here only reflect controls explicitly linked to an asset.
                  </p>
                </div>"""

new_text = """                <div className="bg-blue-50/50 border border-blue-100 rounded p-2 mb-3">
                  <p className="text-[10px] text-blue-800 leading-relaxed">
                    <strong>Component Traceability:</strong> Link ASVS controls to these architectural components using the 'Traceability' dropdown in the workspace rows.
                  </p>
                </div>"""

content = content.replace(old_text, new_text)

with open("src/components/AnalysisLayout.tsx", "w") as f:
    f.write(content)
