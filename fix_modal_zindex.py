with open("src/components/ASVSTriageModal.tsx", "r") as f:
    content = f.read()

content = content.replace("z-50", "z-[60]")

with open("src/components/ASVSTriageModal.tsx", "w") as f:
    f.write(content)
