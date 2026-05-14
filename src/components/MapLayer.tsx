import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { COMPANIES, Company } from "../data/companies";
import { TrendingUp, MessageSquare, Cpu, Activity } from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";

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

const defaultIcon = createPulseIcon("#22ab94");
const activeIcon = createPulseIcon("#ffffff");

// Controller component to handle fly-to
const MapController = ({ selectedPosition }: { selectedPosition: [number, number] | null }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedPosition) {
      map.flyTo(selectedPosition, 6, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [selectedPosition, map]);

  return null;
};

interface MapLayerProps {
  selectedStock: Company | null;
  onSelectNode: (c: Company) => void;
  intelligenceFeed?: any[];
  quote?: any;
  profile?: any;
}

export const MapLayer: React.FC<MapLayerProps> = ({ selectedStock, onSelectNode, intelligenceFeed, quote, profile }) => {
  const activePosition: [number, number] | null = selectedStock ? [selectedStock.lat, selectedStock.lng] : null;

  // Derive partner lines
  const partnerLines: any[] = [];
  if (selectedStock && selectedStock.partners) {
    selectedStock.partners.forEach(pSymbol => {
      const partner = COMPANIES.find(c => c.symbol === pSymbol);
      if (partner) {
        partnerLines.push([
          [selectedStock.lat, selectedStock.lng],
          [partner.lat, partner.lng]
        ]);
      }
    });
  }

  const [activeTab, setActiveTab] = React.useState<"quote" | "profile" | "intel">("quote");

  return (
    <div className="flex-1 relative bg-[#050505] overflow-hidden">
      {/* HUD Overlays */}
      {selectedStock && intelligenceFeed && intelligenceFeed.length > 0 && intelligenceFeed[0] && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-64 bg-zinc-900 border border-[#22ab94] p-3 shadow-2xl z-[1000] backdrop-blur-md">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-mono text-[#22ab94] font-bold">NEURAL LINK // POPUP</span>
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Vector_{selectedStock.symbol}</span>
          </div>
          <h3 className="text-[11px] font-bold text-white mb-2 leading-tight uppercase tracking-tight">
            {intelligenceFeed[0].intelligence?.translatedTitle || intelligenceFeed[0].title || "DECRYPTING_SIGNAL"}
          </h3>
          <p className="text-[10px] text-zinc-400 font-mono italic leading-relaxed">
            GEMINI_SUMMARY: {intelligenceFeed[0].intelligence?.summary || intelligenceFeed[0].description || "Analyzing incoming data stream for threat vectors..."}
          </p>
        </div>
      )}
      
      <div className="absolute bottom-4 left-4 z-[1000] pointer-events-none">
        <div className="bg-zinc-900/80 p-2 border border-zinc-800 font-mono text-[9px] uppercase tracking-widest text-[#22ab94] backdrop-blur-sm shadow-xl">
          LAT: {activePosition?.[0].toFixed(4) || "0.0000"} | LONG: {activePosition?.[1].toFixed(4) || "0.0000"} | ALT: 149M
        </div>
      </div>

      <MapContainer
        center={[20, 0]}
        zoom={3}
        className="w-full h-full bg-black"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
        />
        
        <MapController selectedPosition={activePosition} />

        {COMPANIES.map((company) => (
          <Marker
            key={company.symbol}
            position={[company.lat, company.lng]}
            icon={selectedStock?.symbol === company.symbol ? activeIcon : defaultIcon}
            eventHandlers={{
              click: (e) => {
                onSelectNode(company);
                e.target.openPopup();
              },
              mouseover: (e) => {
                e.target.openPopup();
              }
            }}
          >
            <Popup className="custom-popup">
              <div className="bg-zinc-950 text-white p-3 border border-[#22ab94]/50 font-mono min-w-[240px] shadow-2xl">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-[#22ab94] font-bold text-xl leading-none tracking-tighter">{company.symbol}</div>
                    <div className="text-[8px] text-zinc-500 uppercase mt-1 tracking-widest leading-none">
                      {company.name}
                    </div>
                  </div>
                  {selectedStock?.symbol === company.symbol && quote?.price ? (
                    <div className="text-right">
                      <div className="text-sm text-white font-bold animate-pulse">${quote.price.toFixed(2)}</div>
                      <div className={cn(
                        "text-[9px] font-bold",
                        (quote.changes || 0) >= 0 ? "text-green-500" : "text-red-500"
                      )}>
                        {(quote.changes || 0) >= 0 ? "+" : ""}{(quote.changes || 0).toFixed(2)}%
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-zinc-700 animate-pulse">CONNECTING...</div>
                  )}
                </div>

                {/* Tabs Selector */}
                <div className="flex border-b border-[#22ab94]/20 mb-3">
                  {[
                    { id: 'quote', label: 'TELEMETRY' },
                    { id: 'profile', label: 'PROFILE' },
                    { id: 'intel', label: 'INTEL' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={cn(
                        "px-2 py-1 text-[8px] font-bold tracking-widest transition-all border-b-2",
                        activeTab === tab.id 
                          ? "text-[#22ab94] border-[#22ab94] bg-[#22ab94]/10" 
                          : "text-zinc-600 border-transparent hover:text-zinc-400"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="min-h-[100px]">
                  {activeTab === 'quote' && (
                    <div className="grid grid-cols-2 gap-2 text-[9px] uppercase tracking-tighter">
                      <div>
                        <div className="text-zinc-600">Open</div>
                        <div className="text-white">${quote?.open?.toFixed(2) || "---"}</div>
                      </div>
                      <div>
                        <div className="text-zinc-600">Prev_Close</div>
                        <div className="text-white">${quote?.previousClose?.toFixed(2) || "---"}</div>
                      </div>
                      <div>
                        <div className="text-zinc-600">Day_High</div>
                        <div className="text-white text-green-400 font-bold">${quote?.dayHigh?.toFixed(2) || "---"}</div>
                      </div>
                      <div>
                        <div className="text-zinc-600">Day_Low</div>
                        <div className="text-white text-red-400 font-bold">${quote?.dayLow?.toFixed(2) || "---"}</div>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-zinc-900 mt-1">
                        <div className="text-zinc-600">Data_Uplink_Source</div>
                        <div className="text-[#22ab94] font-bold">{quote?.source || "PRIMARY_RESONATOR"}</div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'profile' && (
                    <div className="space-y-3 text-[9px] uppercase tracking-tighter">
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 px-1">
                        <div>
                          <div className="text-zinc-600">Sector</div>
                          <div className="text-white truncate">{profile?.sector || "DECRYPTING..."}</div>
                        </div>
                        <div>
                          <div className="text-zinc-600">Industry</div>
                          <div className="text-white truncate">{profile?.finnhubIndustry || profile?.industry || "DECRYPTING..."}</div>
                        </div>
                        <div>
                          <div className="text-zinc-600">Mkt_Cap</div>
                          <div className="text-[#22ab94] font-bold">
                            {profile?.marketCapitalization 
                              ? (profile.marketCapitalization / 1e9).toFixed(1) + 'B' 
                              : profile?.mktCap 
                                ? (profile.mktCap / 1e9).toFixed(1) + 'B' 
                                : "---"}
                          </div>
                        </div>
                        <div>
                          <div className="text-zinc-600">Employees</div>
                          <div className="text-white">{profile?.fullTimeEmployees || "---"}</div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-zinc-900 bg-white/5 p-2 space-y-1">
                        <div className="flex justify-between text-[7px] text-zinc-500 font-bold mb-1">
                          <span>FINANCIALS_SUMMARY</span>
                          <span>USD</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Revenue (TTM)</span>
                          <span className="text-white">{profile?.revenue ? formatCurrency(profile.revenue) : "---"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">EPS</span>
                          <span className="text-white">{profile?.eps ? profile.eps.toFixed(2) : "---"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">P/E Ratio</span>
                          <span className="text-white">{profile?.peRatio ? profile.peRatio.toFixed(1) : "---"}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'intel' && (
                    <div className="space-y-3">
                      {selectedStock?.symbol === company.symbol && intelligenceFeed && intelligenceFeed.length > 0 ? (
                        <div className="group">
                          <div className="flex items-center gap-1 text-[#22ab94] text-[9px] font-bold uppercase mb-1">
                            <Activity className="w-2.5 h-2.5" /> Intelligence_Stream
                          </div>
                          <div className="text-[10px] font-bold text-white leading-tight mb-2 uppercase">
                            {intelligenceFeed[0].intelligence?.translatedTitle || intelligenceFeed[0].title}
                          </div>
                          <p className="text-[9px] italic opacity-80 text-zinc-400 line-clamp-3 leading-relaxed">
                            "{intelligenceFeed[0].intelligence?.summary || intelligenceFeed[0].description || "Analyzing data pattern..."}"
                          </p>
                        </div>
                      ) : (
                        <div className="h-[80px] flex items-center justify-center text-zinc-800 font-mono text-[9px] animate-pulse">
                          [ NO_INTEL_STREAM ]
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => onSelectNode(company)}
                  className="mt-4 w-full bg-[#22ab94] text-black text-[9px] py-1.5 font-bold uppercase tracking-widest hover:bg-white transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Cpu className="w-3 h-3" /> Synchronize Link
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {partnerLines.map((line, idx) => (
          <Polyline
            key={idx}
            positions={line}
            pathOptions={{
              color: "#22ab94",
              weight: 1,
              dashArray: "5, 10",
              opacity: 0.5,
              className: "supply-chain-line"
            }}
          />
        ))}
      </MapContainer>

      {/* Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-5 mix-blend-overlay z-[1001]" style={{ 
        backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
        backgroundSize: '100% 2px, 3px 100%'
      }}></div>
    </div>
  );
};
