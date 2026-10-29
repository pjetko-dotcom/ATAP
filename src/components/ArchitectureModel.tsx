/**
 * Architecture Model - Interactive DFD & Threat Canvas
 * Provides an interactive Data Flow Diagram (DFD) canvas allowing users to visualize
 * architectural components, trust boundaries, data flows, and map them to STRIDE threats and ASVS controls.
 * 
 * @module ArchitectureModel
 */
import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
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
  RefreshCw,
  Zap,
  Sliders,
  X,
  FileCode2,
  Network
} from "lucide-react";
import { useWorkspaceState } from "../hooks/useWorkspaceState";

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
    encrypted: true
  },
  {
    id: "flow_2",
    from: "API Gateway",
    to: "Auth Service",
    protocol: "mTLS / gRPC (Token Verify)",
    dataClassification: "Restricted",
    encrypted: true
  },
  {
    id: "flow_3",
    from: "API Gateway",
    to: "Core Backend API",
    protocol: "Internal HTTP (mTLS Header)",
    dataClassification: "Confidential",
    encrypted: true
  },
  {
    id: "flow_4",
    from: "Core Backend API",
    to: "Main Database",
    protocol: "TLS Connection (Prepared Statements)",
    dataClassification: "Restricted",
    encrypted: true
  },
  {
    id: "flow_5",
    from: "Core Backend API",
    to: "Payment Gateway",
    protocol: "HTTPS (HMAC Signature Webhook)",
    dataClassification: "Restricted",
    encrypted: true
  }
];

