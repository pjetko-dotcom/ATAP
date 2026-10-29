with open("src/components/ASVSWorkspace.tsx", "r") as f:
    content = f.read()

content = content.replace("ChevronDown,", "Info, ChevronDown,")

with open("src/components/ASVSWorkspace.tsx", "w") as f:
    f.write(content)
