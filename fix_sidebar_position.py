with open("src/components/ASVSWorkspace.tsx", "r") as f:
    content = f.read()

old_sidebar = """      <div className={`
        fixed xl:static inset-y-0 left-0 z-50 w-72 bg-white border border-slate-200 rounded-lg shadow-xl xl:shadow-sm flex flex-col transform transition-transform duration-300 ease-in-out h-full shrink-0
        ${isChaptersOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0"}
      `}>"""

new_sidebar = """      <div className={`
        absolute xl:static inset-y-0 left-0 z-50 w-72 bg-white border border-slate-200 rounded-lg shadow-xl xl:shadow-sm flex flex-col transform transition-all duration-300 ease-in-out h-full shrink-0
        ${isChaptersOpen ? "translate-x-0 opacity-100 pointer-events-auto" : "-translate-x-12 xl:translate-x-0 opacity-0 xl:opacity-100 pointer-events-none xl:pointer-events-auto"}
      `}>"""

content = content.replace(old_sidebar, new_sidebar)

with open("src/components/ASVSWorkspace.tsx", "w") as f:
    f.write(content)
