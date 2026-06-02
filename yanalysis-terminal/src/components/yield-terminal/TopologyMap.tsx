import React, { useRef, useState, useMemo } from "react";
import { Company, COMPANIES } from "../../data/companies";

export interface Corridor {
  id: string;
  name: string;
  commodityType: string;
  coords: [number, number];
  country: string;
  impactedSymbols: string[];
  baseRisk: number;
  latencyDescription: string;
}

export const CORRIDORS: Corridor[] = [
  { id: "MALACCA_STRAIT", name: "Malacca Strait Corridor", commodityType: "Lithium Wafers & advanced logic materials", coords: [1.3521, 103.8198], country: "SGP/IDN", impactedSymbols: ["TSM", "AAPL", "NVDA", "AMZN"], baseRisk: 68, latencyDescription: "Typical dwell: 48 Hrs" },
  { id: "SUEZ_CANAL", name: "Suez Canal Transit Gate", commodityType: "Crude Oil & Middle East Distillates", coords: [12.6000, 43.3300], country: "EGY/YEM", impactedSymbols: ["XOM", "SHEL", "ARAMCO", "TSLA"], baseRisk: 84, latencyDescription: "Typical detours: +9 Days" },
  { id: "TAIWAN_STRAIT", name: "Taiwan Air-Sea Corridor", commodityType: "High-Beta Semiconductors & CoWoS Substrates", coords: [24.7816, 121.0153], country: "TWN/CHN", impactedSymbols: ["TSM", "NVDA", "ASML", "AAPL"], baseRisk: 72, latencyDescription: "Air logistics latency: +36 Hrs" },
  { id: "PANAMA_CANAL", name: "Panama Canal Sector", commodityType: "Consumer Finished Goods & Grains", coords: [9.1185, -79.7824], country: "PAN", impactedSymbols: ["WMT", "COST", "AMZN", "AAPL"], baseRisk: 42, latencyDescription: "Draft restrictions active: +5 Days" },
  { id: "HORMUZ_STRAIT", name: "Strait of Hormuz Gate", commodityType: "Crude Light & Liquefied Gas Feedstocks", coords: [26.5667, 56.2500], country: "OMN/IRN", impactedSymbols: ["ARAMCO", "XOM", "TSLA", "SHEL"], baseRisk: 88, latencyDescription: "Draft dwell: +3 Days" },
  { id: "CUSHING_OK", name: "Cushing, OK Storage Hub", commodityType: "COMMODITY_CRUDE", coords: [35.9847, -96.7684], country: "USA", impactedSymbols: ["XOM", "CVX", "OXY"], baseRisk: 30, latencyDescription: "Strategic Reserve Site" },
  { id: "ROTTERDAM_PORT", name: "Rotterdam Energy Port", commodityType: "SUPPLY_NODE", coords: [51.9244, 4.4777], country: "NLD", impactedSymbols: ["SHEL", "BP"], baseRisk: 40, latencyDescription: "Flow restriction: Low" },
  { id: "MALACCA_CHOKE", name: "Strait of Malacca Chokepoint", commodityType: "LOGISTICS_CHOKE", coords: [2.1889, 102.2604], country: "MYS", impactedSymbols: ["ARAMCO"], baseRisk: 75, latencyDescription: "High tanker saturation" }
];

export interface TopologyLink {
  fromCoords: [number, number];
  toCoords: [number, number];
  fromName: string;
  toName: string;
  ticker: string;
  sector: string;
}

export interface RelationalLink {
  id: string;
  source: string;
  target: string;
  commodity: string;
  volumeMetrics: string;
  dependencyRisk: string;
}

