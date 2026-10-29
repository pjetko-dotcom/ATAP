import re
with open("src/components/ASVSWorkspace.tsx", "r") as f:
    content = f.read()

content = content.replace("import {\n  ChevronDown,", "import {\n  Info,\n  ChevronDown,")

with open("src/components/ASVSWorkspace.tsx", "w") as f:
    f.write(content)
