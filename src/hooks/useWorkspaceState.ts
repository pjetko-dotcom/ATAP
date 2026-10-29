import { useState, useEffect } from "react";
import { asvsRequirements, ASVSRequirement, asvsTriageQuestions, getRequirementsForTriage } from "../data/asvsData";
import { LOCAL_ACTIVITY_ACTOR } from "../utils/activityLog";

export interface AuditLog {
  id: string;
  action: string;
  user: string;
  time: string;
}

const DEFAULT_COMPONENTS = [
  { id: "Frontend App", color: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
  { id: "API Gateway", color: "bg-pink-50 text-pink-700 border border-pink-200" },
  { id: "Auth Service", color: "bg-amber-50 text-amber-700 border border-amber-200" },
  { id: "Main Database", color: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  { id: "Payment Gateway", color: "bg-sky-50 text-sky-700 border border-sky-200" },
  { id: "Notification Service", color: "bg-purple-50 text-purple-700 border border-purple-200" },
];

export function useWorkspaceState(analysisId: string | undefined) {
  const asvsKey = `atap_asvs_v5_${analysisId || "default"}`;
  const logsKey = `atap_logs_v5_${analysisId || "default"}`;
  const activeKey = `atap_active_req_v5_${analysisId || "default"}`;
  const triageKey = `atap_triage_v5_${analysisId || "default"}`;
  const targetLevelKey = `atap_asvs_target_level_${analysisId || "default"}`;

  // Helper to load and merge ASVS Requirements synchronously
  const loadInitialReqs = (): ASVSRequirement[] => {
    if (typeof window === 'undefined') return asvsRequirements;
    try {
      const stored = localStorage.getItem(asvsKey);
      if (stored) {
        const parsed = JSON.parse(stored) as ASVSRequirement[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return asvsRequirements.map(newReq => {
            const oldReq = parsed.find(r => r.id === newReq.id);
            if (oldReq) {
              return {
                ...newReq,
                status: oldReq.status || newReq.status,
                notes: oldReq.notes || newReq.notes,
                triageReason: oldReq.triageReason || newReq.triageReason,
                traceability: (oldReq.traceability && oldReq.traceability.length > 0) ? oldReq.traceability : newReq.traceability,
              };
            }
            return newReq;
          });
        }
      }
    } catch (e) {
      console.error("Error loading stored ASVS reqs", e);
    }
    return asvsRequirements;
  };

  // Helper to determine initial targetLevel
  const loadInitialLevel = (): number | "all" => {
    if (typeof window === 'undefined') return 2;
    try {
      const storedLvl = localStorage.getItem(targetLevelKey);
      if (storedLvl) {
        if (storedLvl === "all") return "all";
        const num = parseInt(storedLvl, 10);
        if (num >= 1 && num <= 3) return num;
      }
      // Check atap_analyses for this analysis's level
      const storedAnalyses = localStorage.getItem("atap_analyses");
      if (storedAnalyses && analysisId) {
        const parsed = JSON.parse(storedAnalyses);
        const match = parsed.find((a: any) => a.id === analysisId);
        if (match?.asvsLevel) {
          const num = parseInt(match.asvsLevel, 10);
          if (num >= 1 && num <= 3) return num;
        }
      }
    } catch (e) {}
    return 2; // Default to Level 2
  };

  const [reqs, setReqs] = useState<ASVSRequirement[]>(loadInitialReqs);
  const [logs, setLogs] = useState<AuditLog[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(logsKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [{ id: "1", action: "Created Analysis Workspace", user: LOCAL_ACTIVITY_ACTOR, time: "Just now" }];
  });
  const [activeReqId, setActiveReqId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(activeKey);
  });
  const [triageAnswers, setTriageAnswers] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem(triageKey);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [targetLevel, setTargetLevelState] = useState<number | "all">(loadInitialLevel);

  // Sync if analysisId changes
  useEffect(() => {
    if (!analysisId) return;
    setReqs(loadInitialReqs());
    setTargetLevelState(loadInitialLevel());

    const storedLogs = localStorage.getItem(logsKey);
    if (storedLogs) {
      try { setLogs(JSON.parse(storedLogs)); } catch (e) {}
    }
    const storedTriage = localStorage.getItem(triageKey);
    if (storedTriage) {
      try { setTriageAnswers(JSON.parse(storedTriage)); } catch (e) {}
    }
    setActiveReqId(localStorage.getItem(activeKey));
  }, [analysisId]);

  const notifyWorkspaceUpdate = () => {
    setTimeout(() => {
      window.dispatchEvent(new Event("storage_workspace_update"));
      window.dispatchEvent(new Event("storage"));
    }, 0);
  };

  const setTargetLevel = (newLevel: number | "all") => {
    setTargetLevelState(newLevel);
    try {
      localStorage.setItem(targetLevelKey, newLevel.toString());
      if (newLevel !== "all" && analysisId) {
        const storedAnalyses = localStorage.getItem("atap_analyses");
        if (storedAnalyses) {
          const analyses = JSON.parse(storedAnalyses);
          const updated = analyses.map((a: any) => 
            a.id === analysisId ? { ...a, asvsLevel: newLevel.toString() } : a
          );
          localStorage.setItem("atap_analyses", JSON.stringify(updated));
        }
      }
    } catch (e) {
      console.error("Failed to save targetLevel", e);
    }
    addLog(`Cieľová úroveň ASVS nastavená na: ${newLevel === "all" ? "Všetky (L1-L3)" : `L${newLevel}`}`);
    notifyWorkspaceUpdate();
  };

  const saveWorkspace = () => {
    try {
      localStorage.setItem(asvsKey, JSON.stringify(reqs));
      localStorage.setItem(triageKey, JSON.stringify(triageAnswers));
      localStorage.setItem(logsKey, JSON.stringify(logs));
      localStorage.setItem(targetLevelKey, targetLevel.toString());
      if (targetLevel !== "all" && analysisId) {
        const storedAnalyses = localStorage.getItem("atap_analyses");
        if (storedAnalyses) {
          const analyses = JSON.parse(storedAnalyses);
          const updated = analyses.map((a: any) => 
            a.id === analysisId ? { ...a, asvsLevel: targetLevel.toString() } : a
          );
          localStorage.setItem("atap_analyses", JSON.stringify(updated));
        }
      }
      addLog("Analýza a stav ASVS požiadaviek úspešne uložené");
      notifyWorkspaceUpdate();
      return true;
    } catch (e) {
      console.error("Failed to save workspace", e);
      return false;
    }
  };

  // Update localStorage when reqs change
  const saveReqs = (updatedReqs: ASVSRequirement[]) => {
    setReqs(updatedReqs);
    localStorage.setItem(asvsKey, JSON.stringify(updatedReqs));
    notifyWorkspaceUpdate();
  };

  const addLog = (action: string) => {
    const newLog: AuditLog = {
      id: Date.now().toString(),
      action,
      user: LOCAL_ACTIVITY_ACTOR,
      time: "Just now"
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem(logsKey, JSON.stringify(updatedLogs));
    notifyWorkspaceUpdate();
  };

  const updateRequirementStatus = (reqId: string, status: string) => {
    const updated = reqs.map(r => r.id === reqId ? { ...r, status: status as any } : r);
    saveReqs(updated);
    addLog(`Changed requirement ${reqId} status to ${status}`);
  };

  const batchUpdateRequirementStatus = (reqIds: string[], status: string, reason?: string) => {
    if (reqIds.length === 0) return;
    const idSet = new Set(reqIds);
    const updated = reqs.map(r => {
      if (idSet.has(r.id)) {
        return {
          ...r,
          status: status as any,
          triageReason: status === "N/A" && reason ? reason : r.triageReason,
          notes: reason && status === "N/A" ? (r.notes ? `${r.notes}\nOdôvodnenie N/A: ${reason}` : `Odôvodnenie N/A: ${reason}`) : r.notes
        };
      }
      return r;
    });
    setReqs(updated);
    localStorage.setItem(asvsKey, JSON.stringify(updated));

    const newLog: AuditLog = {
      id: Date.now().toString(),
      action: `Hromadne zmenený stav pre ${reqIds.length} požiadaviek na "${status}"${reason ? ` (dôvod: ${reason})` : ""}`,
      user: LOCAL_ACTIVITY_ACTOR,
      time: "Just now"
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem(logsKey, JSON.stringify(updatedLogs));
    notifyWorkspaceUpdate();
  };

  const batchUpdateRequirementNotes = (reqIds: string[], notes: string) => {
    if (reqIds.length === 0 || !notes.trim()) return;
    const idSet = new Set(reqIds);
    const updated = reqs.map(r => {
      if (idSet.has(r.id)) {
        const newNotes = r.notes ? `${r.notes}\n${notes.trim()}` : notes.trim();
        return { ...r, notes: newNotes };
      }
      return r;
    });
    setReqs(updated);
    localStorage.setItem(asvsKey, JSON.stringify(updated));

    const newLog: AuditLog = {
      id: Date.now().toString(),
      action: `Hromadné doplnenie poznámky/evidencie pre ${reqIds.length} požiadaviek`,
      user: LOCAL_ACTIVITY_ACTOR,
      time: "Just now"
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem(logsKey, JSON.stringify(updatedLogs));
    notifyWorkspaceUpdate();
  };

  const updateRequirementNote = (reqId: string, notes: string) => {
    const updated = reqs.map(r => r.id === reqId ? { ...r, notes } : r);
    saveReqs(updated);
    addLog(`Updated implementation notes for ${reqId}`);
  };

  const toggleRequirementTraceability = (reqId: string, compId: string, compColor: string) => {
    const updated = reqs.map(r => {
      if (r.id === reqId) {
        const traces = r.traceability || [];
        const exists = traces.some(t => t.id === compId);
        const updatedTraces = exists 
          ? traces.filter(t => t.id !== compId)
          : [...traces, { id: compId, color: compColor }];
        
        const actionMsg = exists 
          ? `Removed traceability mapping for ${compId} from ${reqId}`
          : `Linked architectural component ${compId} to ${reqId}`;
        
        setTimeout(() => addLog(actionMsg), 50);
        return { ...r, traceability: updatedTraces };
      }
      return r;
    });
    saveReqs(updated);
  };

  const selectActiveRequirement = (reqId: string | null) => {
    setActiveReqId(reqId);
    if (reqId) {
      localStorage.setItem(activeKey, reqId);
    } else {
      localStorage.removeItem(activeKey);
    }
    notifyWorkspaceUpdate();
  };

  /**
   * Set answer to a triage question.
   * If isRelevant === false, marks all affected requirements as "N/A" (nepotrebné) with a reason.
   */
  const setTriageAnswer = (questionId: string, isRelevant: boolean) => {
    const question = asvsTriageQuestions.find(q => q.id === questionId);
    if (!question) return;

    const newAnswers = { ...triageAnswers, [questionId]: isRelevant };
    setTriageAnswers(newAnswers);
    localStorage.setItem(triageKey, JSON.stringify(newAnswers));

    const affectedIds = new Set(getRequirementsForTriage(question, reqs));

    if (!isRelevant) {
      // Mark as N/A (Not Applicable / Nepotrebné)
      const updated = reqs.map(r => {
        if (affectedIds.has(r.id)) {
          return {
            ...r,
            status: "N/A" as const,
            triageReason: `Vylúčené triážou: ${question.category} (Odpoveď: Nie je relevantné)`,
            notes: r.notes ? r.notes : `Označené ako nepotrebné na základe triage otázky: "${question.question}"`
          };
        }
        return r;
      });
      saveReqs(updated);
      addLog(`Triáž: Kontroly pre oblasť "${question.category}" (${affectedIds.size} požiadaviek) označené ako nepotrebné (N/A)`);
    } else {
      // If it was previously excluded by this triage question, restore back into evaluation
      const updated = reqs.map(r => {
        if (affectedIds.has(r.id) && r.triageReason && r.triageReason.includes(question.category)) {
          return {
            ...r,
            status: "Missing" as const,
            triageReason: undefined
          };
        }
        return r;
      });
      saveReqs(updated);
      addLog(`Triáž: Oblasť "${question.category}" potvrdená ako relevantná pre aplikáciu`);
    }
  };

  /**
   * Reset a triage question answer back to undecided.
   */
  const resetTriageAnswer = (questionId: string) => {
    const question = asvsTriageQuestions.find(q => q.id === questionId);
    const newAnswers = { ...triageAnswers };
    delete newAnswers[questionId];
    setTriageAnswers(newAnswers);
    localStorage.setItem(triageKey, JSON.stringify(newAnswers));

    if (question) {
      const affectedIds = new Set(getRequirementsForTriage(question, reqs));
      const updated = reqs.map(r => {
        if (affectedIds.has(r.id) && r.triageReason && r.triageReason.includes(question.category)) {
          return {
            ...r,
            status: "Missing" as const,
            triageReason: undefined
          };
        }
        return r;
      });
      saveReqs(updated);
      addLog(`Triáž: Resetovaná odpoveď pre "${question.category}"`);
    }
  };

  return {
    reqs,
    logs,
    activeReqId,
    triageAnswers,
    targetLevel,
    setTargetLevel,
    saveWorkspace,
    setTriageAnswer,
    resetTriageAnswer,
    updateRequirementStatus,
    batchUpdateRequirementStatus,
    batchUpdateRequirementNotes,
    updateRequirementNote,
    toggleRequirementTraceability,
    selectActiveRequirement,
    addLog,
    components: DEFAULT_COMPONENTS,
  };
}
