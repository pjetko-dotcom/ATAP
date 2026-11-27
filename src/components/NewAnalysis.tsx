/**
 * New Analysis Wizard Module
 * Handles the creation of a new threat model and ASVS assessment workspace.
 * 
 * @module NewAnalysis
 */
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Shield, SlidersHorizontal, Sparkles } from "lucide-react";
import { useAnalyses } from "../hooks/useAnalyses";
import { ProjectCategorizationModal } from "./ProjectCategorizationModal";
import { useLanguage } from "../context/LanguageContext";

/**
 * New Analysis Component.
 * A multi-step form wizard to collect initial data for a new application assessment.
 * Step 1: Basic application metadata (Name, System Type, Owners).
 * Step 2: Target ASVS Level configuration.
 * 
 * @returns {JSX.Element} The rendered wizard component.
 */
export function NewAnalysis() {
  const { t } = useLanguage();
  const starterTemplates = [
    { id: "web", title: t("Webová aplikácia", "Web application"), description: t("Internetová aplikácia so zákazníckymi účtami.", "Internet application with customer accounts."), systemType: "web", asvsLevel: "2", suggestedName: t("Nová webová aplikácia", "New web application") },
    { id: "api", title: t("API / služba", "API / service"), description: t("Backend alebo mikroslužba s citlivými dátami.", "Backend or microservice with sensitive data."), systemType: "api", asvsLevel: "2", suggestedName: t("Nová API služba", "New API service") },
    { id: "critical", title: t("Kritický systém", "Critical system"), description: t("Vysoká úroveň záruky pre kritickú infraštruktúru.", "High assurance for critical infrastructure."), systemType: "api", asvsLevel: "3", suggestedName: t("Kritický systém", "Critical system") },
    { id: "blank", title: t("Začať od začiatku", "Start from scratch"), description: t("Zvoľte typ systému a úroveň manuálne.", "Choose the system type and level manually."), systemType: "web", asvsLevel: "2", suggestedName: "" },
  ];
  const navigate = useNavigate();
  const { saveAnalysis } = useAnalyses();
  // Tracks the current step in the wizard (1 or 2)
  const [step, setStep] = useState(1);
  const [isCategorizationOpen, setIsCategorizationOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("blank");
  
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
          {t("Späť na prehľad", "Back to Dashboard")}
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto p-8 flex justify-center items-start">
        <div className="max-w-2xl w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4">
              <Shield size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{t("Vytvoriť novú analýzu", "Create New Analysis")}</h2>
            <p className="text-sm text-slate-500 mt-1">{t("Nastavte parametre modelu hrozieb a hodnotenia ASVS aplikácie.", "Configure the parameters for your application threat model and ASVS assessment.")}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8">
            {step === 1 && (
              <div className="space-y-6">
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-slate-700">{t("Ako chcete začať?", "How would you like to start?")}</legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {starterTemplates.map(template => (
                      <button
                        key={template.id}
                        type="button"
                        aria-pressed={selectedTemplate === template.id}
                        onClick={() => {
                          setSelectedTemplate(template.id);
                          if (template.id !== "blank") {
                            setFormData(previous => ({
                              ...previous,
                              name: template.suggestedName,
                              systemType: template.systemType,
                              asvsLevel: template.asvsLevel,
                            }));
                          }
                        }}
                        className={`rounded-lg border p-3 text-left transition-colors ${selectedTemplate === template.id ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}
                      >
                        <span className="block text-sm font-bold text-slate-800">{template.title}</span>
                        <span className="mt-1 block text-xs text-slate-500">{template.description}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{t("Šablóny predvyplnia typ a cieľovú úroveň; názov môžete upraviť. Vaše hodnotenie zostane prázdne.", "Templates prefill the system type and target level; you can edit the name. Your assessment remains empty.")}</p>
                </fieldset>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{t("Názov aplikácie", "Application Name")}</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder={t("napr. Retail Banking API v2.4", "e.g. Retail Banking API v2.4")}
                    className="w-full px-4 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{t("Typ systému", "System Type")}</label>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: "web", label: t("Webová aplikácia", "Web Application") },
                      { id: "api", label: "API / Microservice" },
                      { id: "mobile", label: t("Mobilná aplikácia", "Mobile App") },
                      { id: "iot", label: t("IoT zariadenie / firmvér", "IoT Device / Firmware") }
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
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{t("Vlastníci systému", "Business Owners")}</label>
                  <input 
                    type="text" 
                    value={formData.businessOwners}
                    onChange={(e) => setFormData({...formData, businessOwners: e.target.value})}
                    placeholder={t("E-mailové adresy oddelené čiarkou", "Email addresses (comma separated)")}
                    className="w-full px-4 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                  <p className="text-xs text-slate-500 mt-1">{t("Používatelia budú pozvaní ako zainteresované osoby.", "Users will be invited as stakeholders.")}</p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <label className="block text-sm font-semibold text-slate-700">{t("Cieľová úroveň ASVS", "Target ASVS Level")}</label>
                    <button
                      type="button"
                      onClick={() => setIsCategorizationOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Sparkles size={14} className="text-blue-600" />
                      <span>{t("Pomôcka: Triážové otázky pre kategorizáciu projektu", "Helper: Triage questions for project categorization")}</span>
                    </button>
                  </div>
                  <div className="space-y-3">
                    {[
                      { level: "1", title: t("Úroveň 1: Základné automatizované overenie", "Level 1: First steps, automated"), desc: t("Pre nízku úroveň záruky, plne automatizovateľné testovanie.", "For low assurance levels, completely automated testable.") },
                      { level: "2", title: t("Úroveň 2: Väčšina aplikácií", "Level 2: Most applications"), desc: t("Pre aplikácie s citlivými údajmi vyžadujúcimi ochranu. Chráni pred väčšinou súčasných softvérových rizík.", "For applications that contain sensitive data, which requires protection. Defends against most of the risks associated with software today.") },
                      { level: "3", title: t("Úroveň 3: Vysoká úroveň záruky", "Level 3: High assurance"), desc: t("Pre najkritickejšie aplikácie, napríklad s hodnotnými transakciami alebo citlivými zdravotnými údajmi.", "For the most critical applications. Applications that perform high value transactions, contain sensitive medical data, etc.") }
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
                  {t("Späť", "Previous")}
                </button>
              )}
              
              <button 
                type="submit"
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm shadow-blue-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2 transition-colors"
              >
                {step === 1 ? (
                  <>{t("Pokračovať", "Continue")} <ArrowRight size={16} /></>
                ) : (
                  t("Vytvoriť pracovný priestor", "Create Analysis Workspace")
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ProjectCategorizationModal
        isOpen={isCategorizationOpen}
        onClose={() => setIsCategorizationOpen(false)}
        currentLevel={formData.asvsLevel}
        onApplyLevel={(level) => setFormData((prev) => ({ ...prev, asvsLevel: level }))}
      />
    </div>
  );
}
