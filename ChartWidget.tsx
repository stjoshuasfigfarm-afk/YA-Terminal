import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { cn } from '@/src/lib/utils';

// Fix for default marker icons in Leaflet with React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const customIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #00FF41; width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid white; box-shadow: 0 0 8px #00FF41;"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5]
});

type SymbolPos = { [key: string]: [number, number] };

const symbolToPos: SymbolPos = {
  'AAPL': [37.3349, -122.0090], // Cupertino
  'MSFT': [47.6396, -122.1283], // Redmond
  'NVDA': [37.3541, -121.9552], // Santa Clara
  'TSLA': [30.2305, -97.6253],  // Austin (Giga Texas)
  'AMD': [37.3822, -121.9712],  // Santa Clara
  'META': [37.4848, -122.1484], // Menlo Park
  'GOOGL': [37.4221, -122.0841], // Mountain View
  'AMZN': [47.6092, -122.3331], // Seattle
  'NFLX': [37.2431, -121.9702], // Los Gatos
  'BTC': [0, 0], // Decentralized
  'COIN': [37.7749, -122.4194], // San Francisco
  'HOOD': [37.4419, -122.1430], // Menlo Park
  'PLTR': [39.7392, -104.9903], // Denver
  'MSTR': [38.9201, -77.2346],  // Tysons
  'SMCI': [37.3541, -121.9552], // San Jose
  'ARM': [52.2053, 0.1218],    // Cambridge, UK
  'TSM': [24.7735, 121.0116],  // Hsinchu, Taiwan
  'AVGO': [37.3382, -121.8863], // San Jose
  'ORCL': [30.2672, -97.7431],  // Austin
  'TME': [22.5431, 114.0579],   // Shenzhen
  'SPOT': [59.3293, 18.0686],   // Stockholm
  'SONY': [35.6895, 139.6917],  // Tokyo
  'ASML': [51.4231, 5.4211],    // Veldhoven
  'SAP': [49.2721, 8.6416],     // Walldorf
  'TM': [35.0824, 137.1562],    // Toyota City
  'SHOP': [45.4215, -75.6972],  // Ottawa
  'SNOW': [45.6770, -111.0429], // Bozeman
  'ABNB': [37.7749, -122.4194], // San Francisco
  'UBER': [37.7749, -122.4194], // San Francisco
  'PYPL': [37.3382, -121.8863], // San Jose
};

const locations = [
  { id: 1, name: 'NYC Facility', pos: [40.7128, -74.0060] as [number, number], status: 'Active' },
  { id: 2, name: 'London Hub', pos: [51.5074, -0.1278] as [number, number], status: 'Maintenance' },
  { id: 3, name: 'Tokyo Node', pos: [35.6762, 139.6503] as [number, number], status: 'Active' },
  { id: 4, name: 'Singapore HQ', pos: [1.3521, 103.8198] as [number, number], status: 'Optimizing' },
  { id: 5, name: 'Zurich Office', pos: [47.3769, 8.5417] as [number, number], status: 'Active' },
];

function ChangeView({ center, symbol }: { center: [number, number], symbol?: string }) {
  const map = useMap();
  useEffect(() => {
    const isGlobal = symbol === 'BTC' || symbol === 'GOLD' || !symbol;
    const zoomLevel = isGlobal ? 2 : 12;
    
    const timer = setTimeout(() => {
      map.setView(center, zoomLevel, { animate: true, duration: 1.5 });
    }, 3000);

    return () => clearTimeout(timer);
  }, [center, map, symbol]);
  return null;
}

