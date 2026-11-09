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
  architectureFlowStride?: string;
  architectureReviewed?: boolean;
  architectureCustomized?: boolean;
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
  authenticated?: boolean;
  transferType?: "Synchronous" | "Asynchronous";
  dataDescription?: string;
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

export function getSuggestedStrideCategories(flow: ArchitectureThreatFlow): string[] {
  const categories = ["Elevation of Privilege", "Denial of Service"];
  if (!flow.authenticated) categories.push("Spoofing", "Repudiation");
  if (!flow.encrypted) categories.push("Tampering");
  if (!flow.encrypted && flow.dataClassification !== "Public") {
    categories.push("Information Disclosure");
  }
  return categories;
}

function getStrideCode(stride: string): string {
  return stride.split(/\s+/).map(word => word[0]).join("").toUpperCase();
}

function createArchitectureThreat(
  flow: ArchitectureThreatFlow,
  source: ArchitectureThreatComponent,
  target: ArchitectureThreatComponent,
  sourceZone: ArchitectureThreatZone,
  targetZone: ArchitectureThreatZone,
  stride: string,
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

  const scenarioByStride: Record<string, string> = {
    "Elevation of Privilege": `A lower-trust source may reach privileged operations in ${target.name} without sufficient authorization.`,
    Spoofing: `An unauthenticated sender may impersonate a trusted client or service when communicating with ${target.name}.`,
    Tampering: `An attacker may modify data in transit between ${source.name} and ${target.name}.`,
    Repudiation: `Without authenticated, attributable requests, actions arriving at ${target.name} may be difficult to trace to their source.`,
    "Information Disclosure": `Sensitive data may be exposed while moving from ${source.name} to ${target.name}.`,
    "Denial of Service": flow.transferType === "Asynchronous"
      ? `An attacker may overwhelm queues or consumers handling this asynchronous flow.`
      : `An attacker may exhaust resources or block requests along this synchronous flow.`
  };
  const dataContext = flow.dataDescription?.trim()
    ? ` Data described by the model: ${flow.dataDescription.trim()}.`
    : "";

  return {
    id,
    title: `${stride}: ${source.name} → ${target.name}`,
    description: `This data flow crosses from "${sourceZone.name}" into "${targetZone.name}". ${scenarioByStride[stride]}${dataContext} This is an automatically generated scenario, not a confirmed vulnerability. ${encryptedNote}`,
    stride,
    likelihood: "Unlikely",
    impact: threatImpact,
    risk: calculateThreatRisk("Unlikely", threatImpact),
    status: "Open",
    mitigation: `Review ${stride === "Spoofing" ? "sender authentication and identity validation" : stride === "Tampering" ? "message integrity and input validation" : stride === "Repudiation" ? "attributable identity and audit logging" : stride === "Information Disclosure" ? "encryption and data minimization" : stride === "Denial of Service" ? "rate limits, timeouts, and resource limits" : "authorization and least privilege"} at this trust boundary.`,
    componentIds: [source.id, target.id],
    architectureFlowId: flow.id,
    architectureFlowStride: stride,
    architectureReviewed: false,
    architectureCustomized: false
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
  const synced = threats.filter(threat => {
    if (!threat.architectureFlowId) return true;
    if (!boundaryFlowIds.has(threat.architectureFlowId)) return false;
    return threat.architectureCustomized || getSuggestedStrideCategories(
      boundaryFlows.find(({ flow }) => flow.id === threat.architectureFlowId)!.flow
    ).includes(threat.architectureFlowStride ?? "Elevation of Privilege");
  });

  for (const boundary of boundaryFlows) {
    for (const stride of getSuggestedStrideCategories(boundary.flow)) {
      const currentIndex = synced.findIndex(threat =>
        threat.architectureFlowId === boundary.flow.id &&
        (threat.architectureFlowStride ?? "Elevation of Privilege") === stride
      );
      if (currentIndex >= 0) {
        const current = synced[currentIndex];
        if (!current.architectureCustomized) {
          synced[currentIndex] = {
            ...createArchitectureThreat(
              boundary.flow,
              boundary.source,
              boundary.target,
              boundary.sourceZone,
              boundary.targetZone,
              stride,
              current.id
            ),
            status: current.status,
            architectureReviewed: current.architectureReviewed
          };
        }
        continue;
      }

      const baseId = `ATAP-${boundary.flow.id}-${getStrideCode(stride)}`;
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
        stride,
        id
      ));
    }
  }

  return synced;
}
