import re

with open("src/components/ASVSWorkspace.tsx", "r") as f:
    content = f.read()

# Make the chapters sidebar collapsible on desktop too.
old_sidebar = """    <div className="flex h-full gap-6">
      {/* Sidebar for Chapters */}
      <div className="w-64 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col hidden lg:flex h-full">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <BookOpen size={18} className="text-blue-600" />
          <h3 className="font-bold text-slate-800 text-sm">ASVS 5.0 Chapters</h3>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {asvsChapters.map(chapter => (
            <button
              key={chapter.id}
              onClick={() => setActiveChapterId(chapter.id)}
              className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${activeChapterId === chapter.id ? 'bg-blue-50 text-blue-700 font-bold border-r-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <span className="truncate pr-2">V{chapter.id}: {chapter.name}</span>
            </button>
          ))}
        </div>
      </div>"""

# Replace it with a responsive drawer/collapsible sidebar
# Add state: const [isChaptersOpen, setIsChaptersOpen] = useState(false);
new_state = """  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isChaptersOpen, setIsChaptersOpen] = useState(false);"""
content = content.replace("  const [isSummaryOpen, setIsSummaryOpen] = useState(false);", new_state)

new_sidebar = """    <div className="flex h-full gap-4 relative">
      {/* Mobile Chapters Overlay */}
      {isChaptersOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 z-20 lg:hidden"
          onClick={() => setIsChaptersOpen(false)}
        />
      )}

      {/* Sidebar for Chapters */}
      <div className={`
        absolute lg:static inset-y-0 left-0 z-30 w-64 bg-white border border-slate-200 rounded-lg shadow-xl lg:shadow-sm flex flex-col transform transition-transform duration-300 ease-in-out h-full shrink-0
        ${isChaptersOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-blue-600" />
            <h3 className="font-bold text-slate-800 text-sm">ASVS Chapters</h3>
          </div>
          <button onClick={() => setIsChaptersOpen(false)} className="lg:hidden p-1 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          {asvsChapters.map(chapter => (
            <button
              key={chapter.id}
              onClick={() => {
                setActiveChapterId(chapter.id);
                setIsChaptersOpen(false); // Auto-close on mobile
              }}
              className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${activeChapterId === chapter.id ? 'bg-blue-50 text-blue-700 font-bold border-r-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <span className="truncate pr-2">V{chapter.id}: {chapter.name}</span>
            </button>
          ))}
        </div>
      </div>"""

content = content.replace(old_sidebar, new_sidebar)

# We also need to add a button to open the chapters menu on mobile, maybe in the top header.
# Let's find: `      <div className="flex-1 flex flex-col h-full min-w-0">`
# And add a button next to the chapter title.

old_header = """        {/* Chapter Header & Controls */}
        <div className="bg-white p-4 lg:p-6 rounded-lg border border-slate-200 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {activeChapter?.name}
              </h2>
              <p className="text-xs text-slate-500 mt-1">V{activeChapter?.id} • {filteredRequirements.length} requirements</p>
            </div>"""

new_header = """        {/* Chapter Header & Controls */}
        <div className="bg-white p-4 lg:p-6 rounded-lg border border-slate-200 shadow-sm mb-6 flex-shrink-0">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4">
            <div className="flex items-start gap-3">
              <button 
                onClick={() => setIsChaptersOpen(true)}
                className="lg:hidden mt-0.5 p-1.5 border border-slate-200 rounded text-slate-500 hover:bg-slate-50"
              >
                <BookOpen size={16} />
              </button>
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  {activeChapter?.name}
                </h2>
                <p className="text-xs text-slate-500 mt-1">V{activeChapter?.id} • {filteredRequirements.length} requirements</p>
              </div>
            </div>"""

content = content.replace(old_header, new_header)

# Make sure X is imported
if " X," not in content and " X " not in content:
    content = content.replace('Download, BookOpen } from "lucide-react";', 'Download, BookOpen, X } from "lucide-react";')


with open("src/components/ASVSWorkspace.tsx", "w") as f:
    f.write(content)
