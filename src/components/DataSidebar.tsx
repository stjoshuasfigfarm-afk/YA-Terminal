import React, { useState, useMemo, useRef, useEffect } from "react";
import { Company, COMPANIES } from "../data/companies";
import { 
  Activity, 
  TrendingUp, 
  ChevronsLeft, 
  ChevronsRight, 
  Trash2,
  Pin,
  Zap,
  Network,
  Settings
} from "lucide-react";
import { motion } from "motion/react";
import { formatCurrency, cn } from "../lib/utils";
import { TelemetryChart } from "./TelemetryChart";

interface DataSidebarProps {
  selectedStock: Company | null;
  quote: any;
  sentiment: any;
  history: any[];
  financials: any[];
  profile: any;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  isFocusMode?: boolean;
  pinnedTickers?: string[];
  onTogglePin?: (symbol: string, e: React.MouseEvent) => void;
}

const Sparkline = ({ data }: { data?: any[] }) => {
  const points = useMemo(() => {
    if (!data || data.length === 0) return "";
    
    // Take last 20 historical points if available
    const recentData = data.slice(-20);
    const prices = recentData.map(d => d.close || d.price || 0);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    return recentData.map((d, i) => {
      const x = (i / (recentData.length - 1)) * 100;
      const y = 90 - ((prices[i] - min) / range) * 80; // Scale to 10-90 range
      return `${x},${y}`;
    }).join(' ');
  }, [data]);

  if (!points) return null;

  return (
    <svg className="w-16 h-6 overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        className="text-emerald-500/60 transition-all duration-1000"
      />
    </svg>
  );
};

interface OscillatorProps {
  sig: {
    label: string;
    val: string;
    color: string;
         type: string;
         signal: string;
  };
  symbol: string;
}

