import React, { useState } from "react";
import { Save, Info } from "lucide-react";

export function ApplicationContext() {
  const [formData, setFormData] = useState({
    businessPurpose: "E-commerce platform for retail customers.",
    dataClassification: "Confidential",
    complianceRequirements: "GDPR, PCI-DSS",
    userTypes: "Unauthenticated, Customer, Admin",
    internetFacing: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Application context saved successfully.");
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Application Context</h2>
          <p className="text-sm text-slate-500 mt-1">Define the business and security context of the application.</p>
        </div>
        <button 
          onClick={handleSubmit}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Save size={16} />
          Save Context
        </button>
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
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Compliance Requirements</label>
              <input 
                type="text" 
                name="complianceRequirements"
                value={formData.complianceRequirements}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                placeholder="e.g., GDPR, HIPAA, PCI-DSS"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">User Types / Roles</label>
            <input 
              type="text" 
              name="userTypes"
              value={formData.userTypes}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
              placeholder="e.g., Admin, User, Guest"
            />
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <input 
              type="checkbox" 
              id="internetFacing"
              name="internetFacing"
              checked={formData.internetFacing}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 rounded border-slate-300"
            />
            <div>
              <label htmlFor="internetFacing" className="text-sm font-semibold text-slate-700 block">Internet Facing</label>
              <span className="text-xs text-slate-500">Check if the application is accessible from the public internet.</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