export function ArchitectureModel() {
  const { id: analysisId } = useParams<{ id: string }>();
  const storageKey = `atap_architecture_${analysisId || "default"}`;

  const [components, setComponents] = useState<ArchComponent[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.components && Array.isArray(parsed.components) && parsed.components.length > 0) {
          return parsed.components;
        }
      }
    } catch (e) {}
    return DEFAULT_COMPONENTS;
  });

  const [flows, setFlows] = useState<DataFlow[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.flows && Array.isArray(parsed.flows)) {
          return parsed.flows;
        }
      }
    } catch (e) {}
    return DEFAULT_FLOWS;
  });

  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddFlowOpen, setIsAddFlowOpen] = useState(false);
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

  const canvasRef = useRef<HTMLDivElement>(null);

  // Save to localStorage whenever components or flows change
  useEffect(() => {
    const data = {
      components,
      flows,
      zones: DEFAULT_ZONES
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [components, flows, storageKey]);

  // Load threats associated with selected component
  let threatsForSelected: any[] = [];
  if (selectedCompId) {
    try {
      const rawThreats = localStorage.getItem(`atap_threats_${analysisId || "default"}`);
      if (rawThreats) {
        const parsed = JSON.parse(rawThreats);
        threatsForSelected = parsed.filter((t: any) => 
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

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDraggingCompId(compId);
    setDragOffset({
      x: e.clientX - rect.left - comp.x,
      y: e.clientY - rect.top - comp.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingCompId) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const newX = Math.max(10, Math.min(1250, e.clientX - rect.left - dragOffset.x));
    const newY = Math.max(10, Math.min(500, e.clientY - rect.top - dragOffset.y));

    setComponents(prev => prev.map(c => 
      c.id === draggingCompId ? { ...c, x: newX, y: newY } : c
    ));
  };

  const handleMouseUp = () => {
    setDraggingCompId(null);
  };

  const handleResetArchitecture = () => {
    if (window.confirm("Naozaj chcete obnoviť architektúru na predvolený stav?")) {
      setComponents(DEFAULT_COMPONENTS);
      setFlows(DEFAULT_FLOWS);
      setSelectedCompId(null);
      setToastMessage("Architektúra bola obnovená na odporúčaný model.");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleAddComponent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim()) return;

    const newId = newCompName.trim();
    if (components.some(c => c.id === newId)) {
      alert("Komponent s týmto názvom už existuje.");
      return;
    }

    const zone = DEFAULT_ZONES.find(z => z.id === newCompZone) || DEFAULT_ZONES[1];

    const newComp: ArchComponent = {
      id: newId,
      name: newCompName.trim(),
      type: newCompType,
      zoneId: newCompZone,
      tech: newCompTech.trim() || "Všeobecná služba",
      x: zone.x + 30,
      y: zone.y + 100 + (components.length * 20) % 200
    };

    setComponents(prev => [...prev, newComp]);
    setSelectedCompId(newComp.id);
    setIsAddModalOpen(false);
    setNewCompName("");
    setNewCompTech("");
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

    const newFlow: DataFlow = {
      id: `flow_${Date.now()}`,
      from: newFlowFrom,
      to: newFlowTo,
      protocol: newFlowProtocol,
      dataClassification: newFlowClassification,
      encrypted: true
    };

    setFlows(prev => [...prev, newFlow]);
    setIsAddFlowOpen(false);
    setToastMessage(`Tok dát z ${newFlowFrom} do ${newFlowTo} bol pridaný.`);
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
            Interaktívna mapa komponentov, hraníc dôvery (Trust Boundaries) a šifrovaných tokov dát prepojená so STRIDE hrozbami.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
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
              setNewFlowFrom(components[0].id);
              setNewFlowTo(components[1].id);
              setIsAddFlowOpen(true);
            }}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Prepojiť tokom dát</span>
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
      <div className="flex-1 flex overflow-hidden p-6 gap-4">
        
        {/* Canvas Container */}
        <div 
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={() => setSelectedCompId(null)}
          className="flex-1 bg-white rounded-xl border border-slate-200 shadow-xs relative overflow-auto custom-scrollbar select-none min-w-[900px] min-h-[560px]"
          style={{
            backgroundImage: `radial-gradient(#cbd5e1 1px, transparent 1px)`,
            backgroundSize: "24px 24px"
          }}
        >
          {/* Trust Boundaries (Zones) */}
          {DEFAULT_ZONES.map(zone => (
            <div
              key={zone.id}
              className={`absolute rounded-xl border-2 border-dashed ${zone.borderColor} ${zone.bgTint} pointer-events-none transition-all duration-300`}
              style={{
                left: zone.x,
                top: zone.y,
                width: zone.width,
                height: zone.height
              }}
            >
              <div className="p-3">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${zone.color}`}>
                  {zone.name}
                </span>
              </div>
            </div>
          ))}

          {/* SVG Connectors for Data Flows */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: 1300, minHeight: 600 }}>
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="6"
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
                refX="6"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#1d4ed8" />
              </marker>
            </defs>

            {flows.map(flow => {
              const fromComp = components.find(c => c.id === flow.from);
              const toComp = components.find(c => c.id === flow.to);
              if (!fromComp || !toComp) return null;

              // Center coordinates
              const x1 = fromComp.x + 95;
              const y1 = fromComp.y + 35;
              const x2 = toComp.x + 95;
              const y2 = toComp.y + 35;

              // Midpoint for label
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              const isFlowHighlighted = selectedCompId === flow.from || selectedCompId === flow.to;

              return (
                <g key={flow.id}>
                  {/* Flow line */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isFlowHighlighted ? "#2563eb" : "#94a3b8"}
                    strokeWidth={isFlowHighlighted ? 2.5 : 1.8}
                    strokeDasharray={flow.encrypted ? undefined : "4 4"}
                    markerEnd={isFlowHighlighted ? "url(#arrow-selected)" : "url(#arrow)"}
                  />

                  {/* Flow label */}
                  <rect
                    x={midX - 55}
                    y={midY - 10}
                    width={110}
                    height={20}
                    rx={4}
                    fill="#ffffff"
                    stroke={isFlowHighlighted ? "#bfdbfe" : "#e2e8f0"}
                    strokeWidth={1}
                  />
                  <text
                    x={midX}
                    y={midY + 3.5}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="600"
                    fill={isFlowHighlighted ? "#1e40af" : "#64748b"}
                  >
                    {flow.protocol.length > 20 ? `${flow.protocol.substring(0, 18)}...` : flow.protocol}
                  </text>
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
                  width: 190,
                  transform: isDragging ? "scale(1.02)" : "scale(1)"
                }}
                className={`absolute p-3 rounded-xl border bg-white shadow-xs cursor-move transition-shadow ${
                  isSelected 
                    ? "ring-2 ring-blue-500 border-blue-600 shadow-md z-20" 
                    : "border-slate-200 hover:border-slate-400 hover:shadow-sm z-10"
                }`}
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
                    <button
                      onClick={() => handleDeleteComponent(selectedComp.id)}
                      className="text-red-500 hover:text-red-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      title="Zmazať komponent"
                    >
                      <Trash2 size={12} />
                      <span>Zmazať</span>
                    </button>
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-sm mt-0.5">{selectedComp.name}</h4>
                  <div className="mt-2 space-y-1 text-slate-600 text-[11px]">
                    <div><strong>Typ:</strong> <span className="capitalize">{selectedComp.type}</span></div>
                    <div><strong>Technológia:</strong> {selectedComp.tech}</div>
                    <div><strong>Hranica dôvery:</strong> {DEFAULT_ZONES.find(z => z.id === selectedComp.zoneId)?.name || "Zóna"}</div>
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
                            {f.protocol}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteFlow(f.id)}
                          className="text-slate-400 hover:text-red-600 p-1"
                          title="Zmazať tok"
                        >
                          <Trash2 size={12} />
                        </button>
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

      {/* Modal: Add New Component */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-sm">Pridať nový architektonický komponent</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddComponent} className="space-y-3.5 text-xs">
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
                  {DEFAULT_ZONES.map(z => (
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
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Pridať komponent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Flow */}
      {isAddFlowOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-sm">Pridať tok dát (Data Flow)</h3>
              <button onClick={() => setIsAddFlowOpen(false)} className="text-slate-400 hover:text-slate-600">
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
                <label className="block font-semibold text-slate-700 mb-1">Protokol & Šifrovanie</label>
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
                <label className="block font-semibold text-slate-700 mb-1">Klasifikácia prenášaných dát</label>
                <select
                  value={newFlowClassification}
                  onChange={e => setNewFlowClassification(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                >
                  <option value="Public">Verejné (Public)</option>
                  <option value="Internal">Interné (Internal)</option>
                  <option value="Confidential">Dôverné (Confidential)</option>
                  <option value="Restricted">Prísne tajné / Citlivé (Restricted)</option>
                </select>
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
                  Vytvoriť tok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
