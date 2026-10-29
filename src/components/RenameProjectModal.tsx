/**
 * Rename Project Modal
 * Allows analysts to rename a security analysis workspace / project.
 * 
 * @module RenameProjectModal
 */
import React, { useState, useEffect, useRef } from "react";
import { X, Pencil, Check, AlertCircle } from "lucide-react";
import { useAnalyses } from "../hooks/useAnalyses";

interface RenameProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisId: string;
  currentName: string;
  onRenamed?: (newName: string) => void;
}

export function RenameProjectModal({
  isOpen,
  onClose,
  analysisId,
  currentName,
  onRenamed
}: RenameProjectModalProps) {
  const { renameAnalysis } = useAnalyses();
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(currentName);
    setError(null);
  }, [currentName, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Názov projektu nemôže byť prázdny.");
      return;
    }

    const success = renameAnalysis(analysisId, trimmed);
    if (success) {
      if (onRenamed) onRenamed(trimmed);
      onClose();
    } else {
      setError("Nepodarilo sa premenovať projekt.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Pencil size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 tracking-tight">Premenovať projekt</h3>
              <p className="text-xs text-slate-500">Zmeňte názov analýzy / workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
            title="Zavrieť (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="rename-project-input" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Názov Workspace / Projektu <span className="text-red-500">*</span>
              </label>
              <input
                id="rename-project-input"
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="napr. Retail Banking API v2.4"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800 font-medium transition-all shadow-2xs"
                maxLength={120}
              />
              {error && (
                <p className="flex items-center gap-1.5 text-xs text-red-600 font-medium mt-1.5 animate-in fade-in">
                  <AlertCircle size={13} />
                  <span>{error}</span>
                </p>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-700">Pôvodný názov:</p>
              <p className="font-mono text-slate-500 text-[11px] truncate">{currentName}</p>
              <p className="text-[11px] text-slate-400 pt-0.5">Zmena názvu sa okamžite premietne do všetkých modulov analýzy, reportov aj exportov.</p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            >
              Zrušiť
            </button>
            <button
              type="submit"
              disabled={!name.trim() || name.trim() === currentName}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Check size={14} />
              <span>Uložiť názov</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
