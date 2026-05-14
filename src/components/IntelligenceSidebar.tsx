import React, { useMemo } from "react";
import { Company } from "../data/companies";
import { TrendingUp, Newspaper, Activity, Zap, Globe, RefreshCcw } from "lucide-react";
import { formatCurrency, cn } from "../lib/utils";

interface IntelligenceSidebarProps {
  selectedStock: Company | null;
  quote: any;
  news: any[];
  financials: any[];
  profile: any;
  history: any[];
  isAiProcessing: boolean;
}

const CustomTelemetryChart = ({ data }: { data: any[] }) => {
  const chartData = useMemo(() => {
    if (!data || data.length < 2) return [];
    // Sort and take last 50 points for the narrow sidebar
    return [...data].sort((a, b) => a.time - b.time).slice(-50);
  }, [data]);

  if (chartData.length < 2) return (
    <div className="flex-1 flex items-center justify-center font-mono text-[10px] text-zinc-800 uppercase tracking-widest">
      Establishing_Link...
    </div>
  );

  const minPrice = Math.min(...chartData.map(d => d.low));
  const maxPrice = Math.max(...chartData.map(d => d.high));
  const priceRange = maxPrice - minPrice;
  const padding = priceRange * 0.1;

  const getY = (price: number) => {
    return 100 - ((price - (minPrice - padding)) / (priceRange + padding * 2)) * 100;
  };

  const getX = (index: number) => {
    return (index / (chartData.length - 1)) * 100;
  };

  return (
    <div className="flex-1 w-full h-full relative overflow-hidden px-1">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Horizontal Grids */}
        {[0, 25, 50, 75, 100].map(level => (
          <line 
            key={level} 
            x1="0" y1={level} x2="100" y2={level} 
            stroke="#ffffff08" 
            strokeWidth="0.5" 
          />
        ))}
        
        {/* Price Action Path (Area) */}
        <path
          d={`M 0 100 ${chartData.map((d, i) => `L ${getX(i)} ${getY(d.close)}`).join(' ')} L 100 100 Z`}
          fill="url(#chartGradient)"
          className="opacity-20"
        />
        
        {/* Main Price Line */}
        <path
          d={`M ${chartData.map((d, i) => `${getX(i)} ${getY(d.close)}`).join(' L ')}`}
          fill="none"
          stroke="#22ab94"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          className="drop-shadow-[0_0_8px_rgba(34,171,148,0.5)]"
        />

        {/* Highlight Last Point */}
        <circle 
          cx={100} 
          cy={getY(chartData[chartData.length - 1].close)} 
          r="1" 
          fill="#22ab94"
          className="animate-pulse"
        />

        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22ab94" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#22ab94" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Absolute Overlays for Data Precision */}
      <div className="absolute top-2 right-2 font-mono text-[8px] text-zinc-700 flex flex-col items-end uppercase pointer-events-none">
        <span>MAX: {maxPrice.toFixed(2)}</span>
        <span>MIN: {minPrice.toFixed(2)}</span>
      </div>
      
      <div className="absolute bottom-2 left-2 font-mono text-[8px] text-zinc-700 uppercase pointer-events-none">
        SMPL_SIZE: {chartData.length}_TICKS
      </div>
    </div>
  );
};

