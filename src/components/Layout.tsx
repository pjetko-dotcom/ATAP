/**
 * Layout components for the application shell.
 * Provides the main navigation sidebar and a container for nested routes.
 * 
 * @module Layout
 */
import { useState, useEffect, useRef, useMemo } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Shield, LayoutDashboard, FileText, Component, Lock, AlertTriangle, CheckCircle, FileDown, History, HelpCircle, X, Menu, Pin, PinOff, ChevronRight, Pencil, UserRound, Database, Search } from "lucide-react";
import { getCurrentUserName, setCurrentUserName } from "../utils/activityLog";
import { BackupRestoreModal } from "./BackupRestoreModal";
import { useAnalyses } from "../hooks/useAnalyses";
import packageInfo from "../../package.json";
import { useLanguage } from "../context/LanguageContext";
import { LanguageFlag } from "./LanguageFlag";
import { reportText, type ReportLanguage } from "../utils/reportLanguage";

const SIDEBAR_LOCK_KEY = "atap_sidebar_locked";
const appVersion = packageInfo.version;

interface WorkspaceSearchResult {
  id: string;
  title: string;
  detail: string;
  category: string;
  path: string;
}

interface SearchableRequirement {
  id: string;
  title: string;
  chapterId?: number;
  description?: string;
  status?: string;
}

interface SearchableThreat {
  id: string;
  title: string;
  description?: string;
  stride?: string;
}

