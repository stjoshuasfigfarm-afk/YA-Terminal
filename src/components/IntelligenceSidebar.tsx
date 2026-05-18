import React, { useMemo, useEffect, useRef } from "react";
import * as echarts from "echarts";
import Markdown from "react-markdown";
import { Company } from "../data/companies";
import { TrendingUp, Newspaper, Activity, Zap, Globe, RefreshCcw, Link2, Box, ShieldAlert } from "lucide-react";
import { formatCurrency, cn } from "../lib/utils";

interface IntelligenceSidebarProps {
  selectedStock: Company | null;
  quote: any;
  news: any[];
  financials: any[];
  profile: any;
  history: any[];
  isAiProcessing: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  relationships?: { suppliers: any[], customers: any[] };
  briefing?: string | null;
  yields?: any;
  onSelectNews: (story: any) => void;
}



const CustomTelemetryChart = ({ data }: { data: any[] }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // Initialize ECharts
  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current, undefined, {
      renderer: "canvas",
    });

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chartInstance.current?.dispose();
    };
  }, []);

  // Update Data
  useEffect(() => {
    if (!chartInstance.current || !data || data.length < 2) return;

    const sortedData = [...data].sort((a, b) => a.time - b.time).slice(-60);
    
    const dates = sortedData.map(d => {
      const date = new Date(d.time);
      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    });

    const values = sortedData.map(d => d.close);
    const volumes = sortedData.map((d, i) => [i, d.volume, d.open > d.close ? -1 : 1]);

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      animation: false,
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
          label: {
            backgroundColor: "#1e293b",
            color: "#fff",
            fontSize: 8,
          }
        },
        backgroundColor: "#0f172a",
        borderColor: "#1e293b",
        textStyle: { color: "#fff", fontSize: 9, fontFamily: "monospace" },
        formatter: (params: any) => {
          let res = `<div style="font-size: 8px; color: #666;">${params[0].name}</div>`;
          params.forEach((p: any) => {
            if (p.seriesName === "Price") {
              res += `
                <div style="font-size: 10px; color: #10b981; font-weight: bold;">
                  $${Number(p.data).toFixed(2)}
                </div>
              `;
            }
          });
          return res;
        }
      },
      grid: [
        { left: "8%", right: "8%", top: "5%", height: "60%" },
        { left: "8%", right: "8%", top: "75%", height: "15%" }
      ],
      xAxis: [
        {
          type: "category",
          data: dates,
          boundaryGap: true,
          axisLine: { lineStyle: { color: "#1e293b" } },
          axisLabel: { show: false },
          axisTick: { show: false },
          splitLine: { show: false }
        },
        {
          type: "category",
          gridIndex: 1,
          data: dates,
          boundaryGap: true,
          axisLine: { lineStyle: { color: "#1e293b" } },
          axisLabel: { 
            show: true,
            color: "#475569", 
            fontSize: 7, 
            fontFamily: "monospace",
            interval: 11
          },
          axisTick: { show: false },
          splitLine: { show: false }
        }
      ],
      yAxis: [
        {
          scale: true,
          axisLine: { lineStyle: { color: "#1e293b" } },
          axisLabel: { color: "#475569", fontSize: 8, fontFamily: "monospace" },
          splitLine: { lineStyle: { color: "#1e293b", type: "dashed" } }
        },
        {
          scale: true,
          gridIndex: 1,
          splitNumber: 2,
          axisLabel: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: "Price",
          type: "line",
          data: values,
          smooth: true,
          symbol: "none",
          lineStyle: {
            color: "#10b981",
            width: 2,
            shadowBlur: 10,
            shadowColor: "rgba(16, 185, 129, 0.5)"
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(16, 185, 129, 0.2)" },
              { offset: 1, color: "rgba(16, 185, 129, 0)" }
            ])
          }
        },
        {
          name: "Volume",
          type: "bar",
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volumes,
          itemStyle: {
            color: (params: any) => {
              return params.data[2] === 1 ? "#10b98188" : "#f43f5e88";
            }
          }
        }
      ]
    };

    chartInstance.current.setOption(option);
  }, [data]);

  return (
    <div id="main-chart-container" className="grow w-full bg-black relative">
      <div 
        ref={chartRef} 
        className="w-full h-full"
      />
      
      {!data || data.length < 2 ? (
        <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] text-zinc-800 uppercase tracking-widest bg-black/40 backdrop-blur-sm z-10">
          Establishing_Telemetry_Link...
        </div>
      ) : null}
    </div>
  );
};