export const RELATIONAL_LINKS: RelationalLink[] = [
  { id: "TSM-NVDA", source: "TSMC (Hsinchu)", target: "NVIDIA (Santa Clara)", commodity: "4nm Custom Monolithic Wafers", volumeMetrics: "14,500 Units / Month", dependencyRisk: "HIGH // SINGLE-SOURCE CONSTRAINT" },
  { id: "ASML-TSM", source: "ASML (Veldhoven)", target: "TSMC (Tainan)", commodity: "EUV High-NA Optics Modules", volumeMetrics: "2 Units / Fiscal Quarter", dependencyRisk: "CRITICAL // SOLE-SOURCE TECH" },
  { id: "AAPL-TSM", source: "Apple (Cupertino)", target: "TSMC (Hsinchu)", commodity: "M4-Next Silicon Fabrication", volumeMetrics: "110,000 Wafers / Month", dependencyRisk: "MODERATE // CAPACITY LOCKIN" },
  { id: "AMZN-NVDA", source: "AWS (Seattle)", target: "NVIDIA (Santa Clara)", commodity: "Blackwell GB200 Compute Nodes", volumeMetrics: "8,200 Units / Month", dependencyRisk: "HIGH // INFRASTRUCTURE CHOKE" },
  { id: "INTC-ASML", source: "Intel (Hillsboro)", target: "ASML (Veldhoven)", commodity: "High-NA EUV Scanner 0.55", volumeMetrics: "Batch Phase 1", dependencyRisk: "CRITICAL // FOUNDRY VALIDATION" }
];

export function getCorridorHeadquartersLinks(corridor: Corridor): TopologyLink[] {
  const links: TopologyLink[] = [];
  corridor.impactedSymbols.forEach(symbol => {
    const comp = COMPANIES.find(c => c.symbol === symbol);
    if (comp && typeof comp.lat === "number" && typeof comp.lng === "number") {
      const relation = RELATIONAL_LINKS.find(l => l.id.includes(symbol) || l.source.includes(symbol) || l.target.includes(symbol));
      links.push({
        fromCoords: corridor.coords,
        toCoords: [comp.lat, comp.lng],
        fromName: corridor.name,
        toName: `${comp.name} HQ`,
        ticker: symbol,
        sector: comp.sector,
        relation: relation || {
          id: `${corridor.id}-${symbol}`,
          source: corridor.name,
          target: symbol,
          commodity: corridor.commodityType,
          volumeMetrics: "Active Flow",
          dependencyRisk: corridor.baseRisk > 70 ? "HIGH" : "STABLE"
        }
      } as any);
    }
  });
  return links;
}

