import React, { useEffect, useState } from "react";
import { Shield, AlertTriangle, Play, RefreshCw, Zap, TrendingUp, Cpu, MapPin } from "lucide-react";
import { getApiBaseUrl, cn } from "../../lib/utils";

interface CorridorData {
  corridorId: string;
  commodityType: string;
  riskVelocityScore: number;
  transitLatencyPrediction: string;
  originNode: {
    name: string;
    coords: [number, number];
  };
  impactedTickers: string[];
  briefing: string[];
  warning?: string;
}

interface MacroCorridorProps {
  activeCorridorId: string | null;
  onSelectTicker?: (symbol: string) => void;
  recentNewsContent?: string;
  onDataLoaded?: (data: CorridorData) => void;
}

export const MacroCorridor: React.FC<MacroCorridorProps> = ({
  activeCorridorId,
  onSelectTicker,
  recentNewsContent = "",
  onDataLoaded
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<CorridorData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCorridorId) {
      setData(null);
      return;
    }

    const fetchCorridorAnalysis = async () => {
      setLoading(true);
      setError(null);
      try {
        const openRouterKey = localStorage.getItem("openrouter_api_key") || "";
        const openRouterModel = localStorage.getItem("openrouter_model") || "openai/gpt-4o-mini";

        const headers: Record<string, string> = {
          "Content-Type": "application/json"
        };
        if (openRouterKey) {
          headers["X-OpenRouter-API-Key"] = openRouterKey;
          headers["X-OpenRouter-Model"] = openRouterModel;
        }

        // Map standard corridors to friendly commodity categories as suggestions
        let suggestedCommodity = "Critical Logic Components";
        if (activeCorridorId === "SUEZ_CANAL" || activeCorridorId === "HORMUZ_STRAIT") {
          suggestedCommodity = "Crude Oil & LNG";
        } else if (activeCorridorId === "PANAMA_CANAL") {
          suggestedCommodity = "Industrial Hardware";
        }

        const response = await fetch(`${getApiBaseUrl()}/api/ai/corridor`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            corridorId: activeCorridorId,
            commodityType: suggestedCommodity,
            newsText: recentNewsContent || undefined
          })
        });

        if (!response.ok) {
          throw new Error(`Server connection error: status ${response.status}`);
        }

        const payload: CorridorData = await response.json();
        setData(payload);
        if (onDataLoaded) {
          onDataLoaded(payload);
        }
      } catch (err: any) {
        console.error("Failed to analyze corridor:", err);
        setError(err.message || "Connection error during data assessment");
      } finally {
        setLoading(false);
      }
    };

    fetchCorridorAnalysis();
  }, [activeCorridorId, recentNewsContent]);

  if (!activeCorridorId) {
    return (
      <div className="bg-zinc-950 border border-zinc-900 rounded-sm p-4 text-center p-[20px] select-none text-zinc-650 font-sans">
        <AlertTriangle className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Corridor Insights</div>
        <p className="text-[8px] mt-1 italic text-zinc-650 max-w-[200px] mx-auto leading-relaxed">
          Select a trade route on the map to view real-time risk assessments and traffic data.
        </p>
      </div>
    );
  }

  // Determine threat color-scale
  const getRiskColorClass = (score: number) => {
    if (score > 80) return "text-red-500 border-red-500/20 bg-red-500/5";
    if (score > 55) return "text-amber-500 border-amber-500/20 bg-amber-500/5";
    return "text-emerald-500 border-emerald-500/20 bg-emerald-500/5";
  };

  const getRiskBgClass = (score: number) => {
    if (score > 80) return "bg-red-500 shadow-[0_0_15px_#ef4444]";
    if (score > 55) return "bg-amber-500 shadow-[0_0_15px_#f59e0b]";
    return "bg-emerald-500 shadow-[0_0_15px_#10b981]";
  };

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-sm p-3.5 select-text font-sans relative overflow-hidden group">
      {/* Tactical scanline effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:100%_3px] opacity-20 group-hover:opacity-40 transition-opacity z-10" />
      
      {/* Subdued design accent */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-emerald-500/5 select-none pointer-events-none" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-[1px] z-20 flex flex-col items-center justify-center text-center p-4">
          <RefreshCw className="w-6 h-6 text-emerald-500 mb-2" />
          <div className="text-[9px] font-black text-emerald-400 tracking-[0.25em] uppercase">Connecting...</div>
          <p className="text-[7.5px] text-zinc-600 mt-1 uppercase">Resolving trade route data</p>
        </div>
      )}

      {/* Header Info */}
      <div className="flex justify-between items-start border-b border-zinc-900 pb-2 mb-3">
        <div>
          <div className="font-sans text-[7px] text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Regional Data Analysis</span>
          </div>
          <h3 className="text-xs font-black text-white uppercase tracking-tight">
            {activeCorridorId.replace("_", " ")}
          </h3>
          <div className="text-[8px] text-zinc-500 font-sans mt-0.5 uppercase truncate max-w-[200px]">
             Tracking: {data?.commodityType || "Loading data..."}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[8px] text-zinc-650 tracking-tight font-bold">STATUS</div>
          <span className={`text-[8.5px] px-1.5 py-0.5 border font-extrabold uppercase rounded-sm inline-block mt-0.5 ${
            data ? getRiskColorClass(data.riskVelocityScore) : "text-zinc-600 border-zinc-900"
          }`}>
            {loading ? "LOAD" : data ? (data.riskVelocityScore > 80 ? "HIGH ALERT" : data.riskVelocityScore > 55 ? "ELEVATED" : "OPTIMAL") : "OFFLINE"}
          </span>
        </div>
      </div>

      {error ? (
        <div className="p-3 border border-red-500/20 bg-red-500/5 rounded-sm text-center">
          <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-1.5" />
          <div className="text-[8.5px] font-bold text-red-400 uppercase tracking-wider">CONNECTION FAILURE</div>
          <p className="text-[7px] text-zinc-500 mt-1 italic">{error}</p>
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* Failsafe warning line if any */}
          {data.warning && (
            <div className="text-[6.5px] text-amber-500/80 bg-amber-500/[0.04] p-1 border border-amber-500/10 uppercase tracking-tight select-none">
              ⚠️ {data.warning}
            </div>
          )}

          {/* Core Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 bg-zinc-950/50 p-2.5 border border-zinc-900 rounded-sm">
            <div className="relative">
              <div className="text-[7px] text-zinc-500 uppercase font-sans tracking-widest">Risk Velocity</div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className={cn("text-[24px] font-black tracking-tighter leading-none", 
                  data.riskVelocityScore > 80 ? "text-red-500" : data.riskVelocityScore > 55 ? "text-amber-500" : "text-emerald-500"
                )}>
                  {data.riskVelocityScore}
                </span>
                <span className="text-[9px] text-zinc-600 font-bold">/100</span>
              </div>
              
              {/* Dynamic threat bar */}
              <div className="w-full h-1 bg-zinc-900 rounded-full mt-2.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${getRiskBgClass(data.riskVelocityScore)}`}
                  style={{ width: `${data.riskVelocityScore}%` }}
                />
              </div>
            </div>

            <div>
              <div className="text-[7px] text-zinc-500 uppercase font-sans tracking-widest">Transit Latency</div>
              <div className="text-[12px] font-extrabold text-white mt-1.5 leading-tight flex items-center gap-1.5">
                <span className="text-amber-500 w-4 h-4"><RefreshCw className="w-4 h-4" /></span> 
                {data.transitLatencyPrediction}
              </div>
              <div className="text-[7px] text-zinc-650 font-sans mt-3 flex items-center gap-1.5 uppercase truncate border-t border-zinc-900 pt-1.5">
                <MapPin className="w-2.5 h-2.5 text-emerald-600 shrink-0" /> {data.originNode?.name || "Global Hub"}
              </div>
            </div>
          </div>

          {/* AI-Generated Bullet Briefing */}
          <div>
            <div className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest border-b border-zinc-900/60 pb-1 mb-2 flex justify-between items-center select-none">
              <span>⚠️ Risk Briefing</span>
              <span className="text-[6px] text-emerald-500/80 uppercase font-sans">LIVE UPDATES</span>
            </div>
            
            <div className="space-y-3">
              {data.briefing && data.briefing.map((item, idx) => (
                <div key={idx} className="relative flex gap-3 text-[10px] leading-relaxed group items-start select-text pl-4">
                  <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-emerald-500/10 group-hover:bg-emerald-500/40 transition-colors" />
                  <span className="text-emerald-500 font-mono font-black shrink-0 mt-0.5 text-[8px] tracking-tighter">[{String(idx + 1).padStart(2, '0')}]</span>
                  <p className="text-zinc-300 font-sans leading-snug group-hover:text-white transition-colors">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Mapped Corporations Selector */}
          <div>
            <div className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest border-b border-zinc-900/60 pb-1 mb-2 flex justify-between items-center select-none">
              <span>Mapped Asset Directives</span>
              <span className="text-[7px] text-zinc-500">Tickers Tracked</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {data.impactedTickers && data.impactedTickers.map((ticker) => (
                <button
                  key={ticker}
                  onClick={() => onSelectTicker && onSelectTicker(ticker)}
                  className="px-2 py-1 border border-zinc-800 hover:border-emerald-500/60 bg-black hover:bg-zinc-950 font-sans text-[9px] font-extrabold text-zinc-300 hover:text-emerald-400 rounded-sm transition-all text-center flex items-center gap-1 cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  <span>{ticker}</span>
                  <span className="text-[7px] text-zinc-600 font-bold">↗</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-6 text-center select-none text-zinc-750 font-sans">
          <Cpu className="w-6 h-6 mx-auto text-zinc-800 mb-1.5" />
          <span className="text-[8.5px] uppercase font-bold text-zinc-600">Awaiting Connection...</span>
        </div>
      )}
    </div>
  );
};