function TargetCrosshair({ symbol }: { symbol?: string }) {
  const [key, setKey] = React.useState(0);
  const [visible, setVisible] = React.useState(false);

  useEffect(() => {
    if (symbol) {
      setVisible(false);
      const startTimer = setTimeout(() => {
        setKey(prev => prev + 1);
        setVisible(true);
      }, 3000);

      // Ensure crosshair is hidden when popup opens
      const popupDelay = 4500;
      const endTimer = setTimeout(() => {
        setVisible(false);
      }, popupDelay - 100); // Hide slightly before popup

      return () => {
        clearTimeout(startTimer);
        clearTimeout(endTimer);
      };
    }
  }, [symbol]);

  if (!symbol || symbol === 'BTC' || !visible) return null;

  return (
    <div key={key} className="target-crosshair">
      <div className="target-line-v"></div>
      <div className="target-line-h"></div>
      <div className="target-square"></div>
      <div className="absolute top-[calc(50%+20px)] left-[calc(50%+20px)] text-terminal-accent text-[8px] font-mono whitespace-nowrap bg-black/80 px-1 border border-terminal-accent/30 tracking-tighter">
        LOC_ACQUISITION: {symbol}
      </div>
    </div>
  );
}

function MarkerWithAutoPopup({ position, children, icon, symbol }: { position: [number, number], children: React.ReactNode, icon: any, symbol?: string }) {
  const markerRef = React.useRef<L.Marker>(null);
  
  useEffect(() => {
    if (markerRef.current && symbol) {
      const timer = setTimeout(() => {
        markerRef.current?.openPopup();
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [symbol]);

  return (
    <Marker ref={markerRef} position={position} icon={icon}>
      {children}
    </Marker>
  );
}

function MiniEarningsChart({ symbol }: { symbol: string }) {
  const [chartData, setChartData] = React.useState<any[]>([]);

  useEffect(() => {
    // Generate more extreme patterns based on symbol hash for better visual depth
    const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const newData = [
      { q: 'Q1', v: 5 + (hash % 15) },
      { q: 'Q2', v: 45 + (hash % 25) },
      { q: 'Q3', v: 15 + ((hash * 7) % 40) },
      { q: 'Q4', v: 85 + (hash % 15) },
    ];
    setChartData(newData);
  }, [symbol]);

  const max = Math.max(...chartData.map(d => d.v), 1);

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1.5 h-full relative overflow-hidden group/chart pr-1">
        {/* Y-Axis Labels (Smallest possible) */}
        <div className="flex flex-col justify-between text-[4px] text-[#222] font-mono border-r border-terminal-border/10 pr-0.5">
          <span>{max.toFixed(0)}</span>
          <span>0</span>
        </div>

        <div className="flex-1 flex gap-1 items-end border-b border-terminal-border/10 pb-0.5 relative h-full">
          {/* Dynamic scanline overlay */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,255,65,0.05)_1px,transparent_1px)] bg-[size:100%_4px] animate-scanline z-20 opacity-20"></div>
          
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5">
            <div className="border-t border-terminal-accent w-full"></div>
            <div className="border-t border-terminal-accent w-full"></div>
            <div className="border-t border-terminal-accent w-full"></div>
          </div>
          
          {chartData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center z-10 h-full justify-end">
              <div 
                className="w-full bg-terminal-accent/30 border-t-2 border-terminal-accent shadow-[0_0_15px_rgba(0,255,65,0.2)] hover:bg-terminal-accent/60 transition-all duration-700 ease-out relative group" 
                style={{ 
                  height: `${(d.v / max) * 100}%`,
                  transitionDelay: `${i * 150}ms`
                }}
              >
                {/* Value glow pulse */}
                <div className="absolute top-0 left-0 w-full h-1 bg-terminal-accent animate-pulse"></div>
              </div>
              <span className="text-[4px] text-zinc-500 font-bold tracking-tighter">{d.q}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AssetMap({ symbol }: { symbol?: string }) {
  const center = symbol && symbolToPos[symbol] ? symbolToPos[symbol] : [20, 0] as [number, number];
  const [companyData, setCompanyData] = React.useState<any>(null);

  useEffect(() => {
    if (symbol) {
      setCompanyData(null);
      const fetchData = () => {
        fetch(`/api/financials/${symbol}`)
          .then(res => res.json())
          .then(setCompanyData)
          .catch(err => {
            console.error("Fetch error:", err);
            setCompanyData({ price: "0.00", change: "0.00", companyName: "ERROR_NODE" });
          });
      };
      
      fetchData();
      const interval = setInterval(fetchData, 10000); // 10s refresh
      return () => clearInterval(interval);
    } else {
      setCompanyData(null);
    }
  }, [symbol]);

  return (
    <div className="relative h-full w-full bg-black">
      <div className="absolute top-2 left-0 right-0 z-[400] px-3 pointer-events-none">
         <div className="flex justify-between items-center border-b border-terminal-accent/10 pb-0.5">
           <span className="text-[5px] text-terminal-accent/30 font-mono">[LAYER: ASSET_OVERLAY_P3]</span>
           <span className="text-[5px] text-terminal-accent/20 font-mono">RENDER_QUAL: HIGH</span>
         </div>
      </div>
      <MapContainer 
      center={center} 
      zoom={2} 
      scrollWheelZoom={true} 
      className="h-full w-full"
      zoomControl={false}
    >
      <ChangeView center={center} symbol={symbol} />
      <TargetCrosshair symbol={symbol} />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {locations.map(loc => (
        <Marker key={loc.id} position={loc.pos} icon={customIcon}>
          <Popup className="terminal-popup">
            <div className="p-2 font-mono text-[10px] bg-terminal-panel text-white border border-terminal-border rounded">
              <p className="font-bold border-b border-terminal-border mb-1 uppercase tracking-widest">{loc.name}</p>
              <p className="text-emerald-500 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                STATUS: {loc.status}
              </p>
              <p className="text-terminal-muted mt-1 uppercase">LOC: {loc.pos[0].toFixed(2)}, {loc.pos[1].toFixed(2)}</p>
            </div>
          </Popup>
        </Marker>
      ))}
      
      {symbol && symbolToPos[symbol] && symbol !== 'BTC' && (
        <MarkerWithAutoPopup position={symbolToPos[symbol]} icon={customIcon} symbol={symbol}>
          <Popup className="terminal-popup">
            <div className="p-2 font-mono text-[9px] bg-black text-white border border-terminal-border rounded-none min-w-[190px] shadow-[0_0_20px_rgba(0,255,65,0.15)]">
              <div className="flex justify-between items-start border-b border-terminal-border pb-1 mb-1.5">
                <div>
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-terminal-accent animate-pulse" />
                    <p className="font-bold uppercase tracking-[0.1em] text-terminal-accent text-[10px]">{symbol}</p>
                  </div>
                  <p className="text-[6px] text-zinc-500 uppercase truncate max-w-[120px]">{companyData?.companyName || "INITIALIZING..."}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[6px] uppercase">
                <div>
                  <span className="text-[#333] block">HQ</span>
                  <span className="text-zinc-300 truncate block">{companyData?.hq || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[#333] block">STAFF</span>
                  <span className="text-zinc-300 truncate block">{companyData?.employees || "N/A"}</span>
                </div>
              </div>

              {/* Supply Chain Intelligence */}
              <div className="mt-1.5 pt-1 border-t border-terminal-border/20">
                <div className="text-[6px] text-[#444] uppercase mb-1 font-bold">Supply Chains</div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[5px] text-zinc-500 w-8">UP:</span>
                    <div className="flex flex-wrap gap-0.5">
                      {companyData?.supplyChain?.upstream?.map((s: string) => (
                        <span key={s} className="text-[5px] px-0.5 border border-terminal-accent/20 text-terminal-accent/70 font-bold">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[5px] text-zinc-500 w-8">DOWN:</span>
                    <div className="flex flex-wrap gap-0.5">
                      {companyData?.supplyChain?.downstream?.map((s: string) => (
                        <span key={s} className="text-[5px] px-0.5 border border-rose-500/20 text-rose-500/70 font-bold">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-1.5 pt-1 border-t border-terminal-border/20">
                <div className="flex justify-between items-center text-[6px] text-[#333] uppercase mb-0.5">
                  <span>Momentum Grid</span>
                </div>
                <div className="h-10">
                  <MiniEarningsChart symbol={symbol} />
                </div>
              </div>
            </div>
          </Popup>
        </MarkerWithAutoPopup>
      )}
    </MapContainer>
    </div>
  );
}
