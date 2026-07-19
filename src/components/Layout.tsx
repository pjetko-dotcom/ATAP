/**
 * Layout components for the application shell.
 * Provides the main navigation sidebar and a container for nested routes.
 * 
 * @module Layout
 */
import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Shield, LayoutDashboard, FileText, Component, Lock, AlertTriangle, CheckCircle, FileDown, History, HelpCircle, X } from "lucide-react";

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
  
  // Extract analysis ID from the current route path to maintain contextual links.
  const match = location.pathname.match(/\/analysis\/([^\/]+)/);
  const pathId = match ? match[1] : null;
  const analysisId = pathId && pathId !== "new" ? pathId : "1";

  const navLinks = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
  ];

  const analysisLinks = [
    { name: "Application Context", path: `/analysis/${analysisId}/context`, icon: FileText },
    { name: "Architecture Model", path: `/analysis/${analysisId}/architecture`, icon: Component },
    { name: "STRIDE Analysis", path: `/analysis/${analysisId}/stride`, icon: Shield },
    { name: "ASVS Workspace", path: `/analysis/${analysisId}/asvs`, icon: Lock },
    { name: "Threat Register", path: `/analysis/${analysisId}/threats`, icon: AlertTriangle },
    { name: "Findings & Gaps", path: `/analysis/${analysisId}/findings`, icon: CheckCircle },
  ];

  const reportLinks = [
    { name: "XLSX Export", path: `/analysis/${analysisId}/export`, icon: FileDown },
    { name: "Audit Trail", path: `/analysis/${analysisId}/audit`, icon: History },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex-col border-r border-slate-800 shrink-0 hidden md:flex relative z-10">
        <div className="p-6 overflow-y-auto">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white">
              <Shield size={20} />
            </div>
            <h1 className="text-white font-bold text-lg tracking-tight uppercase">ATAP v1.0</h1>
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
                <link.icon size={16} />
                {link.name}
              </Link>
            ))}
            
            <div className="pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase">Analysis Lifecycle</div>
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
                <link.icon size={16} />
                {link.name}
              </Link>
            ))}

            <div className="pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase">Reporting</div>
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
                <link.icon size={16} />
                {link.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-auto border-t border-slate-800">
          <button 
            onClick={() => setIsHelpOpen(true)}
            className="w-full flex items-center gap-3 px-6 py-4 text-sm font-medium hover:bg-slate-800 hover:text-white transition-colors text-slate-400"
          >
            <HelpCircle size={16} />
            Help & Documentation
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
                <h2 className="text-lg font-bold text-slate-800">ATAP v1.0 Help & Documentation</h2>
              </div>
              <button 
                onClick={() => setIsHelpOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm text-slate-600">
              <section>
                <h3 className="font-bold text-slate-800 text-base mb-2">Welcome to Application Threat Analysis Platform (ATAP)</h3>
                <p>ATAP v1.0 is designed to streamline the threat modeling and security verification process using the OWASP ASVS 5.0 framework.</p>
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
