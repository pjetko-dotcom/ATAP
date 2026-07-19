import React, { useState } from "react";
import { Shield, Server, Database, Activity, Lock, AlertTriangle } from "lucide-react";

/**
 * STRIDE Model Dashboard
 * 
 * Provides an interactive reference for the Microsoft STRIDE threat modeling framework
 * (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).
 * Includes common examples and standard mitigations to guide security architecture reviews.
 * 
 * @returns {JSX.Element} The rendered STRIDE analysis component.
 */
export function StrideModel() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const strideCategories = [
    {
      id: "spoofing",
      name: "Spoofing",
      description: "Pretending to be something or someone other than yourself.",
      icon: <Shield size={24} className="text-purple-500" />,
      examples: ["Replaying authentication tokens", "MAC address spoofing", "DNS cache poisoning"],
      mitigation: "Strong Authentication (MFA), Mutual TLS, DNSSEC"
    },
    {
      id: "tampering",
      name: "Tampering",
      description: "Modifying data or code without authorization.",
      icon: <Activity size={24} className="text-red-500" />,
      examples: ["Modifying database records", "Altering in-transit network packets", "Changing configuration files"],
      mitigation: "Digital Signatures, Hashing, Immutable Logs, TLS/SSL"
    },
    {
      id: "repudiation",
      name: "Repudiation",
      description: "Claiming to have not performed an action.",
      icon: <Lock size={24} className="text-slate-500" />,
      examples: ["Denying sending an email", "Denying making a transaction", "Deleting audit logs"],
      mitigation: "Secure Audit Trails, Digital Signatures, Non-repudiation services"
    },
    {
      id: "information_disclosure",
      name: "Information Disclosure",
      description: "Exposing information to individuals who are not authorized to see it.",
      icon: <Database size={24} className="text-blue-500" />,
      examples: ["Data breach", "Exposing API keys in code", "Verbose error messages"],
      mitigation: "Encryption at rest and in transit, Access Controls, Data Masking"
    },
    {
      id: "denial_of_service",
      name: "Denial of Service",
      description: "Denying or degrading service to valid users.",
      icon: <Server size={24} className="text-orange-500" />,
      examples: ["DDoS attacks", "Resource exhaustion", "Application crash via malformed input"],
      mitigation: "Rate Limiting, High Availability Architecture, WAF"
    },
    {
      id: "elevation_of_privilege",
      name: "Elevation of Privilege",
      description: "Gaining capabilities without proper authorization.",
      icon: <AlertTriangle size={24} className="text-yellow-600" />,
      examples: ["Exploiting a buffer overflow", "Vertical privilege escalation", "Bypassing authorization checks"],
      mitigation: "Principle of Least Privilege, Role-Based Access Control, Input Validation"
    }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6 overflow-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">STRIDE Threat Modeling</h2>
        <p className="text-sm text-slate-500 mt-1">Identify and categorize potential threats to the application.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {strideCategories.map((category) => (
          <div 
            key={category.id} 
            className={`bg-white p-6 rounded-xl border shadow-sm transition-colors cursor-pointer ${selectedCategory === category.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 hover:border-blue-300'}`}
            onClick={() => setSelectedCategory(category.id === selectedCategory ? null : category.id)}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                {category.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-800">{category.name}</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4 h-10">{category.description}</p>
            
            {selectedCategory === category.id && (
              <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                <div className="mb-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">Common Examples</h4>
                  <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                    {category.examples.map((example, i) => (
                      <li key={i}>{example}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">Standard Mitigation</h4>
                  <p className="text-xs text-slate-600">{category.mitigation}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
