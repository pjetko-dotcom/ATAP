/**
 * Backup and Restore Modal
 * Allows users to export and restore complete project states including architecture,
 * threat models, ASVS requirement evaluations, audit trail, and version snapshots.
 * 
 * @module BackupRestoreModal
 */
import React, { useEffect, useRef, useState } from "react";
import { 
  Download, 
  Upload, 
  FileJson, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Layers, 
  Database,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { 
  exportSingleProjectBackup, 
  exportAllProjectsBackup, 
  restoreBackup, 
  RestoreResult,
  MAX_BACKUP_SIZE,
  validateBackup,
} from "../utils/backupRestore";

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAnalysisId?: string;
  currentAnalysisName?: string;
  onRestoreSuccess?: (projectNames: string[]) => void;
}

export function BackupRestoreModal({
  isOpen,
  onClose,
  currentAnalysisId,
  currentAnalysisName,
  onRestoreSuccess
}: BackupRestoreModalProps) {
  const [activeTab, setActiveTab] = useState<"backup" | "restore">("backup");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<any | null>(null);
  const [importMode, setImportMode] = useState<"new_id" | "overwrite">("new_id");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const backupTabRef = useRef<HTMLButtonElement>(null);
  const restoreTabRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const nextTab = activeTab === "backup" ? "restore" : "backup";
    setActiveTab(nextTab);
    (nextTab === "backup" ? backupTabRef : restoreTabRef).current?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !modalRef.current) return;
      const focusableElements = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusableElements.length === 0) return;
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExportSingle = () => {
    if (!currentAnalysisId) return;
    const ok = exportSingleProjectBackup(currentAnalysisId);
    if (ok) {
      setStatusMessage({
        type: "success",
        text: `Záloha projektu "${currentAnalysisName || currentAnalysisId}" bola stiahnutá.`
      });
    } else {
      setStatusMessage({
        type: "error",
        text: "Nepodarilo sa vygenerovať zálohu projektu."
      });
    }
  };

  const handleExportAll = () => {
    const ok = exportAllProjectsBackup();
    if (ok) {
      setStatusMessage({
        type: "success",
        text: "Kompletný JSON archív všetkých projektov bol úspešne stiahnutý."
      });
    } else {
      setStatusMessage({
        type: "error",
        text: "Nepodarilo sa exportovať archív projektov."
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMessage(null);
    setFileContent(null);
    setParsedPreview(null);
    if (file.size > MAX_BACKUP_SIZE) {
      setSelectedFile(null);
      setStatusMessage({
        type: "error",
        text: "Súbor zálohy presahuje maximálnu povolenú veľkosť (25 MB)."
      });
      e.target.value = "";
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== "string") {
          throw new Error("Súbor sa nepodarilo prečítať ako text.");
        }
        const validationError = validateBackup(text);
        if (validationError) {
          setFileContent(null);
          setParsedPreview(null);
          setStatusMessage({ type: "error", text: validationError });
          return;
        }
        setFileContent(text);
        setParsedPreview(JSON.parse(text));
      } catch {
        setFileContent(null);
        setParsedPreview(null);
        setStatusMessage({
          type: "error",
          text: "Zvolený súbor neobsahuje platný JSON formát."
        });
      }
    };
    reader.onerror = () => {
      setFileContent(null);
      setParsedPreview(null);
      setStatusMessage({ type: "error", text: "Súbor sa nepodarilo prečítať." });
    };
    reader.readAsText(file);
  };

  const handleRestore = () => {
    if (!fileContent) return;

    setIsProcessing(true);
    setStatusMessage(null);

    setTimeout(() => {
      const result: RestoreResult = restoreBackup(fileContent, importMode);
      setIsProcessing(false);

      if (result.success) {
        setStatusMessage({
          type: "success",
          text: `Úspešne obnovené ${result.importedCount} ${
            result.importedCount === 1 ? "projekt" : result.importedCount < 5 ? "projekty" : "projektov"
          }: ${result.projectNames.join(", ")}`
        });
        if (onRestoreSuccess) {
          onRestoreSuccess(result.projectNames);
        }
        // Reset file selection
        setSelectedFile(null);
        setFileContent(null);
        setParsedPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setStatusMessage({
          type: "error",
          text: result.error || "Obnova dát zo zálohy zlyhala."
        });
      }
    }, 150);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="backup-modal-title"
        tabIndex={-1}
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Database size={18} />
            </div>
            <div>
              <h3 id="backup-modal-title" className="font-bold text-slate-800 text-base">Záloha a obnova projektov (JSON)</h3>
              <p className="text-xs text-slate-500">Zmeny sa ukladajú lokálne; záloha umožňuje preniesť alebo obnoviť dáta.</p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Zavrieť zálohu a obnovu"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div role="tablist" aria-label="Režim zálohy" className="flex border-b border-slate-200 bg-slate-50/50 px-6 pt-2">
          <button
            type="button"
            role="tab"
            ref={backupTabRef}
            id="backup-tab"
            aria-selected={activeTab === "backup"}
            tabIndex={activeTab === "backup" ? 0 : -1}
            aria-controls="backup-modal-tabpanel"
            onKeyDown={handleTabKeyDown}
            onClick={() => { setActiveTab("backup"); setStatusMessage(null); }}
            className={`flex items-center gap-2 pb-2.5 px-3 font-semibold text-xs border-b-2 transition-colors cursor-pointer ${
              activeTab === "backup" 
                ? "border-blue-600 text-blue-700" 
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Download size={14} />
            <span>Zálohovať (Export JSON)</span>
          </button>
          <button
            type="button"
            role="tab"
            ref={restoreTabRef}
            id="restore-tab"
            aria-selected={activeTab === "restore"}
            tabIndex={activeTab === "restore" ? 0 : -1}
            aria-controls="backup-modal-tabpanel"
            onKeyDown={handleTabKeyDown}
            onClick={() => { setActiveTab("restore"); setStatusMessage(null); }}
            className={`flex items-center gap-2 pb-2.5 px-3 font-semibold text-xs border-b-2 transition-colors cursor-pointer ${
              activeTab === "restore" 
                ? "border-blue-600 text-blue-700" 
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Upload size={14} />
            <span>Obnoviť zo zálohy (Import)</span>
          </button>
        </div>

        {/* Modal Content */}
        <div
          id="backup-modal-tabpanel"
          role="tabpanel"
          aria-labelledby={activeTab === "backup" ? "backup-tab" : "restore-tab"}
          tabIndex={0}
          className="p-6 overflow-y-auto space-y-4 flex-1"
        >
          {statusMessage && (
            <div role={statusMessage.type === "error" ? "alert" : "status"} aria-live="polite" className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
              statusMessage.type === "success" 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                : "bg-red-50 border-red-200 text-red-800"
            }`}>
              {statusMessage.type === "success" ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {activeTab === "backup" ? (
            <div className="space-y-4">
              {currentAnalysisId && (
                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileJson size={16} className="text-blue-600" />
                      <h4 className="font-bold text-slate-800 text-sm">Aktuálny projekt</h4>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 font-medium">{currentAnalysisName || "Tento projekt"}</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Záloha obsahuje ASVS hodnotenie, architektúru, DFD toky, STRIDE hrozby a históriu verzií.
                    </p>
                  </div>
                  <button
                    onClick={handleExportSingle}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Stiahnuť JSON</span>
                  </button>
                </div>
              )}

              <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-slate-700" />
                    <h4 className="font-bold text-slate-800 text-sm">Všetky projekty (Kompletný archív)</h4>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Exportuje všetky analýzy a projekty evidované vo vašom lokálnom úložisku do jedného súboru.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ideálne pre offline zálohu, zmenu počítača alebo migráciu.
                  </p>
                </div>
                <button
                  onClick={handleExportAll}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <Download size={14} />
                  <span>Stiahnuť archív</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File input drag/drop area */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/30 transition-colors"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json,application/json"
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2">
                  <Upload size={20} />
                </div>
                <p className="text-xs font-bold text-slate-700">
                  {selectedFile ? selectedFile.name : "Kliknite pre výber .json zálohy alebo presuňte súbor sem"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Podporuje jednotlivé zálohy projektu aj kompletné archívy z ATAP
                </p>
              </div>

              {/* Parsed Preview info */}
              {parsedPreview && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                  <div className="font-bold text-slate-700 flex items-center justify-between">
                    <span>Detegovaný obsah zálohy:</span>
                    <span className="text-[11px] font-normal text-slate-400">
                      {parsedPreview.exportedAt ? new Date(parsedPreview.exportedAt).toLocaleString("sk-SK") : ""}
                    </span>
                  </div>

                  {parsedPreview.type === "atap_full_backup" ? (
                    <div>
                      <p className="text-slate-600">
                        Typ: <strong className="text-blue-700">Kompletný archív ({parsedPreview.projects?.length || 0} projektov)</strong>
                      </p>
                      <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600">
                        {parsedPreview.projects?.slice(0, 4).map((p: any, i: number) => (
                          <li key={i} className="truncate">
                            {p.project?.name} (L{p.project?.asvsLevel || 2}, v{p.project?.currentVersion || "1.0"})
                          </li>
                        ))}
                        {(parsedPreview.projects?.length || 0) > 4 && (
                          <li className="text-slate-400 italic">...a ďalšie {parsedPreview.projects.length - 4} projekty</li>
                        )}
                      </ul>
                    </div>
                  ) : parsedPreview.project ? (
                    <div>
                      <p className="text-slate-600">
                        Projekt: <strong className="text-blue-700">{parsedPreview.project?.name}</strong>
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                        <span>Level: L{parsedPreview.project?.asvsLevel || 2}</span>
                        <span>•</span>
                        <span>Verzia: v{parsedPreview.project?.currentVersion || "1.0"}</span>
                        <span>•</span>
                        <span>Požiadaviek ASVS: {parsedPreview.asvsReqs?.length || 0}</span>
                      </div>
                    </div>
                  ) : null}

                  {/* Mode Selector */}
                  <div className="pt-2 border-t border-slate-200/80 mt-2">
                    <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                      Režim importu:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <label className={`p-2 border rounded-lg cursor-pointer text-left transition-colors ${
                        importMode === "new_id" ? "border-blue-500 bg-blue-50/50" : "border-slate-200 bg-white"
                      }`}>
                        <input
                          type="radio"
                          name="importMode"
                          value="new_id"
                          checked={importMode === "new_id"}
                          onChange={() => setImportMode("new_id")}
                          className="mr-1.5"
                        />
                        <span className="font-bold text-[11px] text-slate-800">Ako nový projekt</span>
                        <p className="text-[10px] text-slate-500 mt-0.5">Vytvorí nezávislú kópiu bez prepísania existujúcich</p>
                      </label>

                      <label className={`p-2 border rounded-lg cursor-pointer text-left transition-colors ${
                        importMode === "overwrite" ? "border-blue-500 bg-blue-50/50" : "border-slate-200 bg-white"
                      }`}>
                        <input
                          type="radio"
                          name="importMode"
                          value="overwrite"
                          checked={importMode === "overwrite"}
                          onChange={() => setImportMode("overwrite")}
                          className="mr-1.5"
                        />
                        <span className="font-bold text-[11px] text-slate-800">Prepísať zhodné ID</span>
                        <p className="text-[10px] text-slate-500 mt-0.5">Aktualizuje existujúci projekt rovnakého ID</p>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Restore Action Button */}
              {fileContent && (
                <button
                  onClick={handleRestore}
                  disabled={isProcessing}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Obnovujem dáta...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Spustiť obnovu zo súboru</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Zavrieť
          </button>
        </div>
      </div>
    </div>
  );
}
