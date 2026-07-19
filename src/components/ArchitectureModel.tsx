import React from "react";
import { UploadCloud, Plus } from "lucide-react";

export function ArchitectureModel() {
  return (
    <div className="flex flex-col h-full bg-slate-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Architecture Model</h2>
          <p className="text-sm text-slate-500 mt-1">Upload or define architectural diagrams and data flows.</p>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          New Component
        </button>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center border-dashed border-2 m-4 p-12 text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
          <UploadCloud size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Upload Architecture Diagram</h3>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          Drag and drop an image file of your architecture diagram, or click to browse. Supported formats: PNG, JPEG, SVG.
        </p>
        <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded hover:bg-slate-50 transition-colors">
          Select File
        </button>
      </div>
    </div>
  );
}
