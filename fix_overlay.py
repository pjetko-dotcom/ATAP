with open("src/components/ASVSWorkspace.tsx", "r") as f:
    content = f.read()

# Make the overlay z-40 so it covers Layout sidebar (which is z-40) or z-50
content = content.replace("fixed inset-0 bg-slate-900/20 z-20 xl:hidden", "fixed inset-0 bg-slate-900/50 z-40 xl:hidden")

with open("src/components/ASVSWorkspace.tsx", "w") as f:
    f.write(content)
