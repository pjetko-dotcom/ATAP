/**
 * Layout components for the application shell.
 * Provides the main navigation sidebar and a container for nested routes.
 * 
 * @module Layout
 */
import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Shield, LayoutDashboard, FileText, Component, Lock, AlertTriangle, CheckCircle, FileDown, History, HelpCircle, X, Menu, Pin, PinOff, ChevronRight } from "lucide-react";

/**
 * Main Layout component.
 * Renders the sidebar navigation (Dashboard, Analysis Lifecycle, Reporting)
 * and uses an `<Outlet />` to render the matched child route.
 * 
 * @returns {JSX.Element} The rendered layout component.
 */
export function Layout() {
  const location = useLocation();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Sidebar state
  const [isSidebarLocked, setIsSidebarLocked] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const isExpanded = isSidebarLocked || isSidebarHovered;
  
  // Close mobile menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Extract analysis ID from the current route path to maintain contextual links.
  const match = location.pathname.match(/\/analysis\/([^\/]+)/);
  const pathId = match ? match[1] : null;
  const activeAnalysisId = pathId && pathId !== "new" ? pathId : null;

  const navLinks = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
  ];

  const analysisLinks = activeAnalysisId ? [
    { name: "Application Context", path: `/analysis/${activeAnalysisId}/context`, icon: FileText },
    { name: "Architecture Model", path: `/analysis/${activeAnalysisId}/architecture`, icon: Component },
    { name: "STRIDE Analysis", path: `/analysis/${activeAnalysisId}/stride`, icon: Shield },
    { name: "ASVS Workspace", path: `/analysis/${activeAnalysisId}/asvs`, icon: Lock },
    { name: "Threat Register", path: `/analysis/${activeAnalysisId}/threats`, icon: AlertTriangle },
    { name: "Findings & Gaps", path: `/analysis/${activeAnalysisId}/findings`, icon: CheckCircle },
  ] : [];

  const reportLinks = activeAnalysisId ? [
    { name: "XLSX Export", path: `/analysis/${activeAnalysisId}/export`, icon: FileDown },
    { name: "Audit Trail", path: `/analysis/${activeAnalysisId}/audit`, icon: History },
  ] : [];

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0 z-20 relative shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center font-bold text-white">
            <Shield size={14} />
          </div>
          <span className="text-base font-bold tracking-tight uppercase">ATAP <span className="text-blue-500">V5.1</span></span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer rounded-md bg-slate-800 border border-slate-700"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}


            {/* Desktop Sidebar Spacer (reserves space in normal flow) */}
      <div className={`hidden md:block shrink-0 transition-all duration-300 ${isSidebarLocked ? 'w-64' : 'w-16'}`} />

      {/* Sidebar Navigation */}
      <aside 
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`
          fixed inset-y-0 left-0 z-40 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 overflow-hidden 
          transform transition-all duration-300 ease-in-out
          ${isMobileMenuOpen ? "translate-x-0 w-64 shadow-2xl flex" : "-translate-x-full md:translate-x-0 md:flex"}
          ${isExpanded ? 'md:w-64' : 'md:w-16'}
        `}
      >
        <div className="p-4 overflow-y-auto overflow-x-hidden flex-1">

          <div className="flex items-center justify-between mb-8 overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white shrink-0">
                <Shield size={20} />
              </div>
              <h1 className={`text-white font-bold text-lg tracking-tight uppercase whitespace-nowrap transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 md:w-auto overflow-hidden'}`}>ATAP V5.1</h1>
            </div>
            {isExpanded && (
              <button 
                onClick={() => setIsSidebarLocked(!isSidebarLocked)}
                className="hidden md:flex text-slate-400 hover:text-white p-1 rounded transition-colors"
                title={isSidebarLocked ? "Unlock Sidebar" : "Lock Sidebar"}
              >
                {isSidebarLocked ? <PinOff size={16} /> : <Pin size={16} />}
              </button>
            )}
          </div>
          <nav className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
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
                <div className={`pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap overflow-hidden transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0 md:w-auto overflow-hidden"}`}>Analysis Lifecycle</div>
                {analysisLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
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

                <div className={`pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap overflow-hidden transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0 md:w-auto overflow-hidden"}`}>Reporting</div>
                {reportLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
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
          <button 
            onClick={() => setIsHelpOpen(true)}
            className="w-full flex items-center gap-3 px-6 py-4 text-sm font-medium hover:bg-slate-800 hover:text-white transition-colors text-slate-400"
          >
            <div className="shrink-0"><HelpCircle size={16} /></div>
            <span className={`whitespace-nowrap transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0 md:w-auto overflow-hidden"}`}>Help & Documentation</span>
          </button>
          <div className="p-6 pt-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700"></div>
            <div className="text-xs">
              <p className="text-white font-medium">Erik Novák</p>
              <p className="opacity-50 uppercase tracking-widest">Lead Analyst</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative z-0">
        <Outlet />
      </main>

      {/* Help Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-600">
                <HelpCircle size={20} />
                <h2 className="text-lg font-bold text-slate-800">ATAP V5.0 Help & Documentation</h2>
              </div>
              <button 
                onClick={() => setIsHelpOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-6 text-sm text-slate-600">
              <section>
                <h3 className="font-bold text-slate-800 text-base mb-2">Welcome to Application Threat Analysis Platform (ATAP)</h3>
                <p>ATAP V5.1 is designed to streamline the threat modeling and security verification process using the OWASP ASVS 5.0 framework.</p>
              </section>
              
              <section>
                <h3 className="font-bold text-slate-800 text-base mb-2">Analysis Lifecycle</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Application Context:</strong> Define the business purpose, data classification, and regulatory requirements of the target system.</li>
                  <li><strong>Architecture Model:</strong> Detail the system components, data flows, and trust boundaries that form your attack surface.</li>
                  <li><strong>STRIDE Analysis:</strong> Utilize the Microsoft STRIDE reference dashboard to systematically identify Spoofing, Tampering, Repudiation, Information Disclosure, DoS, and EoP threats based on your architecture.</li>
                  <li><strong>ASVS Workspace:</strong> Evaluate the application against the full OWASP ASVS 5.0 standard. Features all 17 chapters and 350+ controls. Use the sidebar to navigate chapters, filter by target level (L1-L3), and track implementation status.</li>
                  <li><strong>Threat Register:</strong> Manage identified threats, applying STRIDE categorizations, and prioritize them using the interactive 5x5 Risk Matrix based on Likelihood and Impact.</li>
                  <li><strong>Findings & Gaps:</strong> Automatically cross-reference your architecture and ASVS workspace to auto-generate security gap tickets. This turns missing/partial compliance requirements into actionable development tasks.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-slate-800 text-base mb-2">Tips for Analysis & Reporting</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>In the <strong>ASVS Workspace</strong>, use the <em>Target Level</em> dropdown to automatically filter out requirements that exceed the application's required risk profile.</li>
                  <li>In the <strong>Threat Register</strong>, click on the numbers within the Risk Matrix grid to visually highlight threats corresponding to specific likelihood/impact clusters.</li>
                  <li>Clicking <strong>Generate Gap Analysis</strong> under Findings & Gaps will instantly poll your ASVS workspace for any controls marked as "Missing" or "Partial", translating them into formal gaps with severities.</li>
                </ul>
              </section>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end rounded-b-xl">
              <button 
                onClick={() => setIsHelpOpen(false)}
                className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded shadow-sm hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
