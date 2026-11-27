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
  Pencil,
  ZoomIn,
  ZoomOut,
  Maximize2
} from "lucide-react";
import { useWorkspaceState } from "../hooks/useWorkspaceState";
import { getInitialThreatsForAnalysis, syncArchitectureThreats, type Threat } from "../utils/threatModel";
import { getDiagramLayoutIssues, getFlowPathGeometry } from "../utils/dfd";
import { writeJson } from "../utils/storage";
import { useLanguage } from "../context/LanguageContext";
import type { ReportLanguage } from "../utils/reportLanguage";

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
  cipherSuite?: string;
  keyExchange?: string;
  pqcStatus?: "unknown" | "classical" | "post-quantum";
  dataClassification: "Public" | "Internal" | "Confidential" | "Restricted";
  encrypted: boolean;
  authenticated: boolean;
  transferType: "Synchronous" | "Asynchronous";
  dataDescription: string;
}

interface DfdReviewIssue {
  flowId: string;
  kind: string;
  flowName: string;
  severity: "warning" | "info";
  message: string;
}

const LEGACY_FLOW_PROTOCOLS: Record<string, string> = {
  "HTTPS (HMAC Signature Webhook)": "HTTPS Webhook / REST (HMAC request signing)",
  "HTTPS / TLS 1.3 (JSON REST)": "HTTPS / TLS 1.3 (REST)",
  "Internal HTTP (mTLS Header)": "Internal HTTPS / mTLS",
  "mTLS": "mTLS (TLS transport)",
  "mTLS / gRPC (Token Verify)": "gRPC over mTLS (HTTP/2)",
  "TLS Connection (Prepared Statements)": "PostgreSQL / TLS"
};

function getPqcDesignStatus(keyExchange?: string): NonNullable<DataFlow["pqcStatus"]> {
  if (!keyExchange) return "unknown";
  return keyExchange.startsWith("ML-KEM-") ? "post-quantum" : "classical";
}

function getPqcDesignStatusLabel(status: NonNullable<DataFlow["pqcStatus"]>, language: ReportLanguage): string {
  switch (status) {
    case "classical": return language === "sk" ? "Klasický" : "Classical";
    case "post-quantum": return language === "sk" ? "Postkvantový" : "Post-quantum";
    case "unknown": return language === "sk" ? "Neznámy" : "Unknown";
  }
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
  const protocol = LEGACY_FLOW_PROTOCOLS[flow.protocol] ?? flow.protocol;
  const keyExchange = typeof flow.keyExchange === "string" ? flow.keyExchange : undefined;
  return {
    id: flow.id,
    from: flow.from,
    to: flow.to,
    protocol,
    cipherSuite: typeof flow.cipherSuite === "string" ? flow.cipherSuite : undefined,
    keyExchange,
    pqcStatus: getPqcDesignStatus(keyExchange),
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
const MIN_CANVAS_ZOOM = 0.5;
const MAX_CANVAS_ZOOM = 2;
const MIN_ZONE_WIDTH = COMPONENT_NODE_WIDTH + 40;
const MIN_ZONE_HEIGHT = COMPONENT_NODE_HEIGHT + 80;
const CUSTOM_TECH_STACK = "__custom__";
const TECHNOLOGY_STACK_OPTIONS = [
  ".NET / ASP.NET Core",
  "AWS Lambda",
  "Azure Functions",
  "C# / .NET",
  "Go / OAuth2 / OIDC / JWT",
  "HTTPS Webhook / REST",
  "Java / Spring Boot",
  "JavaScript / Node.js",
  "Kafka / Event Streaming",
  "Kong / Cloudflare TLS 1.3",
  "MongoDB",
  "MySQL",
  "Node.js / Express / gRPC",
  "PostgreSQL (Encrypted at Rest)",
  "Python / Django",
  "Python / FastAPI",
  "Redis",
  "Ruby on Rails",
  "Rust",
  "S3-compatible Object Storage",
  "SOAP / XML",
  "TypeScript / Vite / Tailwind",
  "WebSocket",
  "Všeobecná služba",
  "Zig",
  "ZooKeeper"
].sort((a, b) => a.localeCompare(b, "sk", { sensitivity: "base" }));
const CUSTOM_FLOW_PROTOCOL = "__custom_protocol__";
const FLOW_PROTOCOL_OPTIONS = [
  "AMQP",
  "DNS",
  "gRPC",
  "gRPC over mTLS (HTTP/2)",
  "gRPC over TLS (HTTP/2)",
  "HTTP / REST",
  "HTTPS / mTLS (REST)",
  "HTTPS / TLS 1.2",
  "HTTPS / TLS 1.3",
  "HTTPS / TLS 1.3 (REST)",
  "HTTPS Webhook / REST",
  "HTTPS Webhook / REST (HMAC request signing)",
  "Internal HTTPS / mTLS",
  "Kafka",
  "mTLS (TLS transport)",
  "MQTT over TLS",
  "PostgreSQL / TLS",
  "SFTP / SSH",
  "SMTP / STARTTLS",
  "SOAP / XML over HTTPS",
  "TCP",
  "WebSocket / WSS"
].sort((a, b) => a.localeCompare(b, "sk", { sensitivity: "base" }));
const NIST_CIPHER_SUITES = [
  "TLS_AES_128_GCM_SHA256",
  "TLS_AES_256_GCM_SHA384",
  "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256",
  "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384",
  "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256",
  "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"
].sort((a, b) => a.localeCompare(b, "en"));
const NIST_KEY_EXCHANGE_OPTIONS = [
  "ECDHE with NIST P-256 (secp256r1)",
  "ECDHE with NIST P-384 (secp384r1)",
  "ECDHE with NIST P-521 (secp521r1)",
  "ML-KEM-512 (FIPS 203)",
  "ML-KEM-768 (FIPS 203)",
  "ML-KEM-1024 (FIPS 203)"
].sort((a, b) => a.localeCompare(b, "en"));

function usesTlsCrypto(protocol: string, encrypted: boolean): boolean {
  return /https|m?tls|wss|starttls/i.test(protocol) ||
    (encrypted && /http|grpc|websocket|mqtt|postgres|smtp/i.test(protocol));
}

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
    protocol: "gRPC over mTLS (HTTP/2)",
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
    protocol: "Internal HTTPS / mTLS",
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
    protocol: "PostgreSQL / TLS",
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
    protocol: "HTTPS Webhook / REST (HMAC request signing)",
    dataClassification: "Restricted",
    encrypted: true,
    authenticated: true,
    transferType: "Asynchronous",
    dataDescription: "Payment events and transaction metadata"
  }
];

