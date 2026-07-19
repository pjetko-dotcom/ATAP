import React from "react";
import { FileText } from "lucide-react";

const findings = [
  { id: "F-001", title: "Missing MFA for Admin Users", severity: "High", status: "Open", asvsRef: "V2.3.1" },
  { id: "F-002", title: "Insecure Direct Object Reference (IDOR) on User Profile", severity: "High", status: "In Progress", asvsRef: "V4.1.1" },
  { id: "F-003", title: "Verbose Error Messages", severity: "Low", status: "Closed", asvsRef: "V14.1.2" },
];

const severityColors = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-orange-100 text-orange-700",
  Low: "bg-blue-100 text-blue-700",
};

const statusColors = {
  "Open": "bg-red-50 text-red-700 border border-red-200",
  "In Progress": "bg-yellow-50 text-yellow-700 border border-yellow-200",
  "Closed": "bg-green-50 text-green-700 border border-green-200",
};

export function FindingsAndGaps() {
  return (
    <div className="flex flex-col h-full bg-slate-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Findings & Gaps</h2>
          <p className="text-sm text-slate-500 mt-1">Track identified vulnerabilities and security gaps.</p>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-md shadow-sm hover:bg-slate-700 transition-colors"
        >
          <FileText size={16} />
          Generate Report
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-100">
            <tr>
              <th className="px-6 py-3 w-24">ID</th>
              <th className="px-6 py-3">Finding Description</th>
              <th className="px-6 py-3 w-32">Severity</th>
              <th className="px-6 py-3 w-32">Status</th>
              <th className="px-6 py-3 w-32">ASVS Ref</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {findings.map(finding => (
              <tr key={finding.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-mono text-xs text-slate-500">{finding.id}</td>
                <td className="px-6 py-4 font-medium text-slate-800">{finding.title}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${severityColors[finding.severity as keyof typeof severityColors]}`}>
                    {finding.severity}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${statusColors[finding.status as keyof typeof statusColors]}`}>
                    {finding.status}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-slate-500">{finding.asvsRef}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
