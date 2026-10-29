import React, { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Save, Info, ChevronDown, Check, X, SlidersHorizontal } from "lucide-react";
import { ProjectCategorizationModal } from "./ProjectCategorizationModal";

/**
 * Compliance Standards list / codebook (Číselník)
 */
const COMPLIANCE_STANDARDS = [
  { id: "GDPR", label: "GDPR", desc: "General Data Protection Regulation" },
  { id: "PCI-DSS", label: "PCI-DSS", desc: "Payment Card Industry Data Security Standard" },
  { id: "HIPAA", label: "HIPAA", desc: "Health Insurance Portability & Accountability Act" },
  { id: "ISO27001", label: "ISO 27001", desc: "Information Security Management System" },
  { id: "SOC2", label: "SOC 2", desc: "System and Organization Controls Type II" },
  { id: "NIST-800-53", label: "NIST SP 800-53", desc: "Security and Privacy Controls" },
  { id: "CCPA", label: "CCPA", desc: "California Consumer Privacy Act" },
  { id: "NIS2", label: "NIS 2", desc: "Network & Information Systems Directive" },
  { id: "CIS", label: "CIS Controls", desc: "Center for Internet Security Controls" },
];

/**
 * User Types / Roles list / codebook (Číselník)
 */
const USER_ROLES = [
  { id: "Unauthenticated", label: "Unauthenticated / Anonymous User", desc: "Public visitor without an authenticated session" },
  { id: "Customer", label: "Customer / Registered User", desc: "Standard registered application user" },
  { id: "Admin", label: "Administrator", desc: "Full access to settings, databases, and configuration" },
  { id: "Moderator", label: "Moderator", desc: "Review, moderate public content and user reports" },
  { id: "Developer", label: "Developer / API Consumer", desc: "Accesses developer resources, API keys, and webhooks" },
  { id: "Support", label: "Support Agent", desc: "Customer support with limited user lookup access" },
  { id: "Auditor", label: "Security Auditor / Compliance Officer", desc: "Read-only access to system audits, reports, and logs" },
];

