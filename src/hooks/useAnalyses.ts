import { useState, useEffect, useCallback } from 'react';
import { AnalysisVersionSnapshot } from '../types/versioning';
import { asvsRequirements } from '../data/asvsData';

export interface Analysis {
  id: string;
  name: string;
  systemType: string;
  asvsLevel: string;
  businessOwners: string;
  createdAt: string;
  status: string; // "Draft" | "Final" | "In Review"
  currentVersion: string; // e.g. "1.0" or "1.1"
  versions?: AnalysisVersionSnapshot[];
}

const STORAGE_KEY = 'atap_analyses';

// Seed initial baseline snapshot for Retail Banking API v1.0
const SEED_V1_SNAPSHOT: AnalysisVersionSnapshot = {
  version: "1.0",
  label: "Iniciálny bezpečnostný baseline",
  createdAt: "2026-03-10T10:00:00.000Z",
  createdBy: "Erik Novák",
  status: "Final",
  changeSummary: "Iniciálna verzia bezpečnostnej analýzy pred vstupom do auditu. Identifikované kľúčové riziká v autentifikácii a parameter tampering.",
  asvsLevel: "2",
  metrics: {
    asvsCoverage: 48,
    totalOpenThreats: 3,
    criticalRisks: 2,
    openFindings: 22,
    totalImplemented: 24,
    totalReqs: 50
  },
  data: {
    context: {
      businessPurpose: "E-commerce & retail banking platform for end-customers.",
      dataClassification: "Confidential",
      complianceRequirements: ["GDPR"],
      userTypes: ["Unauthenticated", "Customer", "Admin"],
      internetFacing: true
    },
    threats: [
      {
        id: "TR-001",
        title: "Session Hijacking via XSS",
        description: "An attacker could steal session cookies if XSS vulnerabilities exist in the user profile inputs.",
        stride: "Elevation of Privilege",
        likelihood: "Probably",
        impact: "Major",
        risk: "High",
        status: "Open",
        mitigation: "V4.3.1 (HttpOnly cookies), V5.1.1 (Output encoding)"
      },
      {
        id: "TR-002",
        title: "Parameter Tampering on Checkout",
        description: "Manipulation of product prices during checkout process via intercepting proxy.",
        stride: "Tampering",
        likelihood: "Probably",
        impact: "Major",
        risk: "High",
        status: "Open",
        mitigation: "V5.1.4 (Server-side validation)"
      },
      {
        id: "TR-003",
        title: "Brute Force of Admin Login",
        description: "Automated credential stuffing against the administrative portal.",
        stride: "Spoofing",
        likelihood: "Frequently",
        impact: "Major",
        risk: "Critical",
        status: "Open",
        mitigation: "V2.2.1 (Anti-automation), V2.3.1 (MFA)"
      }
    ],
    asvsReqs: asvsRequirements.map((req, idx) => {
      // In baseline v1.0, some reqs were Missing or Partial
      if (req.id === "V2.1.1") {
        return { ...req, status: "Missing", notes: "Chýba validácia komplexity hesiel na backend API." };
      }
      if (req.id === "V3.2.1") {
        return { ...req, status: "Partial", notes: "Tokeny nemajú nastavenú automatickú rotáciu." };
      }
      if (idx % 3 === 0) {
        return { ...req, status: "Implemented" };
      }
      return { ...req, status: req.status || "Missing" };
    })
  }
};

const DEFAULT_ANALYSIS: Analysis = {
  id: "1",
  name: "Retail Banking API v2.4",
  systemType: "api",
  asvsLevel: "2",
  businessOwners: "team@example.com",
  createdAt: "2026-03-10T10:00:00.000Z",
  status: "Draft",
  currentVersion: "1.1",
  versions: [SEED_V1_SNAPSHOT]
};

function normalizeAnalyses(items: any[]): Analysis[] {
  return items.map(item => {
    const currentVer = item.currentVersion || (item.versions && item.versions.length > 0 ? item.versions[item.versions.length - 1].version : "1.0");
    const versionsList = Array.isArray(item.versions) ? item.versions : [];
    
    // If analysis id is 1 and has no versions, inject baseline v1.0
    if (item.id === "1" && versionsList.length === 0) {
      versionsList.push(SEED_V1_SNAPSHOT);
    }
    
    return {
      ...item,
      currentVersion: currentVer,
      versions: versionsList,
      status: item.status || "Draft"
    };
  });
}

