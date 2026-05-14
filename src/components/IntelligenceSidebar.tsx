import React, { useEffect, useRef } from "react";
import { Company } from "../data/companies";
import { TrendingUp, Newspaper, Activity, Zap, Globe } from "lucide-react";
import { formatCurrency, cn } from "../lib/utils";
import { createChart, ColorType, IChartApi } from 'lightweight-charts';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  Cell,
  XAxis,
  Tooltip
} from 'recharts';

interface IntelligenceSidebarProps {
  selectedStock: Company | null;
  news: any[];
  financials: any[];
  profile: any;
  quote?: any;
  history: any[];
  mktCapHistory: any[];
  isAiProcessing: boolean;
}

export const IntelligenceSidebar: React.FC<IntelligenceSidebarProps> = ({ 
  selectedStock, 
  news = [], 
  financials = [], 
  profile, 
  quote,
  history = [],
  mktCapHistory = [],
  isAiProcessing
}) => {
  if (!selectedStock) {
    return (
      <aside className="w-96 border-l border-zinc-800 flex flex-col bg-zinc-950 z-20 shrink-0 select-none overflow-hidden">
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

  const chartData = React.useMemo(() => {
    if (!Array.isArray(history)) return [];
    const seenDates = new Set();
    return history
      .filter(item => {
        if (!item || !item.date || item.close === undefined) return false;
        if (seenDates.has(item.date)) return false;
        seenDates.add(item.date);
        return true;
      })
      .map(item => ({
        time: item.date,
        price: Number(item.close)
      }))
      .filter(d => !isNaN(d.price))
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [history]);

  const earningsData = React.useMemo(() => {
    if (!Array.isArray(financials)) return [];
    return financials
      .filter((f: any) => f && f.date && f.netIncome !== undefined)
      .map((f: any) => ({
        time: f.date.split('-')[0], // Just the year
        value: Number(f.netIncome),
      }))
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [financials]);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || chartData.length === 0) {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      return;
    }

    // Clean up previous chart if it exists
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    
    const observer = new ResizeObserver(entries => {
      if (entries[0] && chartRef.current) {
        const { width, height } = entries[0].contentRect;
        chartRef.current.applyOptions({ width, height });
      }
    });
    observer.observe(container);

    try {
      const chart = createChart(container, {
        layout: {
          background: { type: ColorType.Solid, color: '#000000' },
          textColor: '#666',
          fontSize: 10,
          fontFamily: 'JetBrains Mono',
        },
        grid: {
          vertLines: { color: 'rgba(34, 171, 148, 0.05)' },
          horzLines: { color: 'rgba(34, 171, 148, 0.05)' },
        },
        width: container.clientWidth || 300,
        height: container.clientHeight || 300,
        timeScale: {
          visible: true,
          borderVisible: false,
        },
        rightPriceScale: {
          visible: true,
          borderVisible: false,
          borderColor: 'rgba(34, 171, 148, 0.2)',
        },
        handleScale: true,
        handleScroll: true,
        crosshair: {
          vertLine: { 
            color: '#22ab94',
            labelBackgroundColor: '#22ab94',
          },
          horzLine: {
            color: '#22ab94',
            labelBackgroundColor: '#22ab94',
          }
        }
      });

      const series = (chart as any).addLineSeries({
        color: '#22ab94',
        lineWidth: 2,
        crosshairMarkerVisible: true,
        lastValueVisible: true,
        priceLineVisible: true,
      });

      series.setData(chartData.map(d => ({ 
        time: d.time, 
        value: d.price 
      })));
      
      chart.timeScale().fitContent();
      chartRef.current = chart;

      return () => {
        observer.disconnect();
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }
      };
    } catch (err) {
      console.error("Chart initialization failed", err);
    }
  }, [chartData]);

  const livePrice = quote?.price || profile?.price;
  const liveChanges = quote?.changes !== undefined ? quote.changes : profile?.changes;

  return (
    <aside className="w-96 border-l border-zinc-800 flex flex-col bg-zinc-950 z-20 shrink-0 select-none overflow-hidden">
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
            <div className="text-[9px] text-zinc-500 font-mono mt-1 uppercase tracking-tight truncate max-w-[150px]">
              {selectedStock.name} | {profile?.sector || "General_Sector"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[8px] font-mono text-zinc-600 mb-1">Source: {quote?.source || "Primary_Uplink"}</div>
            <div className="text-2xl font-mono text-white font-bold leading-none tracking-tighter">
              ${livePrice?.toFixed(2) || "---"}
            </div>
            <div className={cn(
              "text-[10px] font-mono font-bold mt-1",
              (liveChanges || 0) >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {(liveChanges || 0) >= 0 ? "+" : ""}{(liveChanges || 0).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* PRICE CHART */}
      <div className="h-[400px] border-b border-zinc-800 p-4 bg-zinc-900/10 relative overflow-hidden">
        <div className="flex justify-between items-center mb-2 z-10 relative">
          <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Price_Telemetry_30D
          </span>
          <div className="text-[9px] text-zinc-500 font-mono tracking-tighter uppercase">{profile?.finnhubIndustry || profile?.industry || "DECRYPTING_SECTOR"}</div>
        </div>
        <div className="h-[340px] relative z-0" ref={chartContainerRef} />
        {chartData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-[#22ab94] font-mono text-[9px] animate-pulse z-10 bg-zinc-950/50">
            [ WAITING_FOR_SYNC ]
          </div>
        )}
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
          <div className="text-[9px] font-mono text-zinc-600 uppercase mb-2">Income_History</div>
          <div className="w-full h-20 mt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={earningsData}>
                <XAxis 
                  dataKey="time" 
                  hide={false} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 7, fill: '#666', fontFamily: 'JetBrains Mono' }} 
                  interval="preserveStartEnd"
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #22ab94', borderRadius: '0', fontSize: '9px', fontFamily: 'JetBrains Mono' }}
                  itemStyle={{ fontSize: '8px', padding: '1px 0' }}
                  formatter={(value: any) => [formatCurrency(value), "Net Income"]}
                />
                <Bar dataKey="value">
                  {earningsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#22ab94' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
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

