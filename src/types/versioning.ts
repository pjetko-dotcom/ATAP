/**
 * Types and interfaces for the Security Analysis Versioning and Diff System.
 */
import { ASVSRequirement } from "../data/asvsData";

export interface VersionMetrics {
  asvsCoverage: number;
  totalOpenThreats: number;
  criticalRisks: number;
  openFindings: number;
  totalImplemented: number;
  totalReqs: number;
}

export interface VersionSnapshotData {
  context?: {
    businessPurpose: string;
    dataClassification: string;
    complianceRequirements: string[];
    userTypes: string[];
    internetFacing: boolean;
  };
  asvsReqs?: ASVSRequirement[];
  triageAnswers?: Record<string, boolean>;
  threats?: Array<{
    id: string;
    title: string;
    description: string;
    stride: string;
    likelihood: string;
    impact: string;
    risk: string;
    status: string;
    mitigation: string;
  }>;
  categorization?: any;
  targetLevel?: number | "all";
  logs?: Array<{
    id: string;
    action: string;
    user: string;
    time: string;
  }>;
}

export interface AnalysisVersionSnapshot {
  version: string;             // e.g. "1.0", "1.1", "2.0"
  label?: string;              // e.g. "Production Baseline", "Q3 Security Audit"
  createdAt: string;           // ISO date string (e.g. "2026-03-10T10:00:00.000Z")
  createdBy: string;           // e.g. "Erik Novák"
  status: "Draft" | "Final";   // Final = immutable snapshot; Draft = in progress
  changeSummary?: string;      // Description of changes or release notes
  asvsLevel: string;           // e.g. "2"
  metrics: VersionMetrics;
  data: VersionSnapshotData;
}

export interface ASVSDiffItem {
  id: string;
  title: string;
  chapter: number;
  section: string;
  changeType: "status_changed" | "notes_changed" | "traceability_changed" | "added" | "unchanged";
  oldStatus?: string;
  newStatus?: string;
  oldNotes?: string;
  newNotes?: string;
  oldTraceability?: string[];
  newTraceability?: string[];
}

export interface ThreatDiffItem {
  id: string;
  title: string;
  stride: string;
  changeType: "added" | "removed" | "status_changed" | "risk_changed" | "mitigation_changed" | "unchanged";
  oldStatus?: string;
  newStatus?: string;
  oldRisk?: string;
  newRisk?: string;
  oldMitigation?: string;
  newMitigation?: string;
}

export interface ContextDiffItem {
  field: string;
  label: string;
  oldValue: string | string[] | boolean;
  newValue: string | string[] | boolean;
  isDifferent: boolean;
}

export interface VersionDiffResult {
  versionA: string;
  versionB: string;
  dateA: string;
  dateB: string;
  labelA?: string;
  labelB?: string;
  metricsDelta: {
    asvsCoverageDelta: number;
    openThreatsDelta: number;
    criticalRisksDelta: number;
    openFindingsDelta: number;
    implementedDelta: number;
    levelA: string;
    levelB: string;
  };
  asvsDiffs: ASVSDiffItem[];
  threatDiffs: ThreatDiffItem[];
  contextDiffs: ContextDiffItem[];
  totalChangesCount: number;
}