const OscillatorCard = ({ sig, symbol }: OscillatorProps) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const pointsCount = 20;
  const pathData = useMemo(() => {
    return Array.from({ length: pointsCount }).map((_, i) => {
      const seed = symbol.charCodeAt(0) + sig.label.length;
      const noise = Math.sin(i * 0.8 + seed) * 12 + Math.cos(i * 0.4 + seed) * 6;
      let baseVal = 50;
      if (sig.label.includes("RSI")) {
        baseVal = parseFloat(sig.val) || 52;
      } else if (sig.label.includes("MACD")) {
        baseVal = (symbol.charCodeAt(0) % 2 ? 1 : -1) * (0.15 + (symbol.charCodeAt(1) % 10) / 20) * 15 + 50;
      } else if (sig.label.includes("Vol")) {
        baseVal = parseFloat(sig.val) || 45;
      } else if (sig.label.includes("ADX")) {
        baseVal = parseFloat(sig.val) || 28;
      } else if (sig.label.includes("Stoch")) {
        baseVal = parseFloat(sig.val) || 60;
      } else if (sig.label.includes("ATR")) {
        baseVal = (parseFloat(sig.val) * 15) || 30;
      }
      
      const val = baseVal + noise * 1.2;
      
      // Scale into 15% - 85% space inside a 100x100 box
      const yMin = 15;
      const yMax = 85;
      const percentY = (val / 100) * 70 + 15;
      const finalY = Math.max(yMin, Math.min(yMax, 100 - percentY));
      return { 
        index: i,
        x: (i / (pointsCount - 1)) * 100, 
        y: finalY, 
        realVal: val 
      };
    });
  }, [symbol, sig.label, sig.val]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pctX = (e.clientX - rect.left) / rect.width;
    const rawIdx = Math.round(pctX * (pointsCount - 1));
    const finalIdx = Math.max(0, Math.min(pointsCount - 1, rawIdx));
    setHoverIdx(finalIdx);
  };

  const handleMouseLeave = () => {
    setHoverIdx(null);
  };

  const activePoint = hoverIdx !== null ? pathData[hoverIdx] : null;
  const displayVal = activePoint 
    ? (sig.label.includes("MACD") || sig.label.includes("ATR") ? (activePoint.realVal / 10).toFixed(3) : activePoint.realVal.toFixed(1)) 
    : sig.val;

  // Render signal badge depending on value or current hover status
  const currentSignal = activePoint
    ? (sig.type === 'area' ? (activePoint.realVal > 65 ? "Overbought" : activePoint.realVal < 35 ? "Oversold" : "Neutral") : sig.signal)
    : sig.signal;

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="p-2 border border-zinc-900 bg-black rounded-sm group hover:border-[#2962ff]/50 hover:shadow-[0_0_12px_rgba(41,98,255,0.08)] transition-all cursor-crosshair relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-1 text-zinc-400 select-none">
        <div className="text-[6.5px] font-bold tracking-tight text-zinc-500 uppercase">{sig.label}</div>
        <div className="text-[8px] font-mono font-black tabular-nums text-white group-hover:text-emerald-400 transition-colors">
          {displayVal}
        </div>
      </div>
      
      <div className="h-8 w-full relative mb-1.5 bg-zinc-950/40 rounded-xs border border-zinc-950/40 overflow-hidden">
        <svg className="w-full h-full animate-[fadeIn_0.5s_ease-out]" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* TradingView-style grid line at 50% */}
          <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" strokeDasharray="2,2" />
          
          {sig.type === 'area' && (
            <>
              {/* RSI Shaded Zone */}
              <rect x="0" y="30" width="100" height="40" fill="#7e72a2" fillOpacity="0.05" />
              <path 
                d={`M 0 100 L ${pathData[0].x} ${pathData[0].y} ${pathData.map(p => `L ${p.x} ${p.y}`).join(' ')} L 100 100 Z`}
                fill={`${sig.color}`}
                fillOpacity="0.05"
              />
              <path 
                d={`M ${pathData[0].x} ${pathData[0].y} ${pathData.map(p => `L ${p.x} ${p.y}`).join(' ')}`}
                fill="none"
                stroke={sig.color}
                strokeWidth="1.5"
                className="drop-shadow-[0_0_2px_rgba(126,114,162,0.5)]"
              />
            </>
          )}
          
          {sig.type === 'histogram' && (
            pathData.map((p, i) => (
              <rect 
                key={i}
                x={p.x - 1} 
                y={p.y > 50 ? 50 : p.y} 
                width="2" 
                height={Math.max(1, Math.abs(50 - p.y))} 
                fill={p.y < 50 ? "#22ab94" : "#f23645"} 
                fillOpacity={hoverIdx === i ? "1" : "0.6"}
              />
            ))
          )}
          
          {sig.type === 'bars' && (
            pathData.map((p, i) => (
              <rect 
                key={i}
                x={p.x - 1} 
                y={p.y} 
                width="1.5" 
                height={Math.max(1, 100 - p.y)} 
                fill="#2962ff" 
                fillOpacity={hoverIdx === i ? "1" : "0.35"}
              />
            ))
          )}
          
          {(sig.type === 'line' || sig.type === 'stoch') && (
            <>
              {sig.type === 'stoch' && (
                <rect x="0" y="20" width="100" height="60" fill="#ff9800" fillOpacity="0.02" />
              )}
              <path 
                d={`M ${pathData[0].x} ${pathData[0].y} ${pathData.map(p => `L ${p.x} ${p.y}`).join(' ')}`}
                fill="none"
                stroke={sig.color}
                strokeWidth="1.2"
              />
            </>
          )}

          {/* Interactive Crosshair & Value Marker */}
          {activePoint && (
            <>
              {/* Highlight Vertical Line */}
              <line 
                x1={activePoint.x} 
                y1="0" 
                x2={activePoint.x} 
                y2="100" 
                stroke="rgba(16, 185, 129, 0.45)" 
                strokeWidth="0.5" 
                strokeDasharray="2,2" 
              />
              {/* Point Marker */}
              <circle 
                cx={activePoint.x} 
                cy={activePoint.y} 
                r="2.5" 
                fill="#10b981" 
                stroke="#fff" 
                strokeWidth="0.8"
                className="shadow-lg"
              />
            </>
          )}
        </svg>

        {/* Floating crosshair details */}
        {activePoint && (
          <div className="absolute bottom-1 right-1 px-1 py-[0.5px] bg-black/95 border border-zinc-900 text-[5px] text-zinc-500 font-mono tracking-tighter uppercase leading-none rounded-3xs shadow-md">
            T-{20 - hoverIdx} | {activePoint.realVal.toFixed(1)}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center text-[5.5px] font-mono leading-none select-none">
        <span className={cn(
          "px-1 py-0.5 rounded-[2px] transition-all font-bold uppercase",
          ["Overbought", "Bullish", "Strong", "Trending", "Momentum", "High Volume"].includes(currentSignal) ? "bg-emerald-950/60 text-emerald-400 border border-emerald-900/30 font-black" :
          ["Oversold", "Volatile", "Bearish", "Weak", "Pullback", "Low Volume"].includes(currentSignal) ? "bg-rose-950/60 text-rose-400 border border-rose-900/30 font-black" :
          "bg-zinc-900 text-zinc-400 border border-zinc-800/30"
        )}>
          {currentSignal}
        </span>
        <span className="text-zinc-650 font-black tracking-widest text-[5px]">
          {activePoint ? `VAL_POS: ${hoverIdx}` : "CONF: 0.89"}
        </span>
      </div>
    </div>
  );
};

