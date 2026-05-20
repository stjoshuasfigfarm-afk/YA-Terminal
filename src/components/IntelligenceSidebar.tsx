import React, { useMemo, useEffect, useRef } from "react";
import Markdown from "react-markdown";
import { Company } from "../data/companies";
import { 
  TrendingUp, 
  Newspaper, 
  Activity, 
  Zap, 
  Globe as GlobeIcon, 
  RefreshCcw, 
  Link2, 
  Box, 
  ShieldAlert 
} from "lucide-react";
import { formatCurrency, cn } from "../lib/utils";
import { TelemetryChart } from "./TelemetryChart";

interface IntelligenceSidebarProps {
  selectedStock: Company | null;
  quote: any;
  news: any[];
  financials: any[];
  profile: any;
  history: any[];
  historyResolution: string;
  setHistoryResolution: (res: string) => void;
  isAiProcessing: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  relationships?: { suppliers: any[], customers: any[] };
  briefing?: string | null;
  yields?: any;
}

const YieldAnalysis = ({ yields }: { yields: any }) => {
  if (!yields) return null;
  
  return (
    <div className="p-2 border-b border-zinc-800 bg-black/40 shrink-0 hover:bg-zinc-900/20 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[8px] font-mono uppercase tracking-widest flex items-center gap-1" style={{ color: "#22ab94" }}>
          <TrendingUp className="w-2 h-2" /> Yield_Analysis
        </div>
        <div className="text-[7px] font-mono text-zinc-600 uppercase italic">
          {yields.country}_BENCHMARK
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex-col flex">
          <span className="text-[7px] font-mono uppercase text-zinc-500">CB_RATE</span>
          <span className="text-[11px] font-mono font-bold text-white tracking-widest">
            {yields.interestRate.toFixed(2)}%
          </span>
        </div>
        <div className="h-6 w-[1px] bg-zinc-800 mx-2" />
        <div className="flex-1 flex justify-between items-end gap-1 h-6">
          {yields.treasuries && Object.entries(yields.treasuries).map(([key, val]: [string, any]) => (
            <div key={key} className="flex-1 flex flex-col items-center group relative">
              <div 
                className="w-full bg-white/40 hover:bg-white transition-all shadow-[0_0_8px_rgba(34,171,148,0.2)]" 
                style={{ height: `${(val / 10) * 100}%`, backgroundColor: "#22ab94" }}
              />
              <span className="text-[6px] font-mono mt-0.5 text-zinc-500 group-hover:text-emerald-400">{key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const IntelligenceSidebar: React.FC<IntelligenceSidebarProps> = ({ 
  selectedStock, 
  quote,
  news = [], 
  financials = [], 
  profile, 
  history = [],
  historyResolution,
  setHistoryResolution,
  isAiProcessing,
  activeTab,
  setActiveTab,
  relationships = { suppliers: [], customers: [] },
  briefing,
  yields
}) => {

  if (!selectedStock) {
    return (
      <aside className="w-44 border-l border-zinc-800 flex flex-col bg-zinc-950 z-20 shrink-0 select-none overflow-hidden">
        <div className="p-2 border-b border-zinc-800 bg-black">
          <div className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest mb-0.5">System_Idle</div>
          <h2 className="font-mono text-sm text-zinc-800 font-black tracking-tighter uppercase leading-none">Awaiting_Target</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-black/20">
          <Activity className="w-12 h-12 text-zinc-900 mb-3 animate-pulse" />
          <h3 className="font-mono text-white uppercase tracking-[0.2em] font-bold text-[10px]">Uplink Required</h3>
          <p className="text-zinc-600 font-mono text-[8px] mt-2 leading-relaxed italic">Select a node from the global distribution network to initialize live data telemetry.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-44 h-full border-l border-zinc-800 flex flex-col bg-zinc-950 z-20 shrink-0 select-none overflow-hidden">
      <section className="p-2 border-b border-zinc-800 bg-black shrink-0">
        <div className="flex justify-between items-start mb-0.5">
          <div className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest flex items-center gap-1">
            <GlobeIcon className="w-2 h-2" /> Live_Protocol
          </div>
          <div className="flex items-center gap-1">
            {isAiProcessing && <Zap className="w-1.5 h-1.5 text-white animate-pulse" />}
            <div className="text-[8px] bg-white/10 text-white px-1 py-0.5 border border-white/20 font-mono font-bold uppercase animate-pulse">LOCKED</div>
          </div>
        </div>
        <div className="flex items-start justify-between mb-2 pb-2 border-b border-zinc-900">
          <div>
            <h2 className="font-mono text-base text-white font-black tracking-tighter leading-none">{selectedStock.symbol}</h2>
            <div className="text-[7px] text-zinc-500 font-mono mt-0.5 uppercase tracking-tight truncate max-w-[85px]">
              {profile?.companyName || selectedStock.name}
            </div>
          </div>
          <div className="text-right">
            <div 
              id="price-feed" 
              className="text-[11px] font-mono text-white font-bold leading-none tracking-tighter cursor-pointer hover:text-emerald-400 transition-colors flex items-center justify-end gap-1"
              onClick={() => navigator.clipboard.writeText(quote?.price?.toFixed(2) || "")}
              title="Click to copy price"
            >
              ${quote?.price?.toFixed(2) || "---"}
              <span className="text-[6px] text-zinc-650">📋</span>
            </div>
            <div className={cn(
              "text-[7px] font-mono font-bold mt-1 flex items-center justify-end gap-1",
              (quote?.changes || 0) >= 0 ? "text-emerald-400" : "text-red-500"
            )}>
              {(quote?.changes || 0) >= 0 ? <TrendingUp className="w-1.5 h-1.5" /> : <Activity className="w-1.5 h-1.5" />}
              {(quote?.changes || 0) >= 0 ? "+" : ""}{(quote?.changes || 0).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="mt-2 border border-zinc-900 bg-black/40">
          <div className="p-1 px-2 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/40">
             <span className="text-[7px] font-mono uppercase text-zinc-400 tracking-wider">Live_Telemetry</span>
             <span className="text-[6px] font-mono text-zinc-505 uppercase">MKT_TREND</span>
          </div>
          <div className="h-28 w-full p-1">
            <TelemetryChart data={history} />
          </div>
        </div>

        <div className="flex gap-1 mt-1 justify-end">
          {['60', 'D', 'W'].map((res) => (
            <button
              key={res}
              onClick={() => setHistoryResolution(res)}
              className={cn(
                "text-[7px] font-mono px-1.5 py-0.5 transition-all border border-transparent",
                historyResolution === res 
                  ? "text-white bg-zinc-800 border-zinc-700" 
                  : "text-zinc-600 hover:text-zinc-400"
              )}
            >
              {res === '60' ? '1H' : res === 'D' ? '1D' : '1W'}
            </button>
          ))}
        </div>

      </section>

      {/* VERTICAL SEPARATION GAP */}
      <div className="h-40 shrink-0 bg-transparent border-x border-zinc-900 pointer-events-none relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #333 1px, transparent 0)', backgroundSize: '12px 12px' }} />
      </div>

      <section className="flex-1 flex flex-col overflow-y-auto custom-scrollbar scroll-smooth">
        <YieldAnalysis yields={yields} />

        <div className="grid grid-cols-2 border-b border-zinc-800 bg-black/40 shrink-0">
          <div className="p-2 border-r border-zinc-800 bg-black/20">
            <div className="text-[8px] font-mono text-zinc-600 uppercase mb-0.5">Market Cap</div>
            <div className="font-mono text-[10px] text-white font-bold">{profile?.mktCap ? formatCurrency(profile.mktCap) : "---"}</div>
            <div className="mt-3 text-[8px] font-mono text-zinc-600 uppercase mb-0.5">Volume (Avg)</div>
            <div className="font-mono text-[10px] text-zinc-400">{profile?.volAvg ? formatCurrency(profile.volAvg) : "---"}</div>
          </div>
          <div className="p-2 flex flex-col">
            <div className="text-[8px] font-mono text-zinc-600 uppercase mb-2">Profit_Velocity</div>
            <div className="flex-1 flex items-end gap-0.5 px-0.5 h-10">
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
                          (f.netIncome || 0) >= 0 ? "bg-white/60 hover:bg-white" : "bg-red-900/60 hover:bg-red-600"
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
            <div className="mt-1 text-[7px] font-mono text-zinc-700 flex justify-between uppercase">
              <span>Past_6Q</span>
              <span>Delta_Net</span>
            </div>
          </div>
        </div>

        <div className="flex border-b border-zinc-800 bg-black shrink-0">
          <button 
            onClick={() => setActiveTab("INTEL")}
            className={cn(
              "flex-1 py-2 text-[9px] font-mono font-bold uppercase tracking-[0.2em] transition-all",
              activeTab === "INTEL" ? "text-white bg-white/5 border-b-2 border-white" : "text-zinc-600 hover:text-zinc-400"
            )}
          >
            Intelligence
          </button>
          <button 
            onClick={() => setActiveTab("PINNED")}
            className={cn(
              "flex-1 py-1 text-[8px] font-mono font-bold uppercase tracking-wider transition-all",
              activeTab === "PINNED" ? "text-white bg-white/5 border-b-2 border-white" : "text-zinc-600 hover:text-zinc-400"
            )}
          >
            Pinned
          </button>
          <button 
            onClick={() => setActiveTab("BRIEF")}
            className={cn(
              "flex-1 py-1 text-[8px] font-mono font-bold uppercase tracking-wider transition-all",
              activeTab === "BRIEF" ? "text-white bg-white/5 border-b-2 border-white" : "text-zinc-600 hover:text-zinc-400"
            )}
          >
            Brief
          </button>
        </div>

        <div className="flex-1 flex flex-col bg-black relative">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(to bottom, #fff 1px, transparent 1px), linear-gradient(to right, #fff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
          {activeTab === "INTEL" ? (
            <div className="flex flex-col h-full">
              <div className="p-2 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/5 animate-[pulse_4s_ease-in-out_infinite]" />
                <span className="relative z-10 text-[9px] font-mono uppercase tracking-widest flex items-center gap-1" style={{ color: "#22ab94" }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#22ab94] animate-pulse" />
                  <Newspaper className="w-2.5 h-2.5" /> Intelligence_Sync
                </span>
                <span className="relative z-10 text-[7px] font-mono text-[#22ab94]/50">LIVE_FEED</span>
              </div>
              
              <div className="p-3 space-y-3">
                {news && news.length > 0 ? (
                  news.map((item, idx) => (
                    <div key={idx} className="group border-b border-zinc-900 pb-2 last:border-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[8px] font-mono text-zinc-700">
                          {new Date(item.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="h-[1px] flex-1 bg-zinc-900 group-hover:bg-white/20" />
                      </div>
                      <h4 className="text-[10px] font-bold text-zinc-400 leading-tight group-hover:text-white transition-colors line-clamp-3">
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
                  <div className="py-2 flex items-center gap-2 border-t border-white/10">
                    <div className="w-1 h-1 bg-white rounded-full animate-ping" style={{ backgroundColor: "#22ab94" }} />
                    <span className="text-[8px] font-mono uppercase tracking-tighter" style={{ color: "#22ab94" }}>Gemini_Enrichment_Active</span>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "PINNED" ? (
            <div className="flex flex-col h-full animate-in fade-in duration-500 p-3 space-y-4">
              <div className="p-2 border border-zinc-800 flex justify-between items-center bg-zinc-900/20 mb-2">
                <span className="text-[9px] font-mono text-white uppercase tracking-widest flex items-center gap-1">
                  <Link2 className="w-2.5 h-2.5" /> Supply_Chain_Map
                </span>
              </div>
              
              {/* Suppliers */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-[8px] font-mono text-red-500/70 uppercase tracking-widest">Strategic_Suppliers</div>
                  <div className="h-[1px] flex-1 bg-red-900/20" />
                </div>
                
                <div className="space-y-2">
                  {relationships.suppliers && relationships.suppliers.length > 0 ? (
                    relationships.suppliers.map((sup) => (
                      <div key={sup.symbol} className="group flex items-center justify-between p-1.5 bg-zinc-900/40 border border-zinc-800/50 hover:border-red-900/40 transition-all cursor-default">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 flex items-center justify-center bg-black border border-red-900/30 text-[9px] font-bold text-red-500 font-mono">
                            {sup.symbol.slice(0, 2)}
                          </div>
                          <div className="text-[9px] font-bold text-zinc-300 font-mono tracking-tight group-hover:text-red-400 transition-colors truncate max-w-[80px]">{sup.name}</div>
                        </div>
                        <div className="text-[6px] font-mono text-red-900 group-hover:text-red-700 transition-colors uppercase">Input</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-2 border border-dashed border-zinc-900">
                      <div className="text-[7px] font-mono text-zinc-800 uppercase">No_Data</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Customers */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-[8px] font-mono text-blue-500/70 uppercase tracking-widest">Revenue_Channels</div>
                  <div className="h-[1px] flex-1 bg-blue-900/20" />
                </div>
                
                <div className="space-y-2">
                  {relationships.customers && relationships.customers.length > 0 ? (
                    relationships.customers.map((cust) => (
                      <div key={cust.symbol} className="group flex items-center justify-between p-1.5 bg-zinc-900/40 border border-zinc-800/50 hover:border-blue-900/40 transition-all cursor-default">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 flex items-center justify-center bg-black border border-blue-900/30 text-[9px] font-bold text-blue-500 font-mono">
                            {cust.symbol.slice(0, 2)}
                          </div>
                          <div className="text-[9px] font-bold text-zinc-300 font-mono tracking-tight group-hover:text-blue-400 transition-colors truncate max-w-[80px]">{cust.name}</div>
                        </div>
                        <div className="text-[6px] font-mono text-blue-900 group-hover:text-blue-700 transition-colors uppercase">Output</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-2 border border-dashed border-zinc-900">
                      <div className="text-[7px] font-mono text-zinc-800 uppercase">No_Data</div>
                    </div>
                  )}
                </div>
              </div>

              {selectedStock.partners && selectedStock.partners.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="text-[9px] font-mono text-white/70 uppercase tracking-widest">Network_Partners</div>
                    <div className="h-[1px] flex-1 bg-white/20" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedStock.partners.map(p => (
                      <div key={p} className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-white hover:border-white/50 transition-all cursor-default">
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col h-full animate-in fade-in duration-500 p-3">
              <div className="p-2 border border-zinc-800 flex justify-between items-center bg-zinc-900/20 mb-3">
                <span className="text-[9px] font-mono text-white uppercase tracking-widest flex items-center gap-1">
                  <ShieldAlert className="w-2.5 h-2.5" /> Operations_Order
                </span>
              </div>
              
              <div className="p-3 bg-white/5 border border-white/10 rounded-sm mb-4">
                <div className="text-[8px] font-mono text-white uppercase mb-2 border-b border-white/10 pb-1 flex justify-between">
                  <span>STRAT_BRIEFING_v4.2</span>
                  <span className="animate-pulse">ONLINE</span>
                </div>
                
                {briefing ? (
                  <div className="markdown-body font-mono text-[9px] text-zinc-400 leading-relaxed space-y-2">
                    <Markdown>{briefing}</Markdown>
                  </div>
                ) : (
                   <div className="flex flex-col items-center justify-center py-8 opacity-20">
                    <Zap className="w-6 h-6 text-white mb-2 animate-bounce" />
                    <div className="text-[8px] font-mono uppercase text-center">Awaiting_Neural_Synthesis...</div>
                  </div>
                )}
              </div>
              
              <div className="p-2 border border-zinc-900 text-[8px] font-mono text-zinc-700 italic">
                DISCLAIMER: AI-generated assessments are tactical hypotheses. 
                Execute with discretion.
              </div>
            </div>
          )}
        </div>
      </section>

    </aside>
  );
};
