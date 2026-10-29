import re

with open("src/components/ASVSTriageModal.tsx", "r") as f:
    content = f.read()

# Remove the import of categorization stuff
content = re.sub(
    r'import {\s*projectCategorizationQuestions,\s*evaluateProjectCategorization,\s*CategorizationEvaluationResult\n} from "\.\./data/projectCategorizationData";',
    '',
    content
)

# Remove the tabs HTML
tab_html = """          <div className="flex bg-slate-50/80 px-6 pt-4 border-b border-slate-200 gap-2 overflow-x-auto">
            <button
              onClick={() => setModalTab("categorization")}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors cursor-pointer flex items-center gap-2 border-t border-x ${
                modalTab === "categorization"
                  ? "bg-white text-blue-700 border-slate-200 -mb-px shadow-xs"
                  : "bg-transparent text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <SlidersHorizontal size={14} />
              <span>1. Kategorizácia projektu (ASVS Level)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                catAnsweredCount === catTotalCount
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-blue-100 text-blue-800"
              }`}>
                {catAnsweredCount}/{catTotalCount}
              </span>
            </button>
            <button
              onClick={() => setModalTab("chapters")}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors cursor-pointer flex items-center gap-2 border-t border-x ${
                modalTab === "chapters"
                  ? "bg-white text-blue-700 border-slate-200 -mb-px shadow-xs"
                  : "bg-transparent text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <Layers size={14} />
              <span>2. Technologická triáž (Kapitoly V1–V17)</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full font-bold">
                {totalQuestions} otázok
              </span>
            </button>
          </div>
          <div className="text-[11px] text-slate-500 pb-2 hidden sm:block">
            {modalTab === "categorization" ? "Zodpovedajte 5 blokov pre odporúčanie ASVS Levelu" : "Vylúčte nepoužité technológie zo scope"}
          </div>"""

# Remove the Categorization logic at the top
content = re.sub(r'  const \[modalTab, setModalTab\] = useState<"chapters" \| "categorization">\(initialTab\);\n', '', content)
content = re.sub(r'  // Categorization state[\s\S]*?const evaluation: CategorizationEvaluationResult = evaluateProjectCategorization\(catAnswers\);\n\n', '', content)
content = re.sub(r'  initialTab\?: "chapters" \| "categorization";\n', '', content)
content = re.sub(r'  initialTab = "chapters"\n', '', content)
content = re.sub(r',\n  initialTab = "chapters"', '', content)


# Strip the Tab 1 and Tab 2 blocks
# We know the structure:
#         {/* TAB 1: CATEGORIZATION OF THE PROJECT */}
#         {modalTab === "categorization" && ( ... )}
#         {/* TAB 2: CHAPTER TRIAGE (V1 to V17) */}
#         {modalTab === "chapters" && ( ... )}

# We can find these with a regex or just substring operations
idx1 = content.find('{/* TAB 1: CATEGORIZATION OF THE PROJECT */}')
idx2 = content.find('{/* TAB 2: CHAPTER TRIAGE (V1 to V17) */}')
if idx1 != -1 and idx2 != -1:
    content = content[:idx1] + content[idx2:]

# Now replace {modalTab === "chapters" && ( with just (
content = content.replace('{modalTab === "chapters" && (', '(')

with open("src/components/ASVSTriageModal.tsx", "w") as f:
    f.write(content)
