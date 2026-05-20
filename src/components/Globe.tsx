import React, { useEffect, useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Stars, Line } from "@react-three/drei";
import * as THREE from "three";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { COMPANIES, Company } from "../data/companies";

const ScanningHorizon = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      const t = (state.clock.elapsedTime * 0.5) % 4; // 4 is double the radius+padding approx
      meshRef.current.position.y = 2 - t;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.9, 2.1, 64]} />
      <meshBasicMaterial 
        color="#10b981" 
        transparent 
        opacity={0.1} 
        side={THREE.DoubleSide} 
      />
    </mesh>
  );
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
  sentimentScore
}: { 
  position: THREE.Vector3, 
  activityScore: number, 
  isSelected: boolean,
  sentimentScore?: number
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

  const baseColor = isSelected 
    ? (sentimentScore !== undefined ? getSentimentColor(sentimentScore) : "#10b981") 
    : "#334155";
  
  const activeColor = activityScore > 0.7 ? "#f59e0b" : activityScore > 0.4 ? "#3b82f6" : baseColor;

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[isSelected ? 0.04 : 0.015, 16, 16]} />
        <meshBasicMaterial 
          color={isSelected ? baseColor : activeColor} 
          transparent 
          opacity={isSelected ? 1 : 0.4 + activityScore * 0.4}
        />
      </mesh>
      
      {(activityScore > 0.2 || isSelected) && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[isSelected ? 0.08 : 0.04, 16, 16]} />
          <meshBasicMaterial 
            color={activeColor} 
            transparent 
            opacity={0.1} 
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

  return (
    <group>
      {companies.map((company) => {
        const position = latLngToVector3(company.lat, company.lng, 2);
        const isSelected = company.symbol === selectedSymbol;
        
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
            />
            {isSelected && (
              <group position={position}>
                <mesh ref={ringRef}>
                  <ringGeometry args={[0.06, 0.07, 32]} />
                  <meshBasicMaterial 
                    color={sentiment?.score > 0.3 ? "#10b981" : sentiment?.score < -0.3 ? "#ef4444" : "#eab308"} 
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

const DataPulse = ({ curve }: { curve: THREE.QuadraticBezierCurve3 }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      const t = (state.clock.elapsedTime * 0.2) % 1;
      const pos = curve.getPoint(t);
      meshRef.current.position.copy(pos);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.015, 8, 8]} />
      <meshBasicMaterial color="#34d399" />
      <pointLight distance={0.5} intensity={0.5} color="#34d399" />
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
  const arcData = useMemo(() => {
    const list = showAllConnections ? companies : (selectedStock ? [selectedStock] : []);
    const arcs: any[] = [];

    list.forEach(stock => {
      if (!stock.partners) return;
      const startPos = latLngToVector3(stock.lat, stock.lng, 2);
      
      stock.partners.forEach(pSymbol => {
        const partner = companies.find(c => c.symbol === pSymbol);
        if (!partner) return;

        // Dedup: if both showAllConnections, we might draw twice. 
        // For simplicity, we just draw everything.
        const endPos = latLngToVector3(partner.lat, partner.lng, 2);
        const midPoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
        const distance = startPos.distanceTo(endPos);
        midPoint.normalize().multiplyScalar(2 + distance * 0.3);

        const curve = new THREE.QuadraticBezierCurve3(startPos, midPoint, endPos);
        arcs.push({
          points: curve.getPoints(50),
          curve,
          isSelected: stock.symbol === selectedStock?.symbol
        });
      });
    });
    
    return arcs;
  }, [selectedStock, companies, showAllConnections]);

  return (
    <group>
      {arcData.map((data, idx) => (
        <group key={idx}>
          <Line
            points={data.points as THREE.Vector3[]}
            color={data.isSelected ? "#10b981" : "#10b981"}
            lineWidth={data.isSelected ? 1.5 : 0.5}
            dashed={!data.isSelected}
            dashScale={data.isSelected ? 0 : 20}
            dashSize={0.5}
            gapSize={0.5}
            transparent
            opacity={data.isSelected ? 0.6 : 0.15}
          />
          {data.isSelected && <DataPulse curve={data.curve} />}
        </group>
      ))}
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
}

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

export const Globe: React.FC<GlobeProps> = ({ 
  selectedStock, 
  onSelectNode,
  marketData,
  newsData,
  sentiment,
  showAllConnections = false
}) => {
  const [geoJsonData, setGeoJsonData] = React.useState<any>(null);
  const [countryPaths, setCountryPaths] = React.useState<THREE.Vector3[][]>([]);
  const [statePaths, setStatePaths] = React.useState<THREE.Vector3[][]>([]);

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

    // 1. STYLING (OCEAN): deep, subtle neutral grey
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    // 2. STYLING (LAND): brighter, dark slate grey with a thin contrasting border (e.g. stroke #334155)
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;

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
        <CameraFocus selectedStock={selectedStock} />
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
        
        <RotatingGroup autoRotate={!selectedStock}>
          <GlobeSphere texture={globeTexture} />
          
          {/* Render parsed boundaries */}
          <group>
            {/* International Country Borders */}
            {countryPaths.map((points, i) => (
              <Line
                key={`country-border-${i}`}
                points={points}
                color="#64748b"
                lineWidth={0.5}
                transparent
                opacity={0.35}
              />
            ))}
            {/* Domestic State/Province Borders */}
            {statePaths.map((points, i) => (
              <Line
                key={`state-border-${i}`}
                points={points}
                color="#4b5563"
                lineWidth={0.4}
                transparent
                opacity={0.2}
              />
            ))}
          </group>

          <DataPoints />
          <ScanningHorizon />
          <GlobePoints 
            companies={COMPANIES} 
            selectedSymbol={selectedStock?.symbol} 
            onSelect={onSelectNode} 
            marketData={marketData}
            newsData={newsData}
          />
          <SupplyArcs 
            selectedStock={selectedStock} 
            companies={COMPANIES} 
            showAllConnections={showAllConnections}
          />
        </RotatingGroup>

        <EffectComposer>
          <Bloom 
            intensity={1.0} 
            luminanceThreshold={0.9} 
            luminanceSmoothing={0.025} 
          />
        </EffectComposer>
      </Canvas>

      {/* Globe Overlay HUD */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none space-y-4">
        <div className="bg-black/40 backdrop-blur-md border border-emerald-500/20 p-3 font-mono text-[8px] text-emerald-500/50 uppercase tracking-[0.2em] relative overflow-hidden">
           <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
           Global_Asset_Distribution_Net
           <div className="mt-2 text-[6px] opacity-40">
             Uplink_Node: {selectedStock?.symbol || "Awaiting_Input"}
           </div>
        </div>

        <div className="flex gap-2">
          <div className="bg-emerald-950/20 border border-emerald-500/10 p-2">
            <div className="text-[6px] text-emerald-500/30 uppercase mb-1">Latency</div>
            <div className="text-[8px] text-emerald-500 font-mono">14ms</div>
          </div>
          <div className="bg-emerald-950/20 border border-emerald-500/10 p-2">
            <div className="text-[6px] text-emerald-500/30 uppercase mb-1">Stability</div>
            <div className="text-[8px] text-emerald-500 font-mono">99.2%</div>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
        <div className="flex flex-col items-end gap-1">
          <div className="text-[10px] font-mono text-emerald-500/40 tracking-widest uppercase flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Coord_Sync: Active
          </div>
          <div className="bg-emerald-500/20 h-[1px] w-48" />
          <div className="text-[6px] font-mono text-emerald-500/20 uppercase mt-1">
             Alpha_Stream_v4.2.1
          </div>
        </div>
      </div>
    </div>
  );
};