const NeuralVolatilityChart = ({ data }: { data: any[] }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    chartInstance.current = echarts.init(chartRef.current);
    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chartInstance.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!chartInstance.current || !data || data.length < 2) return;

    const sortedData = [...data].sort((a, b) => a.time - b.time).slice(-40);
    const volData = sortedData.map((d, i) => {
      const range = d.high - d.low;
      return range;
    });

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      animation: true,
      grid: { left: "10%", right: "5%", top: "15%", bottom: "15%" },
      xAxis: {
        type: "category",
        show: false,
        data: sortedData.map(d => d.time)
      },
      yAxis: {
        type: "value",
        show: false,
        scale: true
      },
      series: [
        {
          data: volData,
          type: "line",
          smooth: true,
          symbol: "none",
          lineStyle: {
            color: "#22ab94",
            width: 1,
            shadowBlur: 5,
            shadowColor: "#22ab94"
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(34, 171, 148, 0.4)" },
              { offset: 1, color: "rgba(34, 171, 148, 0)" }
            ])
          }
        }
      ]
    };
    chartInstance.current.setOption(option);
  }, [data]);

  return (
    <div className="w-full h-full bg-black">
      <div ref={chartRef} className="w-full h-full" />
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
  isAiProcessing,
  activeTab,
  setActiveTab,
  relationships = { suppliers: [], customers: [] },
  briefing,
  yields,
  onSelectNews
}) => {

  if (!selectedStock) {
    return (
      <aside className="w-[240px] border-l border-zinc-800 flex flex-col bg-zinc-950 z-20 shrink-0 select-none overflow-hidden">
        <div className="p-3 border-b border-zinc-800 bg-black">
          <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-1">System_Idle</div>
          <h2 className="font-mono text-xl text-zinc-800 font-black tracking-tighter uppercase leading-none">Awaiting_Target</h2>
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
    <aside className="w-[300px] h-full border-l border-zinc-800 flex flex-col bg-zinc-950 z-20 shrink-0 select-none overflow-y-auto custom-scrollbar scroll-smooth relative">
      {/* TICKET / PROFILE HEADER - Robust Sticky Implementation */}
      <div className="p-4 border-b border-zinc-800 bg-black sticky top-0 z-[100] flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.9)] backdrop-blur-sm">
        <div className="absolute inset-0 pointer-events-none opacity-10 scanline"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-[0.3em] mb-1">Asset_Protocol</div>
              <h2 className="font-mono text-2xl text-white font-black tracking-tighter leading-none">{selectedStock.symbol}</h2>
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2 mb-1">
                {isAiProcessing && <Zap className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />}
                <div className="text-[8px] bg-white/5 text-white/40 px-1 py-0.5 border border-white/10 font-mono font-bold uppercase tracking-tighter cursor-help">FEED_SECURE</div>
              </div>
              {yields?.interestRate !== undefined && (
                <div className="text-[8px] font-mono text-emerald-500 uppercase tracking-widest">CB_RATE: {Number(yields.interestRate).toFixed(2)}%</div>
              )}
              {profile?.dividend !== undefined && (
                <div className="text-[8px] font-mono text-emerald-500 uppercase tracking-widest">DIV: ${Number(profile.dividend).toFixed(2)}</div>
              )}
              <div className="text-[7px] font-mono text-zinc-700 uppercase tracking-widest truncate max-w-[120px]">{selectedStock.name}</div>
            </div>
          </div>

          <div className="flex items-end justify-between mt-2">
            <div className="flex flex-col">
              <div className="text-[16px] font-mono text-white font-black leading-none tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                {quote?.price !== undefined ? `$${Number(quote.price).toFixed(2)}` : "---"}
              </div>
              <div className={cn(
                "text-[7px] font-mono font-bold mt-1 px-1 py-0.5 inline-block w-fit",
                Number(quote?.changes || 0) >= 0 ? "text-emerald-400 bg-emerald-950/20" : "text-rose-400 bg-rose-950/20"
              )}>
                {Number(quote?.changes || 0) >= 0 ? "▲" : "▼"} {Math.abs(Number(quote?.changes || 0)).toFixed(2)} ({Number(quote?.changesPercentage || 0).toFixed(2)}%)
              </div>
            </div>
            <div className="pb-1">
               <div className="text-[7px] font-mono text-zinc-600 uppercase text-right leading-tight">Live_Link<br/>Node_Silo_{selectedStock.symbol}</div>
            </div>
          </div>
        </div>
      </div>
      

      {/* PRICE CHART - Defined Height and Spacing */}
      <div className="h-56 border-b border-zinc-800 bg-black relative flex flex-col group shrink-0 z-10 pt-8">
        <div className="absolute top-3 right-4 z-20 flex gap-2 child-pointer-events-auto">
          <button 
            className="bg-zinc-900 border border-zinc-800 p-2 hover:bg-emerald-500 hover:text-black transition-all group/btn shadow-xl pointer-events-auto"
            title="Refresh Feed"
          >
            <RefreshCcw className="w-3.5 h-3.5 text-zinc-500 group-hover/btn:text-black transition-colors" />
          </button>
        </div>

        <div className="flex-1 w-full flex flex-col px-2">
          <CustomTelemetryChart data={history} />
        </div>
      </div>

      {/* NEURAL FLUX / VOLATILITY - Reduced Height */}
      <div className="h-24 border-b border-zinc-800 bg-black relative flex flex-col shrink-0 overflow-hidden">
        <div className="px-4 py-2 flex justify-between items-center bg-emerald-950/5">
          <div className="text-[8px] font-mono uppercase tracking-[0.2em] flex items-center gap-1.5" style={{ color: "#22ab94" }}>
            <Activity className="w-3 h-3" /> System_Flux // Volatility
          </div>
          <div className="text-[7px] font-mono text-zinc-700 tracking-tighter uppercase whitespace-nowrap">Neural_Link_v2.0</div>
        </div>
        <div className="flex-1">
          <NeuralVolatilityChart data={history} />
        </div>
      </div>

      <div className="grid grid-cols-2 border-b border-zinc-800 bg-black/40">
        <div className="p-2 border-r border-zinc-800 bg-black/20">
          <div className="text-[8px] font-mono text-zinc-600 uppercase mb-0.5">Market Cap</div>
          <div className="font-mono text-[10px] text-white font-bold">{profile?.mktCap ? formatCurrency(profile.mktCap) : "---"}</div>
          <div className="mt-3 text-[8px] font-mono text-zinc-600 uppercase mb-0.5">Workforce</div>
          <div className="font-mono text-[10px] text-white font-bold">{profile?.fullTimeEmployees ? profile.fullTimeEmployees.toLocaleString() : "---"}</div>
        </div>
        <div className="p-2 border-zinc-800 bg-black/20">
          <div className="text-[8px] font-mono text-zinc-600 uppercase mb-0.5">Volume (Avg)</div>
          <div className="font-mono text-[10px] text-zinc-400">{profile?.volAvg ? formatCurrency(profile.volAvg) : "---"}</div>
          <div className="mt-3 text-[8px] font-mono text-zinc-600 uppercase mb-0.5">Earnings</div>
          <div className="font-mono text-[10px] text-zinc-400">{profile?.lastAnnualEarnings ? formatCurrency(profile.lastAnnualEarnings) : "---"}</div>
        </div>
      </div>

      <div className="p-2 border-b border-zinc-800 bg-black/40">
          <div className="text-[8px] font-mono text-zinc-600 uppercase mb-2">Profit_Velocity</div>
          <div className="flex items-end gap-0.5 px-0.5 h-10">
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

      {/* TAB NAVIGATION */}
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

      {/* CONTENT AREA */}
      <div className="flex-1 flex flex-col min-h-0 bg-black">
        {activeTab === "INTEL" ? (
          <div className="flex flex-col h-full">
            <div className="p-2 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/10">
              <span className="text-[9px] font-mono uppercase tracking-[.2em] flex items-center gap-1.5" style={{ color: "#22ab94" }}>
                <Newspaper className="w-3 h-3" /> Intel_Nexus
              </span>
              <div className="text-[7px] font-mono text-zinc-700 animate-pulse">LIVE_SYNC</div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
              {/* PRIMARY ENRICHED NEWS */}
              <div className="p-3 space-y-4">
                {news && news.length > 0 ? (
                  <>
                    {news.filter(n => {
                      const title = n.intelligence?.translatedTitle || n.title;
                      const summary = n.intelligence?.intelligenceSummary || n.summary || n.description;
                      
                      const isGenericTitle = !title || 
                                           title.includes("SIGNAL_INTERFERENCE") || 
                                           title.trim() === "";
                                           
                      const isGenericSummary = !summary || 
                                       summary.includes("Pending analysis") || 
                                       summary.includes("TACTICAL_INTEL_UNAVAILABLE") ||
                                       summary.trim() === "";
                      return !isGenericTitle && !isGenericSummary;
                    }).map((item, idx) => (
                      <div key={idx} onClick={() => onSelectNews(item)} className="group relative pl-3 border-l border-zinc-800 hover:border-emerald-500/50 transition-all cursor-pointer pb-2">
                        <div className="absolute left-[-1px] top-0 w-[1px] h-2 bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[7px] font-mono text-zinc-600 bg-white/5 px-1 uppercase tracking-tighter">
                            {new Date(item.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[7px] font-mono text-emerald-950 font-black uppercase tracking-[0.2em] bg-emerald-500/10 px-1">
                            {item.source ? item.source.slice(0, 12) : 'UPLINK'}
                          </span>
                        </div>
                        
                        <h4 className="text-[10px] font-bold text-zinc-300 group-hover:text-white transition-colors leading-snug tracking-tight mb-1">
                          {item.intelligence?.translatedTitle || item.title}
                        </h4>
                        
                        <p className="text-[9px] text-zinc-600 line-clamp-2 italic font-mono uppercase leading-tight group-hover:text-zinc-400 transition-colors">
                          {item.intelligence?.intelligenceSummary || item.summary || item.description}
                        </p>
                      </div>
                    ))}

                    {/* DEEP SIGNAL FEED (Lesser News) */}
                    <div className="mt-8 pt-4 border-t border-zinc-900">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="text-[8px] font-mono text-zinc-700 uppercase tracking-[0.3em]">Deep_Scan_Feed</div>
                        <div className="h-[1px] flex-1 bg-zinc-900" />
                      </div>
                      <div className="space-y-3 opacity-50 hover:opacity-100 transition-opacity">
                        {news.slice(12).map((item, idx) => (
                          <div key={`deep-${idx}`} onClick={() => onSelectNews(item)} className="group cursor-pointer hover:bg-white/5 p-1 transition-all rounded-sm border border-transparent hover:border-zinc-800">
                            <div className="text-[7px] font-mono text-zinc-800 mb-1 flex justify-between">
                              <span>SIGNAL_{idx + 100}</span>
                              <span>{new Date(item.published_at).toLocaleDateString()}</span>
                            </div>
                            <div className="text-[8px] font-bold text-zinc-500 group-hover:text-zinc-300 leading-none truncate">
                              {item.title}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center opacity-20">
                    <Activity className="w-10 h-10 text-white mx-auto mb-3 animate-pulse" />
                    <div className="text-[10px] font-mono uppercase tracking-[0.5em]">Establishing_Uplink...</div>
                  </div>
                )}
              </div>
              
              {isAiProcessing && (
                <div className="px-3 py-4 flex items-center gap-2 border-t border-white/5 bg-emerald-950/5 sticky bottom-0">
                  <RefreshCcw className="w-2.5 h-2.5 text-emerald-400 animate-spin" />
                  <span className="text-[8px] font-mono uppercase tracking-[0.2em]" style={{ color: "#22ab94" }}>Neural_Synthesis_In_Progress</span>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "PINNED" ? (
          <div className="flex flex-col h-full animate-in fade-in duration-500">
            <div className="p-2 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
              <span className="text-[9px] font-mono text-white uppercase tracking-widest flex items-center gap-1">
                <Link2 className="w-2.5 h-2.5" /> Supply_Chain_Map
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
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
                          <div>
                            <div className="text-[9px] font-bold text-zinc-300 font-mono tracking-tight group-hover:text-red-400 transition-colors truncate max-w-[80px]">{sup.name}</div>
                          </div>
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
                          <div>
                            <div className="text-[9px] font-bold text-zinc-300 font-mono tracking-tight group-hover:text-blue-400 transition-colors truncate max-w-[80px]">{cust.name}</div>
                          </div>
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

              {/* General Partners */}
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
          </div>
        ) : (
          <div className="flex flex-col h-full animate-in fade-in duration-500">
            <div className="p-2 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
              <span className="text-[9px] font-mono text-white uppercase tracking-widest flex items-center gap-1">
                <ShieldAlert className="w-2.5 h-2.5" /> Operations_Order
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
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
          </div>
        )}
      </div>
    </aside>
  );
};