export function ArchitectureModel() {
  const { language, t } = useLanguage();
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
  const [isDfdReviewOpen, setIsDfdReviewOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dismissedReviewIssues, setDismissedReviewIssues] = useState<Set<string>>(new Set());

  // New component form state
  const [newCompName, setNewCompName] = useState("");
  const [newCompType, setNewCompType] = useState<ArchComponent["type"]>("service");
  const [newCompZone, setNewCompZone] = useState("zone_internal");
  const [newCompTech, setNewCompTech] = useState("");
  const [newCompCustomTech, setNewCompCustomTech] = useState("");

  // New flow form state
  const [newFlowFrom, setNewFlowFrom] = useState("");
  const [newFlowTo, setNewFlowTo] = useState("");
  const [newFlowProtocol, setNewFlowProtocol] = useState("HTTPS / TLS 1.3");
  const [newFlowCustomProtocol, setNewFlowCustomProtocol] = useState("");
  const [newFlowCipherSuite, setNewFlowCipherSuite] = useState("");
  const [newFlowKeyExchange, setNewFlowKeyExchange] = useState("");
  const [newFlowClassification, setNewFlowClassification] = useState<DataFlow["dataClassification"]>("Confidential");
  const [newFlowEncrypted, setNewFlowEncrypted] = useState(false);
  const [newFlowAuthenticated, setNewFlowAuthenticated] = useState(false);
  const [newFlowTransferType, setNewFlowTransferType] = useState<DataFlow["transferType"]>("Synchronous");
  const [newFlowDataDescription, setNewFlowDataDescription] = useState("");

  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const fitCanvasToViewport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = (canvas.clientWidth - 24) / CANVAS_WIDTH;
    setCanvasZoom(clamp(fit, MIN_CANVAS_ZOOM, 1));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();

      const zoomFactor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
      const nextZoom = clamp(canvasZoom * zoomFactor, MIN_CANVAS_ZOOM, MAX_CANVAS_ZOOM);
      if (nextZoom === canvasZoom) return;

      const rect = canvas.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const contentX = (canvas.scrollLeft + pointerX) / canvasZoom;
      const contentY = (canvas.scrollTop + pointerY) / canvasZoom;
      setCanvasZoom(nextZoom);
      requestAnimationFrame(() => {
        const currentCanvas = canvasRef.current;
        if (!currentCanvas) return;
        currentCanvas.scrollLeft = contentX * nextZoom - pointerX;
        currentCanvas.scrollTop = contentY * nextZoom - pointerY;
      });
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [canvasZoom]);

  useEffect(() => {
    if (!isDfdReviewOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setIsDfdReviewOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isDfdReviewOpen]);

  const openAddComponentModal = () => {
    setEditingCompId(null);
    setNewCompName("");
    setNewCompType("service");
    setNewCompZone("zone_internal");
    setNewCompTech("");
    setNewCompCustomTech("");
    setIsComponentModalOpen(true);
  };

  const openEditComponentModal = (component: ArchComponent) => {
    setEditingCompId(component.id);
    setNewCompName(component.name);
    setNewCompType(component.type);
    setNewCompZone(component.zoneId);
    if (TECHNOLOGY_STACK_OPTIONS.includes(component.tech)) {
      setNewCompTech(component.tech);
      setNewCompCustomTech("");
    } else {
      setNewCompTech(CUSTOM_TECH_STACK);
      setNewCompCustomTech(component.tech);
    }
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
    setNewFlowCustomProtocol("");
    setNewFlowCipherSuite("");
    setNewFlowKeyExchange("");
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
    if (FLOW_PROTOCOL_OPTIONS.includes(flow.protocol)) {
      setNewFlowProtocol(flow.protocol);
      setNewFlowCustomProtocol("");
    } else {
      setNewFlowProtocol(CUSTOM_FLOW_PROTOCOL);
      setNewFlowCustomProtocol(flow.protocol);
    }
    setNewFlowCipherSuite(flow.cipherSuite ?? "");
    setNewFlowKeyExchange(flow.keyExchange ?? "");
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
      writeJson(storageKey, data);
    } catch (error) {
      console.error("Failed to save architecture model", error);
      setToastMessage(t("Model architektúry sa nepodarilo uložiť do lokálneho úložiska.", "Could not save the architecture model to local storage."));
    }
  }, [components, flows, zones, storageKey]);

  useEffect(() => {
    const threatStorageKey = `atap_threats_${analysisId || "default"}`;
    const savedThreats = localStorage.getItem(threatStorageKey);
    let threats = getInitialThreatsForAnalysis(analysisId);

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
        writeJson(threatStorageKey, syncedThreats);
      } catch (error) {
        console.error("Failed to save architecture-generated threats", error);
        setToastMessage(t("Automatické hrozby sa nepodarilo uložiť do registra hrozieb.", "Could not save generated threats to the threat register."));
      }
    }
  }, [analysisId, components, flows, zones]);

  // Load threats associated with selected component
  let threatsForSelected: Array<Pick<Threat, "id" | "stride" | "title">> = [];
  if (selectedCompId) {
    try {
      const rawThreats = localStorage.getItem(`atap_threats_${analysisId || "default"}`);
      if (rawThreats) {
        const parsed: unknown = JSON.parse(rawThreats);
        threatsForSelected = Array.isArray(parsed)
          ? parsed.filter((threat): threat is Pick<Threat, "id" | "stride" | "title"> => {
              if (!threat || typeof threat !== "object") return false;
              const item = threat as Partial<Threat>;
              return typeof item.id === "string" &&
                typeof item.stride === "string" &&
                typeof item.title === "string" &&
                Array.isArray(item.componentIds) &&
                item.componentIds.includes(selectedCompId);
            })
          : [];
      }
    } catch (error) {
      console.error("Failed to load threats linked to the selected component", error);
    }
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
      x: (e.clientX - rect.left + canvas.scrollLeft) / canvasZoom - comp.x,
      y: (e.clientY - rect.top + canvas.scrollTop) / canvasZoom - comp.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!canvas || !rect) return;
    const pointerX = (e.clientX - rect.left + canvas.scrollLeft) / canvasZoom;
    const pointerY = (e.clientY - rect.top + canvas.scrollTop) / canvasZoom;

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
      x: (e.clientX - rect.left + canvas.scrollLeft) / canvasZoom - zone.x,
      y: (e.clientY - rect.top + canvas.scrollTop) / canvasZoom - zone.y
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
    if (window.confirm(t("Naozaj chcete obnoviť architektúru na predvolený stav?", "Reset the architecture to its default state?"))) {
      setComponents(DEFAULT_COMPONENTS);
      setFlows(DEFAULT_FLOWS);
      setZones(DEFAULT_ZONES);
      setSelectedCompId(null);
      setToastMessage(t("Architektúra bola obnovená na odporúčaný model.", "Architecture was reset to the recommended model."));
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleSaveZone = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newZoneName.trim();
    if (!name) return;
    if (zones.some(zone => zone.id !== editingZoneId && zone.name.toLowerCase() === name.toLowerCase())) {
      alert(t("Zóna s týmto názvom už existuje.", "A zone with this name already exists."));
      return;
    }

    const color = TRUST_ZONE_COLORS[newZoneColor];
    if (editingZoneId) {
      setZones(prev => prev.map(zone => zone.id === editingZoneId
        ? { ...zone, name, color: color.color, borderColor: color.borderColor, bgTint: color.bgTint }
        : zone
      ));
      setToastMessage(t(`Trust zóna "${name}" bola upravená.`, `Trust zone "${name}" was updated.`));
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
      setToastMessage(t(`Trust zóna "${name}" bola vytvorená.`, `Trust zone "${name}" was created.`));
    }
    setIsZoneModalOpen(false);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteZone = (zone: TrustZone) => {
    if (zones.length < 2) {
      alert(t("V modeli musí zostať aspoň jedna trust zóna.", "At least one trust zone must remain in the model."));
      return;
    }
    if (!window.confirm(t(`Odstrániť zónu "${zone.name}"? Jej komponenty sa presunú do inej zóny.`, `Delete zone "${zone.name}"? Its components will be moved to another zone.`))) return;

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
    setToastMessage(t(`Trust zóna "${zone.name}" bola odstránená.`, `Trust zone "${zone.name}" was deleted.`));
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
      alert(t("Komponent s týmto názvom už existuje.", "A component with this name already exists."));
      return;
    }

    const tech = (newCompTech === CUSTOM_TECH_STACK ? newCompCustomTech : newCompTech).trim() || "Všeobecná služba";
    const targetZone = zones.find(zone => zone.id === newCompZone);
    if (!targetZone) {
      alert(t("Vybraná trust zóna už neexistuje. Obnovte formulár a skúste znova.", "The selected trust zone no longer exists. Reopen the form and try again."));
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
      setToastMessage(t(`Komponent "${name}" bol upravený.`, `Component "${name}" was updated.`));
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
    setToastMessage(t(`Komponent "${newComp.name}" bol pridaný do modelu.`, `Component "${newComp.name}" was added to the model.`));
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteComponent = (id: string) => {
    if (window.confirm(t(`Naozaj chcete odstrániť komponent "${id}" z diagramu?`, `Remove component "${id}" from the diagram?`))) {
      setComponents(prev => prev.filter(c => c.id !== id));
      setFlows(prev => prev.filter(f => f.from !== id && f.to !== id));
      if (selectedCompId === id) setSelectedCompId(null);
      setToastMessage(t(`Komponent "${id}" bol odstránený.`, `Component "${id}" was removed.`));
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleAddFlow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlowFrom || !newFlowTo || newFlowFrom === newFlowTo) {
      alert(t("Zvoľte odlišný zdrojový a cieľový komponent.", "Select different source and destination components."));
      return;
    }
    const protocol = (newFlowProtocol === CUSTOM_FLOW_PROTOCOL ? newFlowCustomProtocol : newFlowProtocol).trim();
    if (!protocol) {
      alert(t("Zadajte protokol alebo spôsob komunikácie.", "Enter a protocol or communication method."));
      return;
    }
    const showTlsCryptoOptions = usesTlsCrypto(protocol, newFlowEncrypted);

    const newFlow: DataFlow = {
      id: editingFlowId ?? `flow_${Date.now()}`,
      from: newFlowFrom,
      to: newFlowTo,
      protocol,
      cipherSuite: showTlsCryptoOptions ? newFlowCipherSuite || undefined : undefined,
      keyExchange: showTlsCryptoOptions ? newFlowKeyExchange || undefined : undefined,
      pqcStatus: showTlsCryptoOptions ? getPqcDesignStatus(newFlowKeyExchange) : undefined,
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
      ? t(`Tok dát z ${newFlowFrom} do ${newFlowTo} bol aktualizovaný.`, `Data flow from ${newFlowFrom} to ${newFlowTo} was updated.`)
      : t(`Tok dát z ${newFlowFrom} do ${newFlowTo} bol pridaný.`, `Data flow from ${newFlowFrom} to ${newFlowTo} was added.`));
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
  const selectedFlowProtocol = newFlowProtocol === CUSTOM_FLOW_PROTOCOL
    ? newFlowCustomProtocol
    : newFlowProtocol;
  const showTlsCryptoOptions = usesTlsCrypto(selectedFlowProtocol, newFlowEncrypted);
  const dfdReviewIssues: DfdReviewIssue[] = flows.flatMap(flow => {
    const flowName = `${flow.from} → ${flow.to}`;
    const issues: DfdReviewIssue[] = [];
    const hasExplicitTlsProtocol = /https|m?tls|wss|starttls/i.test(flow.protocol);

    if (!flow.encrypted && flow.dataClassification !== "Public") {
      issues.push({
        flowId: flow.id,
        kind: `unencrypted:${flow.dataClassification}`,
        flowName,
        severity: "warning",
        message: t(`${flow.dataClassification} dáta sú označené ako nešifrované.`, `${flow.dataClassification} data is marked unencrypted.`)
      });
    } else if (hasExplicitTlsProtocol && !flow.encrypted) {
      issues.push({
        flowId: flow.id,
        kind: "tls-unencrypted",
        flowName,
        severity: "warning",
        message: t("Protokol uvádza TLS, ale prenos je označený ako nešifrovaný.", "The protocol specifies TLS but the flow is marked unencrypted.")
      });
    }

    if (!flow.authenticated && ["Confidential", "Restricted"].includes(flow.dataClassification)) {
      issues.push({
        flowId: flow.id,
        kind: `unauthenticated:${flow.dataClassification}`,
        flowName,
        severity: "warning",
        message: t(`${flow.dataClassification} dáta sú označené bez autentifikácie odosielateľa.`, `${flow.dataClassification} data is marked without sender authentication.`)
      });
    }

    if (usesTlsCrypto(flow.protocol, flow.encrypted)) {
      const cryptoGaps = [
        !flow.cipherSuite ? t("cipher suite nie je určená", "cipher suite is unspecified") : "",
        getPqcDesignStatus(flow.keyExchange) === "unknown" ? t("PQC stav je neznámy", "PQC status is unknown") : ""
      ].filter(Boolean);
      if (cryptoGaps.length) {
        issues.push({
          flowId: flow.id,
          kind: `crypto:${!flow.cipherSuite}:${getPqcDesignStatus(flow.keyExchange) === "unknown"}`,
          flowName,
          severity: "info",
          message: t(`V návrhu: ${cryptoGaps.join("; ")}.`, `In the design: ${cryptoGaps.join("; ")}.`)
        });
      }
    }

    return issues;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      
      {/* Header Toolbar */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">{t("Architektonický DFD Model", "Architecture DFD Model")}</h1>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded border border-blue-200 uppercase">
              Data Flow Diagram
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {t("Interaktívna mapa komponentov, hraníc dôvery (Trust Boundaries) a šifrovaných tokov dát prepojená so STRIDE hrozbami. Šípka ukazuje smer toku od zdroja k cieľu.", "Interactive map of components, trust boundaries and encrypted data flows linked to STRIDE threats. Arrows show flow direction from source to destination.")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openAddComponentModal}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>{t("Nový komponent", "New component")}</span>
          </button>

          <button
            onClick={() => {
              if (components.length < 2) {
                alert(t("Najprv vytvorte aspoň dva komponenty na prepojenie.", "First create at least two components to connect."));
                return;
              }
              openAddFlowModal(components[0].id, components[1].id);
            }}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>{t("Prepojiť tokom dát", "Connect with data flow")}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDfdReviewOpen(true)}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title={t("Voliteľná kontrola návrhu DFD", "Optional DFD design review")}
          >
            <ShieldAlert size={14} className="text-amber-600" />
            <span>{t("Kontrola návrhu", "Design review")}</span>
          </button>

          <button
            onClick={openAddZoneModal}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Layers size={14} />
            <span>{t("Pridať trust zónu", "Add trust zone")}</span>
          </button>

          <button
            onClick={handleResetArchitecture}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            title={t("Resetovať na odporúčanú bezpečnú architektúru", "Reset to the recommended secure architecture")}
          >
            <RefreshCw size={13} />
            <span>{t("Reset modelu", "Reset model")}</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div role="status" aria-live="polite" className="mx-6 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
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
              <span>{t("Rozloženie diagramu obsahuje prekrývajúce sa prvky.", "The diagram contains overlapping elements.")}</span>
            </div>
            {layoutIssues.overlappingZones.length > 0 && (
              <p className="mt-1">{t("Trust zóny:", "Trust zones:")} {layoutIssues.overlappingZones.map(([a, b]) => `${a.name} / ${b.name}`).join(", ")}</p>
            )}
            {layoutIssues.overlappingComponents.length > 0 && (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span>{t("Komponenty:", "Components:")}</span>
                {layoutIssues.overlappingComponents.flatMap(([a, b]) => [a, b]).filter((component, index, items) =>
                  items.findIndex(item => item.id === component.id) === index
                ).map(component => (
                  <button
                    key={component.id}
                    type="button"
                    onClick={() => setSelectedCompId(component.id)}
                    className="rounded border border-amber-300 bg-white px-2 py-0.5 font-semibold text-amber-900 hover:bg-amber-100"
                  >
                    {t("Zamerať", "Focus")} {component.name}
                  </button>
                ))}
              </div>
            )}
            {obstructedFlowIds.length > 0 && (
              <p className="mt-1">
                {t("Toky vedené cez komponenty:", "Flows routed through components:")} {obstructedFlowIds.map(flow => {
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
        <div className="flex-1 min-w-0 min-h-0 relative">
          <div
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={() => setSelectedCompId(null)}
            className="absolute inset-0 bg-white rounded-xl border border-slate-200 shadow-xs overflow-auto custom-scrollbar select-none"
            style={{
              backgroundImage: `radial-gradient(#cbd5e1 1px, transparent 1px)`,
              backgroundSize: `${24 * canvasZoom}px ${24 * canvasZoom}px`
            }}
          >
            <div style={{ position: "relative", width: CANVAS_WIDTH * canvasZoom, height: CANVAS_HEIGHT * canvasZoom }}>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: CANVAS_WIDTH,
                  height: CANVAS_HEIGHT,
                  transform: `scale(${canvasZoom})`,
                  transformOrigin: "top left"
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
                title={t("Potiahnutím presuňte trust zónu", "Drag to move the trust zone")}
              >
                <span className={`text-[11px] font-bold uppercase tracking-wider ${zone.color}`}>
                  {zone.name}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onMouseDown={event => event.stopPropagation()}
                    onClick={() => openEditZoneModal(zone)}
                    aria-label={t(`Upraviť zónu ${zone.name}`, `Edit zone ${zone.name}`)}
                    title={t("Upraviť zónu", "Edit zone")}
                    className="pointer-events-auto rounded bg-white/80 p-1 text-slate-500 hover:text-blue-700"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    onMouseDown={event => event.stopPropagation()}
                    onClick={() => handleDeleteZone(zone)}
                    aria-label={t(`Odstrániť zónu ${zone.name}`, `Delete zone ${zone.name}`)}
                    title={t("Odstrániť zónu", "Delete zone")}
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
                aria-label={t(`Zmeniť veľkosť zóny ${zone.name}. Pomocou šípok upravujte veľkosť po 20 pixeloch.`, `Resize zone ${zone.name}. Use arrow keys to resize in 20-pixel steps.`)}
                title={t("Potiahnutím zmeňte veľkosť; klávesmi šípok upravujte po 20 px", "Drag to resize; use arrow keys for 20 px steps")}
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
              const flowTitle = [
                `${t("Tok dát", "Data flow")}: ${flow.protocol}; ${flow.transferType.toLowerCase()}; ${crossesTrustBoundary ? t("prekračuje hranicu trust zóny", "crosses a trust boundary") : t("v rámci jednej trust zóny", "within one trust zone")}`,
                ...(flow.cipherSuite ? [`Cipher suite: ${flow.cipherSuite}`] : []),
                ...(flow.keyExchange ? [`${t("Výmena kľúčov / KEM", "Key exchange / KEM")}: ${flow.keyExchange}`] : []),
                ...(usesTlsCrypto(flow.protocol, flow.encrypted)
                  ? [`${t("PQC stav návrhu", "PQC design status")}: ${getPqcDesignStatusLabel(flow.pqcStatus ?? getPqcDesignStatus(flow.keyExchange), language)}`]
                  : [])
              ].join("; ");
              const stroke = crossesTrustBoundary
                ? (isFlowHighlighted ? "#c2410c" : "#ea580c")
                : (isFlowHighlighted ? "#2563eb" : "#94a3b8");

              return (
                <g key={flow.id}>
                  <title>{flowTitle}</title>
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
                  <path
                    d={geometry.path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={16}
                    pointerEvents="stroke"
                    role="button"
                    tabIndex={0}
                    aria-label={t(`Upraviť tok ${flow.from} do ${flow.to}`, `Edit flow from ${flow.from} to ${flow.to}`)}
                    onMouseDown={event => event.stopPropagation()}
                    onClick={event => {
                      event.stopPropagation();
                      openEditFlowModal(flow);
                    }}
                    onKeyDown={event => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      event.stopPropagation();
                      openEditFlowModal(flow);
                    }}
                    style={{ cursor: "pointer" }}
                  />
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
                role="button"
                tabIndex={0}
                aria-label={t(`Komponent ${comp.name}, typ ${comp.type}, technológia ${comp.tech}`, `Component ${comp.name}, type ${comp.type}, technology ${comp.tech}`)}
                aria-pressed={isSelected}
                onMouseDown={(e) => handleMouseDown(e, comp.id)}
                onClick={(e) => { e.stopPropagation(); setSelectedCompId(comp.id); }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedCompId(comp.id);
                  }
                  const moveStep = event.shiftKey ? 20 : 5;
                  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
                    event.preventDefault();
                    const delta = {
                      ArrowLeft: { x: -moveStep, y: 0 },
                      ArrowRight: { x: moveStep, y: 0 },
                      ArrowUp: { x: 0, y: -moveStep },
                      ArrowDown: { x: 0, y: moveStep },
                    }[event.key];
                    setComponents(current => current.map(component => component.id === comp.id
                      ? constrainComponentToZone({ ...component, x: component.x + delta.x, y: component.y + delta.y }, zones.find(zone => zone.id === component.zoneId) ?? zones[0])
                      : component
                    ));
                  }
                }}
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
                    <span className="text-blue-600 font-bold">{t("Vybrané", "Selected")}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
              </div>
            </div>
          <div className="absolute top-3 right-3 z-30 flex items-center gap-1 rounded-lg border border-slate-200 bg-white/95 p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setCanvasZoom(current => clamp(current - 0.1, MIN_CANVAS_ZOOM, MAX_CANVAS_ZOOM))}
              disabled={canvasZoom <= MIN_CANVAS_ZOOM}
              aria-label={t("Oddialiť DFD diagram", "Zoom out DFD diagram")}
              title={t("Oddialiť", "Zoom out")}
              className="rounded p-1.5 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ZoomOut size={16} />
            </button>
            <span className="min-w-[3rem] text-center text-[11px] font-medium text-slate-600">
              {Math.round(canvasZoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setCanvasZoom(current => clamp(current + 0.1, MIN_CANVAS_ZOOM, MAX_CANVAS_ZOOM))}
              disabled={canvasZoom >= MAX_CANVAS_ZOOM}
              aria-label={t("Priblížiť DFD diagram", "Zoom in DFD diagram")}
              title={t("Priblížiť", "Zoom in")}
              className="rounded p-1.5 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              onClick={fitCanvasToViewport}
              aria-label={t("Prispôsobiť DFD diagram šírke plátna", "Fit DFD diagram to canvas width")}
              title={t("Prispôsobiť plátnu", "Fit to canvas")}
              className="rounded p-1.5 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Maximize2 size={15} />
            </button>
          </div>
        </div>

        {/* Right Inspector Drawer */}
        <div className="w-80 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden shrink-0">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-blue-600" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                {t("Inšpektor komponentu", "Component inspector")}
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
                    <span className="text-[10px] font-bold uppercase text-slate-400">{t("Komponent", "Component")}</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEditComponentModal(selectedComp)}
                        className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        title={t("Upraviť komponent", "Edit component")}
                      >
                        <Pencil size={12} />
                        <span>{t("Upraviť", "Edit")}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteComponent(selectedComp.id)}
                        className="text-red-500 hover:text-red-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        title={t("Zmazať komponent", "Delete component")}
                      >
                        <Trash2 size={12} />
                        <span>{t("Zmazať", "Delete")}</span>
                      </button>
                    </div>
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-sm mt-0.5">{selectedComp.name}</h4>
                  <div className="mt-2 space-y-1 text-slate-600 text-[11px]">
                    <div><strong>{t("Typ:", "Type:")}</strong> <span className="capitalize">{selectedComp.type}</span></div>
                    <div><strong>{t("Technológia:", "Technology:")}</strong> {selectedComp.tech}</div>
                    <div><strong>{t("Hranica dôvery:", "Trust boundary:")}</strong> {zones.find(z => z.id === selectedComp.zoneId)?.name || t("Zóna", "Zone")}</div>
                  </div>
                </div>

                {/* Associated Data Flows */}
                <div className="pt-4 border-t border-slate-100">
                  <span className="font-bold text-slate-700 block mb-2">
                    {t("Prepojené toky dát", "Connected data flows")}
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
                          {(f.cipherSuite || f.keyExchange || usesTlsCrypto(f.protocol, f.encrypted)) && (
                            <div className="text-[10px] text-slate-500 break-all">
                              {f.cipherSuite && <div><strong>Cipher suite:</strong> {f.cipherSuite}</div>}
                              {f.keyExchange && <div><strong>{t("Výmena kľúčov / KEM:", "Key exchange / KEM:")}</strong> {f.keyExchange}</div>}
                              {usesTlsCrypto(f.protocol, f.encrypted) && (
                                <div><strong>{t("PQC stav návrhu:", "PQC design status:")}</strong> {getPqcDesignStatusLabel(f.pqcStatus ?? getPqcDesignStatus(f.keyExchange), language)}</div>
                              )}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-500">
                            {f.encrypted ? t("Šifrovaný", "Encrypted") : t("Nešifrovaný", "Unencrypted")} · {f.authenticated ? t("Autentifikovaný", "Authenticated") : t("Bez autentifikácie", "Unauthenticated")}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => openEditFlowModal(f)}
                            className="text-slate-400 hover:text-blue-600 p-1"
                            title={t("Upraviť tok", "Edit flow")}
                            aria-label={t(`Upraviť tok ${f.from} do ${f.to}`, `Edit flow from ${f.from} to ${f.to}`)}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFlow(f.id)}
                            className="text-slate-400 hover:text-red-600 p-1"
                            title={t("Zmazať tok", "Delete flow")}
                            aria-label={t(`Zmazať tok ${f.from} do ${f.to}`, `Delete flow from ${f.from} to ${f.to}`)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* STRIDE Threats Mapping */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <ShieldAlert size={14} className="text-purple-600" />
                      <span>{t("STRIDE Hrozby", "STRIDE Threats")}</span>
                    </span>
                    <Link
                      to={`/analysis/${analysisId}/threats`}
                      className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      <span>{t("Všetky", "All")}</span>
                      <ArrowRight size={10} />
                    </Link>
                  </div>

                  {threatsForSelected.length > 0 ? (
                    <div className="space-y-1.5">
                      {threatsForSelected.map(threat => (
                        <Link key={threat.id} to={`/analysis/${analysisId}/threats?search=${encodeURIComponent(threat.id)}`} className="block p-2 bg-slate-50 border border-slate-200 rounded text-[11px] hover:border-blue-300 hover:bg-blue-50">
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-800">{threat.id}</strong>
                            <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1 rounded">
                              {threat.stride}
                            </span>
                          </div>
                          <p className="text-slate-600 mt-1 line-clamp-2">{threat.title}</p>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded border border-dashed border-slate-200 text-slate-400 text-center text-[11px]">
                      {t("Žiadne špecifické hrozby naviazané priamo na tento komponent.", "No specific threats are linked directly to this component.")}
                    </div>
                  )}

                  <Link
                    to={`/analysis/${analysisId}/threats`}
                    className="mt-2 w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors block text-center"
                  >
                    <Plus size={12} />
                    <span>{t("Zadať hrozbu v registri", "Add threat in register")}</span>
                  </Link>
                </div>

                {/* ASVS Traceability Mapping */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <FileCode2 size={14} className="text-blue-600" />
                      <span>{t("ASVS Požiadavky", "ASVS Requirements")}</span>
                    </span>
                    <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 font-bold text-[10px] rounded">
                      {asvsMappedCount} {t("kontrol", "controls")}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">
                    {t("Požiadavky overenia ASVS namapované na tento komponent v záložke ASVS Workspace.", "ASVS verification requirements linked to this component in the ASVS Workspace.")}
                  </p>
                  <Link
                    to={`/analysis/${analysisId}/asvs`}
                    className="w-full py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors block text-center"
                  >
                    <span>{t("Otvoriť ASVS Workspace", "Open ASVS Workspace")}</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>

              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Info size={32} className="mb-2 text-slate-300" />
                <p className="font-bold text-slate-600">{t("Nebol vybraný žiadny komponent", "No component selected")}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {t("Kliknite na ľubovoľný komponent na plátne pre zobrazenie jeho parametrov, STRIDE hrozieb a ASVS prepojení.", "Select a component on the canvas to view its properties, STRIDE threats and ASVS links.")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Optional DFD review */}
      {isDfdReviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dfd-review-title"
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[85vh] flex flex-col p-6"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 id="dfd-review-title" className="font-bold text-slate-800 text-sm">{t("Voliteľná kontrola návrhu DFD", "Optional DFD design review")}</h3>
              <button
                type="button"
                aria-label={t("Zavrieť kontrolu návrhu", "Close design review")}
                onClick={() => setIsDfdReviewOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              {t("Kontrola je nezáväzná, nič nemení ani neblokuje uloženie. Upozornenia sú návrhy na preverenie, nie potvrdené zraniteľnosti.", "This optional review changes nothing and does not block saving. Warnings are suggestions for investigation, not confirmed vulnerabilities.")}
            </p>
            <div className="overflow-y-auto space-y-2 flex-1">
              {dfdReviewIssues.filter(issue => !dismissedReviewIssues.has(`${issue.flowId}-${issue.kind}`)).length ? dfdReviewIssues
                .filter(issue => !dismissedReviewIssues.has(`${issue.flowId}-${issue.kind}`))
                .map(issue => (
                <div
                  key={`${issue.flowId}-${issue.kind}`}
                  className={`rounded-lg border p-3 text-xs ${
                    issue.severity === "warning"
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : "border-blue-200 bg-blue-50 text-blue-900"
                  }`}
                >
                  <div className="font-semibold">{issue.flowName}</div>
                  <div className="mt-0.5">{issue.message}</div>
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const flow = flows.find(item => item.id === issue.flowId);
                        if (flow) openEditFlowModal(flow);
                        setIsDfdReviewOpen(false);
                      }}
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {t("Upraviť tok", "Edit flow")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDismissedReviewIssues(current => new Set(current).add(`${issue.flowId}-${issue.kind}`))}
                      className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      {t("Označiť preskúmané", "Mark reviewed")}
                    </button>
                  </div>
                </div>
              )) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  {t("Nenašli sa upozornenia podľa dostupných pravidiel. To samo osebe nepotvrdzuje bezpečnosť návrhu.", "No warnings were found using the available rules. This alone does not confirm the design is secure.")}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDfdReviewOpen(false)}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
              >
                {t("Zrušiť kontrolu", "Close review")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add or edit trust zone */}
      {isZoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div role="dialog" aria-modal="true" aria-labelledby="zone-modal-title" className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 id="zone-modal-title" className="font-bold text-slate-800 text-sm">
                {editingZoneId ? t("Upraviť trust zónu", "Edit trust zone") : t("Pridať trust zónu", "Add trust zone")}
              </h3>
              <button type="button" aria-label={t("Zavrieť formulár trust zóny", "Close trust zone form")} onClick={() => setIsZoneModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveZone} className="space-y-3.5 text-xs">
              <div>
                <label htmlFor="trust-zone-name" className="block font-semibold text-slate-700 mb-1">{t("Názov zóny *", "Zone name *")}</label>
                <input
                  id="trust-zone-name"
                  type="text"
                  required
                  maxLength={80}
                  value={newZoneName}
                  onChange={event => setNewZoneName(event.target.value)}
                  placeholder={t("napr. Verejný internet", "e.g. Public internet")}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="trust-zone-color" className="block font-semibold text-slate-700 mb-1">{t("Farba zóny", "Zone colour")}</label>
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
                {t("Zónu môžete presúvať potiahnutím jej názvu a meniť jej veľkosť potiahnutím pravého dolného rohu. Komponenty zostávajú v priradenej zóne.", "Drag the zone title to move it and the bottom-right corner to resize it. Components remain in their assigned zone.")}
              </p>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsZoneModalOpen(false)} className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium">
                  {t("Zrušiť", "Cancel")}
                </button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs">
                  {editingZoneId ? t("Uložiť zmeny", "Save changes") : t("Vytvoriť zónu", "Create zone")}
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
                {editingCompId ? t("Upraviť architektonický komponent", "Edit architecture component") : t("Pridať nový architektonický komponent", "Add architecture component")}
              </h3>
              <button type="button" aria-label={t("Zavrieť formulár komponentu", "Close component form")} onClick={() => setIsComponentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveComponent} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Názov komponentu *", "Component name *")}</label>
                <input
                  type="text"
                  required
                  value={newCompName}
                  onChange={e => setNewCompName(e.target.value)}
                  placeholder={t("napr. Customer Order Service", "e.g. Customer Order Service")}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Typ komponentu", "Component type")}</label>
                <select
                  value={newCompType}
                  onChange={e => setNewCompType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="service">{t("Interná služba / API (Microservice)", "Internal service / API (Microservice)")}</option>
                  <option value="client">{t("Webový alebo mobilný klient (Frontend)", "Web or mobile client (Frontend)")}</option>
                  <option value="api_gateway">API Gateway / WAF / Reverse Proxy</option>
                  <option value="database">{t("Databáza / Úložisko dát", "Database / Data storage")}</option>
                  <option value="external">{t("Externá služba 3. strany", "External third-party service")}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Zóna dôvery (Trust Boundary)", "Trust zone (Trust Boundary)")}</label>
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
                <label htmlFor="component-tech" className="block font-semibold text-slate-700 mb-1">{t("Technologický stack", "Technology stack")}</label>
                <select
                  id="component-tech"
                  value={newCompTech}
                  onChange={e => setNewCompTech(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">{t("Vyberte technológiu", "Select technology")}</option>
                  {TECHNOLOGY_STACK_OPTIONS.map(technology => (
                    <option key={technology} value={technology}>{technology === "Všeobecná služba" ? t("Všeobecná služba", "General service") : technology}</option>
                  ))}
                  <option value={CUSTOM_TECH_STACK}>{t("Iný / vlastný stack", "Other / custom stack")}</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-500">{t("V roletke môžete písať písmená a rýchlo skočiť na zodpovedajúcu technológiu.", "Type letters in the dropdown to jump to a matching technology.")}</p>
                {newCompTech === CUSTOM_TECH_STACK && (
                  <input
                    type="text"
                    value={newCompCustomTech}
                    onChange={e => setNewCompCustomTech(e.target.value)}
                    placeholder={t("Zadajte vlastný technologický stack", "Enter a custom technology stack")}
                    className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsComponentModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
                >
                  {t("Zrušiť", "Cancel")}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs"
                >
                  {editingCompId ? t("Uložiť zmeny", "Save changes") : t("Pridať komponent", "Add component")}
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
              <h3 id="flow-modal-title" className="font-bold text-slate-800 text-sm">{editingFlowId ? t("Upraviť tok dát", "Edit data flow") : t("Pridať tok dát (Data Flow)", "Add data flow")}</h3>
              <button type="button" aria-label={t("Zavrieť formulár toku", "Close flow form")} onClick={() => setIsAddFlowOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddFlow} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Odkiaľ (Zdroj)", "From (Source)")}</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">{t("Kam (Cieľ)", "To (Destination)")}</label>
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
                <label htmlFor="flow-protocol" className="block font-semibold text-slate-700 mb-1">{t("Protokol / spôsob komunikácie", "Protocol / communication method")}</label>
                <select
                  id="flow-protocol"
                  required
                  value={newFlowProtocol}
                  onChange={e => setNewFlowProtocol(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                >
                  <option value="">{t("Vyberte protokol alebo spôsob komunikácie", "Select a protocol or communication method")}</option>
                  {FLOW_PROTOCOL_OPTIONS.map(protocol => (
                    <option key={protocol} value={protocol}>{protocol}</option>
                  ))}
                  <option value={CUSTOM_FLOW_PROTOCOL}>{t("Iný / vlastný protokol", "Other / custom protocol")}</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-500">{t("V roletke môžete písať písmená a rýchlo skočiť na zodpovedajúci protokol.", "Type letters in the dropdown to jump to a matching protocol.")}</p>
                {newFlowProtocol === CUSTOM_FLOW_PROTOCOL && (
                  <input
                    type="text"
                    required
                    value={newFlowCustomProtocol}
                    onChange={e => setNewFlowCustomProtocol(e.target.value)}
                    placeholder={t("Zadajte vlastný protokol alebo spôsob komunikácie", "Enter a custom protocol or communication method")}
                    className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none"
                  />
                )}
              </div>

              {showTlsCryptoOptions && (
                <>
                  <div>
                    <label htmlFor="flow-cipher-suite" className="block font-semibold text-slate-700 mb-1">TLS cipher suite</label>
                    <select
                      id="flow-cipher-suite"
                      value={newFlowCipherSuite}
                      onChange={e => setNewFlowCipherSuite(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                    >
                      <option value="">{t("Nezistené / neurčené", "Unknown / unspecified")}</option>
                      {NIST_CIPHER_SUITES.map(cipherSuite => (
                        <option key={cipherSuite} value={cipherSuite}>{cipherSuite}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="flow-key-exchange" className="block font-semibold text-slate-700 mb-1">{t("Výmena kľúčov / KEM (PQC)", "Key exchange / KEM (PQC)")}</label>
                    <select
                      id="flow-key-exchange"
                      value={newFlowKeyExchange}
                      onChange={e => setNewFlowKeyExchange(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                    >
                      <option value="">{t("Nezistené / neurčené", "Unknown / unspecified")}</option>
                      {NIST_KEY_EXCHANGE_OPTIONS.map(keyExchange => (
                        <option key={keyExchange} value={keyExchange}>{keyExchange}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {t("Cipher suite neurčuje výmenu kľúčov. ML-KEM je samostatný NIST KEM; jeho použitie v TLS závisí od podpory TLS endpointu.", "The cipher suite does not determine key exchange. ML-KEM is a separate NIST KEM; its use in TLS depends on endpoint support.")}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    {t("Stav PQC návrhu:", "PQC design status:")} <strong>{getPqcDesignStatusLabel(getPqcDesignStatus(newFlowKeyExchange), language)}</strong>
                  </p>
                </>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Typ prenosu", "Transfer type")}</label>
                <select
                  value={newFlowTransferType}
                  onChange={e => setNewFlowTransferType(e.target.value as DataFlow["transferType"])}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                >
                  <option value="Synchronous">{t("Synchrónny (request / response)", "Synchronous (request / response)")}</option>
                  <option value="Asynchronous">{t("Asynchrónny (fronta / udalosť)", "Asynchronous (queue / event)")}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Popis prenášaných údajov", "Description of transferred data")}</label>
                <textarea
                  value={newFlowDataDescription}
                  onChange={e => setNewFlowDataDescription(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder={t("napr. prihlasovacie údaje, osobné údaje alebo platobné udalosti", "e.g. credentials, personal data or payment events")}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none resize-y"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Klasifikácia prenášaných dát", "Transferred data classification")}</label>
                <select
                  value={newFlowClassification}
                  onChange={e => setNewFlowClassification(e.target.value as DataFlow["dataClassification"])}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                >
                  <option value="Public">{t("Verejné (Public)", "Public")}</option>
                  <option value="Internal">{t("Interné (Internal)", "Internal")}</option>
                  <option value="Confidential">{t("Dôverné (Confidential)", "Confidential")}</option>
                  <option value="Restricted">{t("Prísne tajné / Citlivé (Restricted)", "Restricted / Sensitive")}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 p-2.5 text-slate-700">
                  <input type="checkbox" checked={newFlowEncrypted} onChange={e => setNewFlowEncrypted(e.target.checked)} />
                  <span>{t("Šifrovaný prenos", "Encrypted transfer")}</span>
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 p-2.5 text-slate-700">
                  <input type="checkbox" checked={newFlowAuthenticated} onChange={e => setNewFlowAuthenticated(e.target.checked)} />
                  <span>{t("Autentifikovaný odosielateľ", "Authenticated sender")}</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddFlowOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
                >
                  {t("Zrušiť", "Cancel")}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs"
                >
                  {editingFlowId ? t("Uložiť zmeny", "Save changes") : t("Vytvoriť tok", "Create flow")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
