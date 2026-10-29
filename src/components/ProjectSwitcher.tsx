/**
 * Project Switcher Component
 * Enables quick project switching and inline renaming from the ASVS workspace
 * and all analysis lifecycle screens.
 * 
 * @module ProjectSwitcher
 */
import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  FolderGit2, 
  ChevronDown, 
  Check, 
  Pencil, 
  Plus, 
  LayoutTemplate, 
  Search, 
  X, 
  Shield,
  Layers
} from "lucide-react";
import { useAnalyses, Analysis } from "../hooks/useAnalyses";

interface ProjectSwitcherProps {
  currentAnalysis: Analysis;
  onOpenRenameModal: (id: string, name: string) => void;
}

export function ProjectSwitcher({
  currentAnalysis,
  onOpenRenameModal
}: ProjectSwitcherProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { analyses } = useAnalyses();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Determine current active subroute (e.g. "asvs", "threats", "findings", "context", etc.)
  const getCurrentSubpath = () => {
    const parts = location.pathname.split(`/analysis/${currentAnalysis.id}/`);
    return parts[1] || "asvs";
  };

  const handleSelectProject = (project: Analysis) => {
    if (project.id === currentAnalysis.id) {
      setIsOpen(false);
      return;
    }

    const currentSub = getCurrentSubpath();
    navigate(`/analysis/${project.id}/${currentSub}`);
    setIsOpen(false);
    setSearchQuery("");
  };

  // Filter projects based on search query
  const filteredProjects = analyses.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.systemType && p.systemType.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.asvsLevel && `l${p.asvsLevel}`.includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="relative" ref={containerRef}>
      {/* Project Switcher Bar */}
      <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-lg p-1 pr-1.5 transition-colors">
        
        {/* ASVS Level Badge */}
        <span 
          className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded uppercase border border-blue-200 shrink-0"
          title={`Cieľový OWASP ASVS Level: L${currentAnalysis.asvsLevel}`}
        >
          L{currentAnalysis.asvsLevel}
        </span>

        {/* Project Selector Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-1.5 py-0.5 text-left rounded cursor-pointer group"
          title="Prepnúť na iný projekt alebo spravovať projekty"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <FolderGit2 size={15} className="text-blue-600 shrink-0" />
          
          <span className="text-sm md:text-base font-bold text-slate-800 tracking-tight truncate max-w-[150px] sm:max-w-[220px] md:max-w-xs group-hover:text-blue-700 transition-colors">
            {currentAnalysis.name}
          </span>

          <ChevronDown 
            size={14} 
            className={`text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0 ${
              isOpen ? "rotate-180" : ""
            }`} 
          />
        </button>

        {/* Quick Rename Button right in header */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenRenameModal(currentAnalysis.id, currentAnalysis.name);
          }}
          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50/80 rounded transition-colors cursor-pointer shrink-0"
          title="Premenovať aktuálny projekt"
        >
          <Pencil size={13} />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-84 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          
          {/* Dropdown Header */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={15} className="text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Projekty / Workspaces
              </span>
            </div>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-200">
              {analyses.length} {analyses.length === 1 ? 'projekt' : analyses.length < 5 ? 'projekty' : 'projektov'}
            </span>
          </div>

          {/* Quick Search Filter (if multiple projects) */}
          {analyses.length > 2 && (
            <div className="p-2.5 border-b border-slate-100 bg-white">
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrovať projekty..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-slate-800 transition-colors"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Projects List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
            {filteredProjects.map((project) => {
              const isCurrent = project.id === currentAnalysis.id;

              return (
                <div
                  key={project.id}
                  onClick={() => handleSelectProject(project)}
                  className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-colors group ${
                    isCurrent 
                      ? "bg-blue-50/70 border-l-3 border-blue-600" 
                      : "hover:bg-slate-50 border-l-3 border-transparent"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-xs text-slate-800 truncate group-hover:text-blue-700 transition-colors">
                        {project.name}
                      </span>
                      {isCurrent && (
                        <span className="px-1.5 py-0.2 bg-blue-600 text-white text-[9px] font-bold rounded uppercase tracking-wider shrink-0">
                          Aktívny
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 text-[10px] font-bold rounded">
                        L{project.asvsLevel}
                      </span>
                      <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 text-[10px] font-medium rounded">
                        v{project.currentVersion || "1.0"}
                      </span>
                      <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded uppercase tracking-wider ${
                        project.status === "Final" 
                          ? "bg-emerald-100 text-emerald-800" 
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {project.status || "Draft"}
                      </span>
                      {project.systemType && (
                        <span className="text-[10px] text-slate-400 capitalize">
                          • {project.systemType}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Inline Rename Button for any project in list */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                        onOpenRenameModal(project.id, project.name);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-200/60 rounded-md transition-colors opacity-80 group-hover:opacity-100 cursor-pointer"
                      title={`Premenovať "${project.name}"`}
                    >
                      <Pencil size={13} />
                    </button>

                    {isCurrent && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredProjects.length === 0 && (
              <div className="p-6 text-center text-slate-400 text-xs">
                Nenašli sa žiadne projekty zodpovedajúce filtru "{searchQuery}".
              </div>
            )}
          </div>

          {/* Dropdown Footer Actions */}
          <div className="p-2 bg-slate-50 border-t border-slate-100 flex flex-col gap-1 text-xs">
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenRenameModal(currentAnalysis.id, currentAnalysis.name);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:text-blue-600 hover:bg-white rounded-lg font-semibold transition-colors cursor-pointer"
            >
              <Pencil size={13} className="text-slate-400" />
              <span>Premenovať aktuálny projekt</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                navigate("/analysis/new");
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-blue-600 hover:bg-blue-50/80 rounded-lg font-semibold transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Vytvoriť nový projekt...</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                navigate("/");
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:text-slate-800 hover:bg-white rounded-lg font-medium transition-colors cursor-pointer"
            >
              <LayoutTemplate size={13} className="text-slate-400" />
              <span>Prejsť na prehľad všetkých projektov</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
