import React, { useEffect, useRef, useState, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Polyline, Tooltip, Marker } from "react-leaflet";
import L from "leaflet";
// Add L.Icon.Default.imagePath to fix leaflet marker icon issue
L.Icon.Default.imagePath = "https://unpkg.com/leaflet@1.9.4/dist/images/";
import { COMPANIES, Company } from "../data/companies";
import { Newspaper, Crosshair, Maximize2 } from "lucide-react";
import { cn } from "../lib/utils";
import { SupplyChainGlobe } from "./SupplyChainGlobe";

// Helper component to control Leaflet map view
const MapController = ({ target, activeNewsStory }: { target: Company | null; activeNewsStory: any | null }) => {
  const map = useMap();
  useEffect(() => {
    // Focus on news story location if active, otherwise fallback to target
    const newsCompany = activeNewsStory ? COMPANIES.find(c => c.symbol === activeNewsStory.symbol) : null;
    const targetLocation = newsCompany || target;

    if (targetLocation && typeof targetLocation.lat === 'number' && !isNaN(targetLocation.lat)) {
      // Zoom out to global view first to emphasize the move
      map.flyTo([targetLocation.lat, targetLocation.lng], 2, { duration: 0.5 });
      
      // After a short delay, zoom in to the target
      const timer = setTimeout(() => {
        if (targetLocation && typeof targetLocation.lat === 'number' && !isNaN(targetLocation.lat)) {
          map.flyTo([targetLocation.lat, targetLocation.lng], 5, { duration: 1.5 });
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [target, activeNewsStory, map]);
  return null;
};

// Component to handle programmatic popup opening on selection
const SelectionPopupManager = ({ selectedStock }: { selectedStock: Company | null }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!selectedStock) return;
    
    // Delay slightly to ensure markers are mounted and flyTo has started
    const timer = setTimeout(() => {
      map.eachLayer((layer: any) => {
        if (layer instanceof L.Marker && (layer.options as any).alt === selectedStock.symbol) {
          layer.openPopup();
        }
      });
    }, 1500); // 1.5s delay to coincide with the end of MapController's flyTo
    
    return () => clearTimeout(timer);
  }, [selectedStock, map]);
  
  return null;
};

// Procedural News Pin Manager
const NewsPinManager = ({ activeNewsStory, news }: { activeNewsStory: any | null, news: any[] }) => {
  const map = useMap();
  const newsPinLayerRef = useRef<L.LayerGroup | null>(null);
  const droppedCoordsRef = useRef<Set<string>>(new Set());

  // Initialize Layer Group once
  useEffect(() => {
    if (!newsPinLayerRef.current) {
      newsPinLayerRef.current = L.layerGroup().addTo(map);
    }
  }, [map]);

  // Bulk drop pins for initial/updated news list
  useEffect(() => {
    if (!news || !Array.isArray(news) || news.length === 0 || !newsPinLayerRef.current) return;

    news.forEach(story => {
      if (!story || !story.symbol) return;
      const company = COMPANIES.find(c => c.symbol === story.symbol);
      if (!company || isNaN(company.lat) || isNaN(company.lng)) return;

      const coordKey = `${company.lat.toFixed(4)},${company.lng.toFixed(4)}`;
      if (droppedCoordsRef.current.has(coordKey)) return;

      const pinIcon = L.divIcon({
        className: 'news-brief-pin',
        html: `
          <div class="flex flex-col items-center">
            <div class="w-2.5 h-2.5 bg-emerald-500/80 rounded-full border border-black shadow-[0_0_5px_#10b981]"></div>
            <div class="w-[1px] h-3 bg-gradient-to-b from-emerald-500/80 to-transparent"></div>
          </div>
        `,
        iconSize: [20, 30],
        iconAnchor: [10, 25]
      });

      const pin = L.marker([company.lat, company.lng], { icon: pinIcon, opacity: 0.9, zIndexOffset: 800 })
        .bindPopup(`
          <div class="bg-black text-[8px] font-mono p-1 text-emerald-500 uppercase">
            Story: ${story.title.slice(0, 30)}...
          </div>
        `, { closeButton: false });
      
      pin.addTo(newsPinLayerRef.current!);
      droppedCoordsRef.current.add(coordKey);
    });
  }, [news]);

  // Drop Active Pin Logic Trigger
  useEffect(() => {
    if (!activeNewsStory) return;

    const company = COMPANIES.find(c => c.symbol === activeNewsStory.symbol);
    if (!company || isNaN(company.lat) || isNaN(company.lng)) return;

    const coordKey = `${company.lat.toFixed(4)},${company.lng.toFixed(4)}`;
    
    // For active news, we always want to force open its popup (even if pin exists)
    let activeMarker: L.Marker | null = null;
    newsPinLayerRef.current?.eachLayer((layer: any) => {
      if (layer instanceof L.Marker) {
        const pos = layer.getLatLng();
        if (pos.lat.toFixed(4) === company.lat.toFixed(4) && pos.lng.toFixed(4) === company.lng.toFixed(4)) {
          activeMarker = layer;
        }
      }
    });

    const customIcon = L.divIcon({
      className: 'news-terminal-pin',
      html: `
        <div class="flex flex-col items-center">
          <div class="relative flex items-center justify-center">
            <div class="w-8 h-8 bg-emerald-500/30 rounded-full animate-ping absolute"></div>
            <div class="w-3 h-3 bg-emerald-400 rounded-full border border-white shadow-[0_0_15px_#10b981] z-10"></div>
            <div class="absolute w-10 h-10 border border-emerald-500/20 rounded-full"></div>
            <div class="absolute w-8 h-[0.5px] bg-emerald-500/60"></div>
            <div class="absolute h-8 w-[0.5px] bg-emerald-500/60"></div>
          </div>
          <div class="w-[1.5px] h-12 bg-gradient-to-b from-emerald-400 to-transparent shadow-[0_0_10px_#10b981]"></div>
        </div>
      `,
      iconSize: [40, 60],
      iconAnchor: [20, 52]
    });

    const popupContent = `
      <div class="bg-[#050505] border border-emerald-900/50 p-3 min-w-[220px] font-mono shadow-[0_0_40px_rgba(0,0,0,0.9)] rounded-none">
         <div class="flex items-center justify-between mb-2 border-b border-emerald-900/40 pb-2">
           <div class="flex items-center gap-2">
             <span class="text-[7px] bg-emerald-500 text-black px-1.5 py-0.5 font-black uppercase tracking-tighter">SIG_STORY</span>
             <span class="text-[10px] text-emerald-400 font-black uppercase tracking-[0.1em]">${activeNewsStory.symbol || 'UKN'}</span>
           </div>
           <div class="w-1.5 h-1.5 bg-emerald-500 animate-pulse rounded-full"></div>
         </div>
         <div class="text-[11px] text-zinc-100 font-bold leading-[1.3] mb-3 uppercase tracking-tight">
           ${activeNewsStory.intelligence?.translatedTitle || activeNewsStory.title}
         </div>
         <div class="flex justify-between items-center text-[7px] font-black uppercase tracking-widest text-zinc-600">
           <span>LOC: ${company.lat.toFixed(2)}N / ${company.lng.toFixed(2)}E</span>
           <span class="text-emerald-900/60">RADAR_LOCK_V9</span>
         </div>
      </div>
    `;

    if (activeMarker) {
      (activeMarker as L.Marker).setIcon(customIcon);
      (activeMarker as L.Marker).setPopupContent(popupContent);
      (activeMarker as L.Marker).openPopup();
    } else {
      const pin = L.marker([company.lat, company.lng], { 
        icon: customIcon,
        zIndexOffset: 1000 
      }).bindPopup(popupContent, {
        className: 'terminal-map-popup',
        closeButton: false,
        offset: [0, -10]
      });

      if (newsPinLayerRef.current) {
        pin.addTo(newsPinLayerRef.current);
        droppedCoordsRef.current.add(coordKey);
        pin.openPopup();
      }
    }

  }, [activeNewsStory]);

  return null;
};

interface MapLayerProps {
  selectedStock: Company | null;
  focusStock?: Company | null;
  onSelectNode: (c: Company) => void;
  intelligenceFeed?: any[];
  isNewsCycling: boolean;
  toggleNewsCycling: () => void;
  activeTab?: string;
  news: any[];
  activeNewsStory?: any | null;
  setActiveNewsStory: (story: any | null) => void;
}

export const MapLayer: React.FC<MapLayerProps> = ({ 
  selectedStock, 
  focusStock,
  onSelectNode, 
  intelligenceFeed,
  isNewsCycling,
  toggleNewsCycling,
  activeTab,
  news,
  activeNewsStory,
  setActiveNewsStory
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const [dynamicNews, setDynamicNews] = useState<any[]>([]);
  const [newsAlert, setNewsAlert] = useState<any>(null);

  useEffect(() => {
    if (!isNewsCycling) return;

    // Simulate "Live" updates
      const liveUpdateInterval = setInterval(() => {
        const randomCompany = COMPANIES[Math.floor(Math.random() * COMPANIES.length)];
        const alerts = [
          { title: `Neural Link Uplink: ${randomCompany.symbol}`, summary: `Tactical telemetry detected at ${randomCompany.name} node. Market sentiment recalibrating.` },
          { title: `Silo Breach Detected: ${randomCompany.symbol}`, summary: `Cyber-intelligence reports significant resource shift at ${randomCompany.name} regional headquarters.` },
          { title: `Node Activation: ${randomCompany.symbol}`, summary: `Strategic partnership re-initialization detected for ${randomCompany.name}. Analyzing downstream impact.` },
          { title: `Volume Flux: ${randomCompany.symbol}`, summary: `Sudden volatility surge in ${randomCompany.symbol} neural stream. Potential institutional repositioning.` }
        ];
        const newStory = {
          ...alerts[Math.floor(Math.random() * alerts.length)],
          symbol: randomCompany.symbol,
          date: new Date().toISOString()
        };
        setDynamicNews(prev => [...prev, newStory].slice(-10)); // Keep last 10 live stories
        
        // Trigger Alert
        setNewsAlert(newStory);
        setTimeout(() => setNewsAlert(null), 5000);
        
      }, 30000); // 30s cycle for live news updates on map

    return () => clearInterval(liveUpdateInterval);
  }, [isNewsCycling]);

  useEffect(() => {
    if (!isNewsCycling) {
      setActiveNewsStory(null);
      return;
    }
  }, [isNewsCycling, setActiveNewsStory]);

  useEffect(() => {
    if (isNewsCycling && selectedStock && selectedStock.news && selectedStock.news.length > 0) {
      setActiveNewsStory({ ...selectedStock.news[0], symbol: selectedStock.symbol });
    }
  }, [selectedStock, isNewsCycling, setActiveNewsStory]);

  const arcsData = useMemo(() => {
    if (activeTab !== "PINNED" || !selectedStock || !selectedStock.partners) return [];
    return selectedStock.partners.map(pSymbol => {
      const partner = COMPANIES.find(c => c.symbol === pSymbol);
      if (!partner) return null;
      return {
        startLat: partner.lat,
        startLng: partner.lng,
        endLat: selectedStock.lat,
        endLng: selectedStock.lng,
        color: ["#ff8800", "#22ab94"]
      };
    }).filter(Boolean);
  }, [selectedStock, activeTab]);

  return (
    <div ref={containerRef} className="flex-1 relative bg-[#050505] overflow-hidden map-green-hued">
      {/* 2D PRIMARY MAP (Leaflet) */}
      <div className="absolute inset-0 z-0">
        <MapContainer 
          center={[20, 0]} 
          zoom={3} 
          scrollWheelZoom={true} 
          className="h-full w-full bg-zinc-950"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <MapController target={selectedStock} activeNewsStory={activeNewsStory} />
          <SelectionPopupManager selectedStock={selectedStock} />
          <NewsPinManager activeNewsStory={activeNewsStory} news={news} />
          

          {/* Persistent Company Pins */}
          {COMPANIES.map(company => {
            const isSelected = selectedStock?.symbol === company.symbol;
            const hasActiveNews = activeNewsStory && activeNewsStory.symbol === company.symbol;
            
            return (
              <Marker
                key={`company-${company.symbol}`}
                position={[company.lat, company.lng]}
                alt={company.symbol}
                zIndexOffset={isSelected ? 5000 : (hasActiveNews ? 1000 : 0)}
                icon={L.divIcon({
                  className: 'terminal-company-pin',
                  html: `
                    <div class="flex flex-col items-center group">
                      <div class="relative">
                        ${isSelected ? `
                          <!-- Tactical Selection Pin -->
                          <div class="absolute -inset-4 bg-emerald-500/10 rounded-full animate-pulse"></div>
                          <div class="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center animate-in slide-in-from-top-4 duration-500">
                             <div class="bg-emerald-500 text-black px-1.5 py-0.5 text-[8px] font-black font-mono border-x border-white shadow-[0_0_15px_rgba(16,185,129,0.6)] flex items-center gap-1">
                                <span class="animate-pulse">●</span> ${company.symbol}
                             </div>
                             <div class="w-0.5 h-6 bg-gradient-to-b from-white to-emerald-500"></div>
                          </div>
                          <div class="w-4 h-4 bg-white rounded-full border-2 border-emerald-500 shadow-[0_0_20px_#fff] z-50"></div>
                        ` : `
                          <div class="w-2.5 h-2.5 ${hasActiveNews ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]' : 'bg-zinc-700'} rounded-full border border-zinc-900 transition-all duration-300 group-hover:scale-125 group-hover:bg-white z-10"></div>
                        `}
                        <div class="absolute -top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black border border-zinc-800 text-[6px] px-1 text-zinc-400 font-mono tracking-widest uppercase pointer-events-none z-[6000]">
                          ${company.symbol}
                        </div>
                      </div>
                      ${!isSelected ? `<div class="w-[1px] h-4 bg-gradient-to-b ${hasActiveNews ? 'from-amber-400' : 'from-zinc-700'} to-transparent"></div>` : '<div class="w-[2px] h-6 bg-gradient-to-b from-emerald-500 to-transparent"></div>'}
                    </div>
                  `,
                  iconSize: isSelected ? [60, 80] : [20, 30],
                  iconAnchor: isSelected ? [30, 40] : [10, 26]
                })}
                eventHandlers={{
                  click: () => onSelectNode(company)
                }}
              >
                <Popup className="tactical-popup">
                  <div className="bg-[#050505] border border-zinc-800 p-3 font-mono text-[9px] min-w-[180px] shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                    <div className="flex justify-between items-start mb-2 border-b border-zinc-900 pb-2">
                      <div className="flex flex-col">
                        <span className="text-emerald-500 font-bold text-[11px]">${company.symbol}</span>
                        <span className="text-[6px] text-zinc-600 uppercase tracking-tighter">NODE_IDENTIFIER: {Math.floor(Math.random() * 999999)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[7px] bg-zinc-900 text-zinc-400 px-1 py-0.5 rounded">{company.country}</span>
                      </div>
                    </div>
                    
                    <div className="text-white font-black uppercase mb-3 tracking-tight text-[10px]">{company.name}</div>
                    
                    <div className="grid grid-cols-2 gap-y-2 text-[7px] uppercase tracking-widest text-zinc-500">
                      <div>Sector</div>
                      <div className="text-zinc-300 text-right">{company.sector}</div>
                      
                      <div>Workforce</div>
                      <div className="text-zinc-300 text-right">{company.workforce || 'NDA_PROTECTED'}</div>
                      
                      <div>H_Quarters</div>
                      <div className="text-zinc-300 text-right">{company.headquarters?.split(',')[0] || 'CLASSIFIED'}</div>
                      
                      <div>Network</div>
                      <div className="text-emerald-500/50 text-right italic font-bold">Active_Telemetry</div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-zinc-900 flex justify-between items-center">
                      <div className="text-[6px] text-zinc-700 uppercase tracking-tighter">COORD: {company.lat.toFixed(2)}N / {company.lng.toFixed(2)}E</div>
                      <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Supply Chain Lines on 2D Map */}
          {arcsData.map((arc: any, idx) => (
             <Polyline 
              key={idx}
              positions={[[arc.startLat, arc.startLng], [arc.endLat, arc.endLng]]}
              pathOptions={{ color: '#ff8800', weight: 1, opacity: 0.4, dashArray: '4, 4' }}
             />
          ))}

          {/* New News Alert */}
          {newsAlert && (() => {
            const company = COMPANIES.find(c => c.symbol === newsAlert.symbol);
            if (!company || isNaN(company.lat) || isNaN(company.lng)) return null;
            return (
              <Marker position={[company.lat, company.lng]} zIndexOffset={3000}>
                <Tooltip permanent direction="bottom" offset={[0, 15]} className="!bg-red-600 !border-white !text-white !font-mono !text-[10px] !font-black !uppercase !tracking-widest !shadow-[0_0_20px_red]">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-white animate-ping" />
                    PRIORITY_ALERT: {newsAlert.title}
                  </div>
                </Tooltip>
              </Marker>
            );
          })()}
          
        </MapContainer>
      </div>

      {/* News Summary Overlay - Briefing Pop Up - MOVED TO BOTTOM */}
      {isNewsCycling && activeNewsStory && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1002] w-[400px] max-w-[90vw] bg-black/95 border-t-2 border-emerald-500 p-4 font-mono text-white backdrop-blur-xl shadow-[0_-20px_50px_rgba(16,185,129,0.2)] animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-3 border-b border-emerald-900/30 pb-2">
            <div className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 animate-pulse" />
              Strategic_Briefing // Node_{activeNewsStory.symbol}
            </div>
            <div className="text-[7px] text-emerald-900 font-bold uppercase tracking-widest">Neural_Uplink_v4.2</div>
          </div>
          
          <div className="mb-2">
            <h3 className="text-[14px] font-bold text-white uppercase leading-tight mb-2 tracking-tight">
              {activeNewsStory.intelligence?.translatedTitle || activeNewsStory.title}
            </h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed italic border-l-2 border-emerald-500/20 pl-3">
              {activeNewsStory.intelligence?.intelligenceSummary || activeNewsStory.summary || activeNewsStory.description}
            </p>
          </div>

          <div className="flex justify-between items-center mt-4 pt-2 border-t border-zinc-900/50">
            <div className="text-[7px] text-zinc-700 uppercase tracking-widest flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-emerald-500" />
              Signal_Verified
            </div>
            <div className="text-[7px] text-emerald-500/50 font-bold">BYPASS_STILL_ENCRYPTED</div>
          </div>
        </div>
      )}

      {/* Mini Progress bar for cycle */}
      {isNewsCycling && (
        <div className="absolute top-0 left-0 right-0 h-0.5 z-[1005] bg-zinc-900">
          <div className="h-full bg-emerald-500 animate-[progress_30s_linear_infinite]" />
        </div>
      )}

      {/* Map HUD Control - Top Left */}
      <div className="absolute top-4 left-4 z-[1002] flex flex-col gap-2 pointer-events-auto">
        <button 
          onClick={toggleNewsCycling}
          className={cn(
            "w-10 h-10 border flex items-center justify-center transition-all backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)] group relative rounded-lg",
            isNewsCycling ? "bg-white text-black border-white shadow-[0_0_15px_white]" : "bg-zinc-900/90 border-zinc-800 text-white hover:bg-white hover:text-black"
          )}
        >
          <Newspaper className={cn("w-5 h-5 transition-transform", isNewsCycling ? "scale-110" : "group-hover:rotate-12")} />
          {isNewsCycling && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-black animate-pulse" />
          )}
        </button>
      </div>

      {/* Supply Chain Globe - Top Right */}
      <div className="absolute top-4 right-4 z-[1002]">
        <SupplyChainGlobe selectedStock={selectedStock} />
      </div>

      
      {/* Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-5 mix-blend-overlay z-[1001]" style={{ 
        backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
        backgroundSize: '100% 2px, 3px 100%'
      }}></div>
    </div>
  );
};

