import React, { useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, LineSeries, HistogramSeries } from "lightweight-charts";
import { Company } from "../data/companies";
import { TrendingUp, Newspaper, Activity, Zap, Globe } from "lucide-react";
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

export const IntelligenceSidebar: React.FC<IntelligenceSidebarProps> = ({ 
  selectedStock, 
  quote,
  news = [], 
  financials = [], 
  profile, 
  history = [],
  isAiProcessing
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const earningsContainerRef = useRef<HTMLDivElement>(null);
  
  const [chart, setChart] = useState<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !selectedStock) return;

    const widgetId = "tradingview_widget_" + Math.random().toString(36).substring(7);
    chartContainerRef.current.id = widgetId;

    const initWidget = () => {
      if ((window as any).TradingView) {
        new (window as any).TradingView.widget({
          "autosize": true,
          "symbol": selectedStock.symbol,
          "interval": "D",
          "timezone": "Etc/UTC",
          "theme": "dark",
          "style": "2",
          "locale": "en",
          "toolbar_bg": "#000000",
          "enable_publishing": false,
          "hide_top_toolbar": true,
          "hide_side_toolbar": true,
          "allow_symbol_change": true,
          "container_id": widgetId,
          "backgroundColor": "rgba(0, 0, 0, 1)",
          "gridColor": "rgba(34, 171, 148, 0.05)"
        });
      }
    };

    const tvTimeout = setTimeout(initWidget, 200);

    // Mini Earnings Histogram remains lightweight-charts for performance/look
    let hChart: IChartApi | null = null;
    if (earningsContainerRef.current) {
        hChart = createChart(earningsContainerRef.current, {
            layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#888" },
            grid: { vertLines: { visible: false }, horzLines: { visible: false } },
            width: earningsContainerRef.current.clientWidth || 150,
            height: 80,
            timeScale: { visible: false },
            rightPriceScale: { visible: false },
        });

        const histogram = hChart.addSeries(HistogramSeries, {
            color: '#22ab94',
        });

        if (financials && financials.length > 0) {
            try {
                const histData = financials
                    .map((f: any) => ({
                        time: f.date || new Date().toISOString().split('T')[0],
                        value: f.netIncome || 0,
                        color: (f.netIncome || 0) >= 0 ? '#22ab94' : '#ef4444'
                    }))
                    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
                
                if (histData.length > 0) {
                    histogram.setData(histData);
                    hChart.timeScale().fitContent();
                }
            } catch (e) {
                console.error("Error setting earnings data:", e);
            }
        }
    }

    const handleResize = () => {
      if (earningsContainerRef.current && hChart) {
        hChart.applyOptions({ width: earningsContainerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(tvTimeout);
      window.removeEventListener("resize", handleResize);
      if (hChart) hChart.remove();
    };
  }, [selectedStock, financials]);

  if (!selectedStock) {
    return (
      <aside className="w-80 border-l border-zinc-800 flex flex-col bg-zinc-950 z-20 shrink-0 select-none overflow-hidden">
        <div className="p-4 border-b border-zinc-800 bg-black">
          <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-1">System_Idle</div>
          <h2 className="font-mono text-xl text-zinc-800 font-black tracking-tighter uppercase leading-none">Awaiting_Target</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-black/20">
          <Activity className="w-16 h-16 text-zinc-900 mb-4 animate-pulse" />
          <h3 className="font-mono text-[#22ab94] uppercase tracking-[0.3em] font-bold text-xs">Uplink Required</h3>
          <p className="text-zinc-600 font-mono text-[9px] mt-2 leading-relaxed italic">Select a node from the global distribution network to initialize live data telemetry.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 border-l border-zinc-800 flex flex-col bg-zinc-950 z-20 shrink-0 select-none overflow-hidden">
      {/* TICKET / PROFILE HEADER */}
      <div className="p-4 border-b border-zinc-800 bg-black">
        <div className="flex justify-between items-start mb-1">
          <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest flex items-center gap-1">
            <Globe className="w-3 h-3" /> Live_Protocol
          </div>
          <div className="flex items-center gap-2">
            {isAiProcessing && <Zap className="w-2.5 h-2.5 text-[#22ab94] animate-pulse" />}
            <div className="text-[10px] bg-[#22ab94]/10 text-[#22ab94] px-1.5 py-0.5 border border-[#22ab94]/20 font-mono font-bold">LOCKED</div>
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-mono text-3xl text-white font-black tracking-tighter leading-none">{selectedStock.symbol}</h2>
            <div className="text-[9px] text-zinc-500 font-mono mt-1 uppercase tracking-tight truncate max-w-[150px]">{profile?.companyName || selectedStock.name}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono text-white font-bold leading-none tracking-tighter">
              ${quote?.price?.toFixed(2) || "---"}
            </div>
            <div className={cn(
              "text-[10px] font-mono font-bold mt-1",
              (quote?.changes || 0) >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {(quote?.changes || 0) >= 0 ? "+" : ""}{(quote?.changes || 0).toFixed(2)} ({(quote?.changesPercentage || 0).toFixed(2)}%)
            </div>
          </div>
        </div>
      </div>

      {/* PRICE CHART */}
      <div className="h-[250px] border-b border-zinc-800 bg-black relative flex flex-col pt-4">
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>

      {/* QUICK STATS & MINI CHART */}
      <div className="grid grid-cols-2 border-b border-zinc-800 bg-black/40">
        <div className="p-3 border-r border-zinc-800 bg-black/20">
          <div className="text-[9px] font-mono text-zinc-600 uppercase mb-1">Market Cap</div>
          <div className="font-mono text-xs text-[#22ab94] font-bold">{profile?.mktCap ? formatCurrency(profile.mktCap) : "---"}</div>
          <div className="mt-4 text-[9px] font-mono text-zinc-600 uppercase mb-1">Volume (Avg)</div>
          <div className="font-mono text-xs text-zinc-400">{profile?.volAvg ? formatCurrency(profile.volAvg) : "---"}</div>
        </div>
        <div className="p-3">
          <div className="text-[9px] font-mono text-zinc-600 uppercase mb-2">Earnings_History</div>
          <div ref={earningsContainerRef} className="w-full h-16" />
        </div>
      </div>

      {/* INTELLIGENCE FEED */}
      <div className="flex-1 flex flex-col overflow-hidden bg-black">
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

