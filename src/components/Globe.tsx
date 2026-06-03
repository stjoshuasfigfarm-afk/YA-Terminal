import React, { useEffect, useRef, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Stars, Line, Html } from "@react-three/drei";
import { Lock, Unlock, RotateCcw, Zap, RefreshCcw } from "lucide-react";
import * as THREE from "three";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useCompanies } from "../context/CompaniesContext";
import { Company } from "../data/companies";
import { CORRIDORS, getCorridorHeadquartersLinks, RELATIONAL_LINKS } from "./yield-terminal/TopologyMap";
import { cn } from "../lib/utils";


export enum LOD_LEVEL {
  MACRO = 0,    // Far: Major HQs only
  REGIONAL = 1, // Medium: Secondary facilities + routes
  MICRO = 2     // Close: Local nodes + high density telemetry
}

// Helper to determine company importance for LOD
const getCompanyLODRank = (company: Company): LOD_LEVEL => {
  const globalGiants = ["AAPL", "MSFT", "NVDA", "TSM", "ASML", "JPM", "GS", "TSLA", "TM", "AMZN", "LVMH", "GOOGL", "META", "WMT", "ARAMCO", "700", "9988", "005930"];
  if (globalGiants.includes(company.symbol)) return LOD_LEVEL.MACRO;
  if (company.workforce || company.partners?.length) return LOD_LEVEL.REGIONAL;
  return LOD_LEVEL.MICRO;
};

// Helper to convert lat/lng to 3D coordinates on a sphere
const latLngToVector3 = (lat: number, lng: number, radius: number) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
};

// Helper to convert lat/lng to OpenStreetMap tile coordinates (XYZ Web Mercator)
const latLngToTileXY = (lat: number, lng: number, zoom: number) => {
  const latRad = (lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return {
    x: Math.max(0, Math.min(n - 1, x)),
    y: Math.max(0, Math.min(n - 1, y)),
  };
};

// Helper to convert OSM tile coordinates back to their raw latitude/longitude bounding boxes
const tileXYToLatLngBounds = (x: number, y: number, zoom: number) => {
  const n = Math.pow(2, zoom);
  const lng_west = (x / n) * 360 - 180;
  const lng_east = ((x + 1) / n) * 360 - 180;

  const sinhNormalized = (yVal: number) => {
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * yVal) / n)));
    return (latRad * 180) / Math.PI;
  };

  const lat_north = sinhNormalized(y);
  const lat_south = sinhNormalized(y + 1);

  return { lat_north, lat_south, lng_west, lng_east };
};


interface SupplyLabelProps {
  position: THREE.Vector3;
  company: Company;
  sentimentScore?: number;
}

const SupplyLabel = ({ position, company, sentimentScore }: SupplyLabelProps) => {
  const relations = RELATIONAL_LINKS.filter(l => l.source === company.symbol || l.target === company.symbol);
  
  return (
    <Html position={[0, 0, 0]} className="pointer-events-none select-none z-50">
      <div className="absolute left-4 top-0 -translate-y-1/2 bg-black/95 border border-emerald-500/40 p-1.5 md:p-2 rounded-sm shadow-[0_0_40px_rgba(0,0,0,0.8),0_0_15px_rgba(16,185,129,0.1)] backdrop-blur-xl w-32 md:w-36 font-mono relative antialiased ring-1 ring-white/10 outline outline-1 outline-emerald-500/20 -outline-offset-4 scale-75 md:scale-90">
        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-1.5 h-1.5 border-l border-t border-emerald-400/60" />
        <div className="absolute top-0 right-0 w-1.5 h-1.5 border-r border-t border-emerald-400/60" />
        <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-l border-b border-emerald-400/60" />
        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-r border-b border-emerald-400/60" />

        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5 mb-2 bg-emerald-500/5 px-2 -mx-2 -mt-1">
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-white font-black tracking-[0.2em] text-[9px] leading-none">{company.symbol}</span>
              <span className="text-emerald-500/60 text-[5px] tracking-widest mt-0.5 uppercase">ID: {company.symbol.slice(0, 5)}</span>
            </div>
          </div>
          <div className={cn(
            "w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]",
            sentimentScore && sentimentScore > 0.3 ? "bg-emerald-500 text-emerald-500" : (sentimentScore && sentimentScore < -0.3 ? "bg-red-500 text-red-500" : "bg-amber-500 text-amber-500")
          )} />
        </div>
        
        <div className="space-y-2">
          {relations.length > 0 && (
            <div className="space-y-1.5">
              {relations.map((rel, i) => (
                <div key={i} className="flex flex-col gap-0.5 group">
                  <div className="flex justify-between items-center text-emerald-500/70 uppercase italic text-[6px] font-black tracking-wider">
                    <span className="flex items-center gap-1">
                      {rel.source === company.symbol ? "→ Out" : "← In"}
                      <span className="h-[1px] w-2 bg-emerald-500/30 inline-block" />
                    </span>
                    <span className="text-zinc-500 bg-zinc-800/30 px-1 rounded-px">{rel.source === company.symbol ? rel.target : rel.source}</span>
                  </div>
                  <div className="text-zinc-100 font-bold leading-tight text-[9px] tracking-tight group-hover:text-emerald-400 transition-colors">
                    {rel.commodity}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="pt-2 mt-1.5 border-t border-emerald-500/10 flex flex-col gap-1.5">
             <div className="flex justify-between text-[6px] text-zinc-500 uppercase font-black tracking-widest">
               <span className="flex flex-col">
                 <span className="text-[5px] text-zinc-700">CAP</span>
                 <span className="text-zinc-400">{company.workforce || "N/A"}</span>
               </span>
               <span className="flex flex-col items-end">
                 <span className="text-[5px] text-zinc-700">LOC</span>
                 <span className="text-zinc-400 truncate max-w-[60px]">{company.headquarters?.slice(0, 10) || company.country}</span>
               </span>
             </div>
             <div className="h-0.5 bg-zinc-900 w-full overflow-hidden relative rounded-full">
                <div className="absolute inset-0 bg-emerald-500/20" />
             </div>
          </div>
        </div>
      </div>
    </Html>
  );
};

// Stable deterministic relationship health/momentum based on symbol names
const getRelationshipHealth = (fromSym: string, toSym: string): 'strengthening' | 'weakening' => {
  const codeSum = fromSym.charCodeAt(0) + (toSym.charCodeAt(1) || 0) + (fromSym.charCodeAt(fromSym.length - 1) || 0);
  return codeSum % 2 === 0 ? 'strengthening' : 'weakening';
};

const DataPoints = ({ count = 150 }: { count?: number }) => {
  const points = useMemo(() => {
    const p = [];
    for (let i = 0; i < count; i++) {
      const lat = (Math.random() - 0.5) * 180;
      const lng = (Math.random() - 0.5) * 360;
      const radius = 2 + Math.random() * 0.8;
      p.push({
         pos: latLngToVector3(lat, lng, radius),
         size: Math.random() * 0.005,
         opacity: 0.1 + Math.random() * 0.4
      });
    }
    return p;
  }, [count]);

  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      // Rotation removed
    }
  });

  return (
    <group ref={groupRef}>
      {points.map((p, i) => (
        <mesh key={i} position={p.pos}>
          <sphereGeometry args={[p.size, 8, 8]} />
          <meshBasicMaterial color="#10b981" transparent opacity={p.opacity} />
        </mesh>
      ))}
    </group>
  );
};

const ActivityPulse = React.memo(({ 
  position, 
  activityScore, 
  isSelected,
  sentimentScore,
  nodeColor
}: { 
  position: THREE.Vector3, 
  activityScore: number, 
  isSelected: boolean,
  sentimentScore?: number,
  nodeColor?: string
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Animation removed
    }
    if (glowRef.current) {
      // Animation removed
    }
  });

  const getSentimentColor = (score: number) => {
    if (score > 0.3) return "#10b981"; // Bullish Green
    if (score < -0.3) return "#ef4444"; // Bearish Red
    return "#eab308"; // Neutral Yellow
  };

  const baseColor = nodeColor || (isSelected 
    ? (sentimentScore !== undefined ? getSentimentColor(sentimentScore) : "#10b981") 
    : "#334155");
  
  const activeColor = nodeColor || (activityScore > 0.7 ? "#f59e0b" : activityScore > 0.4 ? "#3b82f6" : baseColor);

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[isSelected ? 0.025 : (nodeColor ? 0.012 : 0.008), 16, 16]} />
        <meshBasicMaterial 
          color={isSelected ? baseColor : activeColor} 
          transparent 
          opacity={isSelected ? 1 : (nodeColor ? 0.7 : 0.4 + activityScore * 0.4)}
        />
      </mesh>
      
      {(activityScore > 0.2 || isSelected || nodeColor) && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[isSelected ? 0.045 : (nodeColor ? 0.025 : 0.015), 16, 16]} />
          <meshBasicMaterial 
            color={activeColor} 
            transparent 
            opacity={0.15} 
          />
        </mesh>
      )}
    </group>
  );
});

