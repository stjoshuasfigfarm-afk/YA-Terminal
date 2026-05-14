import React, { useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi } from "lightweight-charts";
import { Company } from "../data/companies";
import { TrendingUp, BarChart3, Info, Newspaper, User, Users, Landmark, Coins } from "lucide-react";
import { formatCurrency, cn } from "../lib/utils";

interface IntelligenceSidebarProps {
  selectedStock: Company | null;
  news: any[];
  financials: any[];
  profile: any;
  history: any[];
}

export const IntelligenceSidebar: React.FC<IntelligenceSidebarProps> = ({ 
  selectedStock, 
  news, 
  financials, 
  profile, 
  history 
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const earningsContainerRef = useRef<HTMLDivElement>(null);
  
  const [chart, setChart] = useState<IChartApi | null>(null);
  const [earningsChart, setEarningsChart] = useState<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const newChart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#22ab94",
        fontFamily: "JetBrains Mono, monospace",
      },
      grid: {
        vertLines: { color: "#22ab9422" },
        horzLines: { color: "#22ab9422" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 250,
      timeScale: { borderVisible: false },
      rightPriceScale: { borderVisible: false },
    }) as any;

    const series = newChart.addAreaSeries({
      lineColor: "#22ab94",
      topColor: "#22ab9444",
      bottomColor: "transparent",
      lineWidth: 2,
    });

    if (history && history.length > 0) {
      const formattedData = history.map(item => ({
        time: item.date,
        value: item.close
      })).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      series.setData(formattedData);
      newChart.timeScale().fitContent();
    }

    setChart(newChart);

    // Earnings Chart
    if (earningsContainerRef.current) {
        const hChart = createChart(earningsContainerRef.current, {
            layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#888" },
            grid: { vertLines: { visible: false }, horzLines: { color: "#222" } },
            width: earningsContainerRef.current.clientWidth,
            height: 120,
            timeScale: { borderVisible: false, visible: false },
            rightPriceScale: { borderVisible: false },
        }) as any;

        const histogram = hChart.addHistogramSeries({
            color: '#22ab94',
        });

        if (financials && financials.length > 0) {
            const histData = financials.map((f: any) => ({
                time: f.date,
                value: f.netIncome,
                color: f.netIncome > 0 ? '#22ab94' : '#ef4444'
            })).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
            histogram.setData(histData);
            hChart.timeScale().fitContent();
        }
        setEarningsChart(hChart);
    }

    const handleResize = () => {
      if (chartContainerRef.current) newChart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      newChart.remove();
    };
  }, [selectedStock, history, financials]);

  if (!selectedStock) {
    return (
      <aside className="w-[450px] bg-zinc-950 border-l border-[#22ab94] flex flex-col items-center justify-center p-8 text-center">
        <Activity className="w-16 h-16 text-zinc-800 mb-4 animate-pulse" />
        <h3 className="font-mono text-[#22ab94] uppercase tracking-[0.3em] font-bold">Awaiting Target Selection</h3>
        <p className="text-zinc-600 font-mono text-[10px] mt-2">Initialize node link from Global Grid to decrypt intelligence feed.</p>
      </aside>
    );
  }

  return (
    <aside className="w-80 border-l border-zinc-800 flex flex-col bg-zinc-950 z-20 shrink-0 select-none overflow-hidden">
      {/* PRICE CHART */}
      <div className="h-56 border-b border-zinc-800 p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest">Price_Analysis_30D</span>
          <span className="text-[10px] font-mono text-[#22ab94]">VOL: {profile?.volAvg ? formatCurrency(profile.volAvg) : "---"}</span>
        </div>
        <div ref={chartContainerRef} className="h-44 w-full" />
      </div>

      {/* EARNINGS ANALYSIS */}
      <div className="h-32 border-b border-zinc-800 p-4">
        <div className="text-[10px] font-mono uppercase text-zinc-500 mb-2 font-bold tracking-widest">Historical_Net_Income</div>
        <div ref={earningsContainerRef} className="h-20 w-full" />
      </div>

      {/* DATA GRID */}
      <div className="p-4 border-b border-zinc-800 h-auto">
        <table className="w-full text-[10px] font-mono text-zinc-400">
          <tbody>
            <tr className="border-b border-zinc-900">
              <td className="py-1.5 uppercase">Market Cap</td>
              <td className="py-1.5 text-right text-white font-bold">{formatCurrency(profile?.mktCap || 0)}</td>
            </tr>
            <tr className="border-b border-zinc-900">
              <td className="py-1.5 uppercase">Sector</td>
              <td className="py-1.5 text-right text-white truncate max-w-[150px]">{profile?.sector || "---"}</td>
            </tr>
            <tr className="border-b border-zinc-900">
              <td className="py-1.5 uppercase">Employees</td>
              <td className="py-1.5 text-right text-white">{profile?.fullTimeEmployees?.toLocaleString() || "---"}</td>
            </tr>
            <tr>
              <td className="py-1.5 uppercase">Exchange</td>
              <td className="py-1.5 text-right text-white">{profile?.exchangeShortName || "---"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* LIVE INTELLIGENCE FEED */}
      <div className="flex-1 p-4 bg-black overflow-hidden relative flex flex-col">
        <div className="text-[10px] font-mono text-[#22ab94] mb-3 uppercase font-bold tracking-widest">_Live_Intelligence_Feed</div>
        <div className="space-y-3 font-mono text-[10px] flex-1 overflow-y-auto custom-scrollbar">
          {news.map((item, idx) => (
            <div key={idx} className="border-l border-zinc-800 pl-3 py-1 group">
              <span className="text-zinc-600 uppercase">[{new Date(item.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
              <p className="text-zinc-400 underline decoration-[#22ab94]/30 decoration-dotted mt-0.5 group-hover:text-zinc-200 transition-colors">
                {item.intelligence?.translatedTitle || item.title}
              </p>
            </div>
          ))}
          {news.length === 0 && (
            <div className="text-zinc-700 italic py-4">Scanning Neural Link channels for relevant Tier-1 supply chain updates...</div>
          )}
        </div>
      </div>
    </aside>
  );
};

const DataBlock = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="border border-zinc-900 p-2 bg-black/40">
    <div className="flex items-center gap-2 mb-1">
      <span className="text-zinc-600">{icon}</span>
      <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-tighter">{label}</span>
    </div>
    <div className="font-mono text-sm text-[#22ab94] font-bold">{value}</div>
  </div>
);

const Activity = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
