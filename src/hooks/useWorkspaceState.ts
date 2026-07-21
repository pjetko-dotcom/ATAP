import { useState, useEffect } from "react";
import { asvsRequirements, ASVSRequirement } from "../data/asvsData";

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
  const [reqs, setReqs] = useState<ASVSRequirement[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [activeReqId, setActiveReqId] = useState<string | null>(null);

  const asvsKey = `atap_asvs_v5_${analysisId || "default"}`;
  const logsKey = `atap_logs_v5_${analysisId || "default"}`;
  const activeKey = `atap_active_req_v5_${analysisId || "default"}`;

  // Load initial data
  useEffect(() => {
    if (!analysisId) return;

    // Load ASVS Requirements
    const storedAsvs = localStorage.getItem(asvsKey);
    if (storedAsvs) {
      try {
        const parsed = JSON.parse(storedAsvs) as ASVSRequirement[];
        // Merge: keep static titles/descriptions from code, keep status/notes/traceability from storage
        const merged = asvsRequirements.map(newReq => {
          const oldReq = parsed.find(r => r.id === newReq.id);
          if (oldReq) {
            return {
              ...newReq,
              status: oldReq.status || newReq.status,
              notes: oldReq.notes || newReq.notes,
              traceability: (oldReq.traceability && oldReq.traceability.length > 0) ? oldReq.traceability : newReq.traceability,
            };
          }
          return newReq;
        });
        setReqs(merged);
        // Save the merged data back so it stays in sync
        localStorage.setItem(asvsKey, JSON.stringify(merged));
      } catch (e) {
        setReqs(asvsRequirements);
        localStorage.setItem(asvsKey, JSON.stringify(asvsRequirements));
      }
    } else {
      setReqs(asvsRequirements);
      localStorage.setItem(asvsKey, JSON.stringify(asvsRequirements));
    }

    // Load Audit Logs
    const storedLogs = localStorage.getItem(logsKey);
    if (storedLogs) {
      try {
        setLogs(JSON.parse(storedLogs));
      } catch (e) {
        setLogs([]);
      }
    } else {
      const initialLogs: AuditLog[] = [
        { id: "1", action: "Created Analysis Workspace", user: "Erik Novák", time: "Just now" }
      ];
      setLogs(initialLogs);
      localStorage.setItem(logsKey, JSON.stringify(initialLogs));
    }

    // Load Active Req ID
    const storedActive = localStorage.getItem(activeKey);
    if (storedActive) {
      setActiveReqId(storedActive);
    }
  }, [analysisId]);

  // Update localStorage when reqs change
  const saveReqs = (updatedReqs: ASVSRequirement[]) => {
    setReqs(updatedReqs);
    localStorage.setItem(asvsKey, JSON.stringify(updatedReqs));
    
    // Dispatch a storage event to alert other components in the same window (like AnalysisLayout)
    window.dispatchEvent(new Event("storage_workspace_update"));
  };

  const addLog = (action: string) => {
    const newLog: AuditLog = {
      id: Date.now().toString(),
      action,
      user: "Erik Novák",
      time: "Just now"
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem(logsKey, JSON.stringify(updatedLogs));
    window.dispatchEvent(new Event("storage_workspace_update"));
  };

  const updateRequirementStatus = (reqId: string, status: string) => {
    const updated = reqs.map(r => r.id === reqId ? { ...r, status: status as any } : r);
    saveReqs(updated);
    addLog(`Changed requirement ${reqId} status to ${status}`);
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
    window.dispatchEvent(new Event("storage_workspace_update"));
  };

  return {
    reqs,
    logs,
    activeReqId,
    updateRequirementStatus,
    updateRequirementNote,
    toggleRequirementTraceability,
    selectActiveRequirement,
    addLog,
    components: DEFAULT_COMPONENTS,
  };
}
