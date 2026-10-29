with open("src/components/ASVSWorkspace.tsx", "r") as f:
    content = f.read()

old_button = """          <button 
             onClick={() => setIsChaptersOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-slate-200 rounded-md text-slate-700 bg-white"
          >"""

new_button = """          <button 
             onClick={() => setIsChaptersOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-slate-200 rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
          >"""

content = content.replace(old_button, new_button)

with open("src/components/ASVSWorkspace.tsx", "w") as f:
    f.write(content)
