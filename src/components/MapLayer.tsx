import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, GeoJSON } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { COMPANIES, Company } from "../data/companies";
import { TrendingUp, MessageSquare, Cpu, Newspaper, Globe as GlobeIcon, Map as MapIcon, Zap, Network } from "lucide-react";
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
  showGlobalNetwork?: boolean;
  toggleGlobalNetwork?: () => void;
  activeTab?: string;
  marketData?: Record<string, any>;
  allNewsData?: any[];
  sentiment?: any;
  onInjectLiveNews?: () => void;
}

export const MapLayer: React.FC<MapLayerProps> = ({ 
  selectedStock, 
  focusStock,
  onSelectNode, 
  intelligenceFeed,
  isIntelligenceStream,
  toggleIntelligenceStream,
  showGlobalNetwork,
  toggleGlobalNetwork,
  activeTab,
  marketData = {},
  allNewsData = [],
  sentiment,
  onInjectLiveNews
}) => {
  const [is3DMode, setIs3DMode] = useState(true);
  const [showNewsSummary, setShowNewsSummary] = useState(false);
  const [activeNewsIdx, setActiveNewsIdx] = useState(0);

  const [countriesGeoJson, setCountriesGeoJson] = useState<any>(null);
  const [statesGeoJson, setStatesGeoJson] = useState<any>(null);

  // Fetch GeoJSON borders for 2D Map rendering
  useEffect(() => {
    let isMounted = true;
    
    fetch("https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson")
      .then(res => {
        if (!res.ok) throw new Error("Status: " + res.status);
        return res.json();
      })
      .then(data => {
        if (isMounted) setCountriesGeoJson(data);
      })
      .catch(err => console.error("Could not load 2D country boundaries", err));

    fetch("https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_1_states_provinces.geojson")
      .then(res => {
        if (!res.ok) throw new Error("Status: " + res.status);
        return res.json();
      })
      .then(data => {
        if (isMounted) setStatesGeoJson(data);
      })
      .catch(err => console.error("Could not load 2D state boundaries", err));

    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-cycle through news items
  useEffect(() => {
    if (!showNewsSummary || !intelligenceFeed || intelligenceFeed.length === 0) return;
    
    // Safety check for index bound
    if (activeNewsIdx >= intelligenceFeed.length) {
      setActiveNewsIdx(0);
    }

    const interval = setInterval(() => {
      setActiveNewsIdx(prev => (prev + 1) % intelligenceFeed.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [showNewsSummary, intelligenceFeed, activeNewsIdx]);

  // Reset index on focal/selected stock changes
  useEffect(() => {
    setActiveNewsIdx(0);
  }, [selectedStock, focusStock]);
  
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
          <Zap className={cn("w-5 h-5 transition-transform text-amber-500", isIntelligenceStream ? "scale-110 animate-pulse" : "group-hover:rotate-12")} />
          <div className="absolute left-14 bg-black/95 border border-zinc-800 px-3 py-1.5 text-[10px] font-mono text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all uppercase tracking-[0.2em] border-l-2 border-l-white shadow-2xl translate-x-[-10px] group-hover:translate-x-0">
            {isIntelligenceStream ? "Neural_Stream_Enabled" : "Enable_Neural_Stream"}
          </div>
        </button>

        <button 
          onClick={toggleGlobalNetwork}
          className={cn(
            "w-10 h-10 border flex items-center justify-center transition-all backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)] group relative",
            showGlobalNetwork ? "bg-white text-black border-white shadow-[0_0_15px_white]" : "bg-zinc-900/90 border-zinc-800 text-white hover:bg-white hover:text-black"
          )}
        >
          <Network className={cn("w-5 h-5 transition-transform text-blue-500", showGlobalNetwork ? "scale-110" : "group-hover:rotate-12")} />
          <div className="absolute left-14 bg-black/95 border border-zinc-800 px-3 py-1.5 text-[10px] font-mono text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all uppercase tracking-[0.2em] border-l-2 border-l-white shadow-2xl translate-x-[-10px] group-hover:translate-x-0">
            Network
          </div>
        </button>

        <button 
          onClick={() => setIs3DMode(!is3DMode)}
          className={cn(
            "w-10 h-10 border flex items-center justify-center transition-all backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)] group relative bg-zinc-900/90 border-zinc-800 text-white hover:bg-white hover:text-black"
          )}
        >
          {is3DMode ? <MapIcon className="w-5 h-5" /> : <GlobeIcon className="w-5 h-5" />}
          <div className="absolute left-14 bg-black/95 border border-zinc-800 px-3 py-1.5 text-[10px] font-mono text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all uppercase tracking-[0.2em] border-l-2 border-l-white shadow-2xl translate-x-[-10px] group-hover:translate-x-0">
            {is3DMode ? "Switch_to_2D_Projection" : "Initialize_3D_Globe"}
          </div>
        </button>

        <button 
          onClick={() => setShowNewsSummary(!showNewsSummary)}
          className={cn(
            "w-10 h-10 border flex items-center justify-center transition-all backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)] group relative",
            showNewsSummary ? "bg-white text-black border-white shadow-[0_0_15px_white]" : "bg-zinc-900/90 border-zinc-800 text-white hover:bg-white hover:text-black"
          )}
        >
          <Newspaper className="w-5 h-5 text-emerald-500" />
          <div className="absolute left-14 bg-black/95 border border-zinc-800 px-3 py-1.5 text-[10px] font-mono text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all uppercase tracking-[0.2em] border-l-2 border-l-white shadow-2xl translate-x-[-10px] group-hover:translate-x-0">
            {showNewsSummary ? "Hide_News_Summary" : "Show_News_Summary"}
          </div>
        </button>
      </div>
      
      {!showNewsSummary && (
        <div className="absolute left-4 bottom-4 z-[1000] w-[calc(100%-2rem)] max-w-[340px] md:max-w-[380px] pointer-events-auto select-text">
          {(() => {
            const activeCompany = focusStock || selectedStock || COMPANIES[0];
            const currentNewsItem = intelligenceFeed && intelligenceFeed.length > 0 ? intelligenceFeed[activeNewsIdx] : null;

            return (
              <div className="bg-zinc-950/95 border border-zinc-900 shadow-[0_0_25px_rgba(0,0,0,0.85)] backdrop-blur-md p-3.5 flex flex-col gap-2.5 rounded-sm">
                {/* Header Tag */}
                <div className="flex items-center justify-between font-mono text-[8px] select-none text-zinc-400">
                  <div className="flex items-center gap-1.5 uppercase font-bold text-emerald-400">
                    <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span>SIGNAL BROADCAST: {activeCompany.symbol}</span>
                  </div>
                  <div className="flex items-center gap-1.5 grayscale opacity-70">
                    {currentNewsItem?.published_at && (
                      <span className="text-zinc-500 font-medium">
                        {new Date(currentNewsItem.published_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    )}
                    <span className="text-zinc-700">|</span>
                    <span className="bg-zinc-900 px-1 py-0.5 rounded text-zinc-300 font-mono">
                      {intelligenceFeed && intelligenceFeed.length > 0 ? `${activeNewsIdx + 1}/${intelligenceFeed.length}` : "0/0"}
                    </span>
                  </div>
                </div>

                {/* News Title & Link */}
                <div className="space-y-1">
                  {currentNewsItem ? (
                    <>
                      <h4 className="text-[11.5px] uppercase font-black text-zinc-100 leading-snug tracking-wide line-clamp-2 select-text hover:text-emerald-400 cursor-pointer transition-colors"
                          onClick={() => setShowNewsSummary(true)}>
                        {currentNewsItem.intelligence?.translatedTitle || currentNewsItem.title}
                      </h4>
                      <p className="text-[10px] text-zinc-300 leading-normal italic line-clamp-3 select-text pr-1 pt-0.5">
                        {currentNewsItem.description || currentNewsItem.summary || "Secured node connection active. No secondary description signal found on this link."}
                      </p>
                    </>
                  ) : (
                    <div className="py-2 text-[10px] text-zinc-500 italic uppercase font-semibold">
                      Connecting to neural intelligence feed...
                    </div>
                  )}
                </div>

                {/* Interactive Action Controls */}
                <div className="border-t border-zinc-900/80 pt-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => {
                        if (intelligenceFeed && intelligenceFeed.length > 0) {
                          setActiveNewsIdx(prev => (prev - 1 + intelligenceFeed.length) % intelligenceFeed.length);
                        }
                      }}
                      className="px-2 py-1 border border-zinc-805 hover:border-zinc-700 text-[8px] font-mono uppercase tracking-tight text-zinc-400 hover:text-white transition-colors bg-zinc-950 hover:bg-zinc-900 rounded-sm cursor-pointer"
                    >
                      &lt; PREV
                    </button>
                    <button 
                      onClick={() => {
                        if (intelligenceFeed && intelligenceFeed.length > 0) {
                          setActiveNewsIdx(prev => (prev + 1) % intelligenceFeed.length);
                        }
                      }}
                      className="px-2 py-1 border border-zinc-805 hover:border-zinc-700 text-[8px] font-mono uppercase tracking-tight text-zinc-400 hover:text-white transition-colors bg-zinc-950 hover:bg-zinc-900 rounded-sm cursor-pointer"
                    >
                      NEXT &gt;
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {currentNewsItem?.url && currentNewsItem.url !== "https://example.com" && (
                      <a 
                        href={currentNewsItem.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900 text-[8px] font-mono uppercase tracking-wider text-zinc-400 hover:text-emerald-400 transition-all rounded-sm"
                      >
                        Source ↗
                      </a>
                    )}
                    <button 
                      onClick={() => setShowNewsSummary(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1 border border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500 hover:bg-emerald-500/10 text-[8px] font-mono uppercase tracking-wider text-emerald-400 hover:text-emerald-300 transition-all rounded-sm cursor-pointer"
                    >
                      <Newspaper className="w-2.5 h-2.5" />
                      <span>ANALYZE BROADCAST</span>
                    </button>
                  </div>
                </div>

                {/* Subtly embedded coordinate telemetry line */}
                <div className="border-t border-zinc-900/40 pt-1.5 flex justify-between font-mono text-[7px] text-zinc-500 uppercase tracking-widest select-none">
                  <div>HQ: {activeCompany.headquarters || "USA"}</div>
                  <div>
                    {activePosition && isSafeLatLng(activePosition[0], activePosition[1]) 
                      ? `${activePosition[0].toFixed(3)}N, ${activePosition[1].toFixed(3)}E` 
                      : "0.000N, 0.000E"
                    }
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {is3DMode ? (
        <Globe 
          selectedStock={selectedStock} 
          onSelectNode={onSelectNode} 
          marketData={marketData}
          newsData={allNewsData}
          sentiment={sentiment}
          showAllConnections={showGlobalNetwork}
          onInjectLiveNews={onInjectLiveNews}
        />
      ) : (
        <MapContainer
          center={[20, 0]}
          zoom={3}
          className="w-full h-full bg-[#13263a]"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
            className="map-tile-layer"
          />
          
          {countriesGeoJson && (
            <GeoJSON
              key={`map-countries-${countriesGeoJson.features?.length || 0}`}
              data={countriesGeoJson}
              style={{
                fillColor: "transparent",
                color: "#1e40af", // deep base blue outline for countries
                weight: 1.2,
                opacity: 0.5,
                fillOpacity: 0
              }}
            />
          )}

          {statesGeoJson && (
            <GeoJSON
              key={`map-states-${statesGeoJson.features?.length || 0}`}
              data={statesGeoJson}
              style={{
                fillColor: "transparent",
                color: "#0369a1", // beautiful slate sky-blue state borders
                weight: 0.6,
                opacity: 0.5,
                fillOpacity: 0
              }}
            />
          )}
          
          <MapController selectedPosition={activePosition} />

          {COMPANIES.map((company) => {
            if (!isSafeLatLng(company.lat, company.lng)) return null;
            
            const isSelected = selectedStock?.symbol === company.symbol;
            const isFocus = focusStock?.symbol === company.symbol;
            const hasNews = isFocus && intelligenceFeed && intelligenceFeed.length > 0;
            
            // Calculate activity score for 2D icons
            const quote = marketData[company.symbol];
            const volatility = quote ? Math.abs(parseFloat(quote.dp) || 0) : 0;
            const companyNewsCount = allNewsData.filter(n => n.symbol === company.symbol).length;
            const activityScore = Math.min(1, (volatility / 5) + (companyNewsCount / 10));

            const iconColor = activityScore > 0.7 ? "#f59e0b" : activityScore > 0.4 ? "#3b82f6" : "#10b981";
            const pulseSpeed = 2 / (1 + activityScore * 3);
            
            const customIcon = L.divIcon({
              className: "custom-pulsing-icon",
              html: `<div style="background-color: ${isSelected ? '#ffffff' : iconColor}; width: ${isSelected ? '14px' : '10px'}; height: ${isSelected ? '14px' : '10px'}; border-radius: 50%; box-shadow: 0 0 ${isSelected ? '15px #ffffff' : (activityScore * 15 + 'px ' + iconColor)}; animation: pulse ${pulseSpeed}s infinite;"></div>`,
              iconSize: [14, 14],
              iconAnchor: [7, 7]
            });

            const pos = safeLatLng(company.lat, company.lng);
            if (!pos) return null;
            
            return (
              <React.Fragment key={company.symbol}>
                <Marker
                  ref={(el) => { markerRefs.current[company.symbol] = el; }}
                  position={pos}
                  icon={customIcon}
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

      {showNewsSummary && (
        <div className="absolute bottom-0 left-0 right-0 z-[1002] w-full border-t border-zinc-900 bg-zinc-950/98 shadow-[0_-10px_35px_rgba(0,0,0,0.95)] backdrop-blur-md flex flex-col md:flex-row pointer-events-auto select-text">
          {(() => {
            const activeCompany = focusStock || selectedStock || COMPANIES[0];
            const currentNewsItem = intelligenceFeed && intelligenceFeed.length > 0 ? intelligenceFeed[activeNewsIdx] : null;
            
            return (
              <div className="w-full flex flex-col md:flex-row min-h-[140px] md:min-h-0">
                {/* 1. Left Section: Corporate Info stats block */}
                <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-900/60 p-4 shrink-0 flex flex-col justify-between bg-black/40 font-mono">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[14px] font-black tracking-tight text-white">{activeCompany.symbol}</span>
                      <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 border border-emerald-500/20 font-bold uppercase tracking-widest leading-none">NODE_READY</span>
                    </div>
                    <div className="text-[9.5px] text-zinc-450 font-semibold truncate mb-3 uppercase tracking-tighter">{activeCompany.name}</div>
                    
                    <div className="space-y-1.5 border-t border-zinc-900/80 pt-2.5">
                      <div className="flex justify-between text-[9px] items-center">
                        <span className="text-zinc-600 uppercase tracking-tighter">SECTOR</span>
                        <span className="text-zinc-300 truncate text-right max-w-[130px] font-medium">{activeCompany.sector}</span>
                      </div>
                      <div className="flex justify-between text-[9px] items-center">
                        <span className="text-zinc-650 uppercase tracking-tighter font-bold text-emerald-500/80">WORKFORCE</span>
                        <span className="text-emerald-400 font-bold">{activeCompany.workforce || "N/A"}</span>
                      </div>
                      <div className="flex justify-between text-[9px] items-center">
                        <span className="text-zinc-600 uppercase tracking-tighter">HQ_LOCATION</span>
                        <span className="text-zinc-400 truncate text-right max-w-[130px]">{activeCompany.headquarters || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 md:mt-4 text-[7px] text-zinc-600 uppercase tracking-widest flex items-center gap-1.5 pt-2 border-t border-zinc-900/40 select-none">
                    <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span>SECURE METRIC BROADCAST</span>
                  </div>
                </div>

                {/* 2. Middle Section: Highly readable & responsive News Story */}
                <div className="flex-1 p-4 flex flex-col justify-center min-w-0 bg-zinc-950/40 md:py-3.5">
                  {currentNewsItem ? (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 font-mono text-[8px] select-none">
                        <span className="text-emerald-400 font-black uppercase tracking-widest bg-emerald-500/5 px-2 py-0.5 border border-emerald-500/10">TELEMETRY_BRIEF</span>
                        <span className="text-zinc-500">
                          {currentNewsItem.published_at 
                            ? new Date(currentNewsItem.published_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) + " " + new Date(currentNewsItem.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : "--:--"
                          }
                        </span>
                        <div className="h-[1px] flex-1 bg-zinc-900/60" />
                      </div>
                      <div>
                        <h2 className="text-xs md:text-[13px] font-extrabold text-zinc-100 uppercase tracking-wide leading-snug select-text hover:text-emerald-400 transition-colors">
                          {currentNewsItem.intelligence?.translatedTitle || currentNewsItem.title}
                        </h2>
                        <p className="mt-1.5 text-[10.5px] md:text-[11.5px] leading-relaxed text-zinc-300 select-text max-h-[64px] overflow-y-auto italic font-sans pr-2 text-justify">
                          {currentNewsItem.description || currentNewsItem.summary || "No secondary signal analysis found on this broadcast."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 select-none">
                      <span className="text-zinc-600 font-bold uppercase tracking-widest text-[9.5px] font-mono">
                        No active news telemetry stream detected for this node.
                      </span>
                    </div>
                  )}
                </div>

                {/* 2.5 New Middle-Right Section: Supply Chain Inbound/Outbound vectors */}
                <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-zinc-900/60 p-4 shrink-0 flex flex-col justify-between bg-zinc-950/20 font-mono">
                  <div>
                    <div className="text-[8px] text-zinc-500 uppercase tracking-widest mb-2 font-bold flex items-center justify-between select-none">
                      <span>TOPOLOGY VECTORS</span>
                      <span className="text-[7px] text-emerald-500/80 font-medium">REAL-TIME</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Inbound (Suppliers) -> Yellow */}
                      <div>
                        <div className="text-[7.5px] text-zinc-400 uppercase font-bold tracking-widest mb-1.5 flex items-center gap-1 select-none">
                          <span className="w-1.5 h-1.5 bg-[#eab308] rounded-full inline-block" />
                          <span>SUPPLIERS ({COMPANIES.filter(c => c.partners?.includes(activeCompany.symbol)).length})</span>
                        </div>
                        <div className="space-y-1 max-h-[85px] overflow-y-auto custom-scrollbar pr-1">
                          {COMPANIES.filter(c => c.partners?.includes(activeCompany.symbol)).length > 0 ? (
                            COMPANIES.filter(c => c.partners?.includes(activeCompany.symbol)).map(c => (
                              <div 
                                key={c.symbol} 
                                onClick={() => onSelectNode(c)}
                                className="flex items-center justify-between bg-zinc-900/50 p-1 border border-zinc-900 rounded-sm hover:border-[#eab308]/40 hover:bg-zinc-900 cursor-pointer transition-all text-[8px]"
                              >
                                <span className="text-zinc-300 font-bold">{c.symbol}</span>
                                <span className="text-[7px] text-zinc-650 font-medium tracking-tight truncate max-w-[90px]">{c.sector.split(' ')[0]}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-[7px] text-zinc-700 italic uppercase">NONE DETECTED</div>
                          )}
                        </div>
                      </div>

                      {/* Outbound (Customers) -> Green */}
                      <div>
                        <div className="text-[7.5px] text-zinc-400 uppercase font-bold tracking-widest mb-1.5 flex items-center gap-1 select-none">
                          <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full inline-block" />
                          <span>CUSTOMERS ({COMPANIES.filter(c => activeCompany.partners?.includes(c.symbol)).length})</span>
                        </div>
                        <div className="space-y-1 max-h-[85px] overflow-y-auto custom-scrollbar pr-1">
                          {COMPANIES.filter(c => activeCompany.partners?.includes(c.symbol)).length > 0 ? (
                            COMPANIES.filter(c => activeCompany.partners?.includes(c.symbol)).map(c => (
                              <div 
                                key={c.symbol}
                                onClick={() => onSelectNode(c)}
                                className="flex items-center justify-between bg-zinc-900/50 p-1 border border-zinc-900 rounded-sm hover:border-[#22c55e]/40 hover:bg-zinc-900 cursor-pointer transition-all text-[8px]"
                              >
                                <span className="text-zinc-350 font-bold">{c.symbol}</span>
                                <span className="text-[7px] text-zinc-650 font-medium tracking-tight truncate max-w-[90px]">{c.sector.split(' ')[0]}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-[7px] text-zinc-700 italic uppercase">NONE DETECTED</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-[7px] text-zinc-700 uppercase tracking-tight flex items-center gap-1 select-none">
                    <span>RELATION STATUS:</span>
                    <span className="text-zinc-550 font-bold">MULTILATERAL GLOBAL SUPPLY</span>
                  </div>
                </div>

                {/* 3. Right Section: Controls */}
                <div className="w-full md:w-44 border-t md:border-t-0 md:border-l border-zinc-900/60 p-4 shrink-0 flex md:flex-col justify-between items-center md:items-stretch bg-black/40 font-mono text-center">
                  <div className="hidden md:flex justify-between items-center mb-2 select-none">
                    <span className="text-[7.5px] text-zinc-600 uppercase tracking-widest">NAV_STATIONS</span>
                    <button 
                      onClick={() => setShowNewsSummary(false)}
                      className="text-[9px] text-zinc-500 hover:text-white uppercase transition-colors"
                    >
                      [CLOSE]
                    </button>
                  </div>

                  <div className="flex items-center gap-2 justify-center py-1 flex-1 md:flex-none">
                    <button 
                      onClick={() => {
                        if (intelligenceFeed && intelligenceFeed.length > 0) {
                          setActiveNewsIdx(prev => (prev - 1 + intelligenceFeed.length) % intelligenceFeed.length);
                        }
                      }}
                      className="w-10 h-7 flex items-center justify-center border border-zinc-850 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors text-[9.5px] bg-zinc-950/50 hover:bg-zinc-900"
                    >
                      &lt; PREV
                    </button>
                    <span className="text-[8.5px] text-zinc-455 px-1 font-mono whitespace-nowrap min-w-[28px] select-none">
                      {intelligenceFeed && intelligenceFeed.length > 0 ? `${activeNewsIdx + 1}/${intelligenceFeed.length}` : "0/0"}
                    </span>
                    <button 
                      onClick={() => {
                        if (intelligenceFeed && intelligenceFeed.length > 0) {
                          setActiveNewsIdx(prev => (prev + 1) % intelligenceFeed.length);
                        }
                      }}
                      className="w-10 h-7 flex items-center justify-center border border-zinc-850 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors text-[9.5px] bg-zinc-950/50 hover:bg-zinc-900"
                    >
                      NEXT &gt;
                    </button>
                  </div>

                  <button 
                    onClick={() => setShowNewsSummary(false)}
                    className="md:hidden ml-auto border border-zinc-800 hover:border-zinc-500 text-white font-mono px-3 py-1.5 text-[9px] uppercase tracking-wider"
                  >
                    CLOSE
                  </button>

                  <div className="hidden md:block mt-3 text-[7.5px] text-zinc-550 tracking-wider h-4 select-none">
                    {intelligenceFeed && intelligenceFeed.length > 0 && (
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="inline-block w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                        <span>CYCLES IN LIVE FLOW</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-5 mix-blend-overlay z-[1001]" style={{ 
        backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
        backgroundSize: '100% 2px, 3px 100%'
      }}></div>
    </div>
  );
};