const CORPORATE_NODES = [
  { id: "AAPL", name: "APPLE INC.", symbol: "AAPL", lat: 37.3349, lng: -122.0091, location: "Cupertino, CA", sector: "TECH // CONSUMER" },
  { id: "MSFT", name: "MICROSOFT CORP.", symbol: "MSFT", lat: 47.6396, lng: -122.1283, location: "Redmond, WA", sector: "TECH // ENTERPRISE" },
  { id: "NVDA", name: "NVIDIA CORP.", symbol: "NVDA", lat: 37.3712, lng: -121.9663, location: "Santa Clara, CA", sector: "TECH // COMPUTE" },
  { id: "TSM", name: "TSMC FOUNDRY", symbol: "TSM", lat: 24.7816, lng: 121.0153, location: "Hsinchu, TWN", sector: "SEMI // FABRICATION" },
  { id: "ASML", name: "ASML HOLDING", symbol: "ASML", lat: 51.4035, lng: 5.4081, location: "Veldhoven, NLD", sector: "SEMI // EQUIPMENT" },
  { id: "GOOGL", name: "ALPHABET INC.", symbol: "GOOGL", lat: 37.4221, lng: -122.0841, location: "Mountain View, CA", sector: "TECH // AI INFRA" },
  { id: "AMZN", name: "AMAZON.COM", symbol: "AMZN", lat: 47.6092, lng: -122.3331, location: "Seattle, WA", sector: "CONSUMER // LOGISTICS" },
  { id: "META", name: "META PLATFORMS", symbol: "META", lat: 37.4851, lng: -122.1483, location: "Menlo Park, CA", sector: "TECH // NETWORKS" },
  { id: "TSLA", name: "TESLA INC.", symbol: "TSLA", lat: 30.2241, lng: -97.6258, location: "Austin, TX", sector: "AUTO // ELECTRIFIED" },
  { id: "ARAMCO", name: "SAUDI ARAMCO", symbol: "ARAMCO", lat: 26.3861, lng: 50.1264, location: "Dhahran, SAU", sector: "ENERGY // RAW CRUDE" },
  { id: "XOM", name: "EXXON MOBIL", symbol: "XOM", lat: 32.8925, lng: -96.9452, location: "Irving, TX", sector: "ENERGY // PRODUCTION" },
  { id: "SHEL", name: "SHELL PLC", symbol: "SHEL", lat: 52.3702, lng: 4.8952, location: "London, GBR", sector: "ENERGY // REFINEMENT" },
  { id: "JPM", name: "JPMORGAN CHASE", symbol: "JPM", lat: 40.7559, lng: -73.9749, location: "New York, NY", sector: "FINANCIAL // LIQUIDITY" },
  { id: "BABA", name: "ALIBABA GROUP", symbol: "BABA", lat: 30.2741, lng: 120.1551, location: "Hangzhou, CHN", sector: "CONSUMER // RE-DIST" },
  { id: "700", name: "TENCENT", symbol: "700", lat: 22.5431, lng: 114.0579, location: "Shenzhen, CHN", sector: "TECH // SYSTEMS" },
  { id: "005930", name: "SAMSUNG ELEC", symbol: "005930", lat: 37.2636, lng: 127.0286, location: "Suwon, KOR", sector: "SEMI // INTEGRATION" },
  { id: "LVMH", name: "LVMH GROUP", symbol: "LVMH", lat: 48.8718, lng: 2.3015, location: "Paris, FRA", sector: "CONSUMER // PREMIUM" },
  { id: "VALE", name: "VALE S.A.", symbol: "VALE", lat: -22.9068, lng: -43.1729, location: "Rio de Janeiro, BRA", sector: "BASIC // EXTRACTIVE" },
  { id: "BHP", name: "BHP GROUP", symbol: "BHP", lat: -37.8136, lng: 144.9631, location: "Melbourne, AUS", sector: "BASIC // COAL & IRON" },
  { id: "CATL", name: "CATL ENERGY", symbol: "CATL", lat: 26.6655, lng: 119.5479, location: "Ningde, CHN", sector: "AUTO // BATTERIES" },
  { id: "TM", name: "TOYOTA MOTOR", symbol: "TM", lat: 35.0838, lng: 137.1557, location: "Toyota, JPN", sector: "AUTO // SCALE" },
  { id: "SONY", name: "SONY CORP", symbol: "SONY", lat: 35.6324, lng: 139.7441, location: "Tokyo, JPN", sector: "TECH // CONSUMER" },
  { id: "AIR", name: "AIRBUS SE", symbol: "AIR", lat: 43.6047, lng: 1.4442, location: "Toulouse, FRA", sector: "INDUSTRIALS // AVIATION" },
  { id: "BA", name: "BOEING CO", symbol: "BA", lat: 47.5301, lng: -122.3005, location: "Arlington, VA", sector: "INDUSTRIALS // COGNITIVE" },
  { id: "UPS", name: "UPS CARRIER", symbol: "UPS", lat: 33.9167, lng: -84.3542, location: "Atlanta, GA", sector: "LOGISTICS // LAST-MILE" },
  { id: "FDX", name: "FEDEX SYSTEMS", symbol: "FDX", lat: 35.1495, lng: -90.0490, location: "Memphis, TN", sector: "LOGISTICS // FREIGHT" },
  { id: "WMT", name: "WALMART STORES", symbol: "WMT", lat: 36.3729, lng: -94.2088, location: "Bentonville, AR", sector: "CONSUMER // DIST" },
  { id: "SAP.DE", name: "SAP SYSTEM", symbol: "SAP.DE", lat: 49.2933, lng: 8.6419, location: "Walldorf, DEU", sector: "TECH // ERP_COMP" },
  { id: "RELIANCE.NS", name: "RELIANCE IND", symbol: "RELIANCE.NS", lat: 19.0760, lng: 72.8777, location: "Mumbai, IND", sector: "CONGLOMERATE // PETRO" },
  { id: "MELI", name: "MERCADO LIBRE", symbol: "MELI", lat: -34.5495, lng: -58.4556, location: "Buenos Aires, ARG", sector: "CONSUMER // MARKETS" },
  { id: "CBA.AX", name: "COMMONWEALTH", symbol: "CBA.AX", lat: -33.8688, lng: 151.2093, location: "Sydney, AUS", sector: "FINANCIAL // CAP_MKT" },
  { id: "NVO", name: "NOVO NORDISK", symbol: "NVO", lat: 55.7335, lng: 12.4578, location: "Bagsvaerd, DNK", sector: "HEALTHCARE // PHARMA" },
  { id: "LMT", name: "LOCKHEED MARTIN", symbol: "LMT", lat: 39.0118, lng: -77.1773, location: "Bethesda, MD", sector: "INDUSTRIALS // DEF" },
  { id: "PLTR", name: "PALANTIR TECH", symbol: "PLTR", lat: 34.0522, lng: -118.2437, location: "Denver, CO", sector: "TECH // DEF_INTELLIGENCE" },
  { id: "SPY", name: "S&P 500 ETF", symbol: "SPY", lat: 40.7128, lng: -74.0060, location: "New York, NY", sector: "INDEX // MACRO" }
];