const ScanningRings = () => {
  const count = 3;
  return (
    <group>
      {[...Array(count)].map((_, i) => (
        <ScanningRing key={i} delay={i * 2} />
      ))}
    </group>
  );
};

const ScanningRing = ({ delay = 0 }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      const t = (state.clock.elapsedTime + delay) % 6;
      const progress = t / 6;
      const scale = 2.1 + progress * 1.5;
      meshRef.current.scale.set(scale, scale, scale);
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = 0;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1, 1.01, 64]} />
      <meshBasicMaterial color="#10b981" transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  );
};

const TargetLock = ({ color }: { color: string }) => {
  return (
    <mesh>
      <ringGeometry args={[0.06, 0.08, 32]} />
      <meshBasicMaterial 
        color={color} 
        transparent 
        opacity={0.8} 
        side={THREE.DoubleSide} 
      />
    </mesh>
  );
};

const SimpleLabel = ({ company, relationship, position }: { company: Company, relationship?: "SUPPLIER" | "CUSTOMER" | null, position: THREE.Vector3 }) => (
  <Html position={position} className="pointer-events-none select-none">
    <div className={cn(
      "absolute left-4 top-0 -translate-y-1/2 border px-1.5 py-1 rounded-sm text-[8px] font-mono whitespace-nowrap flex flex-col shadow-[0_4px_12px_rgba(0,0,0,0.6)] backdrop-blur-sm",
      relationship === "SUPPLIER" ? "bg-yellow-950/90 border-yellow-500/50 text-yellow-400" :
      relationship === "CUSTOMER" ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-400" :
      "bg-black/95 border-zinc-700 text-white"
    )}>
      <div className="flex items-center gap-1.5 border-b border-white/5 pb-1 mb-1">
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            {relationship === "SUPPLIER" && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 border border-yellow-400" />}
            {relationship === "CUSTOMER" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 border border-emerald-400" />}
            <span className="font-black tracking-widest uppercase">{company.symbol}</span>
          </div>
          <div className="text-[6.5px] text-zinc-400 font-sans tracking-tight max-w-[100px] truncate leading-none mt-0.5">
            {company.name}
          </div>
        </div>
        {relationship && <span className="ml-auto px-1 py-0.5 bg-black/50 border border-white/10 rounded-xs text-[5px] tracking-normal font-black">{relationship}</span>}
      </div>
    </div>
  </Html>
);

const GlobePoints = ({ 
  companies, 
  selectedSymbol, 
  onSelect,
  marketData = {},
  newsData = [],
  sentiment,
  isNewsCyclingActive = false,
  viewportLock = false,
  presentationMode = false,
  showAllConnections = false,
  networkAnchor = null,
  lod,
}: { 
  companies: Company[]; 
  selectedSymbol?: string; 
  onSelect: (c: Company) => void;
  marketData?: Record<string, any>;
  newsData?: any[];
  sentiment?: any;
  isNewsCyclingActive?: boolean;
  viewportLock?: boolean;
  presentationMode?: boolean;
  showAllConnections?: boolean;
  networkAnchor?: Company | null;
  lod: LOD_LEVEL;
}) => {
  const meshRef = useRef<THREE.Group>(null);

  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);

  // No redundant rotation
  const selectedCompany = selectedSymbol ? companies.find(c => c.symbol === selectedSymbol) : null;

  if (presentationMode) return null; // Hide node labels and points in presentation mode for cleaner look

  return (
    <group>
      {companies.map((company, index) => {
        const position = latLngToVector3(company.lat, company.lng, 2);
        const isSelected = company.symbol === selectedSymbol;
        const isHovered = company.symbol === hoveredSymbol;
        
        const anchor = networkAnchor || selectedCompany;
        const isUpstream = anchor && company.partners?.includes(anchor.symbol);
        const isDownstream = anchor && anchor.partners?.includes(company.symbol);
        
        // Dynamic LOD Filtering
        const companyRank = getCompanyLODRank(company);
        if (!isSelected && !isUpstream && !isDownstream && companyRank > lod) {
          return null;
        }

        // If in network mode, hide nodes that aren't connected
        if (showAllConnections && anchor) {
          const isAnchor = anchor.symbol === company.symbol;
          if (!isSelected && !isAnchor && !isUpstream && !isDownstream) {
            return null;
          }
        }
        
        const isSelectedPartner = selectedCompany && (company.partners?.includes(selectedCompany.symbol) || selectedCompany.partners?.includes(company.symbol));
        
        let nodeColor = undefined;
        if (isSelected) {
          nodeColor = sentiment?.score > 0.3 ? "#10b981" : sentiment?.score < -0.3 ? "#ef4444" : "#eab308";
        } else if (isUpstream) {
          nodeColor = "#eab308"; // bright hex yellow for upstream raw materials/logistics vendors
        } else if (isDownstream) {
          nodeColor = "#22c55e"; // bright hex green for downstream partners/customers
        }

        const quote = marketData[company.symbol];
        const volatility = quote ? Math.abs(parseFloat(quote.dp) || 0) : 0;
        const companyNewsCount = (newsData || []).filter(n => n.symbol === company.symbol).length;
        const activityScore = Math.min(1, (volatility / 5) + (companyNewsCount / 10));

        return (
          <group key={`${company.symbol}-${index}`} onClick={(e) => {
            e.stopPropagation();
            onSelect(company);
          }}
          onPointerOver={(e) => { e.stopPropagation(); setHoveredSymbol(company.symbol); }}
          onPointerOut={() => setHoveredSymbol(null)}>
            <ActivityPulse 
              position={position} 
              activityScore={activityScore} 
              isSelected={isSelected} 
              sentimentScore={isSelected ? sentiment?.score : undefined}
              nodeColor={nodeColor}
            />
            {isHovered && !isSelected && !showAllConnections && !isSelectedPartner && (
              <Html position={position} distanceFactor={10} className="pointer-events-none select-none z-10">
                <div className="absolute left-4 top-0 -translate-y-1/2 bg-black/90 border border-emerald-500/40 px-1.5 py-0.5 rounded-sm text-[8px] font-mono text-white shadow-[0_4px_12px_rgba(0,0,0,0.8)] backdrop-blur-sm">
                  {company.symbol}
                </div>
              </Html>
            )}
            {isSelected && (
              <group position={position}>
                <TargetLock color={nodeColor || "#10b981"} />
                {!isNewsCyclingActive && !viewportLock && (
                  <SupplyLabel position={position} company={company} sentimentScore={sentiment?.score} />
                )}
              </group>
            )}
            {((isHovered || showAllConnections || isSelectedPartner) && !isSelected) && (
               <SimpleLabel position={position} company={company} relationship={isUpstream ? "SUPPLIER" : isDownstream ? "CUSTOMER" : null} />
            )}
          </group>
        );
      })}
    </group>
  );
};

const DataPulse = ({ 
  curve, 
  color = "#34d399", 
  speed = 0.2,
  size = 0.015,
  opacity = 1
}: { 
  curve: THREE.QuadraticBezierCurve3;
  color?: string;
  speed?: number;
  size?: number;
  opacity?: number;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      const t = (state.clock.elapsedTime * speed) % 1;
      const pos = curve.getPoint(t);
      meshRef.current.position.copy(pos);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[size, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
      <pointLight distance={0.5} intensity={0.5 * opacity} color={color} />
    </mesh>
  );
};

const SupplyArcs = ({ 
  selectedStock, 
  companies,
  showAllConnections = false,
  networkAnchor = null,
  lod
}: { 
  selectedStock: Company | null; 
  companies: Company[];
  showAllConnections?: boolean;
  networkAnchor?: Company | null;
  lod: LOD_LEVEL;
}) => {
  // Hardcoded check so this multi-tier connection mapping logic ONLY executes when the projection mode is GLOBE_3D
  const projectionMode: 'GLOBE_3D' | 'MAP_2D' = 'GLOBE_3D';
  if (projectionMode !== 'GLOBE_3D') {
    return null;
  }

  const arcData = useMemo(() => {
    // Show all connections at low opacity if nothing is specific, or if explicitly requested
    const list = showAllConnections ? companies : companies; 
    const arcs: any[] = [];

    const addArc = (fromStock: Company, toStock: Company, type: 'upstream' | 'downstream' | 'general') => {
      const startPos = latLngToVector3(fromStock.lat, fromStock.lng, 2);
      const endPos = latLngToVector3(toStock.lat, toStock.lng, 2);
      
      const midPoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
      const distance = startPos.distanceTo(endPos);
      midPoint.normalize().multiplyScalar(2 + distance * 0.3);

      const curve = new THREE.QuadraticBezierCurve3(startPos, midPoint, endPos);
      
      const health = getRelationshipHealth(fromStock.symbol, toStock.symbol);
      
      // Override connection line colors based on multi-tier properties
      let color = "#10b981"; // generic connection line
      if (type === 'upstream') {
        color = "#eab308"; // bright hex yellow for upstream
      } else if (type === 'downstream') {
        color = "#22c55e"; // bright hex green for downstream
      }

      arcs.push({
        points: curve.getPoints(50),
        curve,
        color,
        type,
        health,
        isSelected: (selectedStock && (fromStock.symbol === selectedStock.symbol || toStock.symbol === selectedStock.symbol)) ||
                    (networkAnchor && (fromStock.symbol === networkAnchor.symbol || toStock.symbol === networkAnchor.symbol))
      });
    };

    const anchor = networkAnchor || selectedStock;
    
    // In Macro view, only show arcs if specifically looking at a company or explicitly requested
    if (lod === LOD_LEVEL.MACRO && !anchor && !showAllConnections) {
      return arcs;
    }

    if (showAllConnections && anchor) {
      // 1. Outbound vectors of anchor (Downstream layout)
      if (anchor.partners) {
        anchor.partners.forEach(pSymbol => {
          const toStock = companies.find(c => c.symbol === pSymbol);
          if (toStock) {
            addArc(anchor, toStock, 'downstream');
          }
        });
      }

      // 2. Inbound vectors of anchor (Upstream layout)
      companies.forEach(fromStock => {
        if (fromStock.partners?.includes(anchor.symbol)) {
          addArc(fromStock, anchor, 'upstream');
        }
      });
    }
    
    return arcs;
  }, [selectedStock, companies, showAllConnections, networkAnchor]);

  return (
    <group>
      {arcData.map((data, idx) => {
        const isStrengthening = data.health === 'strengthening';
        const opacityValue = data.isSelected 
          ? (isStrengthening ? 0.85 : 0.45) 
          : (isStrengthening ? 0.12 : 0.06);
        const lineWidth = data.isSelected 
          ? (isStrengthening ? 2.2 : 1.2) 
          : (isStrengthening ? 0.6 : 0.3);

        return (
          <group key={idx}>
            <Line
              points={data.points as THREE.Vector3[]}
              color={data.color}
              lineWidth={lineWidth}
              dashed={!isStrengthening}
              dashScale={isStrengthening ? 0 : 35}
              dashSize={isStrengthening ? 0.5 : 0.15}
              gapSize={isStrengthening ? 0.5 : 0.85}
              transparent
              opacity={opacityValue + 0.15}
            />
            <DataPulse 
              curve={data.curve} 
              color={data.color} 
              speed={data.isSelected ? (isStrengthening ? 0.6 : 0.08) : 0.04} 
              size={data.isSelected ? (isStrengthening ? 0.02 : 0.012) : 0.008} 
            />
          </group>
        );
      })}
    </group>
  );
};

const Atmosphere = ({ presentationMode = false, lod = LOD_LEVEL.MACRO }: { presentationMode?: boolean, lod?: LOD_LEVEL }) => (
  <group>
    {/* Primary Atmosphere - Thicker halo */}
    <mesh scale={[1.12, 1.12, 1.12]}>
      <sphereGeometry args={[1.9, 64, 64]} />
      <meshBasicMaterial 
        color="#10b981" 
        transparent 
        opacity={presentationMode ? 0.25 : 0.15} 
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
    {/* Secondary Inner Atmosphere - More intense rim light */}
    <mesh scale={[1.05, 1.05, 1.05]}>
      <sphereGeometry args={[1.9, 64, 64]} />
      <meshBasicMaterial 
        color="#34d399" 
        transparent 
        opacity={presentationMode ? 0.2 : 0.12} 
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  </group>
);

const GlobeSphere = ({
  presentationMode = false,
  lod = LOD_LEVEL.MACRO,
  selectedStock = null,
  agentFocus = null,
  mapLayers = { hq: true, arcs: true, heatmap: true, satellite: false, borders: true },
  performanceMode = false,
}: {
  presentationMode?: boolean;
  lod?: LOD_LEVEL;
  selectedStock?: any | null;
  agentFocus?: any | null;
  mapLayers?: { hq: boolean; arcs: boolean; heatmap: boolean; satellite: boolean; borders: boolean };
  performanceMode?: boolean;
}) => {
  const { camera } = useThree();
  const [redrawCounter, setRedrawCounter] = useState(0);
  const triggerRedraw = () => setRedrawCounter((prev) => prev + 1);

  // References for tile cache and persistent canvas
  const tileCache = useRef<
    Map<string, { img: HTMLImageElement; loaded: boolean; lastAccess: number }>
  >(new Map());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  // State to track current zoom level and target focus coordinates
  const lastState = useRef({
    zoom: 2,
    lat: 0,
    lng: 0,
    cameraPos: new THREE.Vector3(),
  });

  const [focusLatLng, setFocusLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [tileZoom, setTileZoom] = useState(2);

  const geoJsonDataRef = useRef<any>(null);

  // Load geojson data on mount to support the vector land background layer
  useEffect(() => {
    let isMounted = true;
    const urls = [
      "/ne_110m_admin_0_countries.geojson",
      "https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson",
      "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson"
    ];

    const tryFetch = async () => {
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (isMounted) {
              geoJsonDataRef.current = data;
              triggerRedraw();
            }
            return;
          }
        } catch (e) {
          // ignore error and proceed to fallback
        }
      }
      console.warn("Tiled Globe GeoJSON load fallback: Failed to load from all sources");
    };

    tryFetch();

    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize canvas and CanvasTexture on mount
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 1024;
    canvasRef.current = canvas;

    const canvasTexture = new THREE.CanvasTexture(canvas);
    canvasTexture.colorSpace = THREE.SRGBColorSpace;
    canvasTexture.minFilter = THREE.LinearMipmapLinearFilter;
    canvasTexture.generateMipmaps = true;
    setTexture(canvasTexture);

    return () => {
      canvasTexture.dispose();
      tileCache.current.forEach((val) => {
        val.img.src = "";
      });
      tileCache.current.clear();
    };
  }, []);

  // Helper tile loading core
  const loadTile = (x: number, y: number, z: number, onLoaded: () => void) => {
    const key = `${z}/${x}/${y}`;
    if (tileCache.current.has(key)) {
      const cached = tileCache.current.get(key)!;
      cached.lastAccess = Date.now();
      if (cached.loaded) {
        return cached.img;
      }
      return null;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    const entry = {
      img,
      loaded: false,
      lastAccess: Date.now(),
    };
    tileCache.current.set(key, entry);

    img.onload = () => {
      entry.loaded = true;
      entry.lastAccess = Date.now();
      onLoaded();
    };

    img.onerror = () => {
      tileCache.current.delete(key);
    };

    img.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
    return null;
  };

  const pruneTileCache = () => {
    if (tileCache.current.size > 200) {
      const entries = Array.from(tileCache.current.entries());
      entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);
      const toDeleteCount = tileCache.current.size - 100;
      for (let i = 0; i < toDeleteCount; i++) {
        const [key, entry] = entries[i];
        entry.img.src = ""; // Cancel network fetch and free memory
        tileCache.current.delete(key);
      }
    }
  };

  // Monitor camera position and focus nodes in real-time
  useFrame(() => {
    let targetLat = 0;
    let targetLng = 0;

    if (selectedStock) {
      targetLat = selectedStock.lat;
      targetLng = selectedStock.lng;
    } else if (agentFocus) {
      targetLat = agentFocus.lat;
      targetLng = agentFocus.lng;
    } else {
      const dir = camera.position.clone().normalize();
      const phi = Math.acos(Math.max(-1, Math.min(1, dir.y)));
      const theta = Math.atan2(dir.z, -dir.x);
      
      targetLat = 90 - (phi * 180 / Math.PI);
      targetLng = (theta * 180 / Math.PI) - 180;
      while (targetLng < -180) targetLng += 360;
      while (targetLng > 180) targetLng -= 360;
    }

    const distance = camera.position.length();
    let targetZoom = 2;
    if (distance < 3.4) {
      targetZoom = 15;
    } else if (distance < 3.9) {
      targetZoom = 12;
    } else if (distance < 4.6) {
      targetZoom = 9;
    } else if (distance < 5.5) {
      targetZoom = 6;
    } else if (distance < 7.0) {
      targetZoom = 4;
    } else {
      targetZoom = 2;
    }

    const latDiff = Math.abs(targetLat - lastState.current.lat);
    const lngDiff = Math.abs(targetLng - lastState.current.lng);
    const zoomChanged = targetZoom !== lastState.current.zoom;

    if (zoomChanged || latDiff > 0.5 || lngDiff > 0.5) {
      lastState.current = {
        zoom: targetZoom,
        lat: targetLat,
        lng: targetLng,
        cameraPos: camera.position.clone(),
      };
      setTileZoom(targetZoom);
      setFocusLatLng({ lat: targetLat, lng: targetLng });
    }
  });

  // Redraw canvas whenever redraw is triggered, zoom updates, or focus updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !texture) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Clear with base ocean color
    ctx.fillStyle = presentationMode ? "#080c14" : "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Coordinate tiles loading sequence (Base Layer)
    const tilesToDraw: { x: number; y: number; z: number }[] = [];

    // Global Base Tiles at Zoom level 2
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        tilesToDraw.push({ x, y, z: 2 });
      }
    }

    // Micro Detailed Tiling at Zoom level tileZoom around focal camera coordinates or selected node
    if (focusLatLng && tileZoom > 2) {
      const center = latLngToTileXY(focusLatLng.lat, focusLatLng.lng, tileZoom);
      const n = Math.pow(2, tileZoom);
      const halfGrid = 2; // Paint 5x5 detailed bounds
      for (let dx = -halfGrid; dx <= halfGrid; dx++) {
        for (let dy = -halfGrid; dy <= halfGrid; dy++) {
          const tx = (center.x + dx + n) % n;
          const ty = center.y + dy;
          if (ty >= 0 && ty < n) {
            tilesToDraw.push({ x: tx, y: ty, z: tileZoom });
          }
        }
      }
    }

    // 3. Paint tiles to canvas
    tilesToDraw.forEach((tile) => {
      const img = loadTile(tile.x, tile.y, tile.z, triggerRedraw);
      if (img) {
        const bounds = tileXYToLatLngBounds(tile.x, tile.y, tile.z);
        const x_west = ((bounds.lng_west + 180) / 360) * canvas.width;
        const x_east = ((bounds.lng_east + 180) / 360) * canvas.width;
        const y_north = ((90 - bounds.lat_north) / 180) * canvas.height;
        const y_south = ((90 - bounds.lat_south) / 180) * canvas.height;

        const drawWidth = x_east - x_west;
        const drawHeight = y_south - y_north;

        ctx.save();
        // High-contrast deep satellite tactical look
        if (mapLayers.satellite) {
          ctx.filter = "none";
        } else {
          ctx.filter = "brightness(55%) contrast(145%) saturate(85%)";
        }
        ctx.drawImage(img, x_west, y_north, drawWidth, drawHeight);
        ctx.restore();
      }
    });

    // 4. Overlay vector borders (Top Layer)
    if (mapLayers.borders) {
      if (mapLayers.satellite) {
        // High-contrast outlines for satellite view
        ctx.fillStyle = "transparent";
        ctx.strokeStyle = "rgba(16, 185, 129, 0.8)";
        ctx.lineWidth = 1.0;
      } else {
        // Default solid tactical landmasses
        ctx.fillStyle = presentationMode ? "#334155" : "#1e293b"; 
        ctx.strokeStyle = presentationMode ? "rgba(16, 185, 129, 0.8)" : "rgba(16, 185, 129, 0.4)";
        ctx.lineWidth = 1.2;
      }

      const geoJson = geoJsonDataRef.current;
      if (geoJson && geoJson.features) {
        geoJson.features.forEach((feature: any) => {
          const { geometry } = feature;
          if (!geometry) return;
          const drawPolygon = (polygon: number[][][]) => {
            polygon.forEach((ring) => {
              if (ring.length === 0) return;
              ctx.beginPath();
              ring.forEach(([lng, lat], idx) => {
                const x = ((lng + 180) / 360) * canvas.width;
                const y = ((90 - lat) / 180) * canvas.height;
                if (idx === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              });
              if (!mapLayers.satellite) ctx.fill();
              ctx.stroke();
            });
          };
          if (geometry.type === "Polygon") {
            drawPolygon(geometry.coordinates);
          } else if (geometry.type === "MultiPolygon") {
            geometry.coordinates.forEach((polygon: any) => drawPolygon(polygon));
          }
        });
      }
    }

    texture.needsUpdate = true;
    pruneTileCache();
  }, [redrawCounter, focusLatLng, tileZoom, presentationMode, texture, mapLayers.satellite, mapLayers.borders]);

  return (
    <group>
      <mesh>
        <sphereGeometry args={[1.9, 64, 64]} />
        {texture ? (
          <meshPhongMaterial
            map={texture}
            transparent
            opacity={presentationMode ? 1 : 0.98}
            shininess={presentationMode ? 120 : (performanceMode ? 30 : 90)}
            specular={new THREE.Color(performanceMode ? "#000000" : "#475569")}
            emissive={new THREE.Color("#020617")}
            emissiveIntensity={0.2}
          />
        ) : (
          <meshPhongMaterial color="#020617" transparent opacity={0.8} shininess={30} />
        )}
      </mesh>

      <Atmosphere presentationMode={presentationMode} lod={lod} />
    </group>
  );
};

