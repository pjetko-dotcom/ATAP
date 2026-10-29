import re

with open("src/components/ASVSWorkspace.tsx", "r") as f:
    content = f.read()

# find:
pattern = r'const currentChapterTriageQuestions = activeSectionId === "all"\s*\?\s*chapterTriageQuestions\s*:\s*chapterTriageQuestions\.filter\(q =>\s*q\.sectionId === activeSectionId \|\|\s*\(q\.reqIds && q\.reqIds\.some\(id => id\.startsWith\(activeSectionId \+ "\."\)\)\)\s*\)\.length > 0\s*\?\s*chapterTriageQuestions\.filter\(q =>\s*q\.sectionId === activeSectionId \|\|\s*\(q\.reqIds && q\.reqIds\.some\(id => id\.startsWith\(activeSectionId \+ "\."\)\)\)\s*\)\s*:\s*chapterTriageQuestions;'

new_code = """const currentChapterTriageQuestions = activeSectionId === "all"
    ? chapterTriageQuestions
    : chapterTriageQuestions.filter(q => 
         q.sectionId === activeSectionId ||
        (q.reqIds && q.reqIds.some(id => id.startsWith(activeSectionId + ".")))
      );"""

content = re.sub(pattern, new_code, content)

with open("src/components/ASVSWorkspace.tsx", "w") as f:
    f.write(content)

