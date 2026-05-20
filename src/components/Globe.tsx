import React, { useEffect, useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Stars, Line, Html } from "@react-three/drei";
import * as THREE from "three";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { COMPANIES, Company } from "../data/companies";

// Helper to convert lat/lng to 3D coordinates on a sphere
const latLngToVector3 = (lat: number, lng: number, radius: number) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
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
      groupRef.current.rotation.y += 0.0003;
      groupRef.current.rotation.x += 0.0001;
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

const ActivityPulse = ({ 
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
      const speed = 1 + activityScore * 8;
      const scale = 1 + Math.sin(state.clock.elapsedTime * speed) * (0.05 + activityScore * 0.2);
      meshRef.current.scale.set(scale, scale, scale);
    }
    if (glowRef.current) {
      // @ts-ignore
      glowRef.current.material.opacity = 0.1 + (Math.sin(state.clock.elapsedTime * 2) + 1) * 0.1 * (1 + activityScore);
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
        <sphereGeometry args={[isSelected ? 0.045 : (nodeColor ? 0.025 : 0.015), 16, 16]} />
        <meshBasicMaterial 
          color={isSelected ? baseColor : activeColor} 
          transparent 
          opacity={isSelected ? 1 : (nodeColor ? 0.7 : 0.4 + activityScore * 0.4)}
        />
      </mesh>
      
      {(activityScore > 0.2 || isSelected || nodeColor) && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[isSelected ? 0.09 : (nodeColor ? 0.05 : 0.04), 16, 16]} />
          <meshBasicMaterial 
            color={activeColor} 
            transparent 
            opacity={0.15} 
          />
        </mesh>
      )}
    </group>
  );
};

