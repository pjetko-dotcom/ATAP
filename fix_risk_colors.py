import re

with open("src/components/ThreatRegister.tsx", "r") as f:
    content = f.read()

old_risk_styles = """const riskStyles: Record<RiskLevel, string> = {
  "Very Low": "bg-slate-100 text-slate-700",
  "Low": "bg-blue-100 text-blue-700",
  "Medium": "bg-orange-100 text-orange-700",
  "High": "bg-red-100 text-red-700",
  "Critical": "bg-purple-100 text-purple-700"
};"""

new_risk_styles = """const riskStyles: Record<RiskLevel, string> = {
  "Very Low": "bg-green-50 text-green-700 border border-green-200",
  "Low": "bg-green-100 text-green-800 border border-green-300",
  "Medium": "bg-yellow-100 text-yellow-800 border border-yellow-300",
  "High": "bg-orange-100 text-orange-800 border border-orange-300",
  "Critical": "bg-red-100 text-red-800 border border-red-300"
};"""

old_matrix_styles = """const RISK_CELL_STYLES: Record<RiskLevel, string> = {
  "Very Low": "bg-slate-100 text-slate-600 hover:bg-slate-200",
  "Low": "bg-blue-100 text-blue-700 hover:bg-blue-200",
  "Medium": "bg-orange-100 text-orange-700 hover:bg-orange-200",
  "High": "bg-red-100 text-red-700 hover:bg-red-200",
  "Critical": "bg-purple-100 text-purple-700 hover:bg-purple-200"
};"""

new_matrix_styles = """const RISK_CELL_STYLES: Record<RiskLevel, string> = {
  "Very Low": "bg-green-300 text-green-900 hover:bg-green-400",
  "Low": "bg-green-400 text-green-900 hover:bg-green-500",
  "Medium": "bg-yellow-300 text-yellow-900 hover:bg-yellow-400",
  "High": "bg-orange-400 text-orange-900 hover:bg-orange-500",
  "Critical": "bg-red-500 text-white hover:bg-red-600"
};"""

content = content.replace(old_risk_styles, new_risk_styles)
content = content.replace(old_matrix_styles, new_matrix_styles)

# Update the table risk pills to have border
content = re.sub(r'className={`px-2\.5 py-1 text-\[10px\] font-bold rounded-full uppercase \$\{riskStyles\[threat\.risk\]\}`}',
                 r'className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase ${riskStyles[threat.risk]}`}', content)


with open("src/components/ThreatRegister.tsx", "w") as f:
    f.write(content)