export function ApplicationContext() {
  const { id: analysisId } = useParams<{ id: string }>();
  const contextStorageKey = `atap_context_${analysisId || "default"}`;
  const [isCategorizationModalOpen, setIsCategorizationModalOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [formData, setFormData] = useState(() => {
    try {
      const stored = localStorage.getItem(`atap_context_${analysisId || "default"}`);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return {
      businessPurpose: "E-commerce platform for retail customers.",
      dataClassification: "Confidential",
      complianceRequirements: ["GDPR", "PCI-DSS"] as string[],
      userTypes: ["Unauthenticated", "Customer", "Admin"] as string[],
      internetFacing: true,
    };
  });

  const [isComplianceOpen, setIsComplianceOpen] = useState(false);
  const [complianceSearch, setComplianceSearch] = useState("");
  const complianceRef = useRef<HTMLDivElement>(null);

  const [isUserTypesOpen, setIsUserTypesOpen] = useState(false);
  const [userTypesSearch, setUserTypesSearch] = useState("");
  const userTypesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (complianceRef.current && !complianceRef.current.contains(event.target as Node)) {
        setIsComplianceOpen(false);
      }
      if (userTypesRef.current && !userTypesRef.current.contains(event.target as Node)) {
        setIsUserTypesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleToggleRequirement = (id: string) => {
    setFormData(prev => {
      const isSelected = prev.complianceRequirements.includes(id);
      const updated = isSelected 
        ? prev.complianceRequirements.filter(item => item !== id)
        : [...prev.complianceRequirements, id];
      return {
        ...prev,
        complianceRequirements: updated
      };
    });
  };

  const handleToggleUserType = (id: string) => {
    setFormData(prev => {
      const isSelected = prev.userTypes.includes(id);
      const updated = isSelected
        ? prev.userTypes.filter(item => item !== id)
        : [...prev.userTypes, id];
      return {
        ...prev,
        userTypes: updated
      };
    });
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      localStorage.setItem(contextStorageKey, JSON.stringify(formData));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
      window.dispatchEvent(new Event("storage_workspace_update"));
    } catch (err) {
      console.error("Failed to save application context", err);
    }
  };

  const filteredCompliance = COMPLIANCE_STANDARDS.filter(std =>
    std.label.toLowerCase().includes(complianceSearch.toLowerCase()) ||
    std.desc.toLowerCase().includes(complianceSearch.toLowerCase())
  );

  const filteredUserRoles = USER_ROLES.filter(role =>
    role.label.toLowerCase().includes(userTypesSearch.toLowerCase()) ||
    role.desc.toLowerCase().includes(userTypesSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Application Context</h2>
          <p className="text-sm text-slate-500 mt-1">Define the business and security context of the application.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCategorizationModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-blue-700 border border-blue-200 rounded-md text-sm font-semibold hover:bg-blue-50 transition-colors cursor-pointer shadow-xs"
          >
            <SlidersHorizontal size={15} className="text-blue-600" />
            <span>Kategorizácia projektu (ASVS)</span>
          </button>
          <button 
            type="button"
            id="save-context-btn"
            onClick={() => handleSubmit()}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md shadow-sm transition-all cursor-pointer ${
              isSaved 
                ? "bg-emerald-600 text-white" 
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {isSaved ? <Check size={16} /> : <Save size={16} />}
            <span>{isSaved ? "Saved Context" : "Save Context"}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Business Purpose</label>
            <textarea 
              name="businessPurpose"
              value={formData.businessPurpose}
              onChange={handleChange}
              className="w-full h-24 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm resize-none"
              placeholder="Describe the main purpose of the application..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Data Classification</label>
              <select 
                name="dataClassification"
                value={formData.dataClassification}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm bg-white"
              >
                <option value="Public">Public</option>
                <option value="Internal">Internal</option>
                <option value="Confidential">Confidential</option>
                <option value="Restricted">Restricted</option>
              </select>
            </div>
            
            {/* Standardized Compliance Requirements Multi-Select Dropdown with Checkboxes */}
            <div className="relative" ref={complianceRef}>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Compliance Requirements</label>
              <button
                type="button"
                onClick={() => setIsComplianceOpen(!isComplianceOpen)}
                className="w-full min-h-[40px] px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm bg-white flex items-center justify-between gap-2 text-left shadow-sm hover:border-slate-300 transition-all cursor-pointer"
              >
                <div className="flex flex-wrap gap-1.5 py-0.5">
                  {formData.complianceRequirements.length > 0 ? (
                    formData.complianceRequirements.map((reqId) => {
                      const std = COMPLIANCE_STANDARDS.find((s) => s.id === reqId);
                      return (
                        <span
                          key={reqId}
                          className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded border border-blue-100 hover:bg-blue-100 transition-colors"
                        >
                          {std ? std.label : reqId}
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleRequirement(reqId);
                            }}
                            className="hover:bg-blue-200 p-0.5 rounded cursor-pointer text-blue-500 hover:text-blue-700 transition-colors"
                          >
                            <X size={12} />
                          </span>
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-slate-400 text-sm">Select compliance standards...</span>
                  )}
                </div>
                <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform ${isComplianceOpen ? 'rotate-180' : ''}`} />
              </button>

              {isComplianceOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto p-2 space-y-1">
                  {/* Search Filter */}
                  <div className="px-2 py-1 border-b border-slate-100 mb-1.5">
                    <input
                      type="text"
                      placeholder="Filter compliance standards..."
                      value={complianceSearch}
                      onChange={(e) => setComplianceSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                    />
                  </div>
                  
                  {/* Option List with Checkboxes */}
                  <div className="space-y-0.5">
                    {filteredCompliance.map((std) => {
                      const isChecked = formData.complianceRequirements.includes(std.id);
                      return (
                        <button
                          key={std.id}
                          type="button"
                          onClick={() => handleToggleRequirement(std.id)}
                          className="w-full flex items-start gap-2.5 px-2.5 py-1.5 rounded text-left transition-all hover:bg-slate-50 text-slate-700 cursor-pointer"
                        >
                          <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                            isChecked 
                              ? "border-blue-600 bg-blue-600 text-white" 
                              : "border-slate-300 bg-white hover:border-slate-400"
                          }`}>
                            {isChecked && <Check size={12} className="stroke-[3]" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-800">{std.label}</span>
                            <span className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5">{std.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                    {filteredCompliance.length === 0 && (
                      <div className="text-center text-xs text-slate-400 py-4">No standards matched.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Standardized User Types / Roles Multi-Select Dropdown with Checkboxes */}
          <div className="relative" ref={userTypesRef}>
            <label className="block text-sm font-semibold text-slate-700 mb-1">User Types / Roles</label>
            <button
              type="button"
              onClick={() => setIsUserTypesOpen(!isUserTypesOpen)}
              className="w-full min-h-[40px] px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm bg-white flex items-center justify-between gap-2 text-left shadow-sm hover:border-slate-300 transition-all cursor-pointer"
            >
              <div className="flex flex-wrap gap-1.5 py-0.5">
                {formData.userTypes.length > 0 ? (
                  formData.userTypes.map((roleId) => {
                    const role = USER_ROLES.find((r) => r.id === roleId);
                    return (
                      <span
                        key={roleId}
                        className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-xs font-semibold px-2 py-0.5 rounded border border-teal-100 hover:bg-teal-100 transition-colors"
                      >
                        {role ? role.label : roleId}
                        <span
                          onClick={(e) => {
                              e.stopPropagation();
                              handleToggleUserType(roleId);
                          }}
                          className="hover:bg-teal-200 p-0.5 rounded cursor-pointer text-teal-500 hover:text-teal-700 transition-colors"
                        >
                          <X size={12} />
                        </span>
                      </span>
                    );
                  })
                ) : (
                  <span className="text-slate-400 text-sm">Select user types / roles...</span>
                )}
              </div>
              <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform ${isUserTypesOpen ? 'rotate-180' : ''}`} />
            </button>

            {isUserTypesOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto p-2 space-y-1">
                {/* Search Filter */}
                <div className="px-2 py-1 border-b border-slate-100 mb-1.5">
                  <input
                    type="text"
                    placeholder="Filter user types / roles..."
                    value={userTypesSearch}
                    onChange={(e) => setUserTypesSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>
                
                {/* Option List with Checkboxes */}
                <div className="space-y-0.5">
                  {filteredUserRoles.map((role) => {
                    const isChecked = formData.userTypes.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => handleToggleUserType(role.id)}
                        className="w-full flex items-start gap-2.5 px-2.5 py-1.5 rounded text-left transition-all hover:bg-slate-50 text-slate-700 cursor-pointer"
                      >
                        <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                          isChecked 
                            ? "border-teal-600 bg-teal-600 text-white" 
                            : "border-slate-300 bg-white hover:border-slate-400"
                        }`}>
                          {isChecked && <Check size={12} className="stroke-[3]" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-800">{role.label}</span>
                          <span className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5">{role.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                  {filteredUserRoles.length === 0 && (
                    <div className="text-center text-xs text-slate-400 py-4">No user types/roles matched.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <input 
              type="checkbox" 
              id="internetFacing"
              name="internetFacing"
              checked={formData.internetFacing}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 rounded border-slate-300 cursor-pointer"
            />
            <div>
              <label htmlFor="internetFacing" className="text-sm font-semibold text-slate-700 block cursor-pointer">Internet Facing</label>
              <span className="text-xs text-slate-500">Check if the application is accessible from the public internet.</span>
            </div>
          </div>
        </form>
      </div>

      <ProjectCategorizationModal
        isOpen={isCategorizationModalOpen}
        onClose={() => setIsCategorizationModalOpen(false)}
        currentLevel="2"
        onApplyLevel={(level) => {
          // Can be synced to project settings
        }}
        analysisId={analysisId}
      />
    </div>
  );
}
