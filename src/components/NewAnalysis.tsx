/**
 * New Analysis Wizard Module
 * Handles the creation of a new threat model and ASVS assessment workspace.
 * 
 * @module NewAnalysis
 */
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Shield } from "lucide-react";
import { useAnalyses } from "../hooks/useAnalyses";

/**
 * New Analysis Component.
 * A multi-step form wizard to collect initial data for a new application assessment.
 * Step 1: Basic application metadata (Name, System Type, Owners).
 * Step 2: Target ASVS Level configuration.
 * 
 * @returns {JSX.Element} The rendered wizard component.
 */
export function NewAnalysis() {
  const navigate = useNavigate();
  const { saveAnalysis } = useAnalyses();
  // Tracks the current step in the wizard (1 or 2)
  const [step, setStep] = useState(1);
  
  // Holds the form input data
  const [formData, setFormData] = useState({
    name: "",
    systemType: "web",
    asvsLevel: "2",
    businessOwners: ""
  });

  /**
   * Handles form submission.
   * Advances the wizard step or completes the creation process by navigating to the new analysis.
   * 
   * @param {React.FormEvent} e - The form submission event.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 2) {
      setStep(step + 1);
    } else {
      const newAnalysis = saveAnalysis(formData);
      navigate(`/analysis/${newAnalysis.id}/asvs`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 shrink-0">
        <Link to="/" className="text-slate-500 hover:text-slate-800 flex items-center gap-2 text-sm font-medium">
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto p-8 flex justify-center items-start">
        <div className="max-w-2xl w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4">
              <Shield size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Create New Analysis</h2>
            <p className="text-sm text-slate-500 mt-1">Configure the parameters for your application threat model and ASVS assessment.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8">
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Application Name</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Retail Banking API v2.4" 
                    className="w-full px-4 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">System Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: "web", label: "Web Application" },
                      { id: "api", label: "API / Microservice" },
                      { id: "mobile", label: "Mobile App" },
                      { id: "iot", label: "IoT Device / Firmware" }
                    ].map(type => (
                      <label key={type.id} className={`flex items-center p-4 border rounded-md cursor-pointer transition-colors ${formData.systemType === type.id ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 hover:border-slate-300'}`}>
                        <input 
                          type="radio" 
                          name="systemType" 
                          value={type.id}
                          checked={formData.systemType === type.id}
                          onChange={(e) => setFormData({...formData, systemType: e.target.value})}
                          className="text-blue-600 focus:ring-blue-500" 
                        />
                        <span className="ml-3 text-sm font-medium text-slate-700">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Business Owners</label>
                  <input 
                    type="text" 
                    value={formData.businessOwners}
                    onChange={(e) => setFormData({...formData, businessOwners: e.target.value})}
                    placeholder="Email addresses (comma separated)" 
                    className="w-full px-4 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                  <p className="text-xs text-slate-500 mt-1">Users will be invited as stakeholders.</p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-4">Target ASVS Level</label>
                  <div className="space-y-3">
                    {[
                      { level: "1", title: "Level 1: First steps, automated", desc: "For low assurance levels, completely automated testable." },
                      { level: "2", title: "Level 2: Most applications", desc: "For applications that contain sensitive data, which requires protection. Defends against most of the risks associated with software today." },
                      { level: "3", title: "Level 3: High assurance", desc: "For the most critical applications. Applications that perform high value transactions, contain sensitive medical data, etc." }
                    ].map(l => (
                      <label key={l.level} className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${formData.asvsLevel === l.level ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 hover:border-slate-300'}`}>
                        <input 
                          type="radio" 
                          name="asvsLevel" 
                          value={l.level}
                          checked={formData.asvsLevel === l.level}
                          onChange={(e) => setFormData({...formData, asvsLevel: e.target.value})}
                          className="mt-1 text-blue-600 focus:ring-blue-500" 
                        />
                        <div className="ml-3">
                          <span className="block text-sm font-bold text-slate-800">{l.title}</span>
                          <span className="block text-sm text-slate-500 mt-1 leading-relaxed">{l.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
              {step === 1 ? (
                <div></div> // Placeholder for flex spacing
              ) : (
                <button 
                  type="button" 
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-transparent hover:bg-slate-50 rounded"
                >
                  Previous
                </button>
              )}
              
              <button 
                type="submit"
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm shadow-blue-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2 transition-colors"
              >
                {step === 1 ? (
                  <>Continue <ArrowRight size={16} /></>
                ) : (
                  "Create Analysis Workspace"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
