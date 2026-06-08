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
import { playTacticalAudio } from "../utils/audio";

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
  isAiTriggeredFocus?: boolean;
  onAutopilotInteraction?: (paused: boolean) => void;
  partnerLines?: {
    coords: [[number, number], [number, number]];
    color: string;
    from: any;
    to: any;
  }[];
  shocks?: {
    taiwanStraitBlocked: boolean;
    suezCanalBlocked: boolean;
    malaccaStraitBlocked: boolean;
    panamaCanalBlocked: boolean;
  };
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
  isAiTriggeredFocus = false,
  partnerLines = [],
  shocks = {
    taiwanStraitBlocked: false,
    suezCanalBlocked: false,
    malaccaStraitBlocked: false,
    panamaCanalBlocked: false,
  },
  onAutopilotInteraction
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
  const shockMarkersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
  const liveNewsPopupRef = useRef<maplibregl.Popup | null>(null);
  const [zoom, setZoom] = useState(2);
  const centerRef = useRef<[number, number]>([0, 0]);
  const [displayCenter, setDisplayCenter] = useState<[number, number]>([0, 0]);
  const [pitch, setPitch] = useState(0);
  const [bearing, setBearing] = useState(0);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);

  const onAutopilotInteractionRef = useRef(onAutopilotInteraction);
  useEffect(() => {
    onAutopilotInteractionRef.current = onAutopilotInteraction;
  }, [onAutopilotInteraction]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          "carto-dark": {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
              "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
              "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
              "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
            ],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors, © CARTO"
          }
        },
        layers: [
          {
            id: "background",
            type: "background",
            paint: {
              "background-color": "#050505",
              "background-opacity": 0
            }
          },
          {
            id: "carto-dark-layer",
            type: "raster",
            source: "carto-dark",
            minzoom: 0,
            maxzoom: 20
          }
        ]
      } as any,
      center: [0, 0],
      zoom: 2,
      pitch: 0,
      bearing: 0,
      minPitch: 0,
      maxPitch: 82,
      maxBounds: [[-10000, -82], [10000, 82]],
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

      // Atmospheric Fog
      // @ts-ignore
      if (map.setFog) {
        // @ts-ignore
        map.setFog({
          "range": [0.5, 10],
          "color": "#000000",
          "horizon-blend": 0.05
        });
      }
      
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
      // Enable drag rotation to allow manual pitch adjustment (globe wobble) without sideways rotation
      map.dragRotate.enable();

      // Trigger pause/resume interactions on drag/dragstart and mouse clicks
      map.on("dragstart", () => {
        if (onAutopilotInteractionRef.current) {
          onAutopilotInteractionRef.current(true);
        }
      });
      map.on("dragend", () => {
        if (onAutopilotInteractionRef.current) {
          onAutopilotInteractionRef.current(false);
        }
      });
      map.on("mousedown", () => {
        if (onAutopilotInteractionRef.current) {
          onAutopilotInteractionRef.current(true);
        }
      });
      map.on("mouseup", () => {
        if (onAutopilotInteractionRef.current) {
          onAutopilotInteractionRef.current(false);
        }
      });
    });

    let isAdjusting = false;
    
    map.on("rotate", () => {
      if (isAdjusting) return;
      if (map.getBearing() !== 0) {
        isAdjusting = true;
        map.setBearing(0);
        isAdjusting = false;
      }
    });

    map.on("pitch", () => {
      if (isAdjusting) return;
      setPitch(map.getPitch());
    });

    let moveThrottleTimeout: any = null;

    map.on("move", () => {
      if (isAdjusting) return;

      const { lng, lat } = map.getCenter();
      centerRef.current = [lng, lat];
      
      if (!moveThrottleTimeout) {
        moveThrottleTimeout = setTimeout(() => {
          setDisplayCenter(centerRef.current);
          setZoom(map.getZoom());
          setPitch(map.getPitch());
          moveThrottleTimeout = null;
        }, 500); // UI readouts don't need high frequency update
      }

      let needsAdjustment = false;
      let newLat = lat;

      // Keep North Pole north (always bearing 0) to prevent flipping
      if (map.getBearing() !== 0) {
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
          bearing: 0
        });
        isAdjusting = false;
        return;
      }

      setBearing(0);
    });

    map.on("click", (e) => {
      // Map click logic (can be used for deselection)
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync Shock Markers (Blockades)
  useEffect(() => {
    if (!mapRef.current || !isStyleLoaded) return;

    // Clear old shock markers
    Object.values(shockMarkersRef.current).forEach(m => m.remove());
    shockMarkersRef.current = {};

    const activeShocks = [
      { id: "taiwan", active: shocks.taiwanStraitBlocked, coords: [120.5, 24.5] as [number, number], label: "TAIWAN_STRAIT_RESTRICTED" },
      { id: "suez", active: shocks.suezCanalBlocked, coords: [32.3, 30.0] as [number, number], label: "SUEZ_CANAL_BLOCKADE" },
      { id: "malacca", active: shocks.malaccaStraitBlocked, coords: [101.5, 3.0] as [number, number], label: "MALACCA_STRAIT_BOTTLENECK" },
      { id: "panama", active: shocks.panamaCanalBlocked, coords: [-79.9, 9.1] as [number, number], label: "PANAMA_CANAL_LIMITS" },
    ].filter(s => s.active);

    activeShocks.forEach(shock => {
      const el = document.createElement('div');
      el.className = 'shock-marker';
      el.style.cursor = 'help';
      
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-24 h-24 rounded-full bg-red-500/10 border border-red-500/20 animate-pulse"></div>
          <div class="absolute w-12 h-12 rounded-full border-2 border-red-500/40 animate-ping"></div>
          <div class="z-10 px-2 py-0.5 bg-red-600/90 text-white font-mono text-[7px] font-black tracking-widest rounded-sm whitespace-nowrap shadow-xl border border-red-400/50">
            ${shock.label}
          </div>
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(shock.coords)
        .addTo(mapRef.current!);
      
      shockMarkersRef.current[shock.id] = marker;
    });
  }, [shocks, isStyleLoaded]);

  // Sync Markers
  useEffect(() => {
    if (!mapRef.current || !isStyleLoaded) return;

    // Diff markers instead of clearing all
    const currentSymbols = new Set(entities.map(e => e.symbol || e.name));
    
    // Remove markers that are no longer present
    Object.keys(markersRef.current).forEach(symbol => {
      if (!currentSymbols.has(symbol)) {
        markersRef.current[symbol].remove();
        delete markersRef.current[symbol];
      }
    });

    // Unified tactical color for all nodes
    const tacticalColor = "#34d399"; // Tactical Emerald

    // Add or Update markers
    entities.forEach(entity => {
      if (entity.lat && entity.lng) {
        const symbol = entity.symbol || entity.name;
        const isSelected = selectedStock?.symbol === entity.symbol;

        if (markersRef.current[symbol]) {
          // Update existing marker classes if status changed
          const el = markersRef.current[symbol].getElement();
          const markerContent = el.querySelector('.marker-pulse-wrapper');
          if (markerContent) {
            // Update color/active state if needed
            markerContent.className = cn(
              "relative group/node marker-pulse-wrapper",
              isSelected && "is-selected"
            );
          }
          return;
        }
        
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.style.cursor = 'pointer';
        
        el.innerHTML = `
          <div class="relative group/node marker-pulse-wrapper ${isSelected ? 'is-selected' : ''}">
            <div class="marker-dot w-2.5 h-2.5 rounded-full border border-black/50 shadow-xl transition-all duration-300 group-hover/node:scale-150" 
                 style="background-color: ${tacticalColor}; box-shadow: 0 0 15px ${tacticalColor}aa;">
            </div>
            
            <div class="selection-rings hidden">
              <div class="absolute -inset-4 rounded-full border border-emerald-500/20 animate-[ping_3s_infinite]"></div>
              <div class="absolute -inset-8 rounded-full border border-emerald-500/10 animate-[ping_5s_infinite] delay-1000"></div>
            </div>

            <div class="marker-label absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 pointer-events-none opacity-0 group-hover/node:opacity-100 transition-opacity whitespace-nowrap z-50">
              <div class="px-2 py-0.5 bg-black/90 border border-emerald-500/30 text-emerald-400 font-mono text-[8px] font-black tracking-widest">
                ${entity.symbol}
              </div>
            </div>
          </div>
        `;

        el.addEventListener('click', () => {
          playTacticalAudio("beep");
          if (onSelectNode) onSelectNode(entity);
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([entity.lng, entity.lat])
          .addTo(mapRef.current!);
          
        markersRef.current[symbol] = marker;
      }
    });
  }, [entities, isStyleLoaded, selectedStock, onSelectNode]);

  // Tactical Scanning Grid
  useEffect(() => {
    if (!mapRef.current || !isStyleLoaded) return;
    const map = mapRef.current;

    const gridFeatures: any[] = [];
    for (let lng = -180; lng <= 180; lng += 15) {
      gridFeatures.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: [[lng, -82], [lng, 82]] }
      });
    }
    for (let lat = -75; lat <= 75; lat += 15) {
      gridFeatures.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: [[-180, lat], [180, lat]] }
      });
    }

    const sourceId = "scanning-grid";
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: gridFeatures }
      });

      map.addLayer({
        id: "scanning-grid-layer",
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#10b981",
          "line-width": 0.5,
          "line-opacity": 0.08
        }
      });
    }
  }, [isStyleLoaded]);

  // Sync Network Connections/Lines on Map
  useEffect(() => {
    if (!mapRef.current || !isStyleLoaded) return;
    const map = mapRef.current;

    const geojsonData: any = {
      type: "FeatureCollection",
      features: (partnerLines || []).map((line, idx) => {
        const [p1, p2] = line.coords;
        return {
          type: "Feature",
          id: idx,
          properties: {
            color: line.color || "#10b981",
          },
          geometry: {
            type: "LineString",
            coordinates: [
              [p1[1], p1[0]], // Match MapLibre [longitude, latitude] convention
              [p2[1], p2[0]]
            ]
          }
        };
      })
    };

    const sourceId = "network-lines";
    const layerId = "network-lines-layer";

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: "geojson",
        data: geojsonData
      });

      map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        layout: {
          "line-join": "round",
          "line-cap": "round"
        },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 1.5,
          "line-opacity": 0.4
        }
      });

      // Add a second layer for the glowing pulse animation
      map.addLayer({
        id: `${layerId}-pulse`,
        type: "line",
        source: sourceId,
        layout: {
          "line-join": "round",
          "line-cap": "round"
        },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 3,
          "line-opacity": 0.8,
          "line-dasharray": [1, 2]
        }
      });

      let step = 0;
      let rafId: number;
      const animateDash = () => {
        step = (step + 0.05) % 4; // Slower dash animation
        if (map.getLayer(`${layerId}-pulse`)) {
          map.setPaintProperty(`${layerId}-pulse`, "line-dasharray", [0, step, 1, 4 - step]);
          rafId = requestAnimationFrame(animateDash);
        }
      };
      animateDash();
      return () => cancelAnimationFrame(rafId);
    } else {
      const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
      if (source) {
        source.setData(geojsonData);
      }
    }
  }, [partnerLines, isStyleLoaded]);

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
      if (isAiTriggeredFocus && !isLiveNewsZoomEnabled) {
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
      if (isAutopilot && !isLiveNewsZoomEnabled) {
        // Silent background cycling mode: keep current viewport perfectly aligned
        return;
      }
      mapRef.current.flyTo({
        center: [0, 0],
        zoom: 2,
        duration: 2000,
        pitch: 0,
        bearing: 0
      });
    }
  }, [selectedStock, agentFocus, isStyleLoaded, isLiveNewsZoomEnabled, isAutopilot, isAiTriggeredFocus]);

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

        const popupEl = popup.getElement();
        if (popupEl) {
          popupEl.addEventListener("mouseenter", () => {
            if (onAutopilotInteractionRef.current) {
              onAutopilotInteractionRef.current(true);
            }
          });
          popupEl.addEventListener("mouseleave", () => {
            if (onAutopilotInteractionRef.current) {
              onAutopilotInteractionRef.current(false);
            }
          });
        }
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
        .marker-pulse-wrapper.is-selected .selection-rings {
          display: block !important;
        }
        .marker-pulse-wrapper.is-selected .marker-dot {
          background-color: #34d399 !important;
          box-shadow: 0 0 20px #34d399 !important;
          transform: scale(1.3);
        }
        .marker-pulse-wrapper.is-selected .marker-label {
          opacity: 1 !important;
          pointer-events: auto !important;
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
        <div className="h-px bg-emerald-500/20 my-1 mx-2" />
        
        {/* Slider scroll bar for Overhead to Angle view */}
        <div className="flex flex-col items-center gap-1.5 py-2 px-1 border border-emerald-500/25 bg-black/80 backdrop-blur-md rounded-lg shadow-lg w-14 select-none">
          <span className="text-[7px] text-emerald-500 font-mono tracking-wider font-semibold text-center uppercase" style={{ fontSize: '7px' }}>
            ANGLE
          </span>
          <div className="relative h-20 flex items-center justify-between my-1 w-full px-1 gap-1">
            {/* Tick notches decoration next to the slider */}
            <div className="h-16 flex flex-col justify-between py-0.5 pointer-events-none text-emerald-500/40 text-[5px] font-mono leading-none select-none text-right w-5">
              <span>80°</span>
              <span>60°</span>
              <span>40°</span>
              <span>20°</span>
              <span>0°</span>
            </div>
            <div className="h-16 w-[1px] bg-emerald-500/20 absolute left-[26px]" />
            <input
              type="range"
              min="0"
              max="80"
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
              title="Globe Tilt: 0° (Overhead) to 80° (Angle)"
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

      {/* BOTTLENECK STATUS HUD */}
      <div className="absolute bottom-6 left-6 z-30 pointer-events-none space-y-2">
        <AnimatePresence>
          {shocks.taiwanStraitBlocked && <StatusLine label="TAIWAN_STRAIT" status="RESTRICTED" color="text-red-500" />}
          {shocks.suezCanalBlocked && <StatusLine label="SUEZ_CANAL" status="BLOCKADE" color="text-red-500" />}
          {shocks.malaccaStraitBlocked && <StatusLine label="MALACCA_STRAIT" status="BOTTLENECK" color="text-red-500" />}
          {shocks.panamaCanalBlocked && <StatusLine label="PANAMA_CANAL" status="DRAFT_LIMITS" color="text-orange-500" />}
        </AnimatePresence>
      </div>

      {/* LAT/LNG COORDINATE TICKER */}
      <div className="absolute bottom-6 right-6 z-30 pointer-events-none font-mono flex flex-col items-end gap-1 select-none">
        <div className="px-2 py-0.5 bg-black/60 border border-emerald-500/20 rounded-xs flex items-center gap-2">
          <span className="text-[7.5px] text-zinc-500 font-bold uppercase tracking-widest">LAT</span>
          <span className="text-[10px] text-emerald-500 font-black tabular-nums">{displayCenter[1].toFixed(4)}°</span>
        </div>
        <div className="px-2 py-0.5 bg-black/60 border border-emerald-500/20 rounded-xs flex items-center gap-2">
          <span className="text-[7.5px] text-zinc-500 font-bold uppercase tracking-widest">LNG</span>
          <span className="text-[10px] text-emerald-500 font-black tabular-nums">{displayCenter[0].toFixed(4)}°</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 opacity-40">
          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[6px] text-emerald-500 tracking-[0.2em] font-black uppercase whitespace-nowrap">GEO_SPACIAL_SYNC_ACTIVE</span>
        </div>
      </div>
    </div>
  );
};

const StatusLine = React.memo(({ label, status, color }: { label: string; status: string; color: string }) => (
  <motion.div 
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -10 }}
    className="flex items-center gap-2 font-mono"
  >
    <div className={`w-1 h-1 rounded-full bg-current ${color} animate-pulse`} />
    <span className="text-[7.5px] text-zinc-500 font-bold uppercase tracking-widest">{label}</span>
    <span className={`text-[7.5px] font-black uppercase tracking-tighter ${color}`}>{status}</span>
  </motion.div>
));

const NavButton = React.memo(({ 
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
));
