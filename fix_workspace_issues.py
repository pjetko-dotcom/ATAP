import re

with open("src/components/ASVSWorkspace.tsx", "r") as f:
    content = f.read()

# 1. Fix Triage Questions Fallback
triage_logic_old = """  const currentChapterTriageQuestions = activeSectionId === "all"
    ? chapterTriageQuestions
    : chapterTriageQuestions.filter(q => 
         q.sectionId === activeSectionId ||
        (q.reqIds && q.reqIds.some(id => id.startsWith(activeSectionId + ".")))
      ).length > 0
        ? chapterTriageQuestions.filter(q => 
            q.sectionId === activeSectionId ||
            (q.reqIds && q.reqIds.some(id => id.startsWith(activeSectionId + ".")))
          )
        : chapterTriageQuestions;"""

triage_logic_new = """  const currentChapterTriageQuestions = activeSectionId === "all"
    ? chapterTriageQuestions
    : chapterTriageQuestions.filter(q => 
         q.sectionId === activeSectionId ||
        (q.reqIds && q.reqIds.some(id => id.startsWith(activeSectionId + ".")))
      );"""

content = content.replace(triage_logic_old, triage_logic_new)


# 2. Fix Section Click (close drawer)
section_btn_old = """onClick={() => setActiveSectionId("all")}"""
section_btn_new = """onClick={() => { setActiveSectionId("all"); setIsChaptersOpen(false); }}"""
content = content.replace(section_btn_old, section_btn_new)

section_btn_old2 = """onClick={() => setActiveSectionId(sec.id)}"""
section_btn_new2 = """onClick={() => { setActiveSectionId(sec.id); setIsChaptersOpen(false); }}"""
content = content.replace(section_btn_old2, section_btn_new2)

# 3. Make sidebar overlay on 'lg' as well, so it only becomes static on 'xl' (1280px+)
content = content.replace('className="fixed inset-0 bg-slate-900/20 z-20 lg:hidden"', 'className="fixed inset-0 bg-slate-900/20 z-20 xl:hidden"')
content = content.replace('absolute lg:static', 'absolute xl:static')
content = content.replace('lg:shadow-sm', 'xl:shadow-sm')
content = content.replace('lg:hidden p-1 text-slate-400', 'xl:hidden p-1 text-slate-400')
content = content.replace('-translate-x-full lg:translate-x-0', '-translate-x-full xl:translate-x-0')

# And fix the mobile toggle button to show on lg as well (hidden xl:flex instead of lg:hidden)
content = content.replace('flex items-center justify-between mb-2 lg:hidden', 'flex items-center justify-between mb-2 xl:hidden')

with open("src/components/ASVSWorkspace.tsx", "w") as f:
    f.write(content)
