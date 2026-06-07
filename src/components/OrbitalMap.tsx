import React, { useEffect, useRef, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { motion, AnimatePresence } from "motion/react";
import { 
  Maximize2, 
  RotateCw, 
  Map as MapIcon, 
  Navigation, 
  Crosshair,
  ZoomIn,
  ZoomOut,
  Compass,
  Layers,
  Globe
} from "lucide-react";
import { cn } from "../lib/utils";

interface OrbitalMapProps {
  onSelectNode?: (entity: any) => void;
  selectedStock?: { lat: number; lng: number; name: string; symbol: string } | null;
  agentFocus?: { lat: number; lng: number; locationName: string; zoomLevel?: number } | null;
  autoRotate?: boolean;
  is3D?: boolean;
  entities?: any[];
}

export const OrbitalMap: React.FC<OrbitalMapProps> = ({
  onSelectNode,
  selectedStock,
  agentFocus,
  autoRotate = false,
  is3D = true,
  entities = []
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
  const [zoom, setZoom] = useState(2);
  const [center, setCenter] = useState<[number, number]>([0, 0]);
  const [pitch, setPitch] = useState(0);
  const [bearing, setBearing] = useState(0);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [0, 0],
      zoom: 2,
      pitch: 25,
      bearing: 0,
      minPitch: 0,
      maxPitch: 60,
      attributionControl: false,
      // @ts-ignore
      projection: { type: 'globe' }
    });

    mapRef.current = map;

    map.on("styledata", () => {
      // Re-assert projection on style changes
      // @ts-ignore
      if (map.setProjection) map.setProjection({ type: 'globe' });
    });

    map.on("load", () => {
      setIsStyleLoaded(true);
      
      // Explicitly set globe projection
      // @ts-ignore
      if (map.setProjection) {
        // @ts-ignore
        map.setProjection({ type: 'globe' });
      }
      
      // Force background transparency to see the starfield
      if (map.getLayer('background')) {
        map.setPaintProperty('background', 'background-opacity', 0);
      }

      // Disable touchscreen map rotation to keep North upright
      map.touchZoomRotate.disableRotation();
    });

    let isAdjusting = false;
    map.on("move", () => {
      if (isAdjusting) return;

      const { lng, lat } = map.getCenter();
      let needsAdjustment = false;
      let newBearing = map.getBearing();
      let newLat = lat;

      // Keep North Pole north (always bearing 0) if not auto-rotating
      if (!autoRotate && map.getBearing() !== 0) {
        newBearing = 0;
        needsAdjustment = true;
      }

      // Clamp Latitude to prevent flipping over the poles
      const maxLat = 82;
      const minLat = -82;
      if (lat > maxLat) {
        newLat = maxLat;
        needsAdjustment = true;
      } else if (lat < minLat) {
        newLat = minLat;
        needsAdjustment = true;
      }

      if (needsAdjustment) {
        isAdjusting = true;
        map.jumpTo({
          center: [lng, newLat],
          bearing: newBearing
        });
        isAdjusting = false;
        return;
      }

      setCenter([lng, lat]);
      setZoom(map.getZoom());
      setPitch(map.getPitch());
      setBearing(map.getBearing());
    });

    map.on("click", (e) => {
      // Map click logic (can be used for deselection)
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync Markers
  useEffect(() => {
    if (!mapRef.current || !isStyleLoaded) return;

    // Remove old markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    // Add new markers
    entities.forEach(entity => {
      if (entity.lat && entity.lng) {
        const isSelected = selectedStock?.symbol === entity.symbol;
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.style.cursor = 'pointer';
        
        // Use inline style & tailwind-like HTML for pulse effect
        el.innerHTML = `
          <div class="relative w-3 h-3 rounded-full border-2 border-black/50 shadow-lg" style="background-color: ${isSelected ? '#10b981' : '#ffffff'}; box-shadow: 0 0 10px ${isSelected ? '#10b981' : 'rgba(255,255,255,0.3)'};">
            ${isSelected ? '<div class="absolute -inset-2 rounded-full border-2 border-emerald-500 animate-ping opacity-75"></div>' : ''}
          </div>
        `;

        el.addEventListener('click', () => {
          if (onSelectNode) onSelectNode(entity);
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([entity.lng, entity.lat])
          .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`
            <div style="font-family: monospace; font-size: 10px; color: #10b981; background: black; padding: 4px;">
              ${entity.symbol} | ${entity.name}
            </div>
          `))
          .addTo(mapRef.current!);
          
        markersRef.current[entity.symbol || entity.name] = marker;
      }
    });
  }, [entities, isStyleLoaded, selectedStock]);

  // Handle Autopilot/Focus Transitions
  useEffect(() => {
    if (!mapRef.current || !isStyleLoaded) return;

    if (agentFocus) {
      mapRef.current.flyTo({
        center: [agentFocus.lng, agentFocus.lat],
        zoom: agentFocus.zoomLevel || 12,
        duration: 3000,
        essential: true,
        pitch: 45
      });
    } else if (selectedStock) {
      mapRef.current.flyTo({
        center: [selectedStock.lng, selectedStock.lat],
        zoom: 14, // Zoom in deeper for "street view" feel on selection
        duration: 2500,
        essential: true,
        pitch: 60
      });
    } else {
      mapRef.current.flyTo({
        center: [0, 0],
        zoom: 2,
        duration: 2000,
        pitch: 25,
        bearing: 0
      });
    }
  }, [selectedStock, agentFocus, isStyleLoaded]);

  // Auto-rotation logic
  useEffect(() => {
    if (!mapRef.current || !autoRotate || !isStyleLoaded) return;

    let requestAnimationFrameId: number;
    const rotate = () => {
      if (mapRef.current && autoRotate) {
        mapRef.current.setBearing((mapRef.current.getBearing() + 0.05) % 360);
        requestAnimationFrameId = requestAnimationFrame(rotate);
      }
    };

    rotate();
    return () => cancelAnimationFrame(requestAnimationFrameId);
  }, [autoRotate, isStyleLoaded]);

  const resetOrientation = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        pitch: 25,
        bearing: 0,
        zoom: 2,
        center: [0, 0],
        duration: 1500
      });
    }
  };

  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();

  return (
    <div className="relative w-full h-full bg-black overflow-hidden group">
      <style>{`
        .maplibregl-canvas-container,
        .maplibregl-canvas-container.maplibregl-interactive,
        .maplibregl-map {
          background: transparent !important;
        }
      `}</style>
      {/* Space Background without Stars */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Deep Space Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.03)_0%,transparent_70%)]" />
      </div>

      {/* Map Container */}
      <div 
        ref={mapContainerRef} 
        className={cn(
          "absolute inset-0 z-10 transition-opacity duration-1000",
          isStyleLoaded ? "opacity-100" : "opacity-0"
        )}
        style={{ 
          background: 'transparent',
          transform: 'translateY(-5%)',
          height: '110%'
        }}
      />

      {/* Atmospheric Glow Overlay */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {/* Orbital Fringe Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.08)_0%,transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.03)_0%,transparent_80%)] pointer-events-none" />
        
        {/* Vignette for cinematic depth */}
        <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.9)]" />
      </div>



      {/* Navigation Controls */}
      <div className="absolute top-6 right-6 z-30 flex flex-col gap-2">
        <NavButton icon={<ZoomIn size={16} />} onClick={zoomIn} label="ZOOM_IN" />
        <NavButton icon={<ZoomOut size={16} />} onClick={zoomOut} label="ZOOM_OUT" />
        <div className="h-px bg-emerald-500/20 my-1 mx-2" />
        <NavButton icon={<Compass size={16} />} onClick={resetOrientation} label="RESET_NAV" />
        <div className="h-px bg-emerald-500/20 my-1 mx-2" />
        <NavButton 
          icon={<Globe size={16} />} 
          onClick={resetOrientation} 
          active={zoom < 4}
          label="ORBIT_VIEW" 
        />
      </div>

      {/* Decorative Corners */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-emerald-500/30 z-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-emerald-500/30 z-40 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-emerald-500/30 z-40 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-emerald-500/30 z-40 pointer-events-none" />
    </div>
  );
};

const NavButton = ({ 
  icon, 
  onClick, 
  label, 
  active = false 
}: { 
  icon: React.ReactNode; 
  onClick: () => void; 
  label: string;
  active?: boolean;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "w-10 h-10 flex items-center justify-center transition-all duration-300 border backdrop-blur-md rounded-lg group/btn shadow-lg",
      active 
        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" 
        : "bg-black/60 border-emerald-500/30 text-emerald-500/70 hover:border-emerald-500 hover:text-emerald-400"
    )}
  >
    {icon}
    <div className="absolute right-12 px-2 py-1 bg-black/80 text-[8px] text-emerald-500 border border-emerald-500/30 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-mono tracking-widest">
      {label}
    </div>
  </button>
);