interface HoverNodeData {
  x: number;
  y: number;
  node: typeof CORPORATE_NODES[0] | null;
  visible: boolean;
  isRight: boolean;
  isBottom: boolean;
}

interface TopologyMapProps {
  activeCorridorId?: string | null;
  onSelectCorridor?: (id: string) => void;
  onSelectNode?: (c: Company) => void;
  selectedStock?: Company | null;
}

export const TopologyMap: React.FC<TopologyMapProps> = ({ activeCorridorId, onSelectNode, selectedStock }) => {
  const [hover, setHover] = useState<HoverNodeData>({ x: 0, y: 0, node: null, visible: false, isRight: false, isBottom: false });
  const containerRef = useRef<HTMLDivElement>(null);

  const project = (lat: number, lng: number): [number, number] => {
    const x = ((lng + 180) / 360) * 100;
    const y = ((90 - lat) / 180) * 100;
    return [x, y];
  };

  const handlePointerOver = (e: React.PointerEvent, node: typeof CORPORATE_NODES[0]) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHover({
      x,
      y,
      isRight: x > rect.width * 0.6,
      isBottom: y > rect.height * 0.65,
      node,
      visible: true
    });
  };

  const handlePointerOut = () => {
    setHover(prev => ({ ...prev, visible: false }));
  };

  const handleClick = (e: React.MouseEvent, node: typeof CORPORATE_NODES[0]) => {
    e.stopPropagation();
    if (onSelectNode) {
      const company = COMPANIES.find(c => c.symbol === node.symbol);
      if (company) onSelectNode(company);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-square bg-[#050505] border border-zinc-900 rounded-sm overflow-hidden select-none"
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />
      
      {/* Centralized Hover Tooltip HUD Grid */}
      <div 
        id="terminal-tooltip" 
        className={`absolute z-50 pointer-events-none bg-black border border-emerald-500 p-3 font-mono text-[10px] text-emerald-400 min-w-[260px] shadow-[0_0_30px_rgba(4,120,87,0.5)] rounded-none antialiased ring-1 ring-white/10 transition-all duration-150 ${hover.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-98'}`}
        style={{ 
          left: hover.isRight ? "auto" : `${hover.x + 12}px`, 
          right: hover.isRight ? `${containerRef.current ? containerRef.current.clientWidth - hover.x + 12 : 12}px` : "auto",
          top: hover.isBottom ? "auto" : `${hover.y + 12}px`,
          bottom: hover.isBottom ? `${containerRef.current ? containerRef.current.clientHeight - hover.y + 12 : 12}px` : "auto",
          display: hover.visible ? 'block' : 'none'
        }}
      >
        <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-emerald-400/50" />
        <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-emerald-400/50" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-emerald-400/50" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-emerald-400/50" />

        {hover.node && (
          <>
            <div className="border-b border-emerald-950 pb-1.5 mb-2 font-black text-emerald-500 flex justify-between items-center bg-emerald-500/5 px-1 -mx-1">
              <span className="tracking-widest">[ {hover.node.id} // METRIC_STREAM ]</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 text-[11px]">
              <div className="text-zinc-200">COMPANY: {hover.node.name} ({hover.node.symbol})</div>
              <div className="text-emerald-400 font-bold uppercase tracking-tight">HQ: {hover.node.location} // SECTOR: {hover.node.sector}</div>
            </div>
          </>
        )}
      </div>

      <svg viewBox="0 0 100 100" className="w-full h-full relative z-10 block pointer-events-none">
        {CORPORATE_NODES.map(node => {
          const [cx, cy] = project(node.lat, node.lng);
          const isHovered = hover.node?.id === node.id;
          const isSelected = selectedStock?.symbol === node.symbol;
          
          return (
            <g key={node.id} className="pointer-events-auto cursor-pointer" 
               onPointerOver={(e) => handlePointerOver(e, node)} 
               onPointerOut={handlePointerOut}
               onClick={(e) => handleClick(e, node)}
            >
              {isSelected && (
                <g className="pointer-events-none">
                  {/* Rotating dotted outer ring */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r="4"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="0.15"
                    strokeDasharray="0.8, 0.8"
                    className="origin-center"
                    style={{ transformOrigin: `${cx}px ${cy}px` }}
                  />
                  {/* Animated shrinking target ring */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r="5.5"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="0.25"
                    strokeDasharray="1, 1"
                    className="origin-center"
                    style={{ transformOrigin: `${cx}px ${cy}px` }}
                  />
                  {/* Four hairline target crosshairs */}
                  <line x1={cx - 3.5} y1={cy} x2={cx - 1.8} y2={cy} stroke="#ffffff" strokeWidth="0.15" />
                  <line x1={cx + 1.8} y1={cy} x2={cx + 3.5} y2={cy} stroke="#ffffff" strokeWidth="0.15" />
                  <line x1={cx} y1={cy - 3.5} x2={cx} y2={cy - 1.8} stroke="#ffffff" strokeWidth="0.15" />
                  <line x1={cx} y1={cy + 1.8} x2={cx} y2={cy + 3.5} stroke="#ffffff" strokeWidth="0.15" />
                </g>
              )}
              <circle 
                cx={cx} 
                cy={cy} 
                r={isSelected ? "1.6" : (isHovered ? "1.25" : "0.75")} 
                fill={isSelected ? "#ffffff" : (isHovered ? "#10b981" : "#050505")}
                stroke={isSelected ? "#ffffff" : "#10b981"}
                strokeWidth={isSelected || isHovered ? "0.6" : "0.35"}
                className={isSelected ? "" : ""}
                style={{ 
                   filter: isSelected ? "drop-shadow(0 0 2px #fff)" : (isHovered ? "drop-shadow(0 0 1.5px rgba(16,185,129,0.9))" : "none"),
                   transition: "r 0.15s ease-out, fill 0.15s ease-out, stroke 0.15s ease-out, stroke-width 0.15s ease-out"
                }}
              />
              <text
                x={cx + 1.5}
                y={cy + 0.6}
                fill={isSelected ? "#ffffff" : "#10b981"}
                fontSize="1.95"
                fontWeight="black"
                className={`pointer-events-none select-none font-mono tracking-widest transition-opacity duration-150 ${
                  isHovered || isSelected ? "opacity-100 font-black saturate-150" : "opacity-0"
                }`}
                style={{
                  textShadow: (isHovered || isSelected) ? "0 0 3px rgba(16,185,129,0.8)" : "none"
                }}
              >
                {node.symbol}
              </text>
            </g>
          );
        })}
      </svg>
      
      <div className="absolute bottom-2 left-2 text-[6px] font-mono text-zinc-700 uppercase tracking-widest pointer-events-none">
        Topographic Routing Enabled // Scale 1:24k
      </div>
      <div className="absolute top-2 left-2 text-[6px] font-mono text-zinc-500 uppercase flex items-center gap-1.5 pointer-events-none">
        <span className="w-1 h-1 bg-emerald-500" /> Live Scanning Stream
      </div>
    </div>
  );
};

export const TopologyMapLayout: React.FC<TopologyMapProps> = ({
  activeCorridorId,
  onSelectCorridor,
  onSelectNode,
  selectedStock
}) => {
  return (
    <div className="font-sans text-zinc-400 text-[10px] bg-black border border-zinc-900 rounded-sm overflow-hidden flex flex-col h-full">
      <div className="p-2 border-b border-zinc-900 bg-zinc-950 flex justify-between items-center select-none shrink-0">
        <span className="font-bold text-emerald-400 uppercase tracking-widest text-[9px]">Select Topology Node</span>
        <span className="text-[8px] bg-zinc-900 px-1 py-0.5 text-zinc-500">Active Links</span>
      </div>
      
      <div className="p-1 flex-1 relative">
        <TopologyMap activeCorridorId={activeCorridorId} onSelectCorridor={onSelectCorridor} onSelectNode={onSelectNode} selectedStock={selectedStock} />
      </div>
    </div>
  );
};
