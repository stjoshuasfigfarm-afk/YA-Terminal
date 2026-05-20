import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { COMPANIES, Company } from "../data/companies";
import { TrendingUp, MessageSquare, Cpu, Newspaper, Globe as GlobeIcon, Map as MapIcon } from "lucide-react";
import { cn } from "../lib/utils";
import { Globe } from "./Globe";

// Fix leaflet icon issue
// @ts-ignore
import icon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Marker Creator
const createPulseIcon = (color: string) => L.divIcon({
  className: "custom-pulsing-icon",
  html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 10px ${color}; animation: pulse 2s infinite;"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const defaultIcon = createPulseIcon("#ffffff");
const activeIcon = createPulseIcon("#ffffff");

// Utility to validate coordinates
const isValidCoord = (val: any): val is number => 
  typeof val === 'number' && !isNaN(val) && Number.isFinite(val);

const isSafeLatLng = (lat: any, lng: any): boolean => {
  try {
    if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
    
    // Check if it's already a number or can be converted
    const nLat = typeof lat === 'number' ? lat : parseFloat(String(lat));
    const nLng = typeof lng === 'number' ? lng : parseFloat(String(lng));
    
    // Explicit checks for NaN and Infinity using the most robust methods
    if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) {
      return false;
    }
    
    // Valid coordinate ranges for Earth
    return nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180;
  } catch {
    return false;
  }
};

// Safety wrapper for L.latLng to prevent crashes
const safeLatLng = (lat: any, lng: any): L.LatLng | null => {
  if (isSafeLatLng(lat, lng)) {
    try {
      return L.latLng(Number(lat), Number(lng));
    } catch {
      return null;
    }
  }
  return null;
};

// Controller component to handle fly-to
const MapController = ({ selectedPosition }: { selectedPosition: [number, number] | null }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedPosition && Array.isArray(selectedPosition)) {
      const lat = selectedPosition[0];
      const lng = selectedPosition[1];
      
      const pos = safeLatLng(lat, lng);
      if (pos) {
        try {
          map.flyTo(pos, 6, {
            duration: 1.5,
            easeLinearity: 0.25
          });
        } catch (err) {
          console.error("Map flyTo critically failed:", err, pos);
        }
      }
    }
  }, [selectedPosition, map]);

  return null;
};

interface MapLayerProps {
  selectedStock: Company | null;
  focusStock?: Company | null;
  onSelectNode: (c: Company) => void;
  intelligenceFeed?: any[];
  isIntelligenceStream?: boolean;
  toggleIntelligenceStream?: () => void;
  activeTab?: string;
}