interface GeoJsonFeature {
  type: string;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: any;
  };
}

const parseBorders = (geoJson: any, radius: number): THREE.Vector3[][] => {
  const paths: THREE.Vector3[][] = [];
  if (!geoJson || !geoJson.features) return paths;

  geoJson.features.forEach((feature: GeoJsonFeature) => {
    const { geometry } = feature;
    if (!geometry) return;

    const addPolygon = (polygon: number[][][]) => {
      polygon.forEach((ring) => {
        const points: THREE.Vector3[] = [];
        ring.forEach(([lng, lat]) => {
          points.push(latLngToVector3(lat, lng, radius));
        });
        if (points.length > 1) {
          paths.push(points);
        }
      });
    };

    if (geometry.type === "Polygon") {
      addPolygon(geometry.coordinates);
    } else if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon: number[][][]) => {
        addPolygon(polygon);
      });
    }
  });

  return paths;
};

interface GlobeProps {
  selectedStock: Company | null;
  onSelectNode: (c: Company) => void;
  marketData?: Record<string, any>;
  newsData?: any[];
  sentiment?: any;
  showAllConnections?: boolean;
  networkAnchor?: Company | null;
  onInjectLiveNews?: () => void;
  activeCorridorId?: string | null;
  agentFocus?: any | null;
  agentEntities?: any[];
  viewportLock: boolean;
  setViewportLock: (val: boolean) => void;
  autoRotateEnabled: boolean;
  setAutoRotateEnabled: (val: boolean) => void;
  isNewsCyclingActive?: boolean;
  presentationMode?: boolean;
  mapLayers?: { hq: boolean; arcs: boolean; heatmap: boolean; satellite: boolean; borders: boolean };
}