const GlobePoints = ({ 
  companies, 
  selectedSymbol, 
  onSelect,
  marketData = {},
  newsData = [],
  sentiment
}: { 
  companies: Company[]; 
  selectedSymbol?: string; 
  onSelect: (c: Company) => void;
  marketData?: Record<string, any>;
  newsData?: any[];
  sentiment?: any;
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001;
    }
    if (ringRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.1;
      ringRef.current.scale.set(scale, scale, 1);
    }
  });

  const selectedCompany = selectedSymbol ? companies.find(c => c.symbol === selectedSymbol) : null;

  return (
    <group>
      {companies.map((company) => {
        const position = latLngToVector3(company.lat, company.lng, 2);
        const isSelected = company.symbol === selectedSymbol;
        
        // Multi-tier supply chain vectors color coding
        const isUpstream = selectedCompany && company.partners?.includes(selectedCompany.symbol);
        const isDownstream = selectedCompany && selectedCompany.partners?.includes(company.symbol);
        
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
        const companyNewsCount = newsData.filter(n => n.symbol === company.symbol).length;
        const activityScore = Math.min(1, (volatility / 5) + (companyNewsCount / 10));

        return (
          <group key={company.symbol} onClick={(e) => {
            e.stopPropagation();
            onSelect(company);
          }}>
            <ActivityPulse 
              position={position} 
              activityScore={activityScore} 
              isSelected={isSelected} 
              sentimentScore={isSelected ? sentiment?.score : undefined}
              nodeColor={nodeColor}
            />
            {isSelected && (
              <group position={position}>
                <mesh ref={ringRef}>
                  <ringGeometry args={[0.06, 0.07, 32]} />
                  <meshBasicMaterial 
                    color={nodeColor || "#10b981"} 
                    transparent 
                    opacity={0.5} 
                    side={THREE.DoubleSide} 
                  />
                </mesh>
              </group>
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
  size = 0.015
}: { 
  curve: THREE.QuadraticBezierCurve3;
  color?: string;
  speed?: number;
  size?: number;
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
      <meshBasicMaterial color={color} />
      <pointLight distance={0.5} intensity={0.5} color={color} />
    </mesh>
  );
};

const SupplyArcs = ({ 
  selectedStock, 
  companies,
  showAllConnections = false
}: { 
  selectedStock: Company | null; 
  companies: Company[];
  showAllConnections?: boolean;
}) => {
  // Hardcoded check so this multi-tier connection mapping logic ONLY executes when the projection mode is GLOBE_3D
  const projectionMode: 'GLOBE_3D' | 'MAP_2D' = 'GLOBE_3D';
  if (projectionMode !== 'GLOBE_3D') {
    return null;
  }

  const arcData = useMemo(() => {
    const list = showAllConnections ? companies : (selectedStock ? [selectedStock] : []);
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
        isSelected: selectedStock && (fromStock.symbol === selectedStock.symbol || toStock.symbol === selectedStock.symbol)
      });
    };

    if (showAllConnections) {
      companies.forEach(fromStock => {
        if (!fromStock.partners) return;
        fromStock.partners.forEach(pSymbol => {
          const toStock = companies.find(c => c.symbol === pSymbol);
          if (!toStock) return;

          let relationType: 'upstream' | 'downstream' | 'general' = 'general';
          if (selectedStock) {
            const isUp = selectedStock.partners?.includes(fromStock.symbol);
            const isDown = fromStock.partners?.includes(selectedStock.symbol);
            if (fromStock.symbol === selectedStock.symbol) {
              relationType = 'downstream';
            } else if (toStock.symbol === selectedStock.symbol) {
              relationType = 'upstream';
            }
          }
          addArc(fromStock, toStock, relationType);
        });
      });
    } else if (selectedStock) {
      // 1. Outbound vectors of selectedStock (Downstream layout)
      if (selectedStock.partners) {
        selectedStock.partners.forEach(pSymbol => {
          const toStock = companies.find(c => c.symbol === pSymbol);
          if (toStock) {
            addArc(selectedStock, toStock, 'downstream');
          }
        });
      }

      // 2. Inbound vectors of selectedStock (Upstream layout)
      companies.forEach(fromStock => {
        if (fromStock.partners?.includes(selectedStock.symbol)) {
          addArc(fromStock, selectedStock, 'upstream');
        }
      });
    }
    
    return arcs;
  }, [selectedStock, companies, showAllConnections]);

  return (
    <group>
      {arcData.map((data, idx) => {
        const isStrengthening = data.health === 'strengthening';
        const opacityValue = data.isSelected 
          ? (isStrengthening ? 0.85 : 0.35) 
          : (isStrengthening ? 0.35 : 0.15);
        const lineWidth = data.isSelected 
          ? (isStrengthening ? 2.0 : 1.0) 
          : (isStrengthening ? 0.8 : 0.4);

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
              opacity={opacityValue}
            />
            {data.isSelected && isStrengthening && (
              <DataPulse curve={data.curve} color={data.color} speed={0.45} size={0.016} />
            )}
            {data.isSelected && !isStrengthening && (
              <DataPulse curve={data.curve} color={data.color} speed={0.03} size={0.008} />
            )}
          </group>
        );
      })}
    </group>
  );
};

const GlobeSphere = ({ texture }: { texture: THREE.CanvasTexture | null }) => {
  return (
    <group>
      {/* Ocean/Water Body with dynamic land/ocean texture */}
      <mesh>
        <sphereGeometry args={[1.9, 64, 64]} />
        {texture ? (
          <meshPhongMaterial 
            map={texture}
            transparent
            opacity={0.8}
            shininess={10}
          />
        ) : (
          <meshPhongMaterial 
            color="#1e293b" 
            transparent
            opacity={0.8}
            shininess={10}
          />
        )}
      </mesh>
      
      {/* Grid segments matched to dark grey theme */}
      <mesh>
        <sphereGeometry args={[1.98, 30, 30]} />
        <meshBasicMaterial color="#475569" wireframe transparent opacity={0.06} />
      </mesh>

      {/* Outer Glow in subtle contrasting grey */}
      <mesh>
        <sphereGeometry args={[2.05, 32, 32]} />
        <meshBasicMaterial color="#4b5563" transparent opacity={0.03} side={THREE.BackSide} />
      </mesh>
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
  onInjectLiveNews?: () => void;
}

export interface Vessel {
  id: string;
  name: string;
  type: string;
  coordinates: [number, number];
  heading: number;
  speed: number;
  status: string;
}

const mockVesselRegistry: Vessel[] = [
  { id: "V-101", name: "PACIFIC_TITAN", type: "Cargo", coordinates: [34.5, 155.0], heading: 85, speed: 18.4, status: "Transit" },
  { id: "V-102", name: "ATLANTIC_MARINER", type: "Container", coordinates: [42.1, -35.2], heading: 270, speed: 21.0, status: "Transit" },
  { id: "V-103", name: "SUEZ_CHIEF", type: "Tanker", coordinates: [29.8, 32.6], heading: 180, speed: 12.5, status: "Transit" },
  { id: "V-104", name: "MALACCA_PIONEER", type: "Container", coordinates: [1.8, 102.3], heading: 135, speed: 19.8, status: "Transit" },
  { id: "V-105", name: "PANAMA_VALOUR", type: "Cargo", coordinates: [9.1, -79.7], heading: 315, speed: 8.0, status: "Anchored" },
  { id: "V-106", name: "GIBRALTAR_SENTRY", type: "Tanker", coordinates: [35.9, -5.4], heading: 90, speed: 14.2, status: "Transit" },
  { id: "V-107", name: "HORN_NAVIGATOR", type: "Cargo", coordinates: [-34.5, 18.2], heading: 275, speed: 16.5, status: "Transit" },
  { id: "V-108", name: "ADEN_EXPRESS", type: "Container", coordinates: [12.4, 43.5], heading: 310, speed: 22.1, status: "Transit" },
  { id: "V-109", name: "ENGLISH_ROVER", type: "Cargo", coordinates: [50.2, -1.2], heading: 75, speed: 15.0, status: "Transit" },
  { id: "V-110", name: "TOKYO_VOYAGER", type: "Tanker", coordinates: [33.8, 140.5], heading: 210, speed: 13.8, status: "Transit" },
  { id: "V-111", name: "SINGAPORE_STAR", type: "Container", coordinates: [1.2, 103.9], heading: 0, speed: 0.0, status: "Anchored" },
  { id: "V-112", name: "ROTTERDAM_GIANT", type: "Container", coordinates: [52.2, 4.1], heading: 180, speed: 11.2, status: "Transit" },
  { id: "V-113", name: "RED_SEA_TRADER", type: "Cargo", coordinates: [23.5, 37.2], heading: 345, speed: 17.1, status: "Transit" },
  { id: "V-114", name: "CALIFORNIA_WAVE", type: "Tanker", coordinates: [32.5, -120.4], heading: 160, speed: 15.4, status: "Transit" },
  { id: "V-115", name: "CARIBBEAN_QUEEN", type: "Cargo", coordinates: [15.2, -75.5], heading: 45, speed: 14.8, status: "Transit" },
  { id: "V-116", name: "PERSIAN_MAJESTY", type: "Tanker", coordinates: [26.4, 52.8], heading: 120, speed: 13.0, status: "Transit" },
  { id: "V-117", name: "INDIAN_OCEAN_GEM", type: "Cargo", coordinates: [-5.0, 80.0], heading: 90, speed: 16.0, status: "Transit" },
  { id: "V-118", name: "TASMAN_CLIPPER", type: "Container", coordinates: [-38.2, 160.4], heading: 195, speed: 20.5, status: "Transit" },
  { id: "V-119", name: "BOSPHORUS_BARON", type: "Cargo", coordinates: [41.2, 29.1], heading: 205, speed: 9.5, status: "Transit" },
  { id: "V-120", name: "SHANGHAI_PILOT", type: "Container", coordinates: [30.9, 122.5], heading: 0, speed: 0.0, status: "Anchored" }
];

const VesselNode = ({
  vessel,
  isSelected,
  onSelect,
  onHover,
  onHoverOut,
  globalOpacity = 1
}: {
  vessel: Vessel;
  isSelected: boolean;
  onSelect: () => void;
  onHover: (e: any) => void;
  onHoverOut: () => void;
  globalOpacity: number;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const position = useMemo(() => latLngToVector3(vessel.coordinates[0], vessel.coordinates[1], 1.91), [vessel.coordinates]);
  
  const quat = useMemo(() => {
    const normal = position.clone().normalize();
    const qNorm = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    const qHeading = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -(vessel.heading * Math.PI) / 180);
    return qNorm.multiply(qHeading);
  }, [position, vessel.heading]);

  const color = useMemo(() => {
    if (vessel.status === "Anchored") return '#64748b'; // Dim gray
    if (vessel.type === "Cargo" || vessel.type === "Container") return '#06b6d4'; // Cyan
    if (vessel.type === "Tanker") return '#f59e0b'; // Warning Amber
    return '#06b6d4';
  }, [vessel.type, vessel.status]);

  useFrame((state) => {
    if (groupRef.current && vessel.status === "Transit" && globalOpacity > 0.05) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.08;
      groupRef.current.scale.set(scale, scale, scale);
    }
  });

  if (globalOpacity < 0.05) return null;

  return (
    <group 
      ref={groupRef}
      position={position}
      quaternion={quat}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(e);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHoverOut();
      }}
    >
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.015, 0.045, 3]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={vessel.status === "Anchored" ? 0.3 * globalOpacity : 0.8 * globalOpacity} 
        />
      </mesh>
      
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.035, 0.045, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.6 * globalOpacity} />
        </mesh>
      )}
    </group>
  );
};

