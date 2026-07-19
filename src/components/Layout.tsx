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
                <h2 className="text-lg font-bold text-slate-800">ATAP v1.0 Help & Guide</h2>
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
                <p>ATAP v1.0 is designed to streamline the threat modeling and security verification process using the OWASP ASVS framework.</p>
              </section>
              
              <section>
                <h3 className="font-bold text-slate-800 text-base mb-2">Analysis Lifecycle</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Application Context:</strong> Define the business purpose, data classification, and regulatory requirements of the target system.</li>
                  <li><strong>Architecture Model:</strong> Upload or draw component diagrams and map out data flows and trust boundaries.</li>
                  <li><strong>ASVS Workspace:</strong> Evaluate the application against specific ASVS controls. You can filter by ASVS level and search for specific requirements.</li>
                  <li><strong>Threat Register:</strong> Manage identified threats, applying frameworks like STRIDE, and link them directly to ASVS controls for mitigation.</li>
                  <li><strong>Findings & Gaps:</strong> Track residual risks, security gaps, and verified vulnerabilities.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-slate-800 text-base mb-2">Tips for ASVS Workspace</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Use the <strong>Target Level</strong> dropdown to automatically filter out requirements that exceed the application's risk profile.</li>
                  <li>Link specific architectural components to ASVS controls using the traceability features.</li>
                  <li>Document evidence and rationale when marking a control as "N/A" to maintain a solid audit trail.</li>
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
