import re

with open("src/components/AnalysisLayout.tsx", "r") as f:
    content = f.read()

old_reqs = """  // Read current ASVS Requirements state
  let reqs: ASVSRequirement[] = [];
  try {
    const data = localStorage.getItem(asvsKey);
    if (data) {
      reqs = JSON.parse(data);
    }
  } catch (e) {
    console.error(e);
  }"""

new_reqs = """  // Read current ASVS Requirements state
  let reqs: ASVSRequirement[] = [...asvsRequirements];
  try {
    const data = localStorage.getItem(asvsKey);
    if (data) {
      reqs = JSON.parse(data);
    }
  } catch (e) {
    console.error(e);
  }"""

content = content.replace(old_reqs, new_reqs)

# Also fix the import to include asvsRequirements
if "asvsRequirements" not in content[:500]:
    content = content.replace('import { ASVSRequirement } from "../data/asvsData";', 'import { ASVSRequirement, asvsRequirements } from "../data/asvsData";')

with open("src/components/AnalysisLayout.tsx", "w") as f:
    f.write(content)