const GlobeAgentEntitiesLayer = ({ entities, agentFocus }: { entities: any[], agentFocus: any | null }) => {
  return (
    <group>
      {entities.map((entity, idx) => {
        const pos = latLngToVector3(entity.coordinates[0], entity.coordinates[1], 2);
        const color = entity.type === "CONFLICT" ? "#ef4444" : entity.type === "CARGO" ? "#3b82f6" : "#10b981";
        
        // Arc between agent focus and entity
        let arc = null;
        if (agentFocus) {
          const startPos = latLngToVector3(agentFocus.lat, agentFocus.lng, 2.15);
          const midPoint = new THREE.Vector3().addVectors(startPos, pos).multiplyScalar(0.5);
          const distance = startPos.distanceTo(pos);
          midPoint.normalize().multiplyScalar(2.1 + distance * 0.2);
          const curve = new THREE.QuadraticBezierCurve3(startPos, midPoint, pos);
          arc = (
            <group>
              <Line 
                points={curve.getPoints(30) as THREE.Vector3[]} 
                color={color} 
                lineWidth={0.5} 
                transparent 
                opacity={0.3} 
              />
              <DataPulse curve={curve} color={color} speed={0.8} size={0.006} />
            </group>
          );
        }

        return (
          <group key={`entity-${entity.id || idx}`}>
            {arc}
            <group position={pos}>
              {/* Core Node */}
              <mesh>
                <sphereGeometry args={[0.015, 8, 8]} />
                <meshBasicMaterial color={color} />
              </mesh>
              
              {/* Outer Glow */}
              <mesh>
                <sphereGeometry args={[0.03, 8, 8]} />
                <meshBasicMaterial color={color} transparent opacity={0.2} />
              </mesh>

              {/* Entity Label */}
              <Html distanceFactor={4} position={[0, 0.03, 0]} center className="pointer-events-none select-none">
                <div className="bg-black/90 border border-white/20 px-1.5 py-0.5 rounded-sm shadow-[0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-md whitespace-nowrap min-w-[50px]">
                  <div className="flex items-center justify-between gap-1.5 mb-0.5 border-b border-white/5 pb-0.5">
                    <div className="text-[4.5px] text-zinc-500 font-mono tracking-widest uppercase">{entity.type}</div>
                    <div className={cn("w-0.5 h-0.5 rounded-full", color === "#ef4444" ? "bg-red-500" : color === "#3b82f6" ? "bg-blue-500" : "bg-emerald-500")} />
                  </div>
                  <div className="text-[6.5px] text-white font-black font-mono tracking-tight uppercase">{entity.name}</div>
                </div>
              </Html>
            </group>
          </group>
        );
      })}
    </group>
  );
};