export const IntelligenceSidebar: React.FC<IntelligenceSidebarProps> = ({ 
  selectedStock, 
  quote,
  news = [], 
  financials = [], 
  profile, 
  history = [],
  isAiProcessing
}) => {

  if (!selectedStock) {
    return (
      <aside className="w-56 border-l border-zinc-800 flex flex-col bg-zinc-950 z-20 shrink-0 select-none overflow-hidden">
        <div className="p-3 border-b border-zinc-800 bg-black">
          <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-1">System_Idle</div>
          <h2 className="font-mono text-lg text-zinc-800 font-black tracking-tighter uppercase leading-none">Awaiting_Target</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-black/20">
          <Activity className="w-12 h-12 text-zinc-900 mb-3 animate-pulse" />
          <h3 className="font-mono text-[#22ab94] uppercase tracking-[0.2em] font-bold text-[10px]">Uplink Required</h3>
          <p className="text-zinc-600 font-mono text-[8px] mt-2 leading-relaxed italic">Select a node from the global distribution network to initialize live data telemetry.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-56 h-full border-l border-zinc-800 flex flex-col bg-zinc-950 z-20 shrink-0 select-none overflow-y-auto custom-scrollbar scroll-smooth">
      {/* TICKET / PROFILE HEADER */}
      <div className="p-3 border-b border-zinc-800 bg-black sticky top-0 z-40">
        <div className="flex justify-between items-start mb-1">
          <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest flex items-center gap-1">
            <Globe className="w-2.5 h-2.5" /> Live_Protocol
          </div>
          <div className="flex items-center gap-1.5">
            {isAiProcessing && <Zap className="w-2 h-2 text-[#22ab94] animate-pulse" />}
            <div className="text-[9px] bg-[#22ab94]/10 text-[#22ab94] px-1 py-0.5 border border-[#22ab94]/20 font-mono font-bold uppercase">LOCKED</div>
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-mono text-2xl text-white font-black tracking-tighter leading-none">{selectedStock.symbol}</h2>
            <div className="text-[8px] text-zinc-600 font-mono mt-1 uppercase tracking-tight truncate max-w-[120px]">{profile?.companyName || selectedStock.name}</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-mono text-white font-bold leading-none tracking-tighter">
              ${quote?.price?.toFixed(2) || "---"}
            </div>
            <div className={cn(
              "text-[9px] font-mono font-bold mt-0.5",
              (quote?.changes || 0) >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {(quote?.changes || 0) >= 0 ? "+" : ""}{(quote?.changes || 0).toFixed(2)} ({(quote?.changesPercentage || 0).toFixed(2)}%)
            </div>
          </div>
        </div>
      </div>

      {/* PRICE CHART - SQUARE CONTAINER */}
      <div className="h-56 border-b border-zinc-800 bg-black relative flex flex-col group shrink-0">
        <div className="absolute top-4 left-3 z-10 flex items-center gap-2 pointer-events-none">
          <div className="w-1 h-1 bg-[#22ab94] rounded-full animate-pulse shadow-[0_0_8px_#22ab94]" />
          <span className="text-[9px] font-mono text-[#22ab94] font-bold tracking-widest uppercase opacity-40">Telemetry</span>
        </div>
        
        <div className="absolute top-4 right-3 z-10 flex gap-2">
          <button 
            className="bg-zinc-900/50 border border-zinc-800 p-1 hover:bg-[#22ab94] hover:text-black transition-all group/btn"
            title="Sychronize Neural Link"
          >
            <RefreshCcw className="w-3 h-3 text-[#22ab94] group-hover/btn:text-black" />
          </button>
        </div>

        <div className="flex-1 w-full mt-2 flex flex-col">
          <CustomTelemetryChart data={history} />
        </div>
      </div>

      {/* QUICK STATS & CUSTOM EARNINGS */}
      <div className="grid grid-cols-2 border-b border-zinc-800 bg-black/40">
        <div className="p-3 border-r border-zinc-800 bg-black/20">
          <div className="text-[9px] font-mono text-zinc-600 uppercase mb-1">Market Cap</div>
          <div className="font-mono text-xs text-[#22ab94] font-bold">{profile?.mktCap ? formatCurrency(profile.mktCap) : "---"}</div>
          <div className="mt-4 text-[9px] font-mono text-zinc-600 uppercase mb-1">Volume (Avg)</div>
          <div className="font-mono text-xs text-zinc-400">{profile?.volAvg ? formatCurrency(profile.volAvg) : "---"}</div>
        </div>
        <div className="p-3 flex flex-col">
          <div className="text-[9px] font-mono text-zinc-600 uppercase mb-3">Profit_Velocity</div>
          <div className="flex-1 flex items-end gap-1 px-1 h-12">
            {financials && financials.length > 0 ? (
              (() => {
                const maxVal = Math.max(...financials.map(f => Math.abs(f.netIncome || 0)), 1);
                return financials.slice(-6).map((f: any, i: number) => {
                  const height = Math.min(Math.max((Math.abs(f.netIncome || 0) / maxVal) * 100, 15), 100);
                  return (
                    <div 
                      key={i}
                      className={cn(
                        "flex-1 transition-all duration-500",
                        (f.netIncome || 0) >= 0 ? "bg-[#22ab94]/60 hover:bg-[#22ab94]" : "bg-red-900/60 hover:bg-red-600"
                      )}
                      style={{ height: `${height}%` }}
                      title={`Period: ${f.date}, Var: ${f.netIncome}`}
                    />
                  );
                });
              })()
            ) : (
              [1,2,3,4,5,6].map(i => <div key={i} className="flex-1 bg-zinc-900 h-2 animate-pulse" />)
            )}
          </div>
          <div className="mt-2 text-[8px] font-mono text-zinc-700 flex justify-between uppercase">
            <span>Past_6Q</span>
            <span>Delta_Net</span>
          </div>
        </div>
      </div>

      {/* INTELLIGENCE FEED */}
      <div className="flex flex-col bg-black border-t border-zinc-800">
        <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1">
            <Newspaper className="w-3 h-3" /> Intelligence_Sync
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {news && news.length > 0 ? (
            news.map((item, idx) => (
              <div key={idx} className="group border-b border-zinc-900 pb-3 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-mono text-zinc-700">
                    {new Date(item.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="h-[1px] flex-1 bg-zinc-900 group-hover:bg-[#22ab94]/20" />
                </div>
                <h4 className="text-[11px] font-bold text-zinc-400 leading-snug group-hover:text-[#22ab94] transition-colors line-clamp-2">
                  {item.intelligence?.translatedTitle || item.title}
                </h4>
              </div>
            ))
          ) : (
            <div className="py-8 text-center opacity-20">
              <Activity className="w-8 h-8 text-white mx-auto mb-2 animate-pulse" />
              <div className="text-[10px] font-mono uppercase">Scanning_Neural_Feed...</div>
            </div>
          )}
          
          {isAiProcessing && (
            <div className="py-2 flex items-center gap-2 border-t border-[#22ab94]/10">
              <div className="w-1 h-1 bg-[#22ab94] rounded-full animate-ping" />
              <span className="text-[8px] font-mono text-[#22ab94] uppercase tracking-tighter">Gemini_Enrichment_Active</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

