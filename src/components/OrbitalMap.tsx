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
  Globe,
  Network,
  Target
} from "lucide-react";
import { cn } from "../lib/utils";

interface OrbitalMapProps {
  onSelectNode?: (entity: any) => void;
  selectedStock?: { lat: number; lng: number; name: string; symbol: string } | null;
  agentFocus?: { lat: number; lng: number; locationName: string; zoomLevel?: number } | null;
  autoRotate?: boolean;
  is3D?: boolean;
  entities?: any[];
  activeNewsPopup?: { lat: number; lng: number; title: string; symbol: string } | null;
  isLiveNewsZoomEnabled?: boolean;
  isAutopilot?: boolean;
  toggleGlobalNetwork?: () => void;
  toggleLiveNewsZoom?: () => void;
  resetOrientationTrigger?: number;
}

export const OrbitalMap: React.FC<OrbitalMapProps> = ({
  onSelectNode,
  selectedStock,
  agentFocus,
  autoRotate = false,
  is3D = true,
  entities = [],
  activeNewsPopup = null,
  isLiveNewsZoomEnabled = false,
  isAutopilot = false,
  toggleGlobalNetwork,
  toggleLiveNewsZoom,
  resetOrientationTrigger = 0
}) => {
  // Trigger orientation reset
  useEffect(() => {
    if (resetOrientationTrigger > 0) {
      resetOrientation();
    }
  }, [resetOrientationTrigger]);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
  const liveNewsPopupRef = useRef<maplibregl.Popup | null>(null);
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
      maxZoom: 12,
      pitch: 0,
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

      // Enable touchscreen map rotation and drag rotation to allow interactive exploration
      map.touchZoomRotate.enableRotation();
      map.dragRotate.enable();
    });

    let isAdjusting = false;
    map.on("move", () => {
      if (isAdjusting) return;

      const { lng, lat } = map.getCenter();
      let needsAdjustment = false;
      let newLat = lat;

      // Clamp Latitude to prevent flipping over the poles
      const maxLat = 80;
      const minLat = -80;
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
          center: [lng, newLat]
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
      if (!isLiveNewsZoomEnabled) {
        // AI should not have control of the camera when that button is disabled
        return;
      }
      mapRef.current.flyTo({
        center: [agentFocus.lng, agentFocus.lat],
        zoom: agentFocus.zoomLevel || 12,
        duration: 3000,
        essential: true,
        pitch: 0,
        bearing: 0
      });
    } else if (selectedStock) {
      if (isAutopilot && !isLiveNewsZoomEnabled) {
        // AI / Autopilot should not have control of the camera when that button is disabled
        return;
      }
      mapRef.current.flyTo({
        center: [selectedStock.lng, selectedStock.lat],
        zoom: 14, // Zoom in deeper for "street view" feel on selection
        duration: 2500,
        essential: true,
        pitch: 0,
        bearing: 0
      });
    } else {
      mapRef.current.flyTo({
        center: [0, 0],
        zoom: 2,
        duration: 2000,
        pitch: 0,
        bearing: 0
      });
    }
  }, [selectedStock, agentFocus, isStyleLoaded, isLiveNewsZoomEnabled, isAutopilot]);

  // Handle live news popup alerts on map
  useEffect(() => {
    if (!mapRef.current || !isStyleLoaded) return;

    if (liveNewsPopupRef.current) {
      liveNewsPopupRef.current.remove();
      liveNewsPopupRef.current = null;
    }

    if (activeNewsPopup) {
      const { lat, lng, title, symbol } = activeNewsPopup;
      const htmlText = `
        <div style="font-family: monospace; font-size: 11px; color: #10b981; background: #000000; border: 1px solid rgba(16,185,129,0.5); padding: 10px; border-radius: 4px; box-shadow: 0 0 15px rgba(16,185,129,0.3); max-width: 250px;">
          <div style="font-weight: bold; font-size: 10px; color: #34d399; margin-bottom: 4px; border-bottom: 1px solid rgba(16,185,129,0.2); padding-bottom: 3px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
            <span>LIVE METRIC ALERT</span>
            <span style="color: #60a5fa; font-weight: bold;">${symbol}</span>
          </div>
          <div style="line-height: 1.4; color: #f3f4f6; font-size: 10px;">
            ${title}
          </div>
          <div style="margin-top: 6px; font-size: 8px; color: #6b7280; text-align: right; letter-spacing: 0.1em;">
            ACTIVE FEED NODE
          </div>
        </div>
      `;

      try {
        const popup = new maplibregl.Popup({ 
          closeOnClick: false, 
          closeButton: true,
          offset: 15
        })
          .setLngLat([lng, lat])
          .setHTML(htmlText)
          .addTo(mapRef.current);

        liveNewsPopupRef.current = popup;
      } catch (err) {
        console.warn("Failed to mount map alerts popup", err);
      }
    }

    return () => {
      if (liveNewsPopupRef.current) {
        liveNewsPopupRef.current.remove();
        liveNewsPopupRef.current = null;
      }
    };
  }, [activeNewsPopup, isStyleLoaded]);

  // Auto-rotation logic
  useEffect(() => {
    if (!mapRef.current || !autoRotate || !isStyleLoaded) return;

    let requestAnimationFrameId: number;
    const rotate = () => {
      if (mapRef.current && autoRotate) {
        const center = mapRef.current.getCenter();
        // Spin the globe smoothly west-to-east
        const newLng = (center.lng + 0.08) % 360;
        mapRef.current.jumpTo({
          center: [newLng, center.lat],
          bearing: 0
        });
        requestAnimationFrameId = requestAnimationFrame(rotate);
      }
    };

    rotate();
    return () => cancelAnimationFrame(requestAnimationFrameId);
  }, [autoRotate, isStyleLoaded]);

  // Resize Observer to refresh container layout and prevent black screen / disappearing globe
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    });

    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const resetOrientation = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        pitch: 0,
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
        .maplibregl-popup-content {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .maplibregl-popup-tip {
          border-bottom-color: rgba(16, 185, 129, 0.5) !important;
          border-top-color: rgba(16, 185, 129, 0.5) !important;
          border-left-color: rgba(16, 185, 129, 0.5) !important;
          border-right-color: rgba(16, 185, 129, 0.5) !important;
        }
        .maplibregl-popup-close-button {
          color: #10b981 !important;
          font-family: monospace !important;
          font-weight: bold !important;
          font-size: 14px !important;
          padding: 2px 6px !important;
          outline: none !important;
          background: transparent !important;
          border: none !important;
          cursor: pointer !important;
        }
        .maplibregl-popup-close-button:hover {
          color: #34d399 !important;
        }
      `}</style>
      {/* Space Background without Stars */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Deep Space Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.03)_0%,transparent_70%)]" />
      </div>

      {/* Map Container */}
      <div className="relative w-full h-full overflow-hidden">
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
      </div>

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
        <NavButton 
          icon={<Network size={16} />} 
          onClick={toggleGlobalNetwork} 
          label="NETWORK_TOGGLE" 
        />
        <NavButton 
          icon={<Target size={16} />} 
          onClick={toggleLiveNewsZoom} 
          label="LIVE_FETCH_AGENT" 
        />
        <NavButton icon={<ZoomIn size={16} />} onClick={zoomIn} label="ZOOM_IN" />
        <NavButton icon={<ZoomOut size={16} />} onClick={zoomOut} label="ZOOM_OUT" />
        <div className="h-px bg-emerald-500/20 my-1 mx-2" />
        <NavButton 
          icon={
            <span style={{ transform: `rotate(${-bearing}deg)`, transition: 'transform 0.15s ease-out' }} className="inline-block">
              <Compass size={16} />
            </span>
          } 
          onClick={resetOrientation} 
          label="POINT_NORTH_UP" 
        />
        <div className="h-px bg-emerald-500/20 my-1 mx-2" />
        <NavButton 
          icon={<Globe size={16} />} 
          onClick={resetOrientation} 
          active={zoom < 4}
          label="ORBIT_VIEW" 
        />
        <div className="h-px bg-emerald-500/20 my-1 mx-2" />
        
        {/* Slider scroll bar for Overhead to Angle view */}
        <div className="flex flex-col items-center gap-1.5 py-2 px-1 border border-emerald-500/25 bg-black/80 backdrop-blur-md rounded-lg shadow-lg w-14 select-none">
          <span className="text-[7px] text-emerald-500 font-mono tracking-wider font-semibold text-center uppercase" style={{ fontSize: '7px' }}>
            ANGLE
          </span>
          <div className="relative h-20 flex items-center justify-between my-1 w-full px-1 gap-1">
            {/* Tick notches decoration next to the slider */}
            <div className="h-16 flex flex-col justify-between py-0.5 pointer-events-none text-emerald-500/40 text-[5px] font-mono leading-none select-none text-right w-5">
              <span>60°</span>
              <span>45°</span>
              <span>30°</span>
              <span>15°</span>
              <span>0°</span>
            </div>
            <div className="h-16 w-[1px] bg-emerald-500/20 absolute left-[26px]" />
            <input
              type="range"
              min="0"
              max="60"
              value={pitch}
              onChange={(e) => {
                const newPitch = parseFloat(e.target.value);
                setPitch(newPitch);
                if (mapRef.current) {
                  mapRef.current.setPitch(newPitch);
                }
              }}
              className="accent-emerald-400 cursor-pointer h-16 w-3 xl:w-4 outline-none mr-0.5"
              style={{
                writingMode: "vertical-lr",
                direction: "rtl",
                WebkitAppearance: "slider-vertical"
              }}
              title="Globe Tilt: 0° (Overhead) to 60° (Angle)"
            />
          </div>
          <span className="text-[7px] text-emerald-500/60 font-mono tracking-wider text-center uppercase" style={{ fontSize: '7px' }}>
            FLAT
          </span>
        </div>
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
