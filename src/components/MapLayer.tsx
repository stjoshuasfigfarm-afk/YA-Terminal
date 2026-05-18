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
    const targetLocation = activeNewsStory && COMPANIES.find(c => c.symbol === activeNewsStory.symbol) 
      ? COMPANIES.find(c => c.symbol === activeNewsStory.symbol) 
      : target;

    if (targetLocation) {
      // Zoom out to global view first to emphasize the move
      map.flyTo([targetLocation.lat, targetLocation.lng], 2, { duration: 0.5 });
      
      // After a short delay, zoom in to the target
      const timer = setTimeout(() => {
        map.flyTo([targetLocation.lat, targetLocation.lng], 5, { duration: 1.5 });
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [target, activeNewsStory, map]);
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
          

          {COMPANIES.filter(c => !isNewsCycling || (activeNewsStory && c.symbol === activeNewsStory.symbol)).map(company => (
            <CircleMarker
              key={company.symbol}
              center={[company.lat, company.lng]}
              radius={selectedStock?.symbol === company.symbol ? 8 : (isNewsCycling ? 4 : 6)}
              pathOptions={{
                color: selectedStock?.symbol === company.symbol ? '#22ab94' : (isNewsCycling ? '#555' : '#888'),
                fillColor: selectedStock?.symbol === company.symbol ? '#22ab94' : (isNewsCycling ? '#222' : '#444'),
                fillOpacity: isNewsCycling ? 0.8 : 0.9,
                weight: isNewsCycling ? 1 : 2
              }}
              eventHandlers={{
                click: () => onSelectNode(company)
              }}
            >
              <Tooltip sticky>{company.symbol}</Tooltip>
              <Popup className="tactical-popup">
                <div className="bg-zinc-950 border border-zinc-800 p-2 font-mono text-[10px] text-white">
                  <div className="text-emerald-500 font-bold mb-1">{company.symbol} // {company.name}</div>
                  <div className="text-[8px] text-zinc-500 uppercase tracking-widest">Sector: {company.sector}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Supply Chain Lines on 2D Map */}
          {arcsData.map((arc: any, idx) => (
             <Polyline 
              key={idx}
              positions={[[arc.startLat, arc.startLng], [arc.endLat, arc.endLng]]}
              pathOptions={{ color: '#ff8800', weight: 1, opacity: 0.4, dashArray: '4, 4' }}
             />
          ))}
          {/* Intelligence BRIEF - All news stories mapped to their nodes */}
          {news && news.map((story, i) => {
            const company = COMPANIES.find(c => c.symbol === story.symbol);
            if (!company) return null;
            
            const isActive = activeNewsStory && 
              (story.intelligence?.translatedTitle || story.title) === (activeNewsStory.intelligence?.translatedTitle || activeNewsStory.title);
            
            return (
              <Marker 
                key={`${story.symbol}-${i}-${isActive}`}
                position={[company.lat, company.lng]}
                icon={L.divIcon({
                  className: 'custom-div-icon',
                  html: `<div class="relative ${isActive ? 'z-[2000]' : 'z-[500]'}">
                    ${isActive ? `
                      <div class="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-emerald-500 text-black px-2 py-1 font-mono font-black text-[10px] uppercase tracking-tighter border border-white shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-in zoom-in duration-300">
                        ${(story.intelligence?.translatedTitle || story.title).slice(0, 50)}${(story.intelligence?.translatedTitle || story.title).length > 50 ? '...' : ''}
                      </div>
                      <div class="w-5 h-5 rounded-full bg-white animate-ping opacity-75"></div>
                      <div class="w-4 h-4 absolute top-0.5 left-0.5 rounded-full bg-emerald-400 border-2 border-black shadow-[0_0_15px_white]"></div>
                    ` : `
                      <div class="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 text-emerald-500/80 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest border border-emerald-900/50 backdrop-blur-sm opacity-60 group-hover:opacity-100 transition-opacity">
                        ${(story.intelligence?.translatedTitle || story.title).slice(0, 25)}...
                      </div>
                      <div class="w-2 h-2 absolute top-1.5 left-1.5 rounded-full bg-emerald-900 border border-emerald-500/30"></div>
                    `}
                  </div>`,
                  iconSize: [24, 24],
                  iconAnchor: [12, 12]
                })}
              />
            );
          })}

          {/* New News Alert */}
          {newsAlert && COMPANIES.find(c => c.symbol === newsAlert.symbol) && (
            <Marker position={[COMPANIES.find(c => c.symbol === newsAlert.symbol)!.lat, COMPANIES.find(c => c.symbol === newsAlert.symbol)!.lng]} zIndexOffset={3000}>
              <Tooltip permanent direction="bottom" offset={[0, 15]} className="!bg-red-600 !border-white !text-white !font-mono !text-[10px] !font-black !uppercase !tracking-widest !shadow-[0_0_20px_red]">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-white animate-ping" />
                  PRIORITY_ALERT: {newsAlert.title}
                </div>
              </Tooltip>
            </Marker>
          )}
          
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

