with open("src/components/Layout.tsx", "r") as f:
    content = f.read()

# Make aside overflow-hidden to prevent text from sticking out while animating
content = content.replace("flex flex-col border-r border-slate-800", "flex flex-col border-r border-slate-800 overflow-hidden")

# Change opacity-0 md:hidden to just opacity-0 w-0 md:w-auto
old_span = "opacity-0 md:hidden"
new_span = "opacity-0 w-0 md:w-auto overflow-hidden"
content = content.replace(old_span, new_span)

with open("src/components/Layout.tsx", "w") as f:
    f.write(content)