function readWorkspaceArray<T>(key: string): T[] {
  try {
    const stored = localStorage.getItem(key);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch (error) {
    console.error(`Failed to index workspace search data (${key})`, error);
    return [];
  }
}

function buildWorkspaceSearchIndex(analyses: Array<{ id: string; name: string }>, language: ReportLanguage): WorkspaceSearchResult[] {
  const t = (sk: string, en: string) => reportText(language, sk, en);
  return analyses.flatMap(analysis => {
    const basePath = `/analysis/${analysis.id}`;
    const results: WorkspaceSearchResult[] = [{
      id: `${analysis.id}-project`,
      title: analysis.name,
      detail: t("Projekt", "Project"),
      category: t("Projekt", "Project"),
      path: `${basePath}/asvs`,
    }];
    const currentRequirements = readWorkspaceArray<SearchableRequirement>(`atap_asvs_v5_${analysis.id}`);
    const requirements = currentRequirements.length > 0
      ? currentRequirements
      : readWorkspaceArray<SearchableRequirement>(`atap_asvs_${analysis.id}`);
    const uniqueRequirements = Array.from(new Map(requirements.map(item => [item.id, item])).values());
    results.push(...uniqueRequirements.map(item => ({
      id: `${analysis.id}-asvs-${item.id}`,
      title: `${item.id} ${item.title}`,
      detail: `${analysis.name} · ${item.status || "Pending"} · ${item.description || ""}`,
      category: "ASVS",
      path: `${basePath}/asvs?${item.chapterId ? `chapter=${item.chapterId}&` : ""}search=${encodeURIComponent(item.id)}`,
    })));
    results.push(...readWorkspaceArray<SearchableThreat>(
      `atap_threats_${analysis.id}`
    ).map(item => ({
      id: `${analysis.id}-threat-${item.id}`,
      title: `${item.id} ${item.title}`,
      detail: `${analysis.name} · ${item.stride || t("Hrozba", "Threat")} · ${item.description || ""}`,
      category: t("Hrozba", "Threat"),
      path: `${basePath}/threats?search=${encodeURIComponent(item.id)}`,
    })));
    const architecture = (() => {
      try {
        const raw = localStorage.getItem(`atap_architecture_${analysis.id}`);
        return raw ? JSON.parse(raw) as { components?: Array<{ id: string; name: string; tech?: string; type?: string }> } : null;
      } catch (error) {
        console.error(`Failed to index architecture search data (${analysis.id})`, error);
        return null;
      }
    })();
    results.push(...(architecture?.components || []).map(component => ({
      id: `${analysis.id}-component-${component.id}`,
      title: component.name,
      detail: `${analysis.name} · ${component.type || t("Komponent", "Component")} · ${component.tech || ""}`,
      category: t("Komponent", "Component"),
      path: `${basePath}/architecture?component=${encodeURIComponent(component.id)}`,
    })));
    results.push(...uniqueRequirements
      .filter(item => item.status === "Missing" || item.status === "Partial")
      .map(item => ({
        id: `${analysis.id}-finding-${item.id}`,
        title: `${item.id} ${item.title}`,
        detail: `${analysis.name} · ${item.status} · ${item.description || ""}`,
        category: t("Zistenie / nedostatok", "Finding / gap"),
        path: `${basePath}/asvs?${item.chapterId ? `chapter=${item.chapterId}&` : ""}search=${encodeURIComponent(item.id)}`,
      })));
    return results;
  });
}

function readSidebarLockState(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_LOCK_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Main Layout component.
 * Renders the sidebar navigation (Dashboard, Analysis Lifecycle, Reporting)
 * and uses an `<Outlet />` to render the matched child route.
 * 
 * @returns {JSX.Element} The rendered layout component.
 */
export function Layout() {
  const { language, setLanguage, persistenceError, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { analyses } = useAnalyses();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchResult, setActiveSearchResult] = useState(0);
  const [searchIndexRevision, setSearchIndexRevision] = useState(0);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchModalRef = useRef<HTMLElement>(null);
  const searchIndex = useMemo(() => buildWorkspaceSearchIndex(analyses, language), [analyses, searchIndexRevision, language]);
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return searchIndex.slice(0, 12);
    return searchIndex.filter(result =>
      `${result.title} ${result.detail} ${result.category}`.toLocaleLowerCase().includes(query)
    ).slice(0, 30);
  }, [searchIndex, searchQuery]);
  const searchResultsRef = useRef(searchResults);
  const activeSearchResultRef = useRef(activeSearchResult);
  searchResultsRef.current = searchResults;
  activeSearchResultRef.current = activeSearchResult;
  const openWorkspaceSearch = () => {
    setSearchQuery("");
    setSearchIndexRevision(revision => revision + 1);
    setIsSearchOpen(true);
  };
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [userName, setUserName] = useState(getCurrentUserName);
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const [userNameDraft, setUserNameDraft] = useState(userName);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
  );
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileSearchButtonRef = useRef<HTMLButtonElement>(null);
  const mobileOverlayButtonRef = useRef<HTMLButtonElement>(null);
  const profileModalRef = useRef<HTMLFormElement>(null);
  
  // Sidebar state
  const [isSidebarLocked, setIsSidebarLocked] = useState(readSidebarLockState);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const isExpanded = isSidebarLocked || isSidebarHovered || isMobileMenuOpen;
  
  // Close mobile menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        const target = event.target;
        if (target instanceof HTMLElement && (
          target.isContentEditable ||
          target.closest("input, textarea, select, [contenteditable='true'], [aria-modal='true']")
        )) return;
        event.preventDefault();
        openWorkspaceSearch();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!isSearchOpen) return;
    setActiveSearchResult(0);
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    searchInputRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSearchOpen(false);
      } else if (event.key === "ArrowDown" && searchResultsRef.current.length > 0) {
        event.preventDefault();
        setActiveSearchResult(index => (index + 1) % searchResultsRef.current.length);
      } else if (event.key === "ArrowUp" && searchResultsRef.current.length > 0) {
        event.preventDefault();
        setActiveSearchResult(index => (index - 1 + searchResultsRef.current.length) % searchResultsRef.current.length);
      } else if (event.key === "Enter" && searchResultsRef.current[activeSearchResultRef.current]) {
        event.preventDefault();
        navigate(searchResultsRef.current[activeSearchResultRef.current].path);
        setIsSearchOpen(false);
        setSearchQuery("");
      } else if (event.key === "Tab" && searchModalRef.current) {
        const focusable = Array.from(searchModalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [isSearchOpen, navigate]);

  useEffect(() => {
    setActiveSearchResult(0);
  }, [searchQuery]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen || !isMobileViewport) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const nav = document.getElementById("app-navigation");
    const mobileSearchButton = mobileSearchButtonRef.current;
    const overlayButton = mobileOverlayButtonRef.current;
    const focusableElements = [
      ...(mobileSearchButton ? [mobileSearchButton] : []),
      ...(mobileMenuButtonRef.current ? [mobileMenuButtonRef.current] : []),
      ...(overlayButton ? [overlayButton] : []),
      ...Array.from(nav?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') || []),
    ];
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
        return;
      }
      if (event.key !== "Tab" || focusableElements.length < 2) return;
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [isMobileMenuOpen, isMobileViewport]);

  useEffect(() => {
    const syncUserName = () => setUserName(getCurrentUserName());
    window.addEventListener("storage", syncUserName);
    window.addEventListener("local_profile_update", syncUserName);
    return () => {
      window.removeEventListener("storage", syncUserName);
      window.removeEventListener("local_profile_update", syncUserName);
    };
  }, []);

  useEffect(() => {
    if (!isProfileEditorOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableElements = Array.from(
      profileModalRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) || []
    );
    focusableElements[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileEditorOpen(false);
        return;
      }
      if (event.key !== "Tab" || focusableElements.length === 0) return;
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [isProfileEditorOpen]);

  const openProfileEditor = () => {
    setUserNameDraft(userName);
    setProfileError(null);
    setIsProfileEditorOpen(true);
  };

  const toggleSidebarLock = () => {
    const nextLocked = !isSidebarLocked;
    setIsSidebarLocked(nextLocked);
    try {
      localStorage.setItem(SIDEBAR_LOCK_KEY, String(nextLocked));
    } catch (error) {
      console.error("Failed to save sidebar preference", error);
    }
  };

  const saveProfile = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = userNameDraft.trim();
    if (!trimmedName) {
      setProfileError(t("Meno nemôže byť prázdne.", "The name cannot be empty."));
      return;
    }

    try {
      setCurrentUserName(trimmedName);
      setUserName(trimmedName);
      setIsProfileEditorOpen(false);
      window.dispatchEvent(new Event("local_profile_update"));
    } catch (error) {
      console.error("Failed to save local profile name", error);
      setProfileError(t("Meno sa nepodarilo uložiť. Skontrolujte dostupné úložisko prehliadača.", "Could not save the name. Check browser storage."));
    }
  };

  // Extract analysis ID from the current route path to maintain contextual links.
  const match = location.pathname.match(/\/analysis\/([^\/]+)/);
  const pathId = match ? match[1] : null;
  const guideAnalysisId = location.pathname === "/guide" ? new URLSearchParams(location.search).get("analysis") : null;
  const activeAnalysisId = pathId && pathId !== "new"
    ? pathId
    : analyses.find(analysis => analysis.id === guideAnalysisId)?.id || null;

  const navLinks = [
    { name: t("Prehľad", "Dashboard"), path: "/", icon: LayoutDashboard },
  ];

  const analysisLinks = activeAnalysisId ? [
    { name: t("Kontext aplikácie", "Application Context"), path: `/analysis/${activeAnalysisId}/context`, icon: FileText },
    { name: t("Model architektúry", "Architecture Model"), path: `/analysis/${activeAnalysisId}/architecture`, icon: Component },
    { name: t("Analýza STRIDE", "STRIDE Analysis"), path: `/analysis/${activeAnalysisId}/stride`, icon: Shield },
    { name: t("Pracovný priestor ASVS", "ASVS Workspace"), path: `/analysis/${activeAnalysisId}/asvs`, icon: Lock },
    { name: t("Register hrozieb", "Threat Register"), path: `/analysis/${activeAnalysisId}/threats`, icon: AlertTriangle },
    { name: t("Zistenia a nedostatky", "Findings & Gaps"), path: `/analysis/${activeAnalysisId}/findings`, icon: CheckCircle },
  ] : [];

  const reportLinks = activeAnalysisId ? [
    { name: t("Export reportov", "Report export"), path: `/analysis/${activeAnalysisId}/export`, icon: FileDown },
    { name: t("Auditná stopa", "Audit Trail"), path: `/analysis/${activeAnalysisId}/audit`, icon: History },
  ] : [];

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <a
        href="#main-content"
        className="absolute left-2 top-2 z-[100] -translate-y-20 rounded bg-white px-3 py-2 text-sm font-semibold text-blue-700 shadow focus:translate-y-0"
      >
        {t("Preskočiť na obsah", "Skip to content")}
      </a>
      
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0 z-20 relative shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center font-bold text-white">
            <Shield size={14} />
          </div>
          <span className="text-base font-bold tracking-tight uppercase">AVERT <span className="text-blue-500">V{appVersion}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setLanguage(language === "sk" ? "en" : "sk")} aria-label={t("Prepnúť rozhranie do angličtiny", "Switch interface to Slovak")} className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 p-1.5 text-xs font-bold">
            <LanguageFlag language={language} /> {language.toUpperCase()}
          </button>
          <button ref={mobileSearchButtonRef} type="button" onClick={openWorkspaceSearch} aria-label={t("Otvoriť vyhľadávanie (Ctrl/Cmd+K)", "Open search (Ctrl/Cmd+K)")} className="rounded-md border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:text-white">
            <Search size={19} />
          </button>
          <button
            ref={mobileMenuButtonRef}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? t("Zavrieť navigáciu", "Close navigation") : t("Otvoriť navigáciu", "Open navigation")}
            aria-expanded={isMobileMenuOpen}
            aria-controls="app-navigation"
            className="p-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer rounded-md bg-slate-800 border border-slate-700"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {persistenceError && <p role="alert" className="md:hidden bg-red-50 px-4 py-2 text-xs text-red-700">{t("Jazyk sa nepodarilo uložiť.", "Could not save the language preference.")}</p>}

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <button
          ref={mobileOverlayButtonRef}
          type="button"
          aria-label={t("Zavrieť menu kliknutím mimo", "Close menu")}
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}


            {/* Desktop Sidebar Spacer (reserves space in normal flow) */}
      <div className={`hidden md:block shrink-0 transition-all duration-300 ${isSidebarLocked ? 'w-64' : 'w-16'}`} />

      {/* Sidebar Navigation */}
      <aside 
        id="app-navigation"
        aria-label={t("Hlavná navigácia", "Main navigation")}
        aria-hidden={isMobileViewport && !isMobileMenuOpen}
        inert={isMobileViewport && !isMobileMenuOpen}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`
          fixed inset-y-0 left-0 z-40 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 overflow-hidden 
          transform transition-all duration-300 ease-in-out
          ${isMobileMenuOpen ? "translate-x-0 w-64 shadow-2xl flex" : "-translate-x-full md:translate-x-0 md:flex"}
          ${isExpanded ? 'md:w-64' : 'md:w-16'}
        `}
      >
        <div className={`p-4 overflow-y-auto overflow-x-hidden flex-1 sidebar-scrollbar ${isExpanded ? "" : "sidebar-scrollbar-collapsed"}`}>

          <div className="flex items-center justify-between mb-8 overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white shrink-0">
                <Shield size={20} />
              </div>
              <div className={`min-w-0 transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"}`}>
                <h1 className="text-white font-bold text-lg tracking-tight uppercase whitespace-nowrap">AVERT <span className="text-blue-400 text-xs">V{appVersion}</span></h1>
                <p className="max-w-52 text-[9px] leading-tight text-slate-400">
                  Architecture · STRIDE · Risk · ASVS · Reports
                </p>
              </div>
            </div>
            {isExpanded && (
              <button 
                onClick={toggleSidebarLock}
                aria-label={isSidebarLocked ? t("Odomknúť navigačný panel", "Unpin navigation") : t("Pripnúť navigačný panel", "Pin navigation")}
                aria-pressed={isSidebarLocked}
                className="hidden md:flex text-slate-400 hover:text-white p-1 rounded transition-colors"
                title={isSidebarLocked ? "Unlock Sidebar" : "Lock Sidebar"}
              >
                {isSidebarLocked ? <PinOff size={16} /> : <Pin size={16} />}
              </button>
            )}
          </div>
          <nav aria-label={t("Sekcie aplikácie", "Application sections")} className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                aria-current={location.pathname === link.path ? "page" : undefined}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md ${
                  location.pathname === link.path
                    ? "bg-slate-800 text-white"
                    : "hover:bg-slate-800 hover:text-white"
                }`}
              >
                <div className="shrink-0"><link.icon size={16} /></div>
                <span className={`whitespace-nowrap transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0 md:w-auto overflow-hidden"}`}>{link.name}</span>
              </Link>
            ))}
            
            {activeAnalysisId && (
              <>
                <div className={`pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap overflow-hidden transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0 md:w-auto overflow-hidden"}`}>{t("Priebeh analýzy", "Analysis Lifecycle")}</div>
                {analysisLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    aria-current={location.pathname.includes(link.path) ? "page" : undefined}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md ${
                      location.pathname.includes(link.path)
                        ? "bg-slate-800 text-white text-blue-400"
                        : "hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <div className="shrink-0"><link.icon size={16} /></div>
                    <span className={`whitespace-nowrap transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0 md:w-auto overflow-hidden"}`}>{link.name}</span>
                  </Link>
                ))}

                <div className={`pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap overflow-hidden transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0 md:w-auto overflow-hidden"}`}>{t("Reporty", "Reporting")}</div>
                {reportLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    aria-current={location.pathname.includes(link.path) ? "page" : undefined}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md ${
                      location.pathname.includes(link.path)
                        ? "bg-slate-800 text-white"
                        : "hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <div className="shrink-0"><link.icon size={16} /></div>
                    <span className={`whitespace-nowrap transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0 md:w-auto overflow-hidden"}`}>{link.name}</span>
                  </Link>
                ))}
              </>
            )}
          </nav>
        </div>
        <div className="mt-auto border-t border-slate-800">
          <button type="button" onClick={() => setLanguage(language === "sk" ? "en" : "sk")} aria-label={t("Prepnúť rozhranie do angličtiny", "Switch interface to Slovak")} title={t("Prepnúť jazyk rozhrania", "Switch interface language")} className="hidden md:flex w-full items-center gap-3 px-5 py-3 text-sm font-medium hover:bg-slate-800 hover:text-white">
            <LanguageFlag language={language} /><span>{language.toUpperCase()}</span>
          </button>
          {persistenceError && <p role="alert" className="px-3 text-xs text-red-300">{t("Jazyk sa nepodarilo uložiť.", "Could not save the language preference.")}</p>}
          <button
            ref={searchButtonRef}
            type="button"
            onClick={openWorkspaceSearch}
            aria-label={t("Hľadať v pracovných priestoroch (Ctrl/Cmd+K)", "Search workspaces (Ctrl/Cmd+K)")}
            title={t("Hľadať (Ctrl/Cmd+K)", "Search (Ctrl/Cmd+K)")}
            className="w-full flex items-center gap-3 px-6 py-3 text-sm font-medium hover:bg-slate-800 hover:text-white transition-colors text-slate-400"
          >
            <div className="shrink-0"><Search size={16} /></div>
            <span className={`whitespace-nowrap transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0 md:w-auto overflow-hidden"}`}>{t("Hľadať", "Search")} <kbd className="ml-1 rounded border border-slate-700 px-1 text-[10px]">Ctrl/Cmd+K</kbd></span>
          </button>
          <button
            type="button"
            onClick={() => setIsBackupModalOpen(true)}
            aria-label={t("Zálohovať a obnoviť projekty", "Backup and restore projects")}
            title={t("Záloha a obnova", "Backup & Restore")}
            className="w-full flex items-center gap-3 px-6 py-3 text-sm font-medium hover:bg-slate-800 hover:text-white transition-colors text-slate-400"
          >
            <div className="shrink-0"><Database size={16} /></div>
            <span className={`whitespace-nowrap transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0 md:w-auto overflow-hidden"}`}>{t("Záloha a obnova", "Backup & Restore")}</span>
          </button>
          <Link
            to={activeAnalysisId ? `/guide?${new URLSearchParams({ analysis: activeAnalysisId })}` : "/guide"}
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label={t("Pomoc a dokumentácia", "Help & Documentation")}
            title={t("Pomoc a dokumentácia", "Help & Documentation")}
            aria-current={location.pathname === "/guide" ? "page" : undefined}
            className="w-full flex items-center gap-3 px-6 py-4 text-sm font-medium hover:bg-slate-800 hover:text-white transition-colors text-slate-400"
          >
            <div className="shrink-0"><HelpCircle size={16} /></div>
            <span className={`whitespace-nowrap transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0 md:w-auto overflow-hidden"}`}>{t("Pomoc a dokumentácia", "Help & Documentation")}</span>
          </Link>
          <div className="p-4 pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={openProfileEditor}
              aria-label={`${t("Upraviť profil", "Edit profile")}: ${userName}`}
              title={t("Upraviť profil", "Edit profile")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-slate-200 hover:bg-slate-600"
            >
              <UserRound size={15} />
            </button>
            <div className={`min-w-0 flex-1 text-xs transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"}`}>
              <p className="truncate text-white font-medium">{userName}</p>
              <p className="opacity-50 uppercase tracking-widest">{t("Lokálny profil", "Local profile")}</p>
            </div>
            <button
              type="button"
              onClick={openProfileEditor}
              aria-label={t("Premenovať profil", "Rename profile")}
              title={t("Premenovať profil", "Rename profile")}
              className={`shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors ${isExpanded ? "" : "hidden"}`}
            >
              <Pencil size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col min-w-0 bg-slate-50 relative z-0">
        <Outlet context={{ activeAnalysisId }} />
      </main>

      {isSearchOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-950/50 p-4 pt-[12vh]"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setIsSearchOpen(false);
          }}
        >
          <section ref={searchModalRef} role="dialog" aria-modal="true" aria-labelledby="workspace-search-title" className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-200 px-4">
              <Search size={19} className="shrink-0 text-slate-400" />
              <h2 id="workspace-search-title" className="sr-only">{t("Hľadať v pracovných priestoroch", "Search workspaces")}</h2>
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder={t("Hľadať hrozby, ASVS, komponenty a zistenia…", "Search threats, ASVS, components and findings…")}
                aria-label={t("Hľadať v projektoch", "Search projects")}
                aria-controls="workspace-search-results"
                aria-activedescendant={searchResults.length > 0
                  ? `workspace-search-option-${Math.min(activeSearchResult, searchResults.length - 1)}`
                  : undefined}
                className="h-14 min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
              <button type="button" onClick={() => setIsSearchOpen(false)} aria-label={t("Zavrieť vyhľadávanie", "Close search")} className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50">Esc</button>
            </div>
            <div id="workspace-search-results" role="listbox" aria-label={t("Výsledky vyhľadávania", "Search results")} className="max-h-[55vh] overflow-y-auto p-2">
              {searchResults.map((result, index) => (
                <button
                  key={result.id}
                  id={`workspace-search-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={activeSearchResult === index}
                  onMouseEnter={() => setActiveSearchResult(index)}
                  onClick={() => {
                    navigate(result.path);
                    setIsSearchOpen(false);
                    setSearchQuery("");
                  }}
                  className={`flex w-full items-start justify-between gap-4 rounded-lg px-3 py-2.5 text-left ${activeSearchResult === index ? "bg-blue-50" : "hover:bg-slate-50"}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800">{result.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">{result.detail}</span>
                  </span>
                  <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{result.category}</span>
                </button>
              ))}
              {searchResults.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-slate-500">{t("Nenašli sa žiadne výsledky. Skúste iný výraz.", "No results found. Try another search.")}</p>
              )}
              <p role="status" aria-live="polite" className="sr-only">
                {searchResults.length} {t(searchResults.length === 1 ? "výsledok" : "výsledkov", searchResults.length === 1 ? "result" : "results")}
              </p>
              {searchQuery.trim().length === 0 && searchResults.length > 0 && (
                <p className="px-4 py-2 text-[11px] text-slate-400">{t("Začnite písať. Výsledky vyberte šípkami, otvorte Enterom alebo zatvorte Escapeom.", "Start typing. Select results with arrow keys, open with Enter or close with Escape.")}</p>
              )}
            </div>
          </section>
        </div>
      )}

      {isProfileEditorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setIsProfileEditorOpen(false);
          }}
        >
          <form ref={profileModalRef} role="dialog" aria-modal="true" aria-labelledby="local-profile-title" onSubmit={saveProfile} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserRound size={18} className="text-blue-600" />
                <h2 id="local-profile-title" className="text-base font-bold text-slate-800">{t("Meno profilu", "Profile name")}</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileEditorOpen(false)}
                aria-label={t("Zavrieť", "Close")}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <label htmlFor="local-profile-name" className="mb-1 block text-xs font-semibold text-slate-700">
              {t("Zobrazované meno", "Display name")}
            </label>
            <input
              id="local-profile-name"
              maxLength={80}
              required
              value={userNameDraft}
              onChange={event => setUserNameDraft(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="mt-2 text-xs text-slate-500">
              {t("Meno sa uloží lokálne v tomto prehliadači a použije sa v nových záznamoch.", "The name is stored locally in this browser and used for new records.")}
            </p>
            {profileError && <p role="alert" className="mt-2 text-xs text-red-600">{profileError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsProfileEditorOpen(false)}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {t("Zrušiť", "Cancel")}
              </button>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                {t("Uložiť", "Save")}
              </button>
            </div>
          </form>
        </div>
      )}
      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
    </div>
  );
}