export const DataSidebar = React.memo(({
  selectedStock,
  quote,
  sentiment,
  history,
  financials,
  profile,
  isMinimized,
  onToggleMinimize,
  isFocusMode = true,
  pinnedTickers = [],
  onTogglePin,
}: DataSidebarProps) => {
  const [logs, setLogs] = useState([
    "[ SYSTEM ]: QUANT PORT DISPATCHER RE-ROUTED",
    "[ CACHE ]: HIGH-AVAILABILITY CLOUD RUN TARGET SYNCED",
    "[ RADER ]: SPATIAL TRACKING ENABLED"
  ]);

  React.useEffect(() => {
    if (isMinimized || !selectedStock) return;
    
    const messages = [
      "SIG_SYNC: Receiving telemetry packets...",
      "DATA_NODE: Handshaking with cluster 0xEF...",
      "MKT_VIBE: Calculating volatility coefficients",
      "SENS_RES: Adjusting LOD for deep tracking",
      "KERN_UP: Flushing spatial cache buffers",
      "YIELD_OPT: Optimizing curve projections"
    ];

    const interval = setInterval(() => {
      const msg = messages[Math.floor(Math.random() * messages.length)];
      setLogs(prev => [`[ ${new Date().toLocaleTimeString([], { hour12: true })} ]: ${msg}`, ...prev.slice(0, 8)]);
    }, 4500);

    return () => clearInterval(interval);
  }, [selectedStock, isMinimized]);

  const computedMetrics = useMemo(() => {
    if (!selectedStock) return [];

    const symbol = selectedStock.symbol || "";
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
      hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
    }
    const seed = Math.abs(hash);

    // Fallbacks
    const fallbackMktCap = 150000000000 + (seed % 80) * 12000000000;
    const fallbackPeRatio = 14.5 + (seed % 15) + (seed % 10) / 10;
    const fallbackDivYield = (0.5 + (seed % 5) * 0.6) / 100;
    const fallbackBeta = 0.82 + (seed % 15) * 0.05;
    const fallbackRevenue = (fallbackMktCap * 0.12) * (0.95 + (seed % 5) * 0.05);
    const fallbackNetIncome = (fallbackRevenue * 0.11) * (0.9 + (seed % 4) * 0.08);
    const fallbackDebtToEquity = 0.45 + (seed % 10) * 0.12;
    const fallbackVolume = 8500000 + (seed % 24) * 6200000;

    const finalMktCap = profile?.mktCap || quote?.marketCap || fallbackMktCap;
    const finalPeRatio = profile?.peRatio || fallbackPeRatio;
    const finalDivYield = profile?.divYield !== undefined && profile?.divYield !== null ? profile.divYield : fallbackDivYield;
    const finalBeta = profile?.beta !== undefined && profile?.beta !== null ? profile.beta : fallbackBeta;
    const finalRevenue = financials?.[0]?.revenue || fallbackRevenue;
    const finalNetIncome = financials?.[0]?.netIncome || fallbackNetIncome;
    const finalDebtToEquity = profile?.debtToEquity || fallbackDebtToEquity;
    const finalVolume = quote?.volume || fallbackVolume;

    return [
      { 
        label: 'MKT CAP', 
        value: formatCurrency(finalMktCap),
        tooltip: "Market Capitalization: Total equity valuation estimated via corporate ledger decrypts.",
        status: profile?.mktCap ? "INTEGRITY_OK" : "DECRYPT_ESTIMATE"
      },
      { 
        label: 'P/E RATIO', 
        value: finalPeRatio.toFixed(2),
        tooltip: "Price-to-Earnings Ratio: Fundamental valuation index comparing price against earnings.",
        status: profile?.peRatio ? "INTEGRITY_OK" : "DECRYPT_ESTIMATE"
      },
      { 
        label: 'DIV YIELD', 
        value: `${(finalDivYield * 100).toFixed(2)}%`,
        tooltip: "Dividends Yield: Annual payout rate to stakeholders. Higher rates signify operational maturity.",
        status: profile?.divYield !== undefined && profile?.divYield !== null ? "INTEGRITY_OK" : "DECRYPT_ESTIMATE"
      },
      { 
        label: 'BETA', 
        value: finalBeta.toFixed(2),
        tooltip: "Beta Index: Risk measure gauging historical price volatility relative to market benchmarks.",
        status: profile?.beta !== undefined ? "INTEGRITY_OK" : "DECRYPT_ESTIMATE"
      },
      { 
        label: 'REVENUE', 
        value: formatCurrency(finalRevenue),
        tooltip: "Gross System Revenue: Aggregate incoming capital generated by asset operations.",
        status: financials?.[0]?.revenue ? "INTEGRITY_OK" : "DECRYPT_ESTIMATE"
      },
      { 
        label: 'NET INCOME', 
        value: formatCurrency(finalNetIncome),
        tooltip: "Net Corporate Income: Final profits after deducting operating costs, taxes and overhead.",
        status: financials?.[0]?.netIncome ? "INTEGRITY_OK" : "DECRYPT_ESTIMATE"
      },
      { 
        label: 'DEBT/EQUITY', 
        value: finalDebtToEquity.toFixed(2),
        tooltip: "Debt-to-Equity: Key leverage metric of liability versus shareholder capital reserves.",
        status: profile?.debtToEquity ? "INTEGRITY_OK" : "DECRYPT_ESTIMATE"
      },
      { 
        label: 'VOLUME', 
        value: formatCurrency(finalVolume),
        tooltip: "Asset Volume: Decrypted transactional flow of shares transacted over last 24H cycles.",
        status: quote?.volume ? "INTEGRITY_OK" : "DECRYPT_ESTIMATE"
      },
    ];
  }, [selectedStock, profile, financials, quote]);

  const consensusData = useMemo(() => {
    if (!selectedStock) return { label: "NEUTRAL", score: 0, color: "text-zinc-400", bgGlow: "rgba(113, 113, 122, 0.15)", hex: "#71717a" };
    
    const rsiVal = sentiment?.rsi || ((selectedStock.symbol.charCodeAt(0) % 40) + 42);
    const rsiSignal = rsiVal > 70 ? -1 : rsiVal < 30 ? 1 : 0;

    const macdIsBullish = selectedStock.symbol.charCodeAt(0) % 2 === 1;
    const macdSignal = macdIsBullish ? 1 : -1;

    const volOscVal = (selectedStock.symbol.charCodeAt(0) + (selectedStock.symbol.charCodeAt(1) || 65)) % 40 - 20;
    const volSignal = volOscVal > 5 ? 1 : volOscVal < -5 ? -1 : 0;

    const adxVal = (selectedStock.symbol.charCodeAt(0) % 30) + 15;
    const adxSignal = adxVal > 25 ? 1 : 0;

    const stochVal = (selectedStock.symbol.charCodeAt(2) || 72) % 60 + 20;
    const stochSignal = stochVal > 65 ? -1 : stochVal < 35 ? 1 : 0;

    const score = rsiSignal + macdSignal + volSignal + adxSignal + stochSignal;

    let label = "NEUTRAL";
    let color = "text-zinc-500 border border-zinc-500/25";
    let bgGlow = "rgba(113, 113, 122, 0.15)";
    let hex = "#71717a";
    
    if (score >= 2) {
      label = "STRONG BUY";
      color = "text-emerald-400 border border-emerald-500/25 bg-emerald-950/20";
      bgGlow = "rgba(16, 185, 129, 0.25)";
      hex = "#10b981";
    } else if (score === 1) {
      label = "BUY";
      color = "text-cyan-400 border border-cyan-500/25 bg-cyan-950/10";
      bgGlow = "rgba(6, 182, 212, 0.25)";
      hex = "#06b6d4";
    } else if (score === -1) {
      label = "SELL";
      color = "text-amber-500 border border-amber-500/25 bg-amber-950/10";
      bgGlow = "rgba(245, 158, 11, 0.25)";
      hex = "#f59e0b";
    } else if (score <= -2) {
      label = "STRONG SELL";
      color = "text-rose-500 border border-rose-500/25 bg-rose-950/20 animate-pulse";
      bgGlow = "rgba(239, 68, 68, 0.25)";
      hex = "#ef4444";
    }

    return { label, score, color, bgGlow, hex };
  }, [selectedStock, sentiment]);

  return (
    <aside className={cn(
      "h-full border-r border-zinc-800 flex flex-col bg-black bg-cyber-grid z-25 shrink-0 select-none overflow-hidden relative transition-all duration-150",
      "w-full shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] border-l border-zinc-900"
    )}>
      {isFocusMode && <div className="scanline-overlay" />}
      
      {/* Top Header */}
      <div className="h-11 border-b border-zinc-800 bg-zinc-950/95 flex items-center justify-between px-3 shrink-0 relative overflow-hidden group">
        {/* Hardware Markers */}
        <div className="absolute top-0 left-0 w-[2px] h-[2px] bg-zinc-700 m-1 rounded-full opacity-60" />
        <div className="absolute top-0 right-0 w-[2px] h-[2px] bg-zinc-700 m-1 rounded-full opacity-60" />
        <div className="absolute bottom-0 left-0 w-[2px] h-[2px] bg-zinc-700 m-1 rounded-full opacity-60" />
        <div className="absolute bottom-0 right-0 w-[2px] h-[2px] bg-zinc-700 m-1 rounded-full opacity-60" />
        
        {/* Bezel Accents */}
        <div className="absolute top-0 left-0 w-8 h-[1px] bg-emerald-500/10" />
        <div className="absolute top-0 left-0 w-[1px] h-8 bg-emerald-500/10" />

        {!isMinimized && (
          <div className="flex items-center gap-2.5">
             <div className="relative flex items-center justify-center">
               <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" />
               <div className="absolute w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping opacity-40" />
             </div>
             <div className="flex flex-col">
               <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white font-mono leading-none">DATA_TEL_STREAM_V3</span>
               {!isFocusMode ? (
                 <span className="text-[6px] text-emerald-400 font-mono font-black tracking-widest mt-0.5 animate-pulse">SYSTEM_ENHANCED_V2</span>
               ) : (
                 <span className="text-[6px] text-zinc-500 font-mono tracking-widest mt-0.5">SAT_LINK_ACTIVE_B01</span>
               )}
             </div>
          </div>
        )}
        <div className="flex items-center gap-1.5 z-10">
            <button 
              onClick={onToggleMinimize} 
              className="hidden md:flex text-zinc-500 hover:text-white transition-colors p-1 rounded-sm hover:bg-white/5 active:scale-95"
              title={isMinimized ? "Expand Sidebar" : "Minimize Sidebar"}
            >
              {isMinimized ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
            </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
          {/* Target Title & Spot price */}
          {selectedStock ? (
            <>
              <div className="p-3 border-b border-zinc-900 bg-black shrink-0 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-8 h-8 bg-emerald-500/5 rotate-45 translate-x-4 -translate-y-4 border border-emerald-500/20" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-3 bg-emerald-500/50 rounded-full" />
                      <span className="text-[9px] text-zinc-400 font-mono font-black uppercase tracking-[0.15em]">TARGET_INDEX_ROOT</span>
                    </div>
                    {onTogglePin && (
                      <button
                        onClick={(e) => onTogglePin(selectedStock.symbol, e)}
                        className={cn(
                          "flex items-center gap-1 px-1.5 py-0.5 rounded transition-all border",
                          pinnedTickers.includes(selectedStock.symbol)
                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-extrabold hover:bg-emerald-500/30"
                            : "bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                        )}
                        title={pinnedTickers.includes(selectedStock.symbol) ? "Unpin from monitor list" : "Pin to monitor list"}
                      >
                        <Pin className={cn("w-2.5 h-2.5", pinnedTickers.includes(selectedStock.symbol) ? "fill-emerald-400 text-emerald-400" : "text-zinc-500")} />
                        <span className="text-[7.5px] font-mono leading-none tracking-widest uppercase">
                          {pinnedTickers.includes(selectedStock.symbol) ? "PINNED" : "PIN"}
                        </span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <h2 className="font-sans text-xl text-white font-black tracking-tighter leading-none">{selectedStock.symbol}</h2>
                    <span className="text-[8.5px] text-zinc-500 font-mono font-bold">// {selectedStock.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[7px] mt-2.5">
                    <span className="text-zinc-500 uppercase px-1 border border-zinc-900 bg-black">{profile?.exchangeShortName || "EXCH"}</span>
                    <span className="text-zinc-700 opacity-30">•</span>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className="text-white text-lg font-bold">${quote?.price?.toFixed(2) || "N/A"}</span>
                      {quote && typeof quote.changesPercentage === 'number' && (
                        <span className={cn("text-xs font-bold", quote.changesPercentage >= 0 ? "text-emerald-400" : "text-red-400")}>
                          {quote.changesPercentage > 0 ? "+" : ""}{quote.changesPercentage.toFixed(2)}%
                        </span>
                      )}
                    </div>
                    <div className="ml-auto flex items-center gap-1 text-zinc-600">
                      <div className="w-1 h-1 bg-zinc-800 rounded-full" />
                      <span>LIVE</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 border-b border-zinc-900 bg-black/10">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3 bg-emerald-500/50 rounded-full" />
                    <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-[0.15em] font-black">TELEMETRY_TREND_PULSE</span>
                  </div>
                  <span className="text-[8px] font-mono text-zinc-600 font-bold tracking-tighter">30D_SPAN</span>
                </div>
                <div className="h-[145px] w-full">
                  <TelemetryChart 
                    data={history} 
                    aiForecast={sentiment?.forecast} 
                    ticker={selectedStock.symbol} 
                    isFocusMode={isFocusMode}
                  />
                </div>
              </div>

              {/* SECTOR_CORRELATION_MATRIX */}
              <div className="p-3 border-b border-zinc-900 bg-zinc-950/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3 bg-blue-500/50 rounded-full" />
                    <span className="text-[9px] text-zinc-400 font-mono font-black uppercase tracking-[0.15em]">PEER_CORR_VECTORS</span>
                  </div>
                  <span className="text-[7.5px] text-zinc-600 font-mono font-bold">ALPHA_MODEL::B6</span>
                </div>
                <div className="space-y-2">
                  {COMPANIES.filter(c => c.sector === selectedStock.sector && c.symbol !== selectedStock.symbol).slice(0, 3).map((peer) => {
                    const corr = (0.7 + (peer.symbol.charCodeAt(0) % 30) / 100).toFixed(2);
                    return (
                      <div key={peer.symbol} className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-[8px] font-mono">
                          <span className="text-zinc-500">{peer.symbol} // {peer.name.slice(0, 15)}</span>
                          <span className="text-blue-400 font-black">+{corr}</span>
                        </div>
                        <div className="h-[3px] bg-zinc-900 rounded-full overflow-hidden relative">
                           <motion.div 
                             className="h-full bg-blue-500/60"
                             initial={{ width: 0 }}
                             animate={{ width: `${parseFloat(corr) * 100}%` }}
                             transition={{ duration: 1, ease: "easeOut" }}
                           />
                           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Technical Indicator Gauges */}
              <div className="p-3 border-b border-zinc-900 bg-black/40">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3 bg-emerald-500/50 rounded-full" />
                    <span className="text-[9px] text-zinc-400 font-mono font-black uppercase tracking-[0.15em]">CORE_OSCILLATORS_0xAF</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[7px] text-zinc-600 font-mono font-bold tracking-tighter">SYSTEM_READY</span>
                    <Settings className="w-2.5 h-2.5 text-zinc-700" />
                  </div>
                </div>

                {/* Tactical aggregate speed gauge */}
                <div className="border border-zinc-900 bg-zinc-950/80 rounded-sm p-2 px-3 mb-3 flex items-center justify-between gap-2 relative overflow-hidden group/gauge">
                  <div className="flex flex-col flex-1 font-sans">
                    <span className="text-[6.5px] text-zinc-500 font-mono font-black tracking-widest uppercase">AGG_ANALYSIS_PULSE</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={cn("text-[8.5px] font-mono font-black tracking-widest leading-none px-1.5 py-0.5 rounded-2xs border uppercase", consensusData.color)}>
                        {consensusData.label}
                      </span>
                    </div>
                    <span className="text-[6.5px] text-zinc-400 font-mono leading-tight mt-1.5">
                      Indicator matrices confirm {consensusData.label.toLowerCase()} profile signature.
                    </span>
                  </div>

                  <div className="relative w-20 h-10 flex items-center justify-center pt-2 select-none shrink-0">
                    <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                      <defs>
                        <radialGradient id="gaugeGlow" cx="50%" cy="90%" r="90%">
                          <stop offset="0%" stopColor={consensusData.hex} stopOpacity="0.25" />
                          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                        </radialGradient>
                      </defs>
                      <path d="M 12 45 A 38 38 0 0 1 88 45 Z" fill="url(#gaugeGlow)" />
                      <path d="M 15 45 A 35 35 0 0 1 85 45" fill="none" stroke="#222" strokeWidth="4" strokeLinecap="round" />
                      
                      {/* Interactive regions */}
                      <path d="M 15 45 A 35 35 0 0 1 35 25" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.4" />
                      <path d="M 35 25 A 35 35 0 0 1 65 25" fill="none" stroke="#71717a" strokeWidth="1.5" strokeOpacity="0.4" />
                      <path d="M 65 25 A 35 35 0 0 1 85 45" fill="none" stroke="#10b981" strokeWidth="1.5" strokeOpacity="0.4" />
                      
                      <circle cx="50" cy="45" r="3.5" fill="#fff" />
                      <circle cx="50" cy="45" r="5" fill="none" stroke="#444" strokeWidth="0.8" />
                      
                      <g style={{ transform: `rotate(${90 - (consensusData.score * 35)}deg)`, transformOrigin: "50px 45px", transition: "transform 1s cubic-bezier(0.19, 1, 0.22, 1)" }}>
                        <line x1="50" y1="45" x2="50" y2="15" stroke={consensusData.score === 0 ? "#71717a" : consensusData.hex} strokeWidth="1.8" strokeLinecap="round" />
                        <polygon points="48.5,28 51.5,28 50,11" fill={consensusData.score === 0 ? "#71717a" : consensusData.hex} />
                      </g>
                    </svg>
                    
                    <div className="absolute bottom-0 text-[6px] font-mono text-zinc-500 tracking-wider font-bold">
                      COEF_SLOPE: {consensusData.score > 0 ? "+" : ""}{consensusData.score}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { 
                      label: "RSI (14)", 
                      val: sentiment?.rsi?.toFixed(2) || ((selectedStock.symbol.charCodeAt(0) % 40) + 42).toFixed(2), 
                      color: "#7e72a2", // RSI Purple
                      type: 'area',
                      signal: (sentiment?.rsi || (selectedStock.symbol.charCodeAt(0) % 40) + 42) > 70 ? "Overbought" : (sentiment?.rsi || (selectedStock.symbol.charCodeAt(0) % 40) + 42) < 30 ? "Oversold" : "Neutral"
                    },
                    { 
                      label: "MACD Hist", 
                      val: (selectedStock.symbol.charCodeAt(0) % 2 ? "+" : "-") + (0.15 + (selectedStock.symbol.charCodeAt(1) % 10) / 20).toFixed(2), 
                      color: "#22ab94", // TradingView Green
                      type: 'histogram',
                      signal: selectedStock.symbol.charCodeAt(0) % 2 ? "Bullish" : "Bearish"
                    },
                    { 
                      label: "Vol. Osc", 
                      val: `${((selectedStock.symbol.charCodeAt(0) + (selectedStock.symbol.charCodeAt(1) || 65)) % 40 - 20).toFixed(2)}%`, 
                      color: "#2962ff", // TradingView Blue
                      type: 'bars',
                      signal: ((selectedStock.symbol.charCodeAt(0) + (selectedStock.symbol.charCodeAt(1) || 65)) % 40 - 20) > 5 ? "High Volume" : ((selectedStock.symbol.charCodeAt(0) + (selectedStock.symbol.charCodeAt(1) || 65)) % 40 - 20) < -5 ? "Low Volume" : "Normal"
                    },
                    { 
                      label: "ADX (14)", 
                      val: ((selectedStock.symbol.charCodeAt(0) % 30) + 15).toFixed(1), 
                      color: "#f23645", // TradingView Red
                      type: 'line',
                      signal: ((selectedStock.symbol.charCodeAt(0) % 30) + 15) > 25 ? "Strong" : "Weak"
                    },
                    { 
                      label: "Stoch %K", 
                      val: ((selectedStock.symbol.charCodeAt(2) || 72) % 60 + 20).toFixed(1), 
                      color: "#ff9800", // Orange
                      type: 'stoch',
                      signal: ((selectedStock.symbol.charCodeAt(2) || 72) % 60 + 20) > 65 ? "Momentum" : ((selectedStock.symbol.charCodeAt(2) || 72) % 60 + 20) < 35 ? "Pullback" : "Neutral"
                    },
                    { 
                      label: "ATR (14)", 
                      val: sentiment?.atr?.toFixed(3) || (selectedStock.symbol.charCodeAt(1) % 5 + 1.25).toFixed(3), 
                      color: "#b2b5be", // Gray
                      type: 'line',
                      signal: (sentiment?.atr || (selectedStock.symbol.charCodeAt(1) % 5 + 1.25)) > 2.2 ? "Volatile" : "Stable"
                    }
                  ].map((sig) => (
                    <OscillatorCard key={sig.label} sig={sig} symbol={selectedStock.symbol} />
                  ))}
                </div>
              </div>              {/* Valuation & Core Metrics Grid */}
              <div className="p-3 border-b border-zinc-900 bg-black/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-3 bg-emerald-500/50 rounded-full" />
                  <span className="text-[9px] text-zinc-400 font-mono font-black uppercase tracking-[0.15em]">VALUATION_METRICS_v2</span>
                </div>
                <div className="grid grid-cols-2 gap-px border border-emerald-950/40 bg-emerald-950/10 p-1 rounded-sm">
                  {computedMetrics.map((metric) => (
                    <div 
                      key={metric.label} 
                      className="bg-black/95 px-2 py-2 flex flex-col gap-0.5 border border-zinc-900 hover:border-emerald-500/30 transition-all duration-150 group/metric cursor-help relative fill-mode-forwards"
                    >
                      {/* Cyberpunk Tactical Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-zinc-950/95 border border-emerald-500/35 rounded-xs text-[7px] text-zinc-300 font-mono shadow-[0_0_15px_rgba(16,185,129,0.15)] opacity-0 scale-95 pointer-events-none group-hover/metric:opacity-100 group-hover/metric:scale-100 transition-all duration-155 z-50">
                        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1 mb-1 font-mono">
                          <span className="text-emerald-400 font-black uppercase tracking-wider">{metric.label} INFO</span>
                          <span className={cn(
                            "text-[5.5px] px-1 rounded-3xs border font-black",
                            metric.status === "INTEGRITY_OK" 
                              ? "border-emerald-500/30 text-emerald-500 bg-emerald-555/10" 
                              : "border-amber-500/30 text-amber-500 bg-amber-555/10"
                          )}>
                            {metric.status}
                          </span>
                        </div>
                        <p className="leading-snug text-zinc-400 select-none">{metric.tooltip}</p>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[7px] font-mono text-zinc-600 uppercase font-black tracking-widest group-hover/metric:text-zinc-500">{metric.label}</span>
                        <div className="w-1 h-1 bg-emerald-500/20 rounded-full group-hover/metric:bg-emerald-500/60" />
                      </div>
                      <span className="text-[9px] font-mono text-emerald-500 font-bold tracking-tight">{metric.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Partnership Highlights */}
              {selectedStock?.partners && selectedStock.partners.length > 0 && (
                <div className="p-3 border-b border-zinc-900 bg-emerald-950/5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-3 bg-emerald-500/50 rounded-full" />
                    <span className="text-[9px] text-emerald-500 font-mono font-black uppercase tracking-[0.15em]">PARTNERSHIP_ECOSYSTEM</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(selectedStock.partners || []).map((p: string) => (
                      <span key={p} className="bg-emerald-900/20 text-emerald-400 text-[7px] px-1.5 py-0.5 rounded-sm border border-emerald-500/30 uppercase font-mono tracking-wider">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 6Q Net Income P&L Trend sparkline */}
              <div className="px-3 py-2 font-sans text-[10px] border-b border-zinc-900 bg-black/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3 bg-emerald-500/30 rounded-full" />
                  <span className="text-[8.5px] text-zinc-500 uppercase font-bold tracking-tight">FINANCIAL_P&L_TRAJECTORY</span>
                </div>
                {financials && financials.length > 0 ? (
                  <div className="w-16 h-4 opacity-70">
                    <Sparkline data={financials.map(f => ({ close: f.netIncome }))} />
                  </div>
                ) : (
                  <div className="text-[8px] font-mono text-zinc-800">[ UNAVAILABLE ]</div>
                )}
              </div>

              {/* Micro terminal logs for visual flare */}
              <div className="h-24 bg-black border-t border-zinc-900 flex flex-col shrink-0">
                <div className="px-3 py-1.5 bg-black/80 border-b border-zinc-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3 bg-emerald-500/40 rounded-full" />
                    <span className="text-[8px] text-zinc-500 font-mono font-bold uppercase tracking-wider">TERMINAL_STREAM</span>
                  </div>
                  <div className="w-1.5 h-1.5 bg-emerald-500/80 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                </div>
                <div className="flex-1 overflow-y-auto p-2 font-mono text-[8px] text-emerald-500/70 scrollbar-none select-text">
                  {logs.map((log, i) => (
                    <div key={i} className="mb-0.5 leading-tight hover:text-emerald-400 transition-colors">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
              <Activity className="w-8 h-8 text-zinc-800 mb-3" />
              <h3 className="font-mono text-zinc-500 uppercase tracking-[0.3em] font-black text-[9px]">TARGET REQUIRED</h3>
              <p className="text-[7.5px] font-mono text-zinc-650 mt-2 uppercase tracking-wider">Select an asset marker to load pricing signals.</p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
});