export const MapLayer: React.FC<MapLayerProps> = ({ 
  selectedStock, 
  focusStock,
  onSelectNode, 
  intelligenceFeed,
  isIntelligenceStream,
  toggleIntelligenceStream,
  activeTab
}) => {
  const [is3DMode, setIs3DMode] = useState(true);
  
  const activePosition = React.useMemo((): [number, number] | null => {
    try {
      const target = focusStock || selectedStock;
      if (target && isSafeLatLng(target.lat, target.lng)) {
        const lat = Number(target.lat);
        const lng = Number(target.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return [lat, lng];
        }
      }
    } catch {
      return null;
    }
    return null;
  }, [focusStock, selectedStock]);

  // Derive partner lines
  const partnerLines = React.useMemo((): [number, number][][] => {
    const lines: [number, number][][] = [];
    if (activeTab === "PINNED" && selectedStock && selectedStock.partners && isSafeLatLng(selectedStock.lat, selectedStock.lng)) {
      const sLat = Number(selectedStock.lat);
      const sLng = Number(selectedStock.lng);
      
      selectedStock.partners.forEach(pSymbol => {
        const partner = COMPANIES.find(c => c.symbol === pSymbol);
        if (partner && isSafeLatLng(partner.lat, partner.lng)) {
          const pLat = Number(partner.lat);
          const pLng = Number(partner.lng);
          if (Number.isFinite(pLat) && Number.isFinite(pLng)) {
            lines.push([
              [sLat, sLng],
              [pLat, pLng]
            ]);
          }
        }
      });
    }
    return lines;
  }, [selectedStock, activeTab]);

  // Ref to store markers for programmatic popup opening
  const markerRefs = useRef<{ [key: string]: L.Marker | null }>({});

  useEffect(() => {
    if (is3DMode) return;
    try {
      const target = focusStock || selectedStock;
      if (target && markerRefs.current[target.symbol]) {
        const marker = markerRefs.current[target.symbol];
        if (marker) {
          // Delay to allow flyTo to progress
          const timer = setTimeout(() => {
            try {
              if (marker && typeof marker.openPopup === 'function') {
                marker.openPopup();
              }
            } catch (err) {
              console.warn("Could not open popup for marker", target.symbol, err);
            }
          }, 1200);
          return () => clearTimeout(timer);
        }
      }
    } catch (err) {
      console.warn("Popup effect failed gracefully", err);
    }
  }, [focusStock, selectedStock, is3DMode]);

  return (
    <div className="flex-1 relative bg-[#050505] overflow-hidden map-green-hued">
      {/* Map HUD Control - Top Left */}
      <div className="absolute top-4 left-4 z-[1002] flex flex-col gap-2 pointer-events-auto">
        <button 
          onClick={toggleIntelligenceStream}
          className={cn(
            "w-10 h-10 border flex items-center justify-center transition-all backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)] group relative",
            isIntelligenceStream ? "bg-white text-black border-white shadow-[0_0_15px_white]" : "bg-zinc-900/90 border-zinc-800 text-white hover:bg-white hover:text-black"
          )}
        >
          <Newspaper className={cn("w-5 h-5 transition-transform", isIntelligenceStream ? "scale-110" : "group-hover:rotate-12")} />
          <div className="absolute left-14 bg-black/95 border border-zinc-800 px-3 py-1.5 text-[10px] font-mono text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all uppercase tracking-[0.2em] border-l-2 border-l-white shadow-2xl translate-x-[-10px] group-hover:translate-x-0">
            {isIntelligenceStream ? "Neural_Stream_Enabled" : "Enable_Neural_Stream"}
          </div>
          {isIntelligenceStream && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-black animate-pulse" />
          )}
        </button>

        <button 
          onClick={() => setIs3DMode(true)}
          className={cn(
            "w-10 h-10 border flex items-center justify-center transition-all backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)] group relative",
            is3DMode ? "bg-white text-black border-white shadow-[0_0_15px_white]" : "bg-zinc-900/90 border-zinc-800 text-white hover:bg-white hover:text-black"
          )}
        >
          <GlobeIcon className="w-5 h-5" />
          <div className="absolute left-14 bg-black/95 border border-zinc-800 px-3 py-1.5 text-[10px] font-mono text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all uppercase tracking-[0.2em] border-l-2 border-l-white shadow-2xl translate-x-[-10px] group-hover:translate-x-0">
            Globe_View
          </div>
        </button>

        <button 
          onClick={() => setIs3DMode(false)}
          className={cn(
            "w-10 h-10 border flex items-center justify-center transition-all backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)] group relative",
            !is3DMode ? "bg-white text-black border-white shadow-[0_0_15px_white]" : "bg-zinc-900/90 border-zinc-800 text-white hover:bg-white hover:text-black"
          )}
        >
          <MapIcon className="w-5 h-5" />
          <div className="absolute left-14 bg-black/95 border border-zinc-800 px-3 py-1.5 text-[10px] font-mono text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all uppercase tracking-[0.2em] border-l-2 border-l-white shadow-2xl translate-x-[-10px] group-hover:translate-x-0">
            Map_View
          </div>
        </button>
      </div>
      
      <div className="absolute bottom-4 left-4 z-[1000] pointer-events-none">
        <div className="bg-zinc-900/80 p-2 border border-zinc-800 font-mono text-[9px] uppercase tracking-widest text-white backdrop-blur-sm shadow-xl">
          LAT: {activePosition && isSafeLatLng(activePosition[0], activePosition[1]) ? Number(activePosition[0]).toFixed(4) : "0.0000"} | LONG: {activePosition && isSafeLatLng(activePosition[0], activePosition[1]) ? Number(activePosition[1]).toFixed(4) : "0.0000"} | PROJECTION: {is3DMode ? "GLOBE_3D" : "MERCATOR_2D"}
        </div>
      </div>

      {is3DMode ? (
        <Globe 
          selectedStock={selectedStock} 
          onSelectNode={onSelectNode} 
        />
      ) : (
        <MapContainer
          center={[20, 0]}
          zoom={3}
          className="w-full h-full bg-black"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
            className="map-tile-layer"
          />
          
          <MapController selectedPosition={activePosition} />

          {COMPANIES.map((company) => {
            if (!isSafeLatLng(company.lat, company.lng)) return null;
            
            const isSelected = selectedStock?.symbol === company.symbol;
            const isFocus = focusStock?.symbol === company.symbol;
            const hasNews = isFocus && intelligenceFeed && intelligenceFeed.length > 0;
            
            const pos = safeLatLng(company.lat, company.lng);
            if (!pos) return null;
            
            return (
              <React.Fragment key={company.symbol}>
                <Marker
                  ref={(el) => { markerRefs.current[company.symbol] = el; }}
                  position={pos}
                  icon={isSelected ? activeIcon : defaultIcon}
                  eventHandlers={{
                    click: (e) => {
                      onSelectNode(company);
                      e.target.openPopup();
                    },
                    mouseover: (e) => {
                      e.target.openPopup();
                    },
                  }}
                >
                  <Popup className="custom-popup" offset={[0, -10]}>
                    <div className="bg-zinc-950 text-white p-2 border border-white/50 font-mono w-[180px]">
                      <div className="flex justify-between items-start mb-1">
                        <div className="text-white font-bold text-lg leading-none">{company.symbol}</div>
                        <div className="text-[8px] bg-white/20 text-white px-1 font-black">NODE_ACTIVE</div>
                      </div>
                      <div className="text-[10px] text-zinc-500 mb-1 truncate uppercase tracking-tighter">{company.name}</div>
                      
                      <div className="mt-2 space-y-1 border-t border-white/20 pt-2">
                        <div className="flex justify-between text-[9px]">
                          <span className="text-zinc-600">SECTOR</span>
                          <span className="text-zinc-300 truncate ml-2">{company.sector}</span>
                        </div>
                        {company.workforce && (
                          <div className="flex justify-between text-[9px]">
                            <span className="text-zinc-600">WORKFORCE</span>
                            <span className="text-white font-bold">{company.workforce}</span>
                          </div>
                        )}
                        {company.headquarters && (
                          <div className="flex justify-between text-[9px]">
                            <span className="text-zinc-600">HQ</span>
                            <span className="text-zinc-400 truncate ml-2">{company.headquarters}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>

                {/* Smaller pinned news stories */}
                {hasNews && intelligenceFeed!.slice(0, 2).map((item, nIdx) => {
                  const baseLat = typeof company.lat === 'number' ? company.lat : Number(company.lat);
                  const baseLng = typeof company.lng === 'number' ? company.lng : Number(company.lng);
                  
                  const pinLat = baseLat + (0.8 + nIdx * 1.5);
                  const pinLng = baseLng + (1.2 + nIdx * 0.5);
                  
                  const pinPos = safeLatLng(pinLat, pinLng);
                  if (!pinPos) return null;
                  
                  const publishedAt = item.published_at ? new Date(item.published_at) : null;
                  const timeStr = publishedAt && !isNaN(publishedAt.getTime()) 
                    ? publishedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : "--:--";
                  
                  return (
                    <Marker
                      key={`${company.symbol}-news-${nIdx}`}
                      position={pinPos}
                      icon={L.divIcon({
                      className: "news-pin-icon",
                      html: `
                        <div class="relative group">
                          <div class="absolute -left-2 -top-2 w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                          <div class="bg-black/90 border border-white/40 p-1.5 w-32 backdrop-blur-sm shadow-2xl opacity-80 group-hover:opacity-100 transition-opacity">
                            <div class="text-[7px] text-white font-mono leading-none mb-1 flex justify-between">
                              <span>INTEL_B64</span>
                              <span>${timeStr}</span>
                            </div>
                            <div class="text-[9px] text-white font-bold leading-tight line-clamp-2 uppercase">
                              ${item.intelligence?.translatedTitle || item.title || "TELEMETRY_DATA_INCOMPLETE"}
                            </div>
                          </div>
                        </div>
                      `,
                      iconSize: [128, 40],
                      iconAnchor: [0, 40]
                    })}
                    />
                  );
                })}
              </React.Fragment>
            );
          })}

          {partnerLines.map((line, idx) => (
            <Polyline
              key={idx}
              positions={line}
              pathOptions={{
                color: "#ffffff",
                weight: 1,
                dashArray: "5, 10",
                opacity: 0.3,
                className: "supply-chain-line"
              }}
            />
          ))}
        </MapContainer>
      )}

      {/* Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-5 mix-blend-overlay z-[1001]" style={{ 
        backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
        backgroundSize: '100% 2px, 3px 100%'
      }}></div>
    </div>
  );
};