// RotatingGroup defined later
const RotatingGroup = ({ 
  children, 
  autoRotate = true,
  presentationMode = false,
  groupRef
}: { 
  children: React.ReactNode; 
  autoRotate?: boolean;
  presentationMode?: boolean;
  networkAnchor?: Company | null;
  agentFocus?: any;
  groupRef?: React.RefObject<THREE.Group | null>;
}) => {
  const fallbackRef = useRef<THREE.Group>(null);
  const activeRef = groupRef || fallbackRef;

  useFrame((state, delta) => {
    if (activeRef.current && autoRotate) {
      activeRef.current.rotation.y += delta * (presentationMode ? 0.08 : 0.05);
    }
  });

  return <group ref={activeRef}>{children}</group>;
};

const CameraFocus = ({ 
  selectedStock, 
  agentFocus, 
  networkAnchor, 
  rotatingGroupRef 
}: { 
  selectedStock: Company | null; 
  agentFocus: any | null; 
  networkAnchor: Company | null; 
  rotatingGroupRef?: React.RefObject<THREE.Group | null>;
}) => {
  const { camera, controls } = useThree();
  const [transitionProgress, setTransitionProgress] = useState(0);

  const getTargetAndCameraPos = useMemo(() => {
    const anchor = selectedStock || networkAnchor || agentFocus;
    if (!anchor) return { localTarget: null, localCamera: null };

    const localTarget = latLngToVector3(anchor.lat, anchor.lng, 2);
    // User requested overhead, tight focus on the location itself, not framing connected companies
    const localCamera = localTarget.clone().multiplyScalar(1.3);

    return { localTarget, localCamera };
  }, [selectedStock, networkAnchor, agentFocus]);

  // Reset transition progress whenever the selected targets change to center him
  useEffect(() => {
    if (getTargetAndCameraPos.localTarget) {
      setTransitionProgress(0);
    }
  }, [getTargetAndCameraPos]);

  useFrame((state, delta) => {
    const anchor = selectedStock || networkAnchor || agentFocus;
    if (anchor && getTargetAndCameraPos.localTarget && getTargetAndCameraPos.localCamera) {
      const worldTarget = getTargetAndCameraPos.localTarget.clone();
      const worldCamera = getTargetAndCameraPos.localCamera.clone();

      if (rotatingGroupRef?.current) {
        rotatingGroupRef.current.updateMatrixWorld(true);
        worldTarget.applyMatrix4(rotatingGroupRef.current.matrixWorld);
        worldCamera.applyMatrix4(rotatingGroupRef.current.matrixWorld);
      }

      // @ts-ignore
      if (controls) {
        // Apply the offset (e.g., slightly shifted towards the visible area)
        // Adjusting based on user request "horizontal/vertical offset multiplier"
        const offset = new THREE.Vector3(0.3, 0.3, 0); 
        worldTarget.add(offset);
        
        // Lerp towards the worldTarget, not (0,0,0)
        // @ts-ignore
        controls.target.lerp(worldTarget, delta * 4); 

        if (transitionProgress < 1) {
          // Smoothly advance transition progress
          const nextProgress = transitionProgress + delta * 1.2;
          setTransitionProgress(Math.min(nextProgress, 1));

          // Only lerp camera position during the initial transition period
          camera.position.lerp(worldCamera, delta * 6); 
          
          if (nextProgress >= 1) {
             camera.position.copy(worldCamera);
          }
        }
        
        // Ensure controls are updated to reflect the new target position
        // @ts-ignore
        controls.update();
      }
    }
  });

  return null;
};