const RotatingGroup = ({ 
  children, 
  autoRotate = true 
}: { 
  children: React.ReactNode; 
  autoRotate?: boolean 
}) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += 0.001;
    }
  });

  return <group ref={groupRef}>{children}</group>;
};

const CameraFocus = ({ selectedStock }: { selectedStock: Company | null }) => {
  const { camera, controls } = useThree();
  const targetPos = useMemo(() => {
    if (!selectedStock) return null;
    const pos = latLngToVector3(selectedStock.lat, selectedStock.lng, 2);
    return pos.clone().multiplyScalar(2.5); // Move camera back a bit from the surface
  }, [selectedStock]);

  useFrame((state, delta) => {
    if (targetPos) {
       camera.position.lerp(targetPos, delta * 2);
       // @ts-ignore
       if (controls) {
         // @ts-ignore
         controls.target.lerp(new THREE.Vector3(0, 0, 0), delta * 2);
       }
    }
  });

  return null;
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
  const [pulse, setPulse] = React.useState(true);
  
  useEffect(() => {
    const int = setInterval(() => {
      setPulse(p => !p);
    }, 1500);
    return () => clearInterval(int);
  }, []);

  if (globalOpacity < 0.2) return null;

  const timeStr = story.published_at 
    ? new Date(story.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : "LIVE";

  return (
    <group position={position}>
      {/* Visual glowing pin indicator */}
      <mesh>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.9 * globalOpacity} />
      </mesh>
      
      {/* Interactive Floating HTML Billboard */}
      <Html 
        distanceFactor={4} 
        position={[0, 0.05, 0]}
        center
        className="pointer-events-auto select-none font-mono"
      >
        <div className={`flex flex-col bg-black/95 border border-red-500/40 p-1.5 rounded-sm w-44 shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all duration-300 ${pulse ? 'border-red-500/70' : 'border-red-500/30'}`}>
          <div className="flex items-center justify-between border-b border-red-950 pb-1 mb-1 text-[6px] text-red-500 font-bold tracking-wider">
            <span>[NEWS_UPLINK]</span>
            <span className="animate-pulse flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
              {timeStr}
            </span>
          </div>
          <div className="text-[7.5px] text-white font-bold leading-tight uppercase line-clamp-2">
            {story.intelligence?.translatedTitle || story.title}
          </div>
          <div className="text-[5.5px] text-zinc-500 mt-1 flex justify-between items-center">
            <span>REF: {company.symbol}</span>
            <span>[{company.lat.toFixed(1)}N, {company.lng.toFixed(1)}W]</span>
          </div>
        </div>
      </Html>
    </group>
  );
};

