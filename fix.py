with open("src/components/AnalysisLayout.tsx", "r") as f:
    lines = f.readlines()
    
# We want to keep everything up to line 289: `      </div>`
# And then just `    </div>\n  );\n}\n`
    
new_lines = lines[:289]
new_lines.append("    </div>\n")
new_lines.append("  );\n")
new_lines.append("}\n")

with open("src/components/AnalysisLayout.tsx", "w") as f:
    f.writelines(new_lines)
