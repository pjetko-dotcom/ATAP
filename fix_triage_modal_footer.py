import re

with open("src/components/ASVSTriageModal.tsx", "r") as f:
    content = f.read()

# Fix the closing bracket of chapters block
content = content.replace("        )}\n\n        {/* Footer */}", "        </div>\n\n        {/* Footer */}")
content = content.replace("        )\n\n        {/* Footer */}", "        </div>\n\n        {/* Footer */}")

# Remove modalTab logic in footer
content = re.sub(
    r'\{modalTab === "categorization"[\s\S]*?\}',
    '"Vylúčenia technológií okamžite označia kontroly ako N/A s evidovaným dôvodom."',
    content
)

# Remove the Continue button from the footer (since there's only one tab now)
# Let's replace the whole footer div
old_footer_start = '{/* Footer */}'
idx = content.find(old_footer_start)
if idx != -1:
    footer_end = content.find('</div>\n    </div>\n  );\n}', idx)
    
    new_footer = """{/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Vylúčenia technológií okamžite označia kontroly ako N/A s evidovaným dôvodom.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Hotovo, zavrieť
          </button>
        """
    content = content[:idx] + new_footer + content[footer_end:]

# Replace the opening parenthesis `(`
content = content.replace("        {/* TAB 2: CHAPTER TRIAGE (V1 to V17) */}\n        (\n", "        {/* CHAPTER TRIAGE (V1 to V17) */}\n        <div className=\"flex flex-col flex-1 overflow-hidden\">\n")


# Fix the imports as well
content = re.sub(r'import {\n  projectCategorizationQuestions,\n  evaluateProjectCategorization,\n  CategorizationEvaluationResult\n} from "\.\./data/projectCategorizationData";', '', content)

with open("src/components/ASVSTriageModal.tsx", "w") as f:
    f.write(content)