export const Globe: React.FC<GlobeProps> = ({ 
  selectedStock, 
  onSelectNode,
  marketData,
  newsData,
  sentiment,
  showAllConnections = false,
  onInjectLiveNews
}) => {
  const [geoJsonData, setGeoJsonData] = React.useState<any>(null);
  const [countryPaths, setCountryPaths] = React.useState<THREE.Vector3[][]>([]);
  const [statePaths, setStatePaths] = React.useState<THREE.Vector3[][]>([]);

  // State for vessel selections and tooltips
  const [hoveredVessel, setHoveredVessel] = React.useState<Vessel | null>(null);
  const [hoveredPos, setHoveredPos] = React.useState<{ x: number; y: number } | null>(null);
  const [selectedVessel, setSelectedVessel] = React.useState<Vessel | null>(null);

  // Gimbal and navigation unlocked states
  const [viewportLock, setViewportLock] = React.useState(false);
  const [autoRotateEnabled, setAutoRotateEnabled] = React.useState(true);

  // Transition opacity for seamless fading out when Corporate Network layout is active
  const [vesselOpacity, setVesselOpacity] = React.useState(showAllConnections ? 0 : 1);
  useEffect(() => {
    let active = true;
    const target = showAllConnections ? 0 : 1;
    let prevTime = performance.now();
    
    const animate = () => {
      if (!active) return;
      const now = performance.now();
      const dt = (now - prevTime) / 1000;
      prevTime = now;
      
      setVesselOpacity(prev => {
        const diff = target - prev;
        if (Math.abs(diff) < 0.02) return target;
        return prev + diff * Math.min(1, dt * 8);
      });
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    return () => {
      active = false;
    };
  }, [showAllConnections]);

  useEffect(() => {
    let isMounted = true;

    // Fetch Countries (low resolution 110m is perfect for performance and loads under 200ms)
    fetch("https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson")
      .then((res) => {
        if (!res.ok) throw new Error("Status: " + res.status);
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setGeoJsonData(data);
          setCountryPaths(parseBorders(data, 1.905));
        }
      })
      .catch((err) => console.error("Globe country boundaries load failure:", err));

    // Fetch States/Provinces (admin 1 level)
    fetch("https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_1_states_provinces.geojson")
      .then((res) => {
        if (!res.ok) throw new Error("Status: " + res.status);
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setStatePaths(parseBorders(data, 1.903));
        }
      })
      .catch((err) => console.error("Globe state boundaries load failure:", err));

    return () => {
      isMounted = false;
    };
  }, []);

  const globeTexture = useMemo(() => {
    if (!geoJsonData) return null;
    
    // Create an offscreen canvas
    const width = 2048;
    const height = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // 1. STYLING (OCEAN): deep, dark charcoal
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    // 2. STYLING (LAND & BORDERS): slate gray lands and low-opacity borders
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "rgba(71, 85, 105, 0.4)";
    ctx.lineWidth = 1.0;

    if (geoJsonData.features) {
      geoJsonData.features.forEach((feature: any) => {
        const { geometry } = feature;
        if (!geometry) return;

        const drawPolygon = (polygon: number[][][]) => {
          polygon.forEach((ring) => {
            if (ring.length === 0) return;
            ctx.beginPath();
            ring.forEach(([lng, lat], idx) => {
              const x = ((lng + 180) / 360) * width;
              const y = ((90 - lat) / 180) * height;
              if (idx === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            });
            ctx.fill();
            ctx.stroke();
          });
        };

        if (geometry.type === "Polygon") {
          drawPolygon(geometry.coordinates);
        } else if (geometry.type === "MultiPolygon") {
          geometry.coordinates.forEach((polygon: number[][][]) => {
            drawPolygon(polygon);
          });
        }
      });
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [geoJsonData]);

  return (
    <div className="w-full h-full bg-black relative">
      <Canvas dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 6]} fov={45} />
        {viewportLock && <CameraFocus selectedStock={selectedStock} />}
        <OrbitControls 
          enablePan={false} 
          enableZoom={true} 
          minDistance={3} 
          maxDistance={10}
        />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#44ff44" />
        
        <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
        
        <RotatingGroup autoRotate={autoRotateEnabled && (!viewportLock || (!selectedStock && !selectedVessel))}>
          <GlobeSphere texture={globeTexture} />
          
          {/* Render parsed boundaries */}
          <group>
            {/* International Country Borders */}
            {countryPaths.map((points, i) => (
              <Line
                key={`country-border-${i}`}
                points={points}
                color="#475569"
                lineWidth={0.6}
                transparent
                opacity={0.4}
              />
            ))}
            {/* Domestic State/Province Borders */}
            {statePaths.map((points, i) => (
              <Line
                key={`state-border-${i}`}
                points={points}
                color="#475569"
                lineWidth={0.4}
                transparent
                opacity={0.4}
              />
            ))}
          </group>

          <DataPoints />
          <GlobePoints 
            companies={COMPANIES} 
            selectedSymbol={selectedStock?.symbol} 
            onSelect={onSelectNode} 
            marketData={marketData}
            newsData={newsData}
          />
          {mockVesselRegistry.map((vessel) => (
            <VesselNode
              key={vessel.id}
              vessel={vessel}
              isSelected={selectedVessel?.id === vessel.id}
              onSelect={() => setSelectedVessel(vessel)}
              onHover={(e) => {
                setHoveredVessel(vessel);
                setHoveredPos({ x: e.clientX, y: e.clientY });
              }}
              onHoverOut={() => setHoveredVessel(null)}
              globalOpacity={vesselOpacity}
            />
          ))}
          <SupplyArcs 
            selectedStock={selectedStock} 
            companies={COMPANIES} 
            showAllConnections={showAllConnections}
          />

          {/* Pinned News Headlines on the 3D globe linked to respective company location */}
          {newsData && newsData.slice(0, 1).map((story, idx) => {
            const company = COMPANIES.find(c => c.symbol === story.symbol);
            if (!company) return null;
            return (
              <NewsBillboard 
                key={`globe-news-${idx}-${story.published_at || idx}`} 
                story={story} 
                company={company} 
                globalOpacity={vesselOpacity}
              />
            );
          })}
        </RotatingGroup>

        <EffectComposer>
          <Bloom 
            intensity={1.0} 
            luminanceThreshold={0.9} 
            luminanceSmoothing={0.025} 
          />
        </EffectComposer>
      </Canvas>

      {/* Telemetry Tooltip popup */}
      {hoveredVessel && vesselOpacity > 0.1 && (
        <div 
          className="absolute z-50 pointer-events-none bg-black/95 border border-cyan-500/40 p-3 font-mono text-[9px] w-56 shadow-[0_0_15px_rgba(6,182,212,0.25)] rounded-sm"
          style={{
            left: hoveredPos ? `${hoveredPos.x + 15}px` : "50%",
            top: hoveredPos ? `${hoveredPos.y - 15}px` : "50%",
            transform: "translate(0, -50%)",
          }}
        >
          <div className="flex items-center justify-between border-b border-cyan-950 pb-1.5 mb-1.5">
            <span className="text-cyan-405 font-bold tracking-wider">{hoveredVessel.name}</span>
            <span className="text-[7.5px] bg-cyan-950/80 px-1 py-0.5 text-cyan-300 font-bold border border-cyan-800/30 uppercase rounded-sm">{hoveredVessel.type}</span>
          </div>
          
          <div className="space-y-1 text-zinc-400 text-[8px] tracking-tight">
            <div className="flex justify-between">
              <span className="text-zinc-500">SHIP_ID:</span>
              <span className="text-white font-bold">{hoveredVessel.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">COORDS:</span>
              <span className="text-white">[{hoveredVessel.coordinates[0].toFixed(3)}N, {hoveredVessel.coordinates[1].toFixed(3)}E]</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">SPEED / HDG:</span>
              <span className="text-white font-bold">{hoveredVessel.speed} KTS // {hoveredVessel.heading}°</span>
            </div>
            <div className="flex justify-between border-t border-zinc-900 pt-1 mt-1 text-[7.5px]">
              <span className="text-zinc-650 font-bold">DESTINATION_ETA:</span>
              <span className="text-emerald-400 font-bold">SECURE</span>
            </div>
          </div>
        </div>
      )}

      {/* Globe Overlay HUD */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none space-y-4">
        <div className="bg-black/40 backdrop-blur-md border border-emerald-500/20 p-3 font-mono text-[8px] text-emerald-500/50 uppercase tracking-[0.2em] relative overflow-hidden">
           <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
           {showAllConnections ? "Global_Asset_Distribution_Net" : "Maritime_Logistics_Active"}
           <div className="mt-2 text-[6px] opacity-40">
             Uplink_Node: {selectedStock?.symbol || (selectedVessel ? selectedVessel.name : "Awaiting_Input")}
           </div>
        </div>

        <div className="flex gap-2">
          <div className="bg-emerald-950/20 border border-emerald-500/10 p-2">
             <div className="text-[6px] text-emerald-500/30 uppercase mb-1">Telemetry</div>
             <div className="text-[8px] text-emerald-500 font-mono">{showAllConnections ? "Corporate_Links" : `${mockVesselRegistry.length}_Vessels`}</div>
          </div>
          <div className="bg-emerald-950/20 border border-emerald-500/10 p-2">
            <div className="text-[6px] text-emerald-500/30 uppercase mb-1">Latency</div>
            <div className="text-[8px] text-emerald-500 font-mono">14ms</div>
          </div>
        </div>
      </div>

      {/* Viewport Control Panel - Positioned at Top Right of Earth Coordinate Sphere */}
      <div className="absolute top-4 right-4 z-20 pointer-events-auto select-none w-48 font-mono text-[8px] uppercase tracking-wide">
        <div className="bg-black/85 backdrop-blur-md border border-emerald-500/20 p-2.5 space-y-2">
          <div className="flex items-center justify-between border-b border-emerald-950 pb-1 text-emerald-500 font-bold uppercase tracking-wider">
            <span>Control_Gimbal</span>
            <span className="text-[6px] text-zinc-500">SYS_V1.9</span>
          </div>
          
          <div className="flex flex-col gap-1.5">
            {/* Viewport Lock toggle */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-500 text-[7px] font-bold">Orbit_Lock:</span>
              <button
                onClick={() => setViewportLock(!viewportLock)}
                className={`px-1.5 py-0.5 border text-[7px] font-bold tracking-tighter uppercase transition-colors rounded-sm cursor-pointer ${
                  viewportLock 
                    ? "bg-emerald-950/80 border-emerald-500 text-emerald-400" 
                    : "bg-zinc-900 border-zinc-750 text-zinc-400"
                }`}
              >
                {viewportLock ? "LOCKED" : "UNLOCKED"}
              </button>
            </div>

            {/* Auto-Rotation toggle */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-500 text-[7px] font-bold">Auto_Spin:</span>
              <button
                onClick={() => setAutoRotateEnabled(!autoRotateEnabled)}
                className={`px-1.5 py-0.5 border text-[7px] font-bold tracking-tighter uppercase transition-colors rounded-sm cursor-pointer ${
                  autoRotateEnabled 
                    ? "bg-emerald-950/80 border-emerald-500 text-emerald-400" 
                    : "bg-zinc-900 border-zinc-750 text-zinc-400"
                }`}
              >
                {autoRotateEnabled ? "ON" : "OFF"}
              </button>
            </div>
          </div>

          {!viewportLock && (
            <div className="text-[6px] text-amber-500 font-bold tracking-tighter uppercase bg-amber-500/5 border border-amber-500/15 p-1 text-center rounded-sm animate-pulse">
              [DRAG/SWIPE GLOBE TO SPIN]
            </div>
          )}

          {/* Quick manual simulation injector */}
          <div className="flex flex-col gap-1 border-t border-emerald-950/50 pt-2 mt-1">
            <button
              onClick={() => onInjectLiveNews?.()}
              className="w-full py-1.5 bg-red-950/80 hover:bg-red-900 border border-red-500/50 hover:border-red-500 text-red-400 hover:text-white font-bold tracking-tight text-[7.5px] uppercase transition-all rounded-sm cursor-pointer text-center"
            >
              [! BROADCAST NEWS !]
            </button>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-4 right-4 z-10 pointer-events-none font-mono">
        {selectedVessel && (
          <div className="bg-black/90 border border-cyan-500/20 p-2.5 mb-2 text-[8px] uppercase tracking-wide select-none pointer-events-auto">
            <div className="text-cyan-400 font-bold border-b border-cyan-950 pb-1 mb-1">Vessel Link Selected</div>
            <div className="text-[7.5px] text-zinc-500">Name: <span className="text-white">{selectedVessel.name}</span></div>
            <div className="text-[7.5px] text-zinc-500">Type: <span className="text-white">{selectedVessel.type}</span></div>
            <div className="text-[7.5px] text-zinc-500">Coords: <span className="text-white">[{selectedVessel.coordinates[0]}, {selectedVessel.coordinates[1]}]</span></div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedVessel(null);
              }}
              className="mt-1.5 w-full bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-white font-bold text-[7px] py-1 rounded-sm uppercase cursor-pointer"
            >
              DISCONNECT UPLINK
            </button>
          </div>
        )}
        <div className="flex flex-col items-end gap-1">
          <div className="text-[10px] text-emerald-500/40 tracking-widest uppercase flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Coord_Sync: Active
          </div>
          <div className="bg-emerald-500/20 h-[1px] w-48" />
          <div className="text-[6px] text-emerald-500/20 uppercase mt-1">
             Alpha_Stream_v4.2.1
          </div>
        </div>
      </div>
    </div>
  );
};
