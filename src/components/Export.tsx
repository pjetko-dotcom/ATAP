import React from "react";
import { FileSpreadsheet, Download } from "lucide-react";

export function Export() {
  return (
    <div className="flex flex-col h-full bg-slate-50 p-6 items-center justify-center">
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center max-w-md w-full">
        <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileSpreadsheet size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Export Analysis</h2>
        <p className="text-sm text-slate-500 mb-6">
          Download a comprehensive XLSX report of the current ASVS workspace, including all threats, findings, and notes.
        </p>
        
        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-green-700 transition-colors">
          <Download size={18} />
          Download XLSX Report
        </button>
      </div>
    </div>
  );
}
