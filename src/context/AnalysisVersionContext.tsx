/**
 * AnalysisVersionContext provides versioning state, snapshot navigation,
 * and read-only flags throughout the analysis layout and child routes.
 */
import React, { createContext, useContext, useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAnalyses, Analysis } from "../hooks/useAnalyses";
import { AnalysisVersionSnapshot } from "../types/versioning";

interface AnalysisVersionContextType {
  analysis: Analysis;
  currentWorkingVersion: string;
  viewingVersion: string;
  isHistorical: boolean;
  isReadOnly: boolean;
  activeSnapshot: AnalysisVersionSnapshot | null;
  allVersions: AnalysisVersionSnapshot[];
  setViewingVersion: (version: string) => void;
  resetToActiveVersion: () => void;
  isFinalizeModalOpen: boolean;
  setIsFinalizeModalOpen: (open: boolean) => void;
  isNewVersionModalOpen: boolean;
  setIsNewVersionModalOpen: (open: boolean) => void;
  isDiffModalOpen: boolean;
  setIsDiffModalOpen: (open: boolean) => void;
  isHistoryModalOpen: boolean;
  setIsHistoryModalOpen: (open: boolean) => void;
  diffInitialVersions: { versionA: string; versionB: string };
  openDiffWithVersions: (vA: string, vB: string) => void;
  finalizeVersion: (params: { versionNumber?: string; label?: string; changeSummary?: string; createdBy?: string }) => void;
  createNewVersion: (newVersionNumber: string, params?: { changeSummary?: string; label?: string; cloneFromVersion?: string }) => void;
}

const AnalysisVersionContext = createContext<AnalysisVersionContextType | null>(null);

export function AnalysisVersionProvider({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const { analyses, finalizeVersion: doFinalize, createNewVersion: doCreateNew } = useAnalyses();

  const analysis = useMemo(() => {
    return analyses.find(a => a.id === id) || {
      id: id || "1",
      name: "Retail Banking API v2.4",
      systemType: "api",
      asvsLevel: "2",
      businessOwners: "team@example.com",
      createdAt: new Date().toISOString(),
      status: "Draft",
      currentVersion: "1.0",
      versions: []
    };
  }, [analyses, id]);

  const currentWorkingVersion = analysis.currentVersion || "1.0";
  const [viewingVersion, setViewingVersion] = useState<string>(currentWorkingVersion);

  // If analysis currentVersion changes (e.g. created a new version), sync viewingVersion
  useEffect(() => {
    setViewingVersion(analysis.currentVersion || "1.0");
  }, [analysis.currentVersion, analysis.id]);

  const allVersions = useMemo(() => {
    return analysis.versions || [];
  }, [analysis.versions]);

  const activeSnapshot = useMemo(() => {
    if (!analysis.versions) return null;
    return analysis.versions.find(v => v.version === viewingVersion) || null;
  }, [analysis.versions, viewingVersion]);

  // Is historical if the user is explicitly viewing a finalized historical snapshot
  const isHistorical = viewingVersion !== currentWorkingVersion && activeSnapshot !== null;
  // Read-only if viewing historical snapshot OR if the active analysis is in "Final" status
  const isReadOnly = isHistorical || (viewingVersion === currentWorkingVersion && analysis.status === "Final");

  // Modals state
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [diffInitialVersions, setDiffInitialVersions] = useState<{ versionA: string; versionB: string }>({
    versionA: "1.0",
    versionB: currentWorkingVersion
  });

  const openDiffWithVersions = (vA: string, vB: string) => {
    setDiffInitialVersions({ versionA: vA, versionB: vB });
    setIsDiffModalOpen(true);
  };

  const resetToActiveVersion = () => {
    setViewingVersion(currentWorkingVersion);
  };

  const handleFinalize = (params: { versionNumber?: string; label?: string; changeSummary?: string; createdBy?: string }) => {
    if (analysis.id) {
      doFinalize(analysis.id, params);
      setIsFinalizeModalOpen(false);
    }
  };

  const handleCreateNew = (newVersionNumber: string, params?: { changeSummary?: string; label?: string; cloneFromVersion?: string }) => {
    if (analysis.id) {
      doCreateNew(analysis.id, newVersionNumber, params);
      setViewingVersion(newVersionNumber);
      setIsNewVersionModalOpen(false);
    }
  };

  return (
    <AnalysisVersionContext.Provider
      value={{
        analysis,
        currentWorkingVersion,
        viewingVersion,
        isHistorical,
        isReadOnly,
        activeSnapshot,
        allVersions,
        setViewingVersion,
        resetToActiveVersion,
        isFinalizeModalOpen,
        setIsFinalizeModalOpen,
        isNewVersionModalOpen,
        setIsNewVersionModalOpen,
        isDiffModalOpen,
        setIsDiffModalOpen,
        isHistoryModalOpen,
        setIsHistoryModalOpen,
        diffInitialVersions,
        openDiffWithVersions,
        finalizeVersion: handleFinalize,
        createNewVersion: handleCreateNew,
      }}
    >
      {children}
    </AnalysisVersionContext.Provider>
  );
}

export function useAnalysisVersion() {
  const ctx = useContext(AnalysisVersionContext);
  if (!ctx) {
    throw new Error("useAnalysisVersion must be used within an AnalysisVersionProvider");
  }
  return ctx;
}
