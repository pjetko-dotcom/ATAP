/**
 * Architecture Model - Interactive DFD & Threat Canvas
 * Provides an interactive Data Flow Diagram (DFD) canvas allowing users to visualize
 * architectural components, trust boundaries, data flows, and map them to STRIDE threats and ASVS controls.
 * 
 * @module ArchitectureModel
 */
import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { 
  Server, 
  Database, 
  Globe, 
  ShieldAlert, 
  Lock, 
  Plus, 
  Trash2, 
  Move, 
  Layers, 
  Info, 
  ExternalLink, 
  Check, 
  ArrowRight, 
  AlertTriangle,
  RefreshCw,
  Zap,
  Sliders,
  X,
  FileCode2,
  Network,
  Pencil
} from "lucide-react";
import { useWorkspaceState } from "../hooks/useWorkspaceState";
import { initialThreats, syncArchitectureThreats } from "../utils/threatModel";
import { getDiagramLayoutIssues, getFlowPathGeometry } from "../utils/dfd";

export interface ArchComponent {
  id: string;
  name: string;
  type: "client" | "api_gateway" | "service" | "database" | "external";
  zoneId: string;
  tech: string;
  x: number;
  y: number;
}

export interface TrustZone {
  id: string;
  name: string;
  color: string;
  borderColor: string;
  bgTint: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DataFlow {
  id: string;
  from: string;
  to: string;
  protocol: string;
  dataClassification: "Public" | "Internal" | "Confidential" | "Restricted";
  encrypted: boolean;
  authenticated: boolean;
  transferType: "Synchronous" | "Asynchronous";
  dataDescription: string;
}

function normalizeStoredDataFlow(value: unknown): DataFlow | null {
  if (!value || typeof value !== "object") return null;
  const flow = value as Record<string, unknown>;
  if (
    typeof flow.id !== "string" ||
    typeof flow.from !== "string" ||
    typeof flow.to !== "string" ||
    typeof flow.protocol !== "string"
  ) return null;

  const dataClassification = ["Public", "Internal", "Confidential", "Restricted"].includes(String(flow.dataClassification))
    ? flow.dataClassification as DataFlow["dataClassification"]
    : "Internal";
  return {
    id: flow.id,
    from: flow.from,
    to: flow.to,
    protocol: flow.protocol,
    dataClassification,
    encrypted: typeof flow.encrypted === "boolean" ? flow.encrypted : false,
    authenticated: typeof flow.authenticated === "boolean" ? flow.authenticated : false,
    transferType: flow.transferType === "Asynchronous" ? "Asynchronous" : "Synchronous",
    dataDescription: typeof flow.dataDescription === "string" ? flow.dataDescription : ""
  };
}

type TrustZoneColorKey = "red" | "amber" | "blue" | "emerald" | "purple" | "slate";

const TRUST_ZONE_COLORS: Record<TrustZoneColorKey, Pick<TrustZone, "color" | "borderColor" | "bgTint"> & { label: string }> = {
  red: { label: "Red", color: "text-red-700", borderColor: "border-red-300", bgTint: "bg-red-50/20" },
  amber: { label: "Amber", color: "text-amber-700", borderColor: "border-amber-300", bgTint: "bg-amber-50/20" },
  blue: { label: "Blue", color: "text-blue-700", borderColor: "border-blue-300", bgTint: "bg-blue-50/20" },
  emerald: { label: "Emerald", color: "text-emerald-700", borderColor: "border-emerald-300", bgTint: "bg-emerald-50/20" },
  purple: { label: "Purple", color: "text-purple-700", borderColor: "border-purple-300", bgTint: "bg-purple-50/20" },
  slate: { label: "Slate", color: "text-slate-700", borderColor: "border-slate-300", bgTint: "bg-slate-50/20" }
};

const COMPONENT_NODE_WIDTH = 190;
const COMPONENT_NODE_HEIGHT = 100;
const CANVAS_WIDTH = 1300;
const CANVAS_HEIGHT = 600;
const MIN_ZONE_WIDTH = COMPONENT_NODE_WIDTH + 40;
const MIN_ZONE_HEIGHT = COMPONENT_NODE_HEIGHT + 80;

function getTrustZoneColorKey(zone: TrustZone): TrustZoneColorKey {
  return (Object.keys(TRUST_ZONE_COLORS) as TrustZoneColorKey[])
    .find(key => TRUST_ZONE_COLORS[key].color === zone.color) ?? "blue";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function constrainComponentToZone(component: ArchComponent, zone: TrustZone): ArchComponent {
  const padding = 10;
  return {
    ...component,
    x: clamp(component.x, zone.x + padding, Math.max(zone.x + padding, zone.x + zone.width - COMPONENT_NODE_WIDTH - padding)),
    y: clamp(component.y, zone.y + 44, Math.max(zone.y + 44, zone.y + zone.height - COMPONENT_NODE_HEIGHT - padding))
  };
}

function constrainTrustZone(zone: TrustZone): TrustZone {
  const width = clamp(zone.width, MIN_ZONE_WIDTH, CANVAS_WIDTH - 20);
  const height = clamp(zone.height, MIN_ZONE_HEIGHT, CANVAS_HEIGHT - 20);
  return {
    ...zone,
    width,
    height,
    x: clamp(zone.x, 10, CANVAS_WIDTH - width - 10),
    y: clamp(zone.y, 10, CANVAS_HEIGHT - height - 10)
  };
}

function getStoredTrustZones(parsed: { zones?: unknown }): TrustZone[] {
  if (!Array.isArray(parsed.zones)) return DEFAULT_ZONES;
  const validZones = parsed.zones.filter((value): value is TrustZone => {
    if (!value || typeof value !== "object") return false;
    const zone = value as Record<string, unknown>;
    return typeof zone.id === "string" &&
      typeof zone.name === "string" &&
      typeof zone.x === "number" &&
      typeof zone.y === "number" &&
      typeof zone.width === "number" &&
      typeof zone.height === "number" &&
      typeof zone.color === "string" &&
      typeof zone.borderColor === "string" &&
      typeof zone.bgTint === "string";
  });
  return validZones.length ? validZones.map(constrainTrustZone) : DEFAULT_ZONES;
}

function findComponentPosition(zone: TrustZone, components: ArchComponent[]): { x: number; y: number } {
  const xStart = zone.x + 10;
  const yStart = zone.y + 50;
  const xEnd = Math.max(xStart, zone.x + zone.width - COMPONENT_NODE_WIDTH - 10);
  const yEnd = Math.max(yStart, zone.y + zone.height - COMPONENT_NODE_HEIGHT - 10);

  for (let y = yStart; y <= yEnd; y += 30) {
    for (let x = xStart; x <= xEnd; x += 24) {
      const hasOverlap = components.some(component =>
        x < component.x + COMPONENT_NODE_WIDTH &&
        x + COMPONENT_NODE_WIDTH > component.x &&
        y < component.y + COMPONENT_NODE_HEIGHT &&
        y + COMPONENT_NODE_HEIGHT > component.y
      );
      if (!hasOverlap) return { x, y };
    }
  }

  return { x: xStart, y: yStart };
}

const DEFAULT_ZONES: TrustZone[] = [
  {
    id: "zone_internet",
    name: "Verejný Internet (Nedôveryhodná zóna)",
    color: "text-red-700",
    borderColor: "border-red-300",
    bgTint: "bg-red-50/20",
    x: 30,
    y: 40,
    width: 250,
    height: 480
  },
  {
    id: "zone_dmz",
    name: "DMZ & Edge Perimeter",
    color: "text-amber-700",
    borderColor: "border-amber-300",
    bgTint: "bg-amber-50/20",
    x: 320,
    y: 40,
    width: 270,
    height: 480
  },
  {
    id: "zone_internal",
    name: "Interná privátna sieť (VPC / Trust)",
    color: "text-blue-700",
    borderColor: "border-blue-300",
    bgTint: "bg-blue-50/20",
    x: 630,
    y: 40,
    width: 320,
    height: 480
  },
  {
    id: "zone_data",
    name: "Izolovaná dátová zóna (PCI/Vault)",
    color: "text-emerald-700",
    borderColor: "border-emerald-300",
    bgTint: "bg-emerald-50/20",
    x: 990,
    y: 40,
    width: 250,
    height: 480
  }
];

const DEFAULT_COMPONENTS: ArchComponent[] = [
  {
    id: "Frontend App",
    name: "Frontend SPA (React)",
    type: "client",
    zoneId: "zone_internet",
    tech: "TypeScript / Vite / Tailwind",
    x: 60,
    y: 180
  },
  {
    id: "API Gateway",
    name: "API Gateway & WAF",
    type: "api_gateway",
    zoneId: "zone_dmz",
    tech: "Kong / Cloudflare TLS 1.3",
    x: 350,
    y: 180
  },
  {
    id: "Auth Service",
    name: "Auth & Identity Service",
    type: "service",
    zoneId: "zone_internal",
    tech: "Go / OAuth2 / OIDC / JWT",
    x: 670,
    y: 120
  },
  {
    id: "Core Backend API",
    name: "Core Business API",
    type: "service",
    zoneId: "zone_internal",
    tech: "Node.js / Express / gRPC",
    x: 670,
    y: 280
  },
  {
    id: "Main Database",
    name: "Main Relational DB",
    type: "database",
    zoneId: "zone_data",
    tech: "PostgreSQL (Encrypted at Rest)",
    x: 1020,
    y: 280
  },
  {
    id: "Payment Gateway",
    name: "Stripe API (3rd Party)",
    type: "external",
    zoneId: "zone_dmz",
    tech: "HTTPS Webhook / REST",
    x: 350,
    y: 360
  }
];

const DEFAULT_FLOWS: DataFlow[] = [
  {
    id: "flow_1",
    from: "Frontend App",
    to: "API Gateway",
    protocol: "HTTPS / TLS 1.3 (REST)",
    dataClassification: "Confidential",
    encrypted: true,
    authenticated: true,
    transferType: "Synchronous",
    dataDescription: "User requests and session data"
  },
  {
    id: "flow_2",
    from: "API Gateway",
    to: "Auth Service",
    protocol: "mTLS / gRPC (Token Verify)",
    dataClassification: "Restricted",
    encrypted: true,
    authenticated: true,
    transferType: "Synchronous",
    dataDescription: "Identity tokens"
  },
  {
    id: "flow_3",
    from: "API Gateway",
    to: "Core Backend API",
    protocol: "Internal HTTP (mTLS Header)",
    dataClassification: "Confidential",
    encrypted: true,
    authenticated: true,
    transferType: "Synchronous",
    dataDescription: "Business requests and customer data"
  },
  {
    id: "flow_4",
    from: "Core Backend API",
    to: "Main Database",
    protocol: "TLS Connection (Prepared Statements)",
    dataClassification: "Restricted",
    encrypted: true,
    authenticated: true,
    transferType: "Synchronous",
    dataDescription: "Persisted application records"
  },
  {
    id: "flow_5",
    from: "Core Backend API",
    to: "Payment Gateway",
    protocol: "HTTPS (HMAC Signature Webhook)",
    dataClassification: "Restricted",
    encrypted: true,
    authenticated: true,
    transferType: "Asynchronous",
    dataDescription: "Payment events and transaction metadata"
  }
];

export function ArchitectureModel() {
  const { id: analysisId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const requestedComponent = searchParams.get("component");
  const storageKey = `atap_architecture_${analysisId || "default"}`;

  const [components, setComponents] = useState<ArchComponent[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.components && Array.isArray(parsed.components) && parsed.components.length > 0) {
          const storedZones = getStoredTrustZones(parsed);
          return parsed.components.map((component: ArchComponent) => {
            const zone = storedZones.find(item => item.id === component.zoneId) ?? storedZones[0];
            return constrainComponentToZone({ ...component, zoneId: zone.id }, zone);
          });
        }
      }
    } catch (error) {
      console.error("Failed to load architecture components", error);
    }
    return DEFAULT_COMPONENTS;
  });

  const [flows, setFlows] = useState<DataFlow[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.flows && Array.isArray(parsed.flows)) {
          return parsed.flows
            .map(normalizeStoredDataFlow)
            .filter((flow: DataFlow | null): flow is DataFlow => flow !== null);
        }
      }
    } catch (error) {
      console.error("Failed to load architecture data flows", error);
    }
    return DEFAULT_FLOWS;
  });

  const [zones, setZones] = useState<TrustZone[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return getStoredTrustZones(parsed);
      }
    } catch (error) {
      console.error("Failed to load architecture trust zones", error);
    }
    return DEFAULT_ZONES;
  });

  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const [draggingZoneId, setDraggingZoneId] = useState<string | null>(null);
  const [resizingZoneId, setResizingZoneId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneColor, setNewZoneColor] = useState<TrustZoneColorKey>("blue");
  const [isAddFlowOpen, setIsAddFlowOpen] = useState(false);
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New component form state
  const [newCompName, setNewCompName] = useState("");
  const [newCompType, setNewCompType] = useState<ArchComponent["type"]>("service");
  const [newCompZone, setNewCompZone] = useState("zone_internal");
  const [newCompTech, setNewCompTech] = useState("");

  // New flow form state
  const [newFlowFrom, setNewFlowFrom] = useState("");
  const [newFlowTo, setNewFlowTo] = useState("");
  const [newFlowProtocol, setNewFlowProtocol] = useState("HTTPS / TLS 1.3");
  const [newFlowClassification, setNewFlowClassification] = useState<DataFlow["dataClassification"]>("Confidential");
  const [newFlowEncrypted, setNewFlowEncrypted] = useState(false);
  const [newFlowAuthenticated, setNewFlowAuthenticated] = useState(false);
  const [newFlowTransferType, setNewFlowTransferType] = useState<DataFlow["transferType"]>("Synchronous");
  const [newFlowDataDescription, setNewFlowDataDescription] = useState("");

  const canvasRef = useRef<HTMLDivElement>(null);

  const openAddComponentModal = () => {
    setEditingCompId(null);
    setNewCompName("");
    setNewCompType("service");
    setNewCompZone("zone_internal");
    setNewCompTech("");
    setIsComponentModalOpen(true);
  };

  const openEditComponentModal = (component: ArchComponent) => {
    setEditingCompId(component.id);
    setNewCompName(component.name);
    setNewCompType(component.type);
    setNewCompZone(component.zoneId);
    setNewCompTech(component.tech);
    setIsComponentModalOpen(true);
  };

  const openAddZoneModal = () => {
    setEditingZoneId(null);
    setNewZoneName("");
    setNewZoneColor("blue");
    setIsZoneModalOpen(true);
  };

  const openEditZoneModal = (zone: TrustZone) => {
    setEditingZoneId(zone.id);
    setNewZoneName(zone.name);
    setNewZoneColor(getTrustZoneColorKey(zone));
    setIsZoneModalOpen(true);
  };

  const openAddFlowModal = (from = components[0]?.id ?? "", to = components[1]?.id ?? "") => {
    setEditingFlowId(null);
    setNewFlowFrom(from);
    setNewFlowTo(to);
    setNewFlowProtocol("HTTPS / TLS 1.3");
    setNewFlowClassification("Confidential");
    setNewFlowEncrypted(false);
    setNewFlowAuthenticated(false);
    setNewFlowTransferType("Synchronous");
    setNewFlowDataDescription("");
    setIsAddFlowOpen(true);
  };

  const openEditFlowModal = (flow: DataFlow) => {
    setEditingFlowId(flow.id);
    setNewFlowFrom(flow.from);
    setNewFlowTo(flow.to);
    setNewFlowProtocol(flow.protocol);
    setNewFlowClassification(flow.dataClassification);
    setNewFlowEncrypted(flow.encrypted);
    setNewFlowAuthenticated(flow.authenticated);
    setNewFlowTransferType(flow.transferType);
    setNewFlowDataDescription(flow.dataDescription);
    setIsAddFlowOpen(true);
  };

  useEffect(() => {
    if (requestedComponent && components.some(component => component.id === requestedComponent)) {
      setSelectedCompId(requestedComponent);
    }
  }, [requestedComponent, components]);

  // Save the complete DFD model whenever its components, flows, or trust zones change.
  useEffect(() => {
    const data = {
      components,
      flows,
      zones
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save architecture model", error);
      setToastMessage("Model architektúry sa nepodarilo uložiť do lokálneho úložiska.");
    }
  }, [components, flows, zones, storageKey]);

  useEffect(() => {
    const threatStorageKey = `atap_threats_${analysisId || "default"}`;
    const savedThreats = localStorage.getItem(threatStorageKey);
    let threats = initialThreats;

    if (savedThreats) {
      try {
        const parsed: unknown = JSON.parse(savedThreats);
        if (!Array.isArray(parsed)) {
          console.error("Cannot sync architecture threats: stored threat register is not an array.");
          return;
        }
        threats = parsed;
      } catch (error) {
        console.error("Cannot sync architecture threats: stored threat register is invalid.", error);
        return;
      }
    }

    const syncedThreats = syncArchitectureThreats(threats, flows, components, zones);
    if (JSON.stringify(syncedThreats) !== JSON.stringify(threats)) {
      try {
        localStorage.setItem(threatStorageKey, JSON.stringify(syncedThreats));
      } catch (error) {
        console.error("Failed to save architecture-generated threats", error);
        setToastMessage("Automatické hrozby sa nepodarilo uložiť do registra hrozieb.");
      }
    }
  }, [analysisId, components, flows, zones]);

  // Load threats associated with selected component
  let threatsForSelected: any[] = [];
  if (selectedCompId) {
    try {
      const rawThreats = localStorage.getItem(`atap_threats_${analysisId || "default"}`);
      if (rawThreats) {
        const parsed = JSON.parse(rawThreats);
        threatsForSelected = parsed.filter((t: any) => 
          (Array.isArray(t.componentIds) && t.componentIds.includes(selectedCompId)) ||
          (t.title && t.title.toLowerCase().includes(selectedCompId.toLowerCase())) ||
          (t.description && t.description.toLowerCase().includes(selectedCompId.toLowerCase())) ||
          (t.mitigation && t.mitigation.toLowerCase().includes(selectedCompId.toLowerCase()))
        );
      }
    } catch (e) {}
  }

  // Load ASVS controls mapped to selected component
  let asvsMappedCount = 0;
  if (selectedCompId) {
    try {
      const rawReqs = localStorage.getItem(`atap_asvs_v5_${analysisId || "default"}`);
      if (rawReqs) {
        const parsed = JSON.parse(rawReqs);
        asvsMappedCount = parsed.filter((r: any) => 
          r.traceability && r.traceability.some((t: any) => t.id === selectedCompId)
        ).length;
      }
    } catch (e) {}
  }

  // Drag and Drop Handlers
  const handleMouseDown = (e: React.MouseEvent, compId: string) => {
    e.stopPropagation();
    setSelectedCompId(compId);
    const comp = components.find(c => c.id === compId);
    if (!comp) return;

    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!canvas || !rect) return;

    setDraggingCompId(compId);
    setDragOffset({
      x: e.clientX - rect.left + canvas.scrollLeft - comp.x,
      y: e.clientY - rect.top + canvas.scrollTop - comp.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!canvas || !rect) return;
    const pointerX = e.clientX - rect.left + canvas.scrollLeft;
    const pointerY = e.clientY - rect.top + canvas.scrollTop;

    if (draggingCompId) {
      const component = components.find(item => item.id === draggingCompId);
      const zone = component && zones.find(item => item.id === component.zoneId);
      if (!component || !zone) return;

      const minX = zone.x + 10;
      const minY = zone.y + 44;
      setComponents(prev => prev.map(item => item.id === draggingCompId
        ? {
            ...item,
            x: clamp(pointerX - dragOffset.x, minX, Math.max(minX, zone.x + zone.width - COMPONENT_NODE_WIDTH - 10)),
            y: clamp(pointerY - dragOffset.y, minY, Math.max(minY, zone.y + zone.height - COMPONENT_NODE_HEIGHT - 10))
          }
        : item
      ));
      return;
    }

    if (draggingZoneId) {
      const zone = zones.find(item => item.id === draggingZoneId);
      if (!zone) return;
      const x = clamp(pointerX - dragOffset.x, 10, CANVAS_WIDTH - zone.width - 10);
      const y = clamp(pointerY - dragOffset.y, 10, CANVAS_HEIGHT - zone.height - 10);
      const deltaX = x - zone.x;
      const deltaY = y - zone.y;
      const movedZone = { ...zone, x, y };

      setZones(prev => prev.map(item => item.id === draggingZoneId ? movedZone : item));
      setComponents(prev => prev.map(component => component.zoneId === draggingZoneId
        ? constrainComponentToZone({ ...component, x: component.x + deltaX, y: component.y + deltaY }, movedZone)
        : component
      ));
      return;
    }

    if (resizingZoneId) {
      const zone = zones.find(item => item.id === resizingZoneId);
      if (!zone) return;
      const resizedZone = {
        ...zone,
        width: clamp(pointerX - zone.x, MIN_ZONE_WIDTH, CANVAS_WIDTH - zone.x - 10),
        height: clamp(pointerY - zone.y, MIN_ZONE_HEIGHT, CANVAS_HEIGHT - zone.y - 10)
      };
      setZones(prev => prev.map(item => item.id === resizingZoneId ? resizedZone : item));
      setComponents(prev => prev.map(component => component.zoneId === resizingZoneId
        ? constrainComponentToZone(component, resizedZone)
        : component
      ));
    }
  };

  const handleZoneMouseDown = (e: React.MouseEvent, zone: TrustZone) => {
    e.stopPropagation();
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!canvas || !rect) return;
    setDraggingZoneId(zone.id);
    setDragOffset({
      x: e.clientX - rect.left + canvas.scrollLeft - zone.x,
      y: e.clientY - rect.top + canvas.scrollTop - zone.y
    });
  };

  const handleZoneKeyboardResize = (e: React.KeyboardEvent, zone: TrustZone) => {
    const steps: Record<string, { width: number; height: number }> = {
      ArrowRight: { width: 20, height: 0 },
      ArrowLeft: { width: -20, height: 0 },
      ArrowDown: { width: 0, height: 20 },
      ArrowUp: { width: 0, height: -20 }
    };
    const step = steps[e.key];
    if (!step) return;
    e.preventDefault();
    const resizedZone = constrainTrustZone({
      ...zone,
      width: zone.width + step.width,
      height: zone.height + step.height
    });
    setZones(prev => prev.map(item => item.id === zone.id ? resizedZone : item));
    setComponents(prev => prev.map(component => component.zoneId === zone.id
      ? constrainComponentToZone(component, resizedZone)
      : component
    ));
  };

  const handleZoneResizeMouseDown = (e: React.MouseEvent, zone: TrustZone) => {
    e.stopPropagation();
    setResizingZoneId(zone.id);
  };

  const handleMouseUp = () => {
    setDraggingCompId(null);
    setDraggingZoneId(null);
    setResizingZoneId(null);
  };

  const handleResetArchitecture = () => {
    if (window.confirm("Naozaj chcete obnoviť architektúru na predvolený stav?")) {
      setComponents(DEFAULT_COMPONENTS);
      setFlows(DEFAULT_FLOWS);
      setZones(DEFAULT_ZONES);
      setSelectedCompId(null);
      setToastMessage("Architektúra bola obnovená na odporúčaný model.");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleSaveZone = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newZoneName.trim();
    if (!name) return;
    if (zones.some(zone => zone.id !== editingZoneId && zone.name.toLowerCase() === name.toLowerCase())) {
      alert("Zóna s týmto názvom už existuje.");
      return;
    }

    const color = TRUST_ZONE_COLORS[newZoneColor];
    if (editingZoneId) {
      setZones(prev => prev.map(zone => zone.id === editingZoneId
        ? { ...zone, name, color: color.color, borderColor: color.borderColor, bgTint: color.bgTint }
        : zone
      ));
      setToastMessage(`Trust zóna "${name}" bola upravená.`);
    } else {
      let id = `zone_${Date.now()}`;
      let suffix = 2;
      while (zones.some(zone => zone.id === id)) {
        id = `zone_${Date.now()}_${suffix}`;
        suffix += 1;
      }
      setZones(prev => [...prev, {
        id,
        name,
        color: color.color,
        borderColor: color.borderColor,
        bgTint: color.bgTint,
        x: clamp(30 + zones.length * 35, 10, CANVAS_WIDTH - 270),
        y: clamp(40 + zones.length * 25, 10, CANVAS_HEIGHT - 290),
        width: 260,
        height: 280
      }]);
      setToastMessage(`Trust zóna "${name}" bola vytvorená.`);
    }
    setIsZoneModalOpen(false);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteZone = (zone: TrustZone) => {
    if (zones.length < 2) {
      alert("V modeli musí zostať aspoň jedna trust zóna.");
      return;
    }
    if (!window.confirm(`Odstrániť zónu "${zone.name}"? Jej komponenty sa presunú do inej zóny.`)) return;

    const remainingZones = zones.filter(item => item.id !== zone.id);
    const fallbackZone = remainingZones[0];
    const componentsToMove = components.filter(component => component.zoneId === zone.id);
    const placedComponents = components.filter(component => component.zoneId === fallbackZone.id);
    const movedComponents = componentsToMove.map(component => {
      const position = findComponentPosition(fallbackZone, placedComponents);
      const moved = constrainComponentToZone({ ...component, zoneId: fallbackZone.id, ...position }, fallbackZone);
      placedComponents.push(moved);
      return moved;
    });
    const movedById = new Map(movedComponents.map(component => [component.id, component]));

    setZones(remainingZones);
    setComponents(prev => prev.map(component => movedById.get(component.id) ?? component));
    setToastMessage(`Trust zóna "${zone.name}" bola odstránená.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveComponent = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCompName.trim();
    if (!name) return;

    const duplicate = components.some(c =>
      c.id !== editingCompId &&
      (c.id.toLowerCase() === name.toLowerCase() || c.name.toLowerCase() === name.toLowerCase())
    );
    if (duplicate) {
      alert("Komponent s týmto názvom už existuje.");
      return;
    }

    const tech = newCompTech.trim() || "Všeobecná služba";
    const targetZone = zones.find(zone => zone.id === newCompZone);
    if (!targetZone) {
      alert("Vybraná trust zóna už neexistuje. Obnovte formulár a skúste znova.");
      return;
    }
    if (editingCompId) {
      const existing = components.find(component => component.id === editingCompId);
      if (!existing) return;
      const position = existing.zoneId === newCompZone
        ? { x: existing.x, y: existing.y }
        : findComponentPosition(targetZone, components.filter(component => component.id !== editingCompId && component.zoneId === newCompZone));
      setComponents(prev => prev.map(component => component.id === editingCompId
        ? constrainComponentToZone({ ...component, ...position, name, type: newCompType, zoneId: newCompZone, tech }, targetZone)
        : component
      ));
      setSelectedCompId(editingCompId);
      setIsComponentModalOpen(false);
      setEditingCompId(null);
      setToastMessage(`Komponent "${name}" bol upravený.`);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const newId = name;
    const position = findComponentPosition(targetZone, components.filter(component => component.zoneId === newCompZone));

    const newComp: ArchComponent = {
      id: newId,
      name,
      type: newCompType,
      zoneId: newCompZone,
      tech,
      ...position
    };

    setComponents(prev => [...prev, newComp]);
    setSelectedCompId(newComp.id);
    setIsComponentModalOpen(false);
    setToastMessage(`Komponent "${newComp.name}" bol pridaný do modelu.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteComponent = (id: string) => {
    if (window.confirm(`Naozaj chcete odstrániť komponent "${id}" z diagramu?`)) {
      setComponents(prev => prev.filter(c => c.id !== id));
      setFlows(prev => prev.filter(f => f.from !== id && f.to !== id));
      if (selectedCompId === id) setSelectedCompId(null);
      setToastMessage(`Komponent "${id}" bol odstránený.`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleAddFlow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlowFrom || !newFlowTo || newFlowFrom === newFlowTo) {
      alert("Zvoľte odlišný zdrojový a cieľový komponent.");
      return;
    }
    if (!newFlowProtocol.trim()) {
      alert("Zadajte protokol alebo spôsob komunikácie.");
      return;
    }

    const newFlow: DataFlow = {
      id: editingFlowId ?? `flow_${Date.now()}`,
      from: newFlowFrom,
      to: newFlowTo,
      protocol: newFlowProtocol.trim(),
      dataClassification: newFlowClassification,
      encrypted: newFlowEncrypted,
      authenticated: newFlowAuthenticated,
      transferType: newFlowTransferType,
      dataDescription: newFlowDataDescription.trim()
    };

    setFlows(prev => editingFlowId
      ? prev.map(flow => flow.id === editingFlowId ? newFlow : flow)
      : [...prev, newFlow]
    );
    setIsAddFlowOpen(false);
    setEditingFlowId(null);
    setToastMessage(editingFlowId
      ? `Tok dát z ${newFlowFrom} do ${newFlowTo} bol aktualizovaný.`
      : `Tok dát z ${newFlowFrom} do ${newFlowTo} bol pridaný.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteFlow = (flowId: string) => {
    setFlows(prev => prev.filter(f => f.id !== flowId));
  };

  const getCompIcon = (type: ArchComponent["type"]) => {
    switch (type) {
      case "client": return <Globe size={16} className="text-blue-500" />;
      case "api_gateway": return <Network size={16} className="text-amber-500" />;
      case "service": return <Server size={16} className="text-purple-500" />;
      case "database": return <Database size={16} className="text-emerald-500" />;
      case "external": return <Zap size={16} className="text-sky-500" />;
    }
  };

  const selectedComp = components.find(c => c.id === selectedCompId);
  const layoutIssues = getDiagramLayoutIssues(
    zones.map(zone => ({ id: zone.id, name: zone.name, x: zone.x, y: zone.y, width: zone.width, height: zone.height })),
    components.map(component => ({
      id: component.id,
      name: component.name,
      x: component.x,
      y: component.y,
      width: COMPONENT_NODE_WIDTH,
      height: COMPONENT_NODE_HEIGHT
    }))
  );
  const overlappingZoneIds = new Set(layoutIssues.overlappingZones.flatMap(([first, second]) => [first.id, second.id]));
  const overlappingComponentIds = new Set(layoutIssues.overlappingComponents.flatMap(([first, second]) => [first.id, second.id]));
  const flowPairOffsets = new Map<string, { index: number; count: number }>();
  const flowsByPair = new Map<string, DataFlow[]>();
  for (const flow of flows) {
    const pairKey = [flow.from, flow.to].sort().join("\u0000");
    flowsByPair.set(pairKey, [...(flowsByPair.get(pairKey) ?? []), flow]);
  }
  for (const pairFlows of flowsByPair.values()) {
    pairFlows.forEach((flow, index) => flowPairOffsets.set(flow.id, { index, count: pairFlows.length }));
  }
  const componentRectangles = components.map(component => ({
    id: component.id,
    name: component.name,
    x: component.x,
    y: component.y,
    width: COMPONENT_NODE_WIDTH,
    height: COMPONENT_NODE_HEIGHT
  }));
  const flowGeometries = new Map(flows.flatMap(flow => {
    const from = componentRectangles.find(component => component.id === flow.from);
    const to = componentRectangles.find(component => component.id === flow.to);
    if (!from || !to) return [];
    const offset = flowPairOffsets.get(flow.id);
    const geometry = getFlowPathGeometry(
      from,
      to,
      offset?.index ?? 0,
      offset?.count ?? 1,
      componentRectangles.filter(component => component.id !== flow.from && component.id !== flow.to)
    );
    return geometry ? [[flow.id, geometry] as const] : [];
  }));
  const obstructedFlowIds = flows.filter(flow => (flowGeometries.get(flow.id)?.obstructedComponentIds.length ?? 0) > 0);
  const obstructedComponentIds = new Set(
    obstructedFlowIds.flatMap(flow => flowGeometries.get(flow.id)?.obstructedComponentIds ?? [])
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      
      {/* Header Toolbar */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Architektonický DFD Model</h1>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded border border-blue-200 uppercase">
              Data Flow Diagram
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Interaktívna mapa komponentov, hraníc dôvery (Trust Boundaries) a šifrovaných tokov dát prepojená so STRIDE hrozbami. Šípka ukazuje smer toku od zdroja k cieľu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openAddComponentModal}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Nový komponent</span>
          </button>

          <button
            onClick={() => {
              if (components.length < 2) {
                alert("Najprv vytvorte aspoň dva komponenty na prepojenie.");
                return;
              }
              openAddFlowModal(components[0].id, components[1].id);
            }}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Prepojiť tokom dát</span>
          </button>

          <button
            onClick={openAddZoneModal}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Layers size={14} />
            <span>Pridať trust zónu</span>
          </button>

          <button
            onClick={handleResetArchitecture}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            title="Resetovať na odporúčanú bezpečnú architektúru"
          >
            <RefreshCw size={13} />
            <span>Reset modelu</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="mx-6 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <Check size={14} className="text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Workspace (Canvas + Inspector Drawer) */}
      <div className="flex-1 flex flex-col overflow-hidden p-6 gap-3">
        {(layoutIssues.overlappingZones.length > 0 || layoutIssues.overlappingComponents.length > 0 || obstructedFlowIds.length > 0) && (
          <div role="alert" className="shrink-0 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle size={14} />
              <span>Rozloženie diagramu obsahuje prekrývajúce sa prvky.</span>
            </div>
            {layoutIssues.overlappingZones.length > 0 && (
              <p className="mt-1">Trust zóny: {layoutIssues.overlappingZones.map(([a, b]) => `${a.name} / ${b.name}`).join(", ")}</p>
            )}
            {layoutIssues.overlappingComponents.length > 0 && (
              <p className="mt-1">Komponenty: {layoutIssues.overlappingComponents.map(([a, b]) => `${a.name} / ${b.name}`).join(", ")}</p>
            )}
            {obstructedFlowIds.length > 0 && (
              <p className="mt-1">
                Toky vedené cez komponenty: {obstructedFlowIds.map(flow => {
                  const blockedBy = flowGeometries.get(flow.id)?.obstructedComponentIds
                    .map(id => components.find(component => component.id === id)?.name ?? id)
                    .join(", ");
                  return `${flow.from} → ${flow.to} (${blockedBy})`;
                }).join("; ")}
              </p>
            )}
          </div>
        )}
        <div className="flex-1 flex overflow-hidden gap-4 min-h-0">
        
        {/* Canvas Container */}
        <div 
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={() => setSelectedCompId(null)}
          className="flex-1 bg-white rounded-xl border border-slate-200 shadow-xs relative overflow-auto custom-scrollbar select-none min-w-[900px] min-h-[560px]"
          style={{
            backgroundImage: `radial-gradient(#cbd5e1 1px, transparent 1px)`,
            backgroundSize: "24px 24px"
          }}
        >
          {/* Trust Boundaries (Zones) */}
          {zones.map(zone => (
            <div
              key={zone.id}
              className={`absolute rounded-xl border-2 border-dashed ${zone.borderColor} ${zone.bgTint} pointer-events-none ${
                overlappingZoneIds.has(zone.id) ? "ring-4 ring-amber-400/70" : ""
              }`}
              style={{
                left: zone.x,
                top: zone.y,
                width: zone.width,
                height: zone.height,
                transition: draggingZoneId === zone.id || resizingZoneId === zone.id ? "none" : "all 150ms"
              }}
            >
              <div
                onMouseDown={event => handleZoneMouseDown(event, zone)}
                className="pointer-events-auto flex items-center justify-between gap-2 p-2.5 cursor-move select-none"
                title="Potiahnutím presuňte trust zónu"
              >
                <span className={`text-[11px] font-bold uppercase tracking-wider ${zone.color}`}>
                  {zone.name}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onMouseDown={event => event.stopPropagation()}
                    onClick={() => openEditZoneModal(zone)}
                    aria-label={`Upraviť zónu ${zone.name}`}
                    title="Upraviť zónu"
                    className="pointer-events-auto rounded bg-white/80 p-1 text-slate-500 hover:text-blue-700"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    onMouseDown={event => event.stopPropagation()}
                    onClick={() => handleDeleteZone(zone)}
                    aria-label={`Odstrániť zónu ${zone.name}`}
                    title="Odstrániť zónu"
                    className="pointer-events-auto rounded bg-white/80 p-1 text-slate-500 hover:text-red-600"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <button
                type="button"
                onMouseDown={event => handleZoneResizeMouseDown(event, zone)}
                onKeyDown={event => handleZoneKeyboardResize(event, zone)}
                aria-label={`Zmeniť veľkosť zóny ${zone.name}. Pomocou šípok upravujte veľkosť po 20 pixeloch.`}
                title="Potiahnutím zmeňte veľkosť; klávesmi šípok upravujte po 20 px"
                className="pointer-events-auto absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize rounded-tl bg-white/80 text-slate-500 hover:text-blue-700"
              >
                <Move size={12} className="mx-auto rotate-45" />
              </button>
            </div>
          ))}

          {/* SVG Connectors for Data Flows */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: 1300, minHeight: 600 }}>
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#3b82f6" />
              </marker>
              <marker
                id="arrow-selected"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#1d4ed8" />
              </marker>
              <marker
                id="arrow-boundary"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#ea580c" />
              </marker>
              <marker
                id="arrow-boundary-selected"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#c2410c" />
              </marker>
            </defs>

            {flows.map(flow => {
              const fromComp = components.find(c => c.id === flow.from);
              const toComp = components.find(c => c.id === flow.to);
              if (!fromComp || !toComp) return null;

              const geometry = flowGeometries.get(flow.id);
              if (!geometry) return null;

              const labelWidth = Math.min(110, geometry.length - 36);
              const showFlowLabel = labelWidth >= 42;
              const maxLabelCharacters = Math.floor((labelWidth - 12) / 5);
              const flowLabel = flow.protocol.length > maxLabelCharacters
                ? `${flow.protocol.substring(0, maxLabelCharacters - 1)}…`
                : flow.protocol;

              const isFlowHighlighted = selectedCompId === flow.from || selectedCompId === flow.to;
              const crossesTrustBoundary = fromComp.zoneId !== toComp.zoneId;
              const stroke = crossesTrustBoundary
                ? (isFlowHighlighted ? "#c2410c" : "#ea580c")
                : (isFlowHighlighted ? "#2563eb" : "#94a3b8");

              return (
                <g key={flow.id}>
                  <title>{`Tok dát: ${flow.protocol}; ${flow.transferType.toLowerCase()}; ${crossesTrustBoundary ? "prekračuje hranicu trust zóny" : "v rámci jednej trust zóny"}`}</title>
                  {/* Flow line */}
                  <path
                    d={geometry.path}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={isFlowHighlighted ? 2.5 : 1.8}
                    strokeDasharray={flow.encrypted ? undefined : "6 4"}
                    markerEnd={crossesTrustBoundary
                      ? (isFlowHighlighted ? "url(#arrow-boundary-selected)" : "url(#arrow-boundary)")
                      : (isFlowHighlighted ? "url(#arrow-selected)" : "url(#arrow)")}
                  />

                  {showFlowLabel && (
                    <>
                      <rect
                        x={geometry.labelX - labelWidth / 2}
                        y={geometry.labelY - 10}
                        width={labelWidth}
                        height={20}
                        rx={4}
                        fill="#ffffff"
                        stroke={crossesTrustBoundary ? "#fed7aa" : isFlowHighlighted ? "#bfdbfe" : "#e2e8f0"}
                        strokeWidth={1}
                      />
                      <text
                        x={geometry.labelX}
                        y={geometry.labelY + 3.5}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="600"
                        fill={crossesTrustBoundary ? "#c2410c" : isFlowHighlighted ? "#1e40af" : "#64748b"}
                      >
                        {flowLabel}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Interactive Component Nodes */}
          {components.map(comp => {
            const isSelected = selectedCompId === comp.id;
            const isDragging = draggingCompId === comp.id;

            return (
              <div
                key={comp.id}
                onMouseDown={(e) => handleMouseDown(e, comp.id)}
                onClick={(e) => { e.stopPropagation(); setSelectedCompId(comp.id); }}
                style={{
                  left: comp.x,
                  top: comp.y,
                  width: COMPONENT_NODE_WIDTH,
                  height: COMPONENT_NODE_HEIGHT,
                  transform: isDragging ? "scale(1.02)" : "scale(1)"
                }}
                className={`absolute p-3 rounded-xl border bg-white shadow-xs cursor-move transition-shadow ${
                  isSelected 
                    ? "ring-2 ring-blue-500 border-blue-600 shadow-md z-20" 
                    : "border-slate-200 hover:border-slate-400 hover:shadow-sm z-10"
                } ${overlappingComponentIds.has(comp.id) || obstructedComponentIds.has(comp.id) ? "outline outline-2 outline-amber-400" : ""}`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {getCompIcon(comp.type)}
                    <span className="font-bold text-xs text-slate-800 truncate max-w-[130px]">
                      {comp.name}
                    </span>
                  </div>
                  <Move size={12} className="text-slate-300" />
                </div>

                <div className="text-[10px] text-slate-500 truncate mb-2">
                  {comp.tech}
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[9px]">
                  <span className="text-slate-400 uppercase font-semibold">
                    {comp.type}
                  </span>
                  {isSelected && (
                    <span className="text-blue-600 font-bold">Vybrané</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Inspector Drawer */}
        <div className="w-80 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden shrink-0">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-blue-600" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                Inšpektor komponentu
              </h3>
            </div>
            {selectedComp && (
              <button
                onClick={() => setSelectedCompId(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar text-xs">
            {selectedComp ? (
              <>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Komponent</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEditComponentModal(selectedComp)}
                        className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        title="Upraviť komponent"
                      >
                        <Pencil size={12} />
                        <span>Upraviť</span>
                      </button>
                      <button
                        onClick={() => handleDeleteComponent(selectedComp.id)}
                        className="text-red-500 hover:text-red-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        title="Zmazať komponent"
                      >
                        <Trash2 size={12} />
                        <span>Zmazať</span>
                      </button>
                    </div>
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-sm mt-0.5">{selectedComp.name}</h4>
                  <div className="mt-2 space-y-1 text-slate-600 text-[11px]">
                    <div><strong>Typ:</strong> <span className="capitalize">{selectedComp.type}</span></div>
                    <div><strong>Technológia:</strong> {selectedComp.tech}</div>
                    <div><strong>Hranica dôvery:</strong> {zones.find(z => z.id === selectedComp.zoneId)?.name || "Zóna"}</div>
                  </div>
                </div>

                {/* STRIDE Threats Mapping */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <ShieldAlert size={14} className="text-purple-600" />
                      <span>STRIDE Hrozby</span>
                    </span>
                    <Link
                      to={`/analysis/${analysisId}/threats`}
                      className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      <span>Všetky</span>
                      <ArrowRight size={10} />
                    </Link>
                  </div>

                  {threatsForSelected.length > 0 ? (
                    <div className="space-y-1.5">
                      {threatsForSelected.map((threat: any) => (
                        <div key={threat.id} className="p-2 bg-slate-50 border border-slate-200 rounded text-[11px]">
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-800">{threat.id}</strong>
                            <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1 rounded">
                              {threat.stride}
                            </span>
                          </div>
                          <p className="text-slate-600 mt-1 line-clamp-2">{threat.title}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded border border-dashed border-slate-200 text-slate-400 text-center text-[11px]">
                      Žiadne špecifické hrozby naviazané priamo na tento komponent.
                    </div>
                  )}

                  <Link
                    to={`/analysis/${analysisId}/threats`}
                    className="mt-2 w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors block text-center"
                  >
                    <Plus size={12} />
                    <span>Zadať hrozbu v registri</span>
                  </Link>
                </div>

                {/* ASVS Traceability Mapping */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <FileCode2 size={14} className="text-blue-600" />
                      <span>ASVS Požiadavky</span>
                    </span>
                    <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 font-bold text-[10px] rounded">
                      {asvsMappedCount} kontrol
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Požiadavky overenia ASVS namapované na tento komponent v záložke ASVS Workspace.
                  </p>
                  <Link
                    to={`/analysis/${analysisId}/asvs`}
                    className="w-full py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors block text-center"
                  >
                    <span>Otvoriť ASVS Workspace</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>

                {/* Associated Data Flows */}
                <div className="pt-4 border-t border-slate-100">
                  <span className="font-bold text-slate-700 block mb-2">
                    Prepojené toky dát
                  </span>
                  <div className="space-y-1.5">
                    {flows.filter(f => f.from === selectedComp.id || f.to === selectedComp.id).map(f => (
                      <div key={f.id} className="p-2 bg-slate-50 border border-slate-200 rounded text-[11px] flex items-center justify-between">
                        <div>
                          <div className="font-medium text-slate-800">
                            {f.from} → {f.to}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {f.protocol} · {f.dataClassification} · {f.transferType.toLowerCase()}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {f.encrypted ? "Šifrovaný" : "Nešifrovaný"} · {f.authenticated ? "Autentifikovaný" : "Bez autentifikácie"}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => openEditFlowModal(f)}
                            className="text-slate-400 hover:text-blue-600 p-1"
                            title="Upraviť tok"
                            aria-label={`Upraviť tok ${f.from} do ${f.to}`}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFlow(f.id)}
                            className="text-slate-400 hover:text-red-600 p-1"
                            title="Zmazať tok"
                            aria-label={`Zmazať tok ${f.from} do ${f.to}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Info size={32} className="mb-2 text-slate-300" />
                <p className="font-bold text-slate-600">Nebol vybraný žiadny komponent</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Kliknite na ľubovoľný komponent na plátne pre zobrazenie jeho parametrov, STRIDE hrozieb a ASVS prepojení.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Modal: Add or edit component */}
      {isZoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div role="dialog" aria-modal="true" aria-labelledby="zone-modal-title" className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 id="zone-modal-title" className="font-bold text-slate-800 text-sm">
                {editingZoneId ? "Upraviť trust zónu" : "Pridať trust zónu"}
              </h3>
              <button type="button" aria-label="Zavrieť formulár trust zóny" onClick={() => setIsZoneModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveZone} className="space-y-3.5 text-xs">
              <div>
                <label htmlFor="trust-zone-name" className="block font-semibold text-slate-700 mb-1">Názov zóny *</label>
                <input
                  id="trust-zone-name"
                  type="text"
                  required
                  maxLength={80}
                  value={newZoneName}
                  onChange={event => setNewZoneName(event.target.value)}
                  placeholder="napr. Verejný internet"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="trust-zone-color" className="block font-semibold text-slate-700 mb-1">Farba zóny</label>
                <select
                  id="trust-zone-color"
                  value={newZoneColor}
                  onChange={event => setNewZoneColor(event.target.value as TrustZoneColorKey)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  {(Object.keys(TRUST_ZONE_COLORS) as TrustZoneColorKey[]).map(colorKey => (
                    <option key={colorKey} value={colorKey}>{TRUST_ZONE_COLORS[colorKey].label}</option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-500">
                Zónu môžete presúvať potiahnutím jej názvu a meniť jej veľkosť potiahnutím pravého dolného rohu. Komponenty zostávajú v priradenej zóne.
              </p>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsZoneModalOpen(false)} className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium">
                  Zrušiť
                </button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs">
                  {editingZoneId ? "Uložiť zmeny" : "Vytvoriť zónu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isComponentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div role="dialog" aria-modal="true" aria-labelledby="component-modal-title" className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 id="component-modal-title" className="font-bold text-slate-800 text-sm">
                {editingCompId ? "Upraviť architektonický komponent" : "Pridať nový architektonický komponent"}
              </h3>
              <button type="button" aria-label="Zavrieť formulár komponentu" onClick={() => setIsComponentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveComponent} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Názov komponentu *</label>
                <input
                  type="text"
                  required
                  value={newCompName}
                  onChange={e => setNewCompName(e.target.value)}
                  placeholder="napr. Customer Order Service"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Typ komponentu</label>
                <select
                  value={newCompType}
                  onChange={e => setNewCompType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="service">Interná služba / API (Microservice)</option>
                  <option value="client">Webový alebo mobilný klient (Frontend)</option>
                  <option value="api_gateway">API Gateway / WAF / Reverse Proxy</option>
                  <option value="database">Databáza / Úložisko dát</option>
                  <option value="external">Externá služba 3. strany</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Zóna dôvery (Trust Boundary)</label>
                <select
                  value={newCompZone}
                  onChange={e => setNewCompZone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Technologický stack</label>
                <input
                  type="text"
                  value={newCompTech}
                  onChange={e => setNewCompTech(e.target.value)}
                  placeholder="napr. Python / FastAPI / PostgreSQL"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsComponentModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs"
                >
                  {editingCompId ? "Uložiť zmeny" : "Pridať komponent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Flow */}
      {isAddFlowOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div role="dialog" aria-modal="true" aria-labelledby="flow-modal-title" className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 id="flow-modal-title" className="font-bold text-slate-800 text-sm">{editingFlowId ? "Upraviť tok dát" : "Pridať tok dát (Data Flow)"}</h3>
              <button type="button" aria-label="Zavrieť formulár toku" onClick={() => setIsAddFlowOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddFlow} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Odkiaľ (Zdroj)</label>
                  <select
                    value={newFlowFrom}
                    onChange={e => setNewFlowFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                  >
                    {components.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kam (Cieľ)</label>
                  <select
                    value={newFlowTo}
                    onChange={e => setNewFlowTo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                  >
                    {components.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Protokol / spôsob komunikácie</label>
                <input
                  type="text"
                  required
                  value={newFlowProtocol}
                  onChange={e => setNewFlowProtocol(e.target.value)}
                  placeholder="napr. HTTPS / TLS 1.3 (JSON REST)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Typ prenosu</label>
                <select
                  value={newFlowTransferType}
                  onChange={e => setNewFlowTransferType(e.target.value as DataFlow["transferType"])}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                >
                  <option value="Synchronous">Synchrónny (request / response)</option>
                  <option value="Asynchronous">Asynchrónny (fronta / udalosť)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Popis prenášaných údajov</label>
                <textarea
                  value={newFlowDataDescription}
                  onChange={e => setNewFlowDataDescription(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="napr. prihlasovacie údaje, osobné údaje alebo platobné udalosti"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none resize-y"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Klasifikácia prenášaných dát</label>
                <select
                  value={newFlowClassification}
                  onChange={e => setNewFlowClassification(e.target.value as DataFlow["dataClassification"])}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                >
                  <option value="Public">Verejné (Public)</option>
                  <option value="Internal">Interné (Internal)</option>
                  <option value="Confidential">Dôverné (Confidential)</option>
                  <option value="Restricted">Prísne tajné / Citlivé (Restricted)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 p-2.5 text-slate-700">
                  <input type="checkbox" checked={newFlowEncrypted} onChange={e => setNewFlowEncrypted(e.target.checked)} />
                  <span>Šifrovaný prenos</span>
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 p-2.5 text-slate-700">
                  <input type="checkbox" checked={newFlowAuthenticated} onChange={e => setNewFlowAuthenticated(e.target.checked)} />
                  <span>Autentifikovaný odosielateľ</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddFlowOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs"
                >
                  {editingFlowId ? "Uložiť zmeny" : "Vytvoriť tok"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