const GlobeAgentRepresentative = ({ agentFocus }: { agentFocus: any }) => {
  const droneRef = useRef<THREE.Group>(null);
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);

  const position = useMemo(() => {
    if (!agentFocus) return new THREE.Vector3(0, 0, 0);
    return latLngToVector3(agentFocus.lat, agentFocus.lng, 2.15); // Hover slightly above base
  }, [agentFocus]);

  useFrame((state) => {
    if (droneRef.current) {
      // Gentle bobbing motion
      droneRef.current.position.y = position.y + Math.sin(state.clock.elapsedTime * 3) * 0.015;
      droneRef.current.rotation.y += 0.02;
    }
    if (ringRef1.current) {
      ringRef1.current.rotation.x += 0.03;
      ringRef1.current.rotation.y += 0.01;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.y += 0.035;
      ringRef2.current.rotation.z += 0.02;
    }
  });

  if (!agentFocus) return null;

  return (
    <group position={position} ref={droneRef}>
      {/* 1. Core Drone Sphere Representative - glowing teal style */}
      <mesh>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#10b981" />
      </mesh>
      
      {/* 2. Outer Ring 1 */}
      <mesh ref={ringRef1}>
        <torusGeometry args={[0.07, 0.003, 8, 32]} />
        <meshBasicMaterial color="#34d399" transparent opacity={0.8} />
      </mesh>

      {/* 3. Outer Ring 2 (Perpendicular) */}
      <mesh ref={ringRef2}>
        <torusGeometry args={[0.08, 0.003, 8, 32]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.7} />
      </mesh>

      {/* 4. Scanning laser beam pointing straight down */}
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.002, 0.015, 0.2, 16]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.35} />
      </mesh>
    </group>
  );
};

