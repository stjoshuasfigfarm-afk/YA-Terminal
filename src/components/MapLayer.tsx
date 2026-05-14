import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { COMPANIES, Company } from "../data/companies";
import { TrendingUp, MessageSquare, Cpu } from "lucide-react";

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
}

export const MapLayer: React.FC<MapLayerProps> = ({ selectedStock, onSelectNode, intelligenceFeed }) => {
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
            GEMINI_SUMMARY: {intelligenceFeed[0].intelligence?.translatedSummary || intelligenceFeed[0].description || "Analyzing incoming data stream for threat vectors..."}
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
                // Center the map on click if not already handled by flyTo
                e.target.openPopup();
              },
              mouseover: (e) => {
                e.target.openPopup();
              },
              mouseout: (e) => {
                // Optional: keep popup open or close it
                // e.target.closePopup();
              }
            }}
          >
            <Popup className="custom-popup">
              <div className="bg-zinc-950 text-white p-2 border border-[#22ab94]/50 font-mono">
                <div className="text-[#22ab94] font-bold text-lg leading-none mb-1">{company.symbol}</div>
                <div className="text-xs text-zinc-400 mb-2">{company.name}</div>
                
                {intelligenceFeed && intelligenceFeed.length > 0 && intelligenceFeed[0] && (
                   <div className="mt-2 pt-2 border-t border-[#22ab94]/20">
                      <div className="flex items-center gap-1 text-[#22ab94] text-[10px] font-bold uppercase mb-1">
                        <MessageSquare className="w-3 h-3" /> Intelligence Feed
                      </div>
                      <div className="text-[10px] italic line-clamp-2">
                        "{intelligenceFeed[0].intelligence?.translatedTitle || intelligenceFeed[0].title || "Initializing link..."}"
                      </div>
                   </div>
                )}
                
                <button 
                  onClick={() => onSelectNode(company)}
                  className="mt-3 w-full bg-[#22ab94] text-black text-[10px] py-1 font-bold uppercase tracking-widest hover:bg-white transition-colors"
                >
                  Intercept Data
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
