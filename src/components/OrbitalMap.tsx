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
  Target,
  Box,
  MapPin
} from "lucide-react";
import { cn } from "../lib/utils";

interface OrbitalMapProps {
  onSelectNode?: (entity: any) => void;
  selectedStock?: { lat: number; lng: number; name: string; symbol: string } | null;
  agentFocus?: { lat: number; lng: number; locationName: string; zoomLevel?: number } | null;
  autoRotate?: boolean;
  is3D?: boolean;
  entities?: any[];
  activeNewsPopup?: { lat: number; lng: number; title: string; symbol: string; fullStory?: any } | null;
  onHeadlineClick?: (news: any) => void;
  isLiveNewsZoomEnabled?: boolean;
  isFocusMode?: boolean;
  isAutopilot?: boolean;
  toggleGlobalNetwork?: () => void;
  toggleLiveNewsZoom?: () => void;
  toggleFocusMode?: () => void;
  resetOrientationTrigger?: number;
  partnerLines?: {
    coords: [[number, number], [number, number]];
    color: string;
    from: any;
    to: any;
  }[];
}

export const OrbitalMap: React.FC<OrbitalMapProps> = ({
  onSelectNode,
  selectedStock,
  agentFocus,
  autoRotate = false,
  is3D = true,
  entities = [],
  activeNewsPopup = null,
  onHeadlineClick,
  isLiveNewsZoomEnabled = false,
  isFocusMode = true,
  isAutopilot = false,
  toggleGlobalNetwork,
  toggleLiveNewsZoom,
  toggleFocusMode,
  resetOrientationTrigger = 0,
  partnerLines = []
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
  const liveNewsPopupsRef = useRef<Set<maplibregl.Popup>>(new Set());
  const [zoom, setZoom] = useState(2);
  const [center, setCenter] = useState<[number, number]>([0, 0]);
  const [pitch, setPitch] = useState(0);
  const [bearing, setBearing] = useState(0);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const [show3DBuildings, setShow3DBuildings] = useState(true);
  // Sync Detailed POI Layers (Retail & Civic)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isStyleLoaded) return;

    const retailLayerId = "poi-retail-layer";
    const civicLayerId = "poi-civic-layer";

    const updatePoiLayers = () => {
      // Retail Assets
      if (!map.getLayer(retailLayerId)) {
        map.addLayer({
          id: retailLayerId,
          type: "circle",
          source: "carto",
          "source-layer": "poi",
          minzoom: 14,
          filter: [
            "match",
            ["get", "class"],
            ["shop", "grocery", "restaurant", "fast_food", "cafe", "bank", "pharmacy", "commercial"],
            true,
            false
          ],
          paint: {
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              14, 3,
              18, 6
            ],
            "circle-color": [
              "case",
              ["match", ["to-string", ["get", "brand"]], ["Amazon", "Walmart", "McDonald's", "Starbucks", "Target"], true, false],
              "#10b981", // High priority Green (Hiring)
              "#fbbf24"  // Default Yellow
            ],
            "circle-stroke-width": [
              "case",
              ["match", ["to-string", ["get", "brand"]], ["Amazon", "Walmart", "McDonald's", "Starbucks", "Target"], true, false],
              2,
              1
            ],
            "circle-stroke-color": "#000",
            "circle-opacity": 0.85
          }
        });

        // Add labels
        map.addLayer({
          id: `${retailLayerId}-label`,
          type: "symbol",
          source: "carto",
          "source-layer": "poi",
          minzoom: 15.5,
          filter: [
            "match",
            ["get", "class"],
            ["shop", "grocery", "restaurant", "fast_food", "cafe", "bank", "pharmacy", "commercial"],
            true,
            false
          ],
          layout: {
            "text-field": ["get", "name"],
            "text-size": 9,
            "text-offset": [0, 1.2],
            "text-anchor": "top"
          },
          paint: {
            "text-color": "#fbbf24",
            "text-halo-color": "#000",
            "text-halo-width": 1
          }
        });
      }

      // Civic Points
      if (!map.getLayer(civicLayerId)) {
        map.addLayer({
          id: civicLayerId,
          type: "circle",
          source: "carto",
          "source-layer": "poi",
          minzoom: 14,
          filter: [
            "match",
            ["get", "class"],
            ["library", "town_hall", "public_space", "school", "hospital", "museum", "attraction", "park"],
            true,
            false
          ],
          paint: {
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              14, 4,
              18, 7
            ],
            "circle-color": "#60a5fa", // distinct icon color for civic
            "circle-stroke-width": 1,
            "circle-stroke-color": "#000",
            "circle-opacity": 0.9
          }
        });

        // Add labels
        map.addLayer({
          id: `${civicLayerId}-label`,
          type: "symbol",
          source: "carto",
          "source-layer": "poi",
          minzoom: 15.5,
          filter: [
            "match",
            ["get", "class"],
            ["library", "town_hall", "public_space", "school", "hospital", "museum", "attraction", "park"],
            true,
            false
          ],
          layout: {
            "text-field": ["get", "name"],
            "text-size": 9,
            "text-offset": [0, 1.2],
            "text-anchor": "top"
          },
          paint: {
            "text-color": "#60a5fa",
            "text-halo-color": "#000",
            "text-halo-width": 1
          }
        });
      }

      // Interaction: Hover cursor for distinct layers
      const interactiveLayers = [retailLayerId, civicLayerId];
      interactiveLayers.forEach(layer => {
        map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
      });

      // Interaction: Click handling using queryRenderedFeatures
      map.on("click", async (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: interactiveLayers });
        if (!features.length) return;
        
        const feat = features[0];
        const props = feat.properties;
        const coords = e.lngLat;
        
        const typeLabel = feat.layer.id === retailLayerId ? "RETAIL_ASSET" : "CIVIC_POINT";
        const brandLabel = props.brand ? `<div><span style="color:#666">BRAND:</span> <span style="color:#ddd">${props.brand}</span></div>` : "";
        const amenityLabel = props.amenity ? `<div><span style="color:#666">AMENITY:</span> <span style="color:#ddd">${props.amenity}</span></div>` : "";
        const classLabel = props.class ? `<div><span style="color:#666">CLASS:</span> <span style="color:#ddd">${props.class}</span></div>` : "";
        
        const popupId = `ai-analysis-${Math.random().toString(36).substring(7)}`;

        const popup = new maplibregl.Popup({ offset: 10, maxWidth: "250px" })
          .setLngLat(coords)
          .setHTML(`
            <div style="font-family: monospace; background: #000000; border: 1px solid rgba(16,185,129,0.4); padding: 10px; border-radius: 2px; color: #10b981; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
              <div style="font-size: 7px; color: #666; margin-bottom: 6px; display: flex; justify-content: space-between; border-bottom: 1px solid #222; padding-bottom: 4px;">
                <span>POI_METADATA_EXTRACTOR</span>
                <span style="color: ${feat.layer.id === retailLayerId ? '#fbbf24' : '#60a5fa'}">${typeLabel}</span>
              </div>
              <div style="font-weight: 900; font-size: 11px; margin-bottom: 8px; letter-spacing: 0.05em; color: #fff;">${props.name || "UNNAMED_ASSET"}</div>
              
              <div style="display: flex; flex-direction: column; gap: 4px; font-size: 9px; margin-bottom: 8px;">
                  ${classLabel}
                  ${amenityLabel}
                  ${brandLabel}
                  <div><span style="color:#666">SYS_ID:</span> <span style="color:#888">${feat.id || 'N/A'}</span></div>
              </div>
              
              <div id="${popupId}" style="border-top: 1px solid #222; padding-top: 6px; font-size: 9px; display: flex; flex-direction: column; gap: 4px;">
                  <div style="display: flex; flex-direction: column; gap: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #60a5fa; font-size: 7px;">INIT_SECURE_UPLINK...</span>
                        <span style="color: #333; font-size: 6px;">[SCAN_ACTIVE]</span>
                    </div>
                    <div style="width: 100%; height: 2px; background: rgba(96, 165, 250, 0.5);"></div>
                  </div>
              </div>
            </div>
            <style>
              @keyframes scan {
                0% { left: -30%; }
                100% { left: 100%; }
              }
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
              }
            </style>
          `)
          .addTo(map);

          try {
            const resp = await fetch("/api/ai/poi-analysis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: props.name || "UNNAMED_ASSET",
                    type: props.class || props.amenity || typeLabel,
                    brand: props.brand || "",
                    lat: coords.lat,
                    lng: coords.lng
                })
            });
            const data = await resp.json();
            
            const container = popup.getElement()?.querySelector(`#${popupId}`);
            if (container) {
                const hColor = data.hiringLikelihood === 'High' ? '#10b981' : data.hiringLikelihood === 'Moderate' ? '#60a5fa' : '#71717a';
                container.innerHTML = `
                    <div style="color: #444; font-size: 7px; margin-bottom: 4px; letter-spacing: 0.1em; font-weight: bold;">STRATEGIC_ASSESSMENT_V1.2</div>
                    <div style="color: #ddd; margin-bottom: 10px; line-height: 1.4; font-size: 9px; padding: 6px; background: rgba(255,255,255,0.03); border-left: 2px solid #333;">${data.analysis || "Unable to determine"}</div>
                    
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #111; padding-bottom: 4px;">
                           <span style="color: #666; font-size: 7px;">ENTITY_UNIFIED_PARENT</span>
                           <span style="color: #34d399; font-weight: bold; font-size: 8px;">${data.parentCompany || "INDEPENDENT"}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #111; padding-bottom: 4px;">
                           <span style="color: #666; font-size: 7px;">TURNOVER_SYSTEM_CHURN</span>
                           <span style="color: #f87171; font-weight: bold; font-size: 8px;">${data.employeeTurnover || "UNKNOWN"}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                           <span style="color: #666; font-size: 7px;">HIRING_EXPANSION_LKL</span>
                           <div style="display: flex; items-center; gap: 4px;">
                             <span style="padding: 1px 4px; border-radius: 2px; background: ${hColor}22; color: ${hColor}; font-weight: 900; font-size: 8px; border: 1px solid ${hColor}44;">${(data.hiringLikelihood || "STABLE").toUpperCase()}</span>
                           </div>
                        </div>
                    </div>
                `;
            }
        } catch (e) {
            const container = popup.getElement()?.querySelector(`#${popupId}`);
            if (container) {
                container.innerHTML = `<div style="color: #ef4444;">AI_LINK_FAILED</div>`;
            }
        }
      });
    };

    updatePoiLayers();
  }, [isStyleLoaded]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [0, 20],
      zoom: 1.5,
      minZoom: 1,
      maxZoom: 20,
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
        el.className = 'custom-marker z-10 transition-transform duration-300';
        el.style.cursor = 'pointer';
        
        // Use inline style & tailwind-like HTML for optimized, static visual details
        el.innerHTML = `
          <div class="relative flex items-center justify-center pointer-events-none group transform hover:scale-125 transition-transform duration-300">
            <svg width="24" height="24" viewBox="0 0 24 24" class="${isSelected ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-amber-500'} transition-colors duration-300">
              <circle cx="12" cy="12" r="3" fill="currentColor" />
              <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.5" fill="none" class="opacity-60" />
              <path d="M12 1v4M12 19v4M1 12h4M19 12h4" stroke="currentColor" stroke-width="1.5" class="opacity-80" />
              ${isSelected ? '<circle cx="12" cy="12" r="12" stroke="currentColor" stroke-width="1" fill="none" stroke-dasharray="2 4" stroke-linecap="round" class="opacity-50" />' : ''}
            </svg>
            ${isSelected ? '<div class="absolute -inset-2 rounded-full border border-emerald-500/40 opacity-70"></div>' : ''}
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

    if (!isFocusMode) {
      // Zoomed out to see the whole globe
      mapRef.current.flyTo({
        center: [0, 0],
        zoom: 1.8,
        duration: 3000,
        pitch: 0,
        bearing: 0
      });
      return;
    }

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
    }
  }, [selectedStock, agentFocus, isStyleLoaded, isLiveNewsZoomEnabled, isAutopilot, isFocusMode]);

  useEffect(() => {
    return () => {
      liveNewsPopupsRef.current.forEach(popup => popup.remove());
      liveNewsPopupsRef.current.clear();
    };
  }, []);

  // Handle live news popup alerts on map
  useEffect(() => {
    if (!mapRef.current || !isStyleLoaded) return;

    if (activeNewsPopup && isLiveNewsZoomEnabled) {
      const { lat, lng, title, symbol } = activeNewsPopup;
      const popupId = `news-popup-${Math.random().toString(36).substring(7)}`;
      const htmlText = `
        <style>
          @keyframes tacticalPopupFadeInOut {
            0% { opacity: 0; transform: scale(0.9) translateY(10px); }
            5% { opacity: 1; transform: scale(1) translateY(0); }
            90% { opacity: 1; transform: scale(1) translateY(0); }
            100% { opacity: 0; transform: scale(0.95) translateY(-5px); }
          }
        </style>
        <div id="${popupId}" style="
          position: relative;
          cursor: pointer; 
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; 
          background: rgba(5, 5, 5, 0.90); 
          backdrop-filter: blur(12px);
          border: 1px solid rgba(16, 185, 129, 0.3); 
          padding: 14px; 
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(16, 185, 129, 0.05); 
          width: 320px; 
          border-left: 4px solid #10b981;
          border-right: 1px solid rgba(16, 185, 129, 0.1);
          animation: tacticalPopupFadeInOut 10s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          overflow: hidden;
        " onmouseover="this.style.borderColor='rgba(16, 185, 129, 0.6)'; this.style.background='rgba(5, 5, 5, 0.95)'; this.style.boxShadow='0 8px 32px rgba(0, 0, 0, 0.9), inset 0 0 30px rgba(16, 185, 129, 0.1)';" onmouseout="this.style.borderColor='rgba(16, 185, 129, 0.3)'; this.style.background='rgba(5, 5, 5, 0.90)'; this.style.boxShadow='0 8px 32px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(16, 185, 129, 0.05)';">
          
          <div style="
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 8px; 
            border-bottom: 1px solid rgba(16, 185, 129, 0.15); 
            padding-bottom: 6px; 
            pointer-events: none;
          ">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 8px; height: 8px; background-color: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; animation: pulse 2s infinite;"></div>
              <span style="font-weight: 800; font-size: 11px; color: #10b981; letter-spacing: 0.15em;">INTERCEPT // <span style="color: #6ee7b7;">${symbol}</span></span>
            </div>
            <span style="color: rgba(16, 185, 129, 0.6); font-weight: bold; font-size: 10px;">${new Date().toISOString().split('T')[1].slice(0,8)}Z</span>
          </div>
          
          <div style="
            color: #d4d4d8; 
            font-size: 12px; 
            line-height: 1.5; 
            text-shadow: 0 0 4px rgba(255, 255, 255, 0.1);
            font-weight: 500;
            pointer-events: none;
            margin-bottom: 10px;
          ">
            ${title}
          </div>
          
          <div style="
            font-size: 9px; 
            color: #10b981; 
            opacity: 0.6;
            text-align: right; 
            font-weight: bold; 
            letter-spacing: 0.05em; 
            pointer-events: none;
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 4px;
          ">
            <span>ACCESS BRIEFING</span>
            <span style="font-size: 12px;">→</span>
          </div>
        </div>
      `;

      try {
        const popup = new maplibregl.Popup({ 
          closeOnClick: true, 
          closeButton: false,
          offset: 15,
          className: 'tactical-news-popup'
        })
          .setLngLat([lng, lat])
          .setHTML(htmlText)
          .addTo(mapRef.current);

        // Add event listener to the specific popup content
        const pollForContainer = setInterval(() => {
          const el = document.getElementById(popupId);
          if (el) {
            el.onclick = (e) => {
              e.stopPropagation();
              if (onHeadlineClick) {
                onHeadlineClick(activeNewsPopup);
                popup.remove();
              }
            };
            clearInterval(pollForContainer);
          }
        }, 50);

        // Cleanup interval after 2 seconds if not found
        setTimeout(() => clearInterval(pollForContainer), 2000);

        liveNewsPopupsRef.current.add(popup);

        // Auto remove after 10 seconds (matches animation duration)
        setTimeout(() => {
          if (liveNewsPopupsRef.current.has(popup)) {
            popup.remove();
            liveNewsPopupsRef.current.delete(popup);
          }
        }, 10000);
      } catch (err) {
        console.warn("Failed to mount map alerts popup", err);
      }
    }

    return () => {
      // We don't remove all popups on unmount of effect, only on unmount of component?
      // Wait, this is triggered when activeNewsPopup changes. 
      // We only want to remove all when the component fully unmounts, not on every re-render.
      // We'll leave the popups on the screen.
    };
  }, [activeNewsPopup, isStyleLoaded, isLiveNewsZoomEnabled, isFocusMode]);

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

// Sync Lines and Connection layers in MapLibre
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isStyleLoaded) return;

    const sourceId = "connection-lines-source";
    const layerGlowId = "connection-lines-glow-layer";
    const layerId = "connection-lines-layer";

    const getGreatCircleRoute = (start: [number, number], end: [number, number], pointsCount: number = 32): [number, number][] => {
      const [lng1, lat1] = start;
      const [lng2, lat2] = end;

      // Handle identical points or wrap coordinates nicely
      const distance = Math.sqrt(Math.pow(lng2 - lng1, 2) + Math.pow(lat2 - lat1, 2));
      if (distance < 0.1) {
        return [start, end];
      }

      const rLat1 = (lat1 * Math.PI) / 180;
      const rLng1 = (lng1 * Math.PI) / 180;
      const rLat2 = (lat2 * Math.PI) / 180;
      const rLng2 = (lng2 * Math.PI) / 180;

      // Spherical distance between the two points
      const d = 2 * Math.asin(Math.sqrt(
        Math.pow(Math.sin((rLat1 - rLat2) / 2), 2) +
        Math.cos(rLat1) * Math.cos(rLat2) * Math.pow(Math.sin((rLng1 - rLng2) / 2), 2)
      ));

      if (d === 0) return [start, end];

      const route: [number, number][] = [];
      for (let i = 0; i <= pointsCount; i++) {
        const f = i / pointsCount;
        const A = Math.sin((1 - f) * d) / Math.sin(d);
        const B = Math.sin(f * d) / Math.sin(d);

        const x = A * Math.cos(rLat1) * Math.cos(rLng1) + B * Math.cos(rLat2) * Math.cos(rLng2);
        const y = A * Math.cos(rLat1) * Math.sin(rLng1) + B * Math.cos(rLat2) * Math.sin(rLng2);
        const z = A * Math.sin(rLat1) + B * Math.sin(rLat2);

        const lat = Math.atan2(z, Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)));
        const lng = Math.atan2(y, x);

        route.push([(lng * 180) / Math.PI, (lat * 180) / Math.PI]);
      }
      return route;
    };

    const features = (partnerLines || []).map((line) => {
      const fromLatLng = line.coords[0];
      const toLatLng = line.coords[1];
      
      const arcCoords = getGreatCircleRoute(
        [fromLatLng[1], fromLatLng[0]], // [lng, lat]
        [toLatLng[1], toLatLng[0]] // [lng, lat]
      );
      
      return {
        type: "Feature",
        properties: {
          color: line.color || "#10b981",
        },
        geometry: {
          type: "LineString",
          coordinates: arcCoords,
        },
      };
    });

    const geojsonData: any = {
      type: "FeatureCollection",
      features: features.map(f => ({
        type: "Feature",
        properties: f.properties,
        geometry: f.geometry
      })),
    };

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: "geojson",
        data: geojsonData,
      });

      // 1. Neon glow layer (wider, high blur-ready appearance)
      map.addLayer({
        id: layerGlowId,
        type: "line",
        source: sourceId,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 6,
          "line-opacity": 0.25,
        },
      });

      // 2. Main foreground layer (sharp, brighter, dashed)
      map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 2,
          "line-opacity": 0.9,
          "line-dasharray": [3, 2],
        },
      });
    } else {
      const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
      if (source) {
        source.setData(geojsonData);
      }
    }
  }, [partnerLines, isStyleLoaded]);

  // Toggle 3D Buildings
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isStyleLoaded) return;

    if (show3DBuildings) {
      // Find the label layer to insert buildings beneath
      const layers = map.getStyle().layers;
      let labelLayerId: string | undefined;
      if (layers) {
        for (let i = 0; i < layers.length; i++) {
          if (layers[i].type === 'symbol' && layers[i].layout && (layers[i].layout as any)['text-field']) {
            labelLayerId = layers[i].id;
            break;
          }
        }
      }

      if (!map.getLayer('3d-buildings')) {
        // Standard OSM building source-layer is 'building' or 'buildings'
        // Carto/MapLibre often uses 'building'
        try {
          map.addLayer(
            {
              'id': '3d-buildings',
              'source': 'carto',
              'source-layer': 'building',
              'type': 'fill-extrusion',
              'minzoom': 15,
              'paint': {
                'fill-extrusion-color': '#555555',
                'fill-extrusion-height': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  15,
                  0,
                  15.05,
                  ['get', 'render_height']
                ],
                'fill-extrusion-base': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  15,
                  0,
                  15.05,
                  ['get', 'render_min_height']
                ],
                'fill-extrusion-opacity': 0.6
              }
            },
            labelLayerId
          );
        } catch (e) {
          console.warn("Could not add 3D buildings layer - possible source/layer mismatch", e);
        }
      } else {
        map.setLayoutProperty('3d-buildings', 'visibility', 'visible');
      }
    } else if (map.getLayer('3d-buildings')) {
      map.setLayoutProperty('3d-buildings', 'visibility', 'none');
    }
  }, [show3DBuildings, isStyleLoaded]);

  const resetOrientation = () => {
    if (mapRef.current) {
      mapRef.current.easeTo({
        bearing: 0,
        duration: 800
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
      {/* Space Background with Stars */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-[#020202]">
        {/* Simple CSS Starfield */}
        <div className="absolute inset-0 opacity-40 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIj48ZyBmaWxsPSIjRkZGIiBvcGFjaXR5PSIwLjgiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMTAwIiByPSIwLjUiLz48Y2lyY2xlIGN4PSIyMDAiIGN5PSI1MCIgcj0iMSIvPjxjaXJjbGUgY3g9IjM1MCIgY3k9IjI1MCIgcj0iMC41Ii8+PGNpcmNsZSBjeD0iMTAwIiBjeT0iMzAwIiByPSIxIi8+PGNpcmNsZSBjeD0iMjUwIiBjeT0iMzUwIiByPSIwLjUiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjIzMCIgcj0iMSIvPjxjaXJjbGUgY3g9IjMxMCIgY3k9IjEyMCIgcj0iMC41Ii8+PGNpcmNsZSBjeD0iMTUwIiBjeT0iMjAwIiByPSIwLjUiLz48L2c+PC9zdmc+')] mix-blend-screen mix-blend-screen [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]"></div>
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
        <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.9)] pointer-events-none" />
        
        {/* Central Tactical Crosshair */}
        {isFocusMode && (
          <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-[200px] h-[1px] bg-emerald-500/30" />
              <div className="absolute h-[200px] w-[1px] bg-emerald-500/30" />
              <div className="absolute w-[2px] h-[2px] bg-emerald-400 rounded-full" />
              <div className="absolute w-[80px] h-[80px] rounded-full border border-emerald-500/20" />
              <div className="absolute w-[400px] h-[400px] rounded-full border-[0.5px] border-dashed border-emerald-500/10" />
            </div>
          </div>
        )}

        {/* CRT Scanline Overlay */}
        {isFocusMode && (
          <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_4px,3px_100%]" />
        )}

      </div>



      {/* Navigation Controls */}
      <div className="absolute top-6 right-6 z-30 flex flex-col gap-2">
        <NavButton 
          icon={<Box size={16} />} 
          onClick={() => setShow3DBuildings(!show3DBuildings)} 
          active={show3DBuildings}
          label="TOGGLE_3D_STRUCTURES" 
          className="hidden md:flex"
        />
        <NavButton icon={<ZoomIn size={16} />} onClick={zoomIn} label="ZOOM_IN" className="hidden md:flex" />
        <NavButton icon={<ZoomOut size={16} />} onClick={zoomOut} label="ZOOM_OUT" className="hidden md:flex" />
        <div className="hidden md:block h-px bg-emerald-500/20 my-1 mx-2" />
        {/* Compass Instrument */}
        <button
          onClick={resetOrientation}
          className={cn(
            "w-12 h-12 flex items-center justify-center transition-all duration-300 border backdrop-blur-md rounded-full group/compass shadow-lg relative",
            "bg-black/60 border-emerald-500/30 text-emerald-500/70 hover:border-emerald-500 hover:text-emerald-400"
          )}
          title="Reset Orientation (North Up)"
        >
          {/* Compass Face */}
          <div className="relative w-10 h-10 flex items-center justify-center">
            {/* Outer Ring */}
            <div className="absolute inset-0 border border-emerald-500/20 rounded-full" />
            <div className="absolute inset-1 border-[0.5px] border-emerald-500/10 rounded-full" />
            
            {/* Degree Ticks */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
              <div 
                key={deg} 
                className={cn(
                  "absolute w-[1px] bg-emerald-500/40",
                  deg % 90 === 0 ? "h-1.5 w-[1.5px]" : "h-1"
                )}
                style={{ transform: `rotate(${deg}deg) translateY(-14px)` }} 
              />
            ))}
            
            {/* Cardinals */}
            <span className="absolute top-1 text-[6px] font-mono font-black text-emerald-500/60 tracking-tighter">N</span>
            <span className="absolute bottom-1 text-[6px] font-mono font-black text-emerald-500/30 tracking-tighter">S</span>
            <span className="absolute left-1 text-[6px] font-mono font-black text-emerald-500/30 tracking-tighter">W</span>
            <span className="absolute right-1 text-[6px] font-mono font-black text-emerald-500/30 tracking-tighter">E</span>

            {/* Needle Pivot */}
            <div className="absolute w-1 h-1 bg-emerald-500 rounded-full z-10 shadow-[0_0_5px_#10b981]" />

            {/* Rotating Needle */}
            <div 
              className="relative w-1 h-7 transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) flex flex-col"
              style={{ transform: `rotate(${-bearing}deg)` }}
            >
              {/* North Half (Red) */}
              <div className="w-full h-1/2 bg-gradient-to-t from-red-500 to-red-600 rounded-t-full shadow-[0_0_10px_rgba(239,68,68,0.4)]" />
              {/* South Half (Silver) */}
              <div className="w-full h-1/2 bg-gradient-to-b from-zinc-400 to-zinc-500 rounded-b-full shadow-[0_0_5px_rgba(255,255,255,0.1)] opacity-80" />
            </div>
          </div>

          <div className="absolute right-14 px-2 py-1 bg-black/80 text-[8px] text-emerald-500 border border-emerald-500/30 rounded opacity-0 group-hover/compass:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-mono tracking-widest uppercase">
            COMPASS_ORIENTATION
          </div>
        </button>

        <div className="h-px bg-emerald-500/20 my-1 mx-2" />
        <NavButton 
          icon={<Globe size={16} />} 
          onClick={resetOrientation} 
          active={zoom < 4}
          label="reset" 
        />
        <div className="hidden md:block h-px bg-emerald-500/20 my-1 mx-2" />
        
        {/* Slider scroll bar for Overhead to Angle view */}
        <div className="hidden md:flex flex-col items-center gap-1.5 py-2 px-1 border border-emerald-500/25 bg-black/80 backdrop-blur-md rounded-lg shadow-lg w-14 select-none">
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
  active = false,
  className
}: { 
  icon: React.ReactNode; 
  onClick: () => void; 
  label: string;
  active?: boolean;
  className?: string;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "w-10 h-10 flex items-center justify-center transition-all duration-300 border backdrop-blur-md rounded-lg group/btn shadow-lg",
      active 
        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" 
        : "bg-black/60 border-emerald-500/30 text-emerald-500/70 hover:border-emerald-500 hover:text-emerald-400",
      className
    )}
  >
    {icon}
    <div className="absolute right-12 px-2 py-1 bg-black/80 text-[8px] text-emerald-500 border border-emerald-500/30 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-mono tracking-widest">
      {label}
    </div>
  </button>
);