export function useAnalyses() {
  const [analyses, setAnalyses] = useState<Analysis[]>(() => {
    if (typeof window === 'undefined') return [DEFAULT_ANALYSIS];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = normalizeAnalyses(parsed);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
          return normalized;
        }
      }
    } catch (e) {
      console.error('Failed to parse stored analyses', e);
    }
    const initial: Analysis[] = [DEFAULT_ANALYSIS];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    } catch (e) {}
    return initial;
  });

  useEffect(() => {
    const syncFromStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setAnalyses(normalizeAnalyses(parsed));
          }
        }
      } catch (e) {}
    };

    window.addEventListener('storage_workspace_update', syncFromStorage);
    window.addEventListener('storage', syncFromStorage);
    return () => {
      window.removeEventListener('storage_workspace_update', syncFromStorage);
      window.removeEventListener('storage', syncFromStorage);
    };
  }, []);

  const saveAnalysis = (analysis: Omit<Analysis, 'id' | 'createdAt' | 'status' | 'currentVersion' | 'versions'>) => {
    const newAnalysis: Analysis = {
      ...analysis,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: 'Draft',
      currentVersion: '1.0',
      versions: []
    };
    const updated = [...analyses, newAnalysis];
    setAnalyses(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
    window.dispatchEvent(new Event('storage_workspace_update'));
    return newAnalysis;
  };

  const updateAnalysis = useCallback((id: string, updates: Partial<Analysis>) => {
    setAnalyses(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, ...updates } : a);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save updated analysis', e);
      }
      setTimeout(() => {
        window.dispatchEvent(new Event('storage_workspace_update'));
      }, 0);
      return updated;
    });
  }, []);

  const deleteAnalysis = (id: string) => {
    const updated = analyses.filter(a => a.id !== id);
    setAnalyses(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
    window.dispatchEvent(new Event('storage_workspace_update'));
  };

  /**
   * Rename an existing analysis and record an audit trail event.
   */
  const renameAnalysis = useCallback((id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return false;

    setAnalyses(prev => {
      const target = prev.find(a => a.id === id);
      const oldName = target ? target.name : "";
      const updated = prev.map(a => a.id === id ? { ...a, name: trimmed } : a);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save renamed analysis', e);
      }

      // Add audit log
      const logsKey = `atap_logs_v5_${id}`;
      try {
        const storedLogs = localStorage.getItem(logsKey);
        const prevLogs = storedLogs ? JSON.parse(storedLogs) : [];
        const newLog = {
          id: Date.now().toString(),
          action: oldName ? `Projekt premenovaný z "${oldName}" na "${trimmed}".` : `Projekt premenovaný na "${trimmed}".`,
          user: "Erik Novák",
          time: "Práve teraz"
        };
        localStorage.setItem(logsKey, JSON.stringify([newLog, ...prevLogs]));
      } catch (e) {}

      setTimeout(() => {
        window.dispatchEvent(new Event('storage_workspace_update'));
        window.dispatchEvent(new Event('storage'));
      }, 0);

      return updated;
    });

    return true;
  }, []);

  /**
   * Finalize the current version of an analysis into an immutable snapshot.
   */
  const finalizeVersion = useCallback((
    analysisId: string,
    params: {
      versionNumber?: string;
      label?: string;
      changeSummary?: string;
      createdBy?: string;
    }
  ) => {
    const targetAnalysis = analyses.find(a => a.id === analysisId);
    if (!targetAnalysis) return null;

    const versionNumber = params.versionNumber || targetAnalysis.currentVersion || "1.0";
    
    // 1. Gather all current state for this analysis from localStorage
    const asvsKey = `atap_asvs_v5_${analysisId}`;
    const threatsKey = `atap_threats_${analysisId}`;
    const contextKey = `atap_context_${analysisId}`;
    const triageKey = `atap_triage_v5_${analysisId}`;
    const logsKey = `atap_logs_v5_${analysisId}`;
    const targetLvlKey = `atap_asvs_target_level_${analysisId}`;

    let reqsList: any[] = [];
    try {
      const stored = localStorage.getItem(asvsKey);
      if (stored) reqsList = JSON.parse(stored);
    } catch (e) {}

    let threatsList: any[] = [];
    try {
      const stored = localStorage.getItem(threatsKey);
      if (stored) threatsList = JSON.parse(stored);
    } catch (e) {}

    let contextData: any = null;
    try {
      const stored = localStorage.getItem(contextKey);
      if (stored) contextData = JSON.parse(stored);
    } catch (e) {}

    let triageAnswers: any = {};
    try {
      const stored = localStorage.getItem(triageKey);
      if (stored) triageAnswers = JSON.parse(stored);
    } catch (e) {}

    let logsList: any[] = [];
    try {
      const stored = localStorage.getItem(logsKey);
      if (stored) logsList = JSON.parse(stored);
    } catch (e) {}

    const totalRelevant = reqsList.filter((r: any) => r.status !== "N/A").length;
    const implementedCount = reqsList.filter((r: any) => r.status === "Implemented").length;
    const asvsCoverage = totalRelevant > 0 ? Math.round((implementedCount / totalRelevant) * 100) : 0;
    const openFindings = reqsList.filter((r: any) => r.status === "Missing" || r.status === "Partial").length;
    const totalOpenThreats = threatsList.filter((t: any) => t.status === "Open").length;
    const criticalRisks = threatsList.filter((t: any) => t.status === "Open" && (t.risk === "Critical" || t.risk === "High")).length;

    // 2. Build snapshot
    const snapshot: AnalysisVersionSnapshot = {
      version: versionNumber,
      label: params.label || `Finálna verzia ${versionNumber}`,
      createdAt: new Date().toISOString(),
      createdBy: params.createdBy || "Erik Novák",
      status: "Final",
      changeSummary: params.changeSummary || `Verzia ${versionNumber} bola finalizovaná a uzatvorená.`,
      asvsLevel: targetAnalysis.asvsLevel || "2",
      metrics: {
        asvsCoverage,
        totalOpenThreats,
        criticalRisks,
        openFindings,
        totalImplemented: implementedCount,
        totalReqs: reqsList.length
      },
      data: {
        context: contextData,
        asvsReqs: reqsList,
        triageAnswers,
        threats: threatsList,
        logs: logsList
      }
    };

    // 3. Update existing version list or append
    const existingVersions = targetAnalysis.versions || [];
    const filteredVersions = existingVersions.filter(v => v.version !== versionNumber);
    const updatedVersions = [...filteredVersions, snapshot].sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));

    // 4. Log audit trail
    const auditLog = {
      id: Date.now().toString(),
      action: `Verzia v${versionNumber} bola úspešne finalizovaná a uzamknutá (Status: Final).`,
      user: params.createdBy || "Erik Novák",
      time: "Práve teraz"
    };
    try {
      localStorage.setItem(logsKey, JSON.stringify([auditLog, ...logsList]));
    } catch (e) {}

    // 5. Update analysis record
    updateAnalysis(analysisId, {
      status: "Final",
      currentVersion: versionNumber,
      versions: updatedVersions
    });

    window.dispatchEvent(new Event("storage_workspace_update"));
    return snapshot;
  }, [analyses, updateAnalysis]);

  /**
   * Create a new version continuing from the previous state.
   */
  const createNewVersion = useCallback((
    analysisId: string,
    newVersionNumber: string,
    params?: {
      changeSummary?: string;
      label?: string;
      cloneFromVersion?: string;
    }
  ) => {
    const targetAnalysis = analyses.find(a => a.id === analysisId);
    if (!targetAnalysis) return false;

    // If cloning from a specific historical snapshot, restore its keys
    if (params?.cloneFromVersion && targetAnalysis.versions) {
      const snap = targetAnalysis.versions.find(v => v.version === params.cloneFromVersion);
      if (snap?.data) {
        if (snap.data.asvsReqs) {
          localStorage.setItem(`atap_asvs_v5_${analysisId}`, JSON.stringify(snap.data.asvsReqs));
        }
        if (snap.data.threats) {
          localStorage.setItem(`atap_threats_${analysisId}`, JSON.stringify(snap.data.threats));
        }
        if (snap.data.context) {
          localStorage.setItem(`atap_context_${analysisId}`, JSON.stringify(snap.data.context));
        }
        if (snap.data.triageAnswers) {
          localStorage.setItem(`atap_triage_v5_${analysisId}`, JSON.stringify(snap.data.triageAnswers));
        }
      }
    }

    // Add audit log
    const logsKey = `atap_logs_v5_${analysisId}`;
    try {
      const storedLogs = localStorage.getItem(logsKey);
      const prevLogs = storedLogs ? JSON.parse(storedLogs) : [];
      const newLog = {
        id: Date.now().toString(),
        action: `Vytvorená nová pracovná verzia v${newVersionNumber} (zo stavu v${targetAnalysis.currentVersion}).`,
        user: "Erik Novák",
        time: "Práve teraz"
      };
      localStorage.setItem(logsKey, JSON.stringify([newLog, ...prevLogs]));
    } catch (e) {}

    // Update analysis status to Draft with new version
    updateAnalysis(analysisId, {
      currentVersion: newVersionNumber,
      status: "Draft"
    });

    window.dispatchEvent(new Event("storage_workspace_update"));
    return true;
  }, [analyses, updateAnalysis]);

  return { 
    analyses, 
    saveAnalysis, 
    updateAnalysis, 
    renameAnalysis,
    deleteAnalysis, 
    finalizeVersion, 
    createNewVersion 
  };
}

