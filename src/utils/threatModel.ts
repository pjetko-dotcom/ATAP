export type LikelihoodLevel = "Exceptionally" | "Unlikely" | "Probably" | "Frequently";
export type ImpactLevel = "Minor" | "Moderate" | "Major" | "Critical";
export type RiskLevel = "Very Low" | "Low" | "Medium" | "High" | "Critical";
export type ThreatStatus = "Open" | "Mitigated" | "Remediated" | "Accepted";

export interface Threat {
  id: string;
  title: string;
  description: string;
  stride: string;
  likelihood: LikelihoodLevel;
  impact: ImpactLevel;
  risk: RiskLevel;
  status: ThreatStatus;
  mitigation: string;
  componentIds?: string[];
  asvsRefs?: string[];
  architectureFlowId?: string;
}

export interface ArchitectureThreatComponent {
  id: string;
  name: string;
  zoneId: string;
}

export interface ArchitectureThreatZone {
  id: string;
  name: string;
}

export interface ArchitectureThreatFlow {
  id: string;
  from: string;
  to: string;
  dataClassification: "Public" | "Internal" | "Confidential" | "Restricted";
  encrypted: boolean;
}

export const initialThreats: Threat[] = [
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
    description: "Manipulation of product prices during the checkout process via intercepting proxy.",
    stride: "Tampering",
    likelihood: "Probably",
    impact: "Major",
    risk: "High",
    status: "Mitigated",
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
  },
  {
    id: "TR-004",
    title: "Information Disclosure via Stack Traces",
    description: "Unhandled exceptions leaking internal network paths and database versions.",
    stride: "Information Disclosure",
    likelihood: "Exceptionally",
    impact: "Minor",
    risk: "Very Low",
    status: "Accepted",
    mitigation: "Risk accepted for internal dev environments. To be fixed in Prod."
  }
];

export function calculateThreatRisk(likelihood: LikelihoodLevel, impact: ImpactLevel): RiskLevel {
  const scoresLikelihood: Record<LikelihoodLevel, number> = {
    Exceptionally: 1,
    Unlikely: 2,
    Probably: 3,
    Frequently: 4
  };
  const scoresImpact: Record<ImpactLevel, number> = {
    Minor: 1,
    Moderate: 2,
    Major: 3,
    Critical: 4
  };
  const score = scoresLikelihood[likelihood] * scoresImpact[impact];

  if (score >= 12) return "Critical";
  if (score >= 8) return "High";
  if (score >= 4) return "Medium";
  if (score >= 2) return "Low";
  return "Very Low";
}

function createArchitectureThreat(
  flow: ArchitectureThreatFlow,
  source: ArchitectureThreatComponent,
  target: ArchitectureThreatComponent,
  sourceZone: ArchitectureThreatZone,
  targetZone: ArchitectureThreatZone,
  id: string
): Threat {
  const impact: Record<ArchitectureThreatFlow["dataClassification"], ImpactLevel> = {
    Public: "Minor",
    Internal: "Moderate",
    Confidential: "Major",
    Restricted: "Critical"
  };
  const threatImpact = impact[flow.dataClassification];
  const encryptedNote = flow.encrypted
    ? "The flow is marked as encrypted; verify encryption configuration, certificate validation, and endpoint identity."
    : "The flow is marked as unencrypted; assess confidentiality and tampering exposure and require appropriate transport protection.";

  return {
    id,
    title: `Trust-boundary access: ${source.name} → ${target.name}`,
    description: `This data flow crosses from "${sourceZone.name}" into "${targetZone.name}". If the receiving component does not enforce authentication, authorization, and input validation, a lower-trust source could gain unauthorized access or influence protected operations. This is an automatically generated scenario, not a confirmed vulnerability. ${encryptedNote}`,
    stride: "Elevation of Privilege",
    likelihood: "Unlikely",
    impact: threatImpact,
    risk: calculateThreatRisk("Unlikely", threatImpact),
    status: "Open",
    mitigation: "Review authentication, authorization, input validation, transport protection, and security logging at this trust boundary.",
    componentIds: [source.id, target.id],
    architectureFlowId: flow.id
  };
}

export function syncArchitectureThreats(
  threats: Threat[],
  flows: ArchitectureThreatFlow[],
  components: ArchitectureThreatComponent[],
  zones: ArchitectureThreatZone[]
): Threat[] {
  const componentById = new Map(components.map(component => [component.id, component]));
  const zoneById = new Map(zones.map(zone => [zone.id, zone]));
  const boundaryFlows = flows.flatMap(flow => {
    const source = componentById.get(flow.from);
    const target = componentById.get(flow.to);
    if (!source || !target || source.zoneId === target.zoneId) return [];

    const sourceZone = zoneById.get(source.zoneId);
    const targetZone = zoneById.get(target.zoneId);
    return sourceZone && targetZone ? [{ flow, source, target, sourceZone, targetZone }] : [];
  });
  const boundaryFlowIds = new Set(boundaryFlows.map(({ flow }) => flow.id));
  const synced = threats.filter(threat =>
    !threat.architectureFlowId || boundaryFlowIds.has(threat.architectureFlowId)
  );

  for (const boundary of boundaryFlows) {
    const existingIndex = synced.findIndex(threat => threat.architectureFlowId === boundary.flow.id);
    if (existingIndex >= 0) {
      const current = synced[existingIndex];
      synced[existingIndex] = {
        ...createArchitectureThreat(
          boundary.flow,
          boundary.source,
          boundary.target,
          boundary.sourceZone,
          boundary.targetZone,
          current.id
        ),
        status: current.status
      };
      continue;
    }

    const baseId = `ATAP-${boundary.flow.id}`;
    let id = baseId;
    let suffix = 2;
    while (synced.some(threat => threat.id === id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    synced.push(createArchitectureThreat(
      boundary.flow,
      boundary.source,
      boundary.target,
      boundary.sourceZone,
      boundary.targetZone,
      id
    ));
  }

  return synced;
}