const NewsBillboard = ({ 
  story, 
  company, 
  globalOpacity = 1 
}: { 
  story: any; 
  company: Company; 
  globalOpacity?: number;
}) => {
  const position = useMemo(() => latLngToVector3(company.lat, company.lng, 2.05), [company]);
  
  if (globalOpacity < 0.2) return null;

  const timeStr = story.published_at 
    ? new Date(story.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    : "LIVE_SIG";

  return (
    <group position={position}>
      {/* Visual glowing pin indicator */}
      <mesh>
        <sphereGeometry args={[0.02, 12, 12]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.9 * globalOpacity} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.15 * globalOpacity} />
      </mesh>
      
      {/* Interactive Floating HTML Billboard */}
      <Html 
        distanceFactor={4} 
        position={[0.1, 0.1, 0]}
        center={false}
        className="pointer-events-auto select-none font-mono scale-75 md:scale-90"
        zIndexRange={[0, 10]}
      >
        <div className="flex flex-col bg-black/95 border border-red-500/40 p-1.5 md:p-2 rounded-none w-32 md:w-36 shadow-[0_0_15px_rgba(239,68,68,0.15)] backdrop-blur-xl">
          {/* Corner Trim */}
          <div className="absolute -top-px -left-px w-2 h-2 border-t border-l border-red-500/80" />
          <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-red-500/80" />

          <div className="flex items-center justify-between border-b border-red-500/20 pb-1.5 mb-1.5 text-[7px] text-red-500 font-black tracking-[0.2em] uppercase">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
              </span>
              <span>ALERT</span>
            </div>
            <span className="text-zinc-600 font-mono tracking-normal">{timeStr}</span>
          </div>
          
          <div className="text-[9px] text-white font-black leading-tight uppercase line-clamp-3 tracking-tight mb-2">
            {story.intelligence?.translatedTitle || story.translatedTitle || story.headline || story.title || company.name}
          </div>

          <div className="flex items-center gap-1.5 pt-1.5 border-t border-red-500/10">
            <div className="flex flex-col">
               <div className="text-[5px] text-red-500/60 font-black uppercase tracking-widest leading-none">REF</div>
               <div className="text-[7px] text-zinc-100 font-black tracking-wider leading-none">{company.symbol}</div>
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
};

const GlobeCorridorsLayer = ({ 
  activeCorridorId, 
  onSelectNode 
}: { 
  activeCorridorId: string | null; 
  onSelectNode: (c: Company) => void;
}) => {
  const beacons = useMemo(() => {
    return CORRIDORS.map(c => {
      const pos = latLngToVector3(c.coords[0], c.coords[1], 2.01);
      const color = c.baseRisk > 80 ? "#ef4444" : c.baseRisk > 60 ? "#f59e0b" : "#10b981";
      return { ...c, pos, color };
    });
  }, []);

  const activeCorridor = CORRIDORS.find(c => c.id === activeCorridorId);
  
  const links = useMemo(() => {
    if (!activeCorridor) return [];
    return getCorridorHeadquartersLinks(activeCorridor);
  }, [activeCorridorId, activeCorridor]);

  return (
    <group>
      {/* 1. Pulsing Beacons */}
      {beacons.map(b => (
        <group key={`beacon-${b.id}`}>
          <mesh position={b.pos}>
            <sphereGeometry args={[0.02, 10, 10]} />
            <meshBasicMaterial color={b.color} />
          </mesh>
          <mesh position={b.pos}>
            <sphereGeometry args={[b.id === activeCorridorId ? 0.05 : 0.035, 10, 10]} />
            <meshBasicMaterial color={b.color} transparent opacity={0.2} />
          </mesh>
        </group>
      ))}

      {/* 2. Visual Arcs Connecting origin to hq */}
      {activeCorridor && links.map((link, idx) => {
        const startPos = latLngToVector3(link.fromCoords[0], link.fromCoords[1], 2);
        const endPos = latLngToVector3(link.toCoords[0], link.toCoords[1], 2);
        
        const midPoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
        const distance = startPos.distanceTo(endPos);
        midPoint.normalize().multiplyScalar(2 + distance * 0.25);

        const curve = new THREE.QuadraticBezierCurve3(startPos, midPoint, endPos);
        const pts = curve.getPoints(45);
        const arcColor = activeCorridor.baseRisk > 80 ? "#ef4444" : activeCorridor.baseRisk > 60 ? "#f59e0b" : "#10b981";

        return (
          <group key={`3d-corridor-${idx}`}>
            <Line
              points={pts as THREE.Vector3[]}
              color={arcColor}
              lineWidth={1.8}
              transparent
              opacity={0.85}
            />
            {/* Marching pulse along the curve representing rapid flow velocity */}
            <DataPulse curve={curve} color={arcColor} speed={0.4} size={0.012} />
          </group>
        );
      })}
    </group>
  );
};

const TargetReticle = ({ position, color = "#10b981" }: { position: THREE.Vector3, color?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useFrame((state) => {
    if (containerRef.current) {
      // Periodic tactical glitch
      const isGlitch = Math.sin(state.clock.elapsedTime * 20) > 0.96;
      containerRef.current.style.opacity = isGlitch ? "0.2" : "0.7";
      containerRef.current.style.transform = isGlitch ? "scale(1.1) skew(2deg)" : "scale(1) skew(0deg)";
    }
  });

  return (
    <group position={position}>
      <Html center className="pointer-events-none select-none z-50">
        <div ref={containerRef} className="relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center font-mono overflow-visible transition-all duration-75">
          {/* Main Reticle Outer Frame */}
          <div className="absolute inset-0 border border-emerald-500/30 rounded-full" />
          
          {/* Tactical HUD Frame */}
          <div className="relative w-14 h-14 md:w-16 md:h-16 border border-emerald-500/30 bg-emerald-950/10 flex items-center justify-center backdrop-blur-[1.5px]">
            {/* L-brackets */}
            <div className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 border-emerald-400" />
            <div className="absolute top-0 right-0 w-3 h-3 border-r-2 border-t-2 border-emerald-400" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-l-2 border-b-2 border-emerald-400" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 border-emerald-400" />
            
            {/* Center Crosshair */}
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_#10b981]" />
          </div>
          
          {/* Scanning lines */}
          <div className="absolute top-1/2 left-[-20%] right-[-20%] h-px bg-emerald-500/20" />
          <div className="absolute left-1/2 top-[-20%] bottom-[-20%] w-px bg-emerald-500/20" />
        </div>
      </Html>
    </group>
  );
};

const LODController = ({ onUpdate }: { onUpdate: (lod: LOD_LEVEL) => void }) => {
  const { camera } = useThree();
  const lastLod = useRef<LOD_LEVEL>(LOD_LEVEL.MACRO);

  useFrame(() => {
    const distance = camera.position.length();
    let currentLod = LOD_LEVEL.MACRO;

    if (distance < 3.8) {
      currentLod = LOD_LEVEL.MICRO;
    } else if (distance < 5.2) {
      currentLod = LOD_LEVEL.REGIONAL;
    }

    if (currentLod !== lastLod.current) {
      lastLod.current = currentLod;
      onUpdate(currentLod);
    }
  });

  return null;
};


const GlobeHeatmap = ({ marketData, newsData, companies }: { marketData: any, newsData: any[], companies: Company[] }) => {
  const heatmapPoints = useMemo(() => {
    return companies.map(c => {
      const quote = marketData[c.symbol];
      const volatility = quote ? Math.abs(parseFloat(quote.dp) || 0) : 0;
      const companyNewsCount = (newsData || []).filter(n => n.symbol === c.symbol).length;
      const weight = Math.min(1, 0.1 + (volatility / 5) + (companyNewsCount / 8));
      
      if (weight < 0.2) return null;
      
      return {
        pos: latLngToVector3(c.lat, c.lng, 2.01),
        weight,
        color: volatility > 3 ? "#ef4444" : volatility > 1 ? "#f59e0b" : "#10b981"
      };
    }).filter(p => p !== null);
  }, [marketData, newsData, companies]);

  return (
    <group>
      {heatmapPoints.map((p, i) => (
        <mesh key={i} position={p!.pos}>
          <sphereGeometry args={[0.04 * p!.weight, 16, 16]} />
          <meshBasicMaterial color={p!.color} transparent opacity={0.3 * p!.weight} />
          <pointLight distance={0.4} intensity={0.5 * p!.weight} color={p!.color} />
        </mesh>
      ))}
    </group>
  );
};

export const Globe: React.FC<GlobeProps> = ({ 
  selectedStock, 
  onSelectNode,
  marketData = {},
  newsData = [],
  sentiment,
  showAllConnections = false,
  networkAnchor = null,
  onInjectLiveNews,
  activeCorridorId = null,
  agentFocus = null,
  agentEntities = [],
  viewportLock,
  setViewportLock,
  autoRotateEnabled,
  setAutoRotateEnabled,
  isNewsCyclingActive = false,
  presentationMode = false,
  mapLayers = { hq: true, arcs: true, heatmap: true, satellite: false, borders: true }
}) => {
  const { companies } = useCompanies();
  const rotatingGroupRef = useRef<THREE.Group>(null);
  const [lod, setLod] = useState<LOD_LEVEL>(LOD_LEVEL.MACRO);
  const [geoJsonData, setGeoJsonData] = React.useState<any>(null);
  const [countryPaths, setCountryPaths] = React.useState<THREE.Vector3[][]>([]);
  const [statePaths, setStatePaths] = React.useState<THREE.Vector3[][]>([]);
  const [loadedTexture, setLoadedTexture] = React.useState<THREE.Texture | null>(null);

  // Sync viewport lock when stock selected
  useEffect(() => {
    if (selectedStock) {
      setViewportLock(true);
    }
  }, [selectedStock]);

  // Transition opacity for seamless fading out when Corporate Network layout is active
  const [vesselOpacity, setVesselOpacity] = React.useState(showAllConnections ? 0 : 1);
  useEffect(() => {
    setVesselOpacity(showAllConnections ? 0 : 1);
  }, [showAllConnections]);

  useEffect(() => {
    let isMounted = true;

    const countryUrls = [
      "/ne_110m_admin_0_countries.geojson",
      "https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson",
      "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson"
    ];

    const stateUrls = [
      "/ne_110m_admin_1_states_provinces.geojson",
      "https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_1_states_provinces.geojson",
      "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_1_states_provinces.geojson"
    ];

    const loadCountries = async () => {
      for (const url of countryUrls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (isMounted) {
              setGeoJsonData(data);
              setCountryPaths(parseBorders(data, 1.905));
            }
            return;
          }
        } catch (e) {
          // proceed to next fallback
        }
      }
      console.warn("Could not load country boundaries from any mirror source.");
    };

    const loadStates = async () => {
      for (const url of stateUrls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (isMounted) {
              setStatePaths(parseBorders(data, 1.903));
            }
            return;
          }
        } catch (e) {
          // proceed to next fallback
        }
      }
      console.warn("Could not load state boundaries from any mirror source.");
    };

    loadCountries();
    loadStates();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    new THREE.TextureLoader().load(
      'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        setLoadedTexture(texture);
      },
      (error) => {
        console.error("Texture load error", error);
      }
    );
  }, []);

  return (
    <div className={cn("w-full h-full relative", presentationMode ? "bg-zinc-950" : "bg-black")}>
      <Canvas dpr={[1, 2]} gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={[0, 0, presentationMode ? 8.2 : 5.8]} fov={32} />
        <LODController onUpdate={setLod} />
        {(viewportLock || networkAnchor || isNewsCyclingActive) && !presentationMode && <CameraFocus selectedStock={selectedStock} agentFocus={agentFocus} networkAnchor={networkAnchor} rotatingGroupRef={rotatingGroupRef} />}
        <OrbitControls 
          enablePan={false} 
          enableZoom={false} 
          enableRotate={false}
          enableDamping={true}
          dampingFactor={0.08}
          rotateSpeed={0.8}
          minDistance={2.2} 
          maxDistance={100}
        />
        
        <ambientLight intensity={presentationMode ? 1.5 : 0.5} />
        <pointLight position={[10, 10, 10]} intensity={presentationMode ? 2.5 : 1} color="#ffffff" />
        <pointLight position={[-10, -10, -10]} intensity={presentationMode ? 1 : 0.5} color="#44ff44" />
        
        {/* <Stars radius={100} depth={50} count={5000} factor={4} saturation={0.5} fade speed={1} /> */}
        
        <RotatingGroup 
          autoRotate={autoRotateEnabled && !isNewsCyclingActive && !networkAnchor && (!viewportLock || (!selectedStock && !agentFocus))}
          presentationMode={presentationMode}
          networkAnchor={networkAnchor}
          agentFocus={agentFocus}
          groupRef={rotatingGroupRef}
        >
          <ambientLight intensity={0.5} />
          <pointLight position={[5, 5, 5]} intensity={1} />
          <GlobeSphere presentationMode={presentationMode} lod={lod} selectedStock={selectedStock} agentFocus={agentFocus} mapLayers={mapLayers} />
          
          {/* Render parsed boundaries */}
          <group>
            {mapLayers.borders && (
              <>
                {/* International Country Borders */}
                {countryPaths.map((points, i) => (
                  <Line
                    key={`country-border-${i}`}
                    points={points}
                    color={presentationMode ? "#64748b" : "#475569"}
                    lineWidth={presentationMode ? 0.8 : 0.6}
                    transparent
                    opacity={presentationMode ? 0.6 : 0.4}
                  />
                ))}
                {/* Domestic State/Province Borders - Layered LOD */}
                {lod >= LOD_LEVEL.REGIONAL && statePaths.map((points, i) => (
                  <Line
                    key={`state-border-${i}`}
                    points={points}
                    color={presentationMode ? "#475569" : "#475569"}
                    lineWidth={0.4}
                    transparent
                    opacity={lod === LOD_LEVEL.REGIONAL ? 0.2 : 0.4}
                  />
                ))}
              </>
            )}
          </group>

          <DataPoints count={presentationMode ? 70 : 150} />
          
          {mapLayers.hq && (
            <GlobePoints 
              companies={companies} 
              selectedSymbol={selectedStock?.symbol} 
              onSelect={onSelectNode} 
              marketData={marketData}
              newsData={newsData}
              sentiment={sentiment}
              isNewsCyclingActive={isNewsCyclingActive}
              viewportLock={viewportLock}
              presentationMode={presentationMode}
              showAllConnections={showAllConnections}
              networkAnchor={networkAnchor}
              lod={lod}
            />
          )}

          {!presentationMode && (
            <>
              {mapLayers.arcs && (
                <SupplyArcs 
                  selectedStock={selectedStock} 
                  companies={companies} 
                  showAllConnections={showAllConnections}
                  networkAnchor={networkAnchor}
                  lod={lod}
                />
              )}
              {mapLayers.heatmap && (
                <GlobeHeatmap marketData={marketData} newsData={newsData} companies={companies} />
              )}
              <GlobeCorridorsLayer 
                activeCorridorId={activeCorridorId} 
                onSelectNode={onSelectNode} 
              />
            </>
          )}

          {/* Pinned News Headlines on the 3D globe linked to respective company location */}
          {!presentationMode && newsData && newsData.slice(0, 1).map((story, idx) => {
            const company = companies.find(c => c.symbol === story.symbol);
            if (!company || isNewsCyclingActive || viewportLock) return null;
            return (
              <NewsBillboard 
                key={`globe-news-${idx}-${story.published_at || idx}`} 
                story={story} 
                company={company} 
                globalOpacity={vesselOpacity}
              />
            );
          })}

          {!presentationMode && selectedStock && !isNewsCyclingActive && (
            <TargetReticle 
              position={latLngToVector3(selectedStock.lat, selectedStock.lng, 2.05)} 
              color={sentiment?.score > 0.3 ? "#10b981" : sentiment?.score < -0.3 ? "#ef4444" : "#3b82f6"}
            />
          )}

          {!presentationMode && agentFocus && (
            <GlobeAgentRepresentative agentFocus={agentFocus} />
          )}
          {!presentationMode && agentEntities.length > 0 && (
            <GlobeAgentEntitiesLayer entities={agentEntities} agentFocus={agentFocus} />
          )}
        </RotatingGroup>

        <EffectComposer>
          <Bloom 
            intensity={2.2} 
            luminanceThreshold={0.7} 
            luminanceSmoothing={0.05} 
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
};
