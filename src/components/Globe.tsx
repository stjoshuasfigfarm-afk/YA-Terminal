import React, { useEffect, useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Stars } from "@react-three/drei";
import * as THREE from "three";
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

const GlobePoints = ({ 
  companies, 
  selectedSymbol, 
  onSelect 
}: { 
  companies: Company[]; 
  selectedSymbol?: string; 
  onSelect: (c: Company) => void 
}) => {
  const meshRef = useRef<THREE.Group>(null);

  return (
    <group ref={meshRef}>
      {companies.map((company) => {
        const position = latLngToVector3(company.lat, company.lng, 2);
        const isSelected = company.symbol === selectedSymbol;

        return (
          <mesh 
            key={company.symbol} 
            position={position}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(company);
            }}
          >
            <sphereGeometry args={[isSelected ? 0.03 : 0.015, 16, 16]} />
            <meshBasicMaterial 
              color={isSelected ? "#ffffff" : "#444444"} 
              transparent 
              opacity={isSelected ? 1 : 0.6}
            />
            {isSelected && (
               <mesh>
                 <sphereGeometry args={[0.06, 16, 16]} />
                 <meshBasicMaterial color="#ffffff" transparent opacity={0.15} />
               </mesh>
            )}
          </mesh>
        );
      })}
    </group>
  );
};

const SupplyArcs = ({ 
  selectedStock, 
  companies 
}: { 
  selectedStock: Company | null; 
  companies: Company[] 
}) => {
  const arcs = useMemo(() => {
    if (!selectedStock || !selectedStock.partners) return [];

    const startPos = latLngToVector3(selectedStock.lat, selectedStock.lng, 2);
    
    return selectedStock.partners.map(pSymbol => {
      const partner = companies.find(c => c.symbol === pSymbol);
      if (!partner) return null;

      const endPos = latLngToVector3(partner.lat, partner.lng, 2);
      
      // Calculate control point for arc
      const midPoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
      const distance = startPos.distanceTo(endPos);
      midPoint.normalize().multiplyScalar(2 + distance * 0.4);

      const curve = new THREE.QuadraticBezierCurve3(startPos, midPoint, endPos);
      return curve.getPoints(50);
    }).filter(Boolean);
  }, [selectedStock, companies]);

  return (
    <group>
      {arcs.map((points, idx) => (
        <line key={idx}>
          <bufferGeometry attach="geometry" setFromPoints={points as THREE.Vector3[]} />
          <lineBasicMaterial attach="material" color="#ffffff" transparent opacity={0.3} linewidth={1} />
        </line>
      ))}
    </group>
  );
};

const GlobeSphere = () => {
  return (
    <mesh>
      <sphereGeometry args={[1.98, 64, 64]} />
      <meshPhongMaterial 
        color="#050505" 
        emissive="#111111"
        specular="#333333"
        shininess={5}
        transparent
        opacity={0.9}
      />
      {/* Wireframe for grid effect */}
      <mesh>
        <sphereGeometry args={[2, 40, 40]} />
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.03} />
      </mesh>
    </mesh>
  );
};

interface GlobeProps {
  selectedStock: Company | null;
  onSelectNode: (c: Company) => void;
}

export const Globe: React.FC<GlobeProps> = ({ selectedStock, onSelectNode }) => {
  return (
    <div className="w-full h-full bg-black relative">
      <Canvas dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 6]} fov={45} />
        <OrbitControls 
          enablePan={false} 
          enableZoom={true} 
          minDistance={3} 
          maxDistance={10}
          autoRotate={!selectedStock}
          autoRotateSpeed={0.5}
        />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4444ff" />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <group rotation={[0, 0, 0]}>
          <GlobeSphere />
          <GlobePoints 
            companies={COMPANIES} 
            selectedSymbol={selectedStock?.symbol} 
            onSelect={onSelectNode} 
          />
          <SupplyArcs 
            selectedStock={selectedStock} 
            companies={COMPANIES} 
          />
        </group>
      </Canvas>

      {/* Globe Overlay HUD */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-2 font-mono text-[8px] text-white/50 uppercase tracking-[0.2em]">
           Global_Asset_Distribution_Net
        </div>
      </div>
      
      <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
        <div className="flex flex-col items-end gap-1">
          <div className="text-[10px] font-mono text-white/40 tracking-widest uppercase">
            Coord_Sync: Active
          </div>
          <div className="bg-white/10 h-[1px] w-32" />
        </div>
      </div>
    </div>
  );
};
