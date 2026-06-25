import React, { useEffect, useRef, useMemo, useState } from "react";
import * as echarts from "echarts";
import { TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "../lib/utils";

interface YieldCurveMonitorProps {
  yields: {
    interestRate?: number;
    treasuries?: Record<string, number>;
    country?: string;
    updatedAt?: string;
  } | null;
  compact?: boolean;
}

export const YieldCurveMonitor: React.FC<YieldCurveMonitorProps> = ({ yields, compact = false }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // Default fallback yields for US Term Structure
  const activeYields = useMemo(() => {
    return yields || {
      interestRate: 5.50,
      treasuries: { '2Y': 4.82, '5Y': 4.45, '10Y': 4.42, '30Y': 4.56 },
      country: "USA"
    };
  }, [yields]);

  const [analysisStatus, setAnalysisStatus] = useState<"NORMAL" | "RECALIBRATING" | "STRESSING">("NORMAL");

  const runAnalysis = (mode: "RECALIBRATING" | "STRESSING") => {
    setAnalysisStatus(mode);
    setTimeout(() => setAnalysisStatus("NORMAL"), 3000);
  };

  // Spread Check validation (2-Year vs 10-Year yield)
  const spreadDetails = useMemo(() => {
    const treasuries = activeYields.treasuries || {};
    let y2 = treasuries['2Y'] ?? 4.82;
    let y10 = treasuries['10Y'] ?? 4.42;

    if (analysisStatus === "STRESSING") {
      y2 += 0.5;
      y10 -= 0.2;
    }

    const spread = y10 - y2;
    const isInverted = y2 > y10;
    return {
      y2,
      y10,
      spread: parseFloat(spread.toFixed(3)),
      isInverted
    };
  }, [activeYields, analysisStatus]);

  const historicalData = useMemo(() => {
    // Generate mock time series data for the past 5 Years (~1825 days)
    const output = [];
    const now = new Date();
    
    // Generate data, stepping by 2 days to optimize chart rendering (~900 points)
    for (let i = 1825; i >= 0; i -= 2) {
       const date = new Date(now);
       date.setDate(date.getDate() - i);
       
       const portion = 1 - (i / 1825); // 0 to 1 (0 = 5 years ago, 1 = today)
       
       let target2Y = 2;
       let target10Y = 2;
       
       // Macro rate environment phases over last 5 years:
       if (portion < 0.2) { 
         // Pre-COVID to COVID drop
         target2Y = 2.0 - (portion / 0.2) * 1.8;
         if (target2Y < 0.1) target2Y = 0.1;
         target10Y = target2Y + 0.8 + (Math.sin(portion * 10) * 0.2);
       } else if (portion < 0.5) { 
         // Post-COVID ZIRP era
         target2Y = 0.15;
         target10Y = 1.2 + (portion - 0.2) * 1.5;
       } else if (portion < 0.8) { 
         // Aggressive Rate Hikes (Inflation)
         const hikeProgress = (portion - 0.5) / 0.3;
         target2Y = 0.15 + (hikeProgress * 4.8);
         target10Y = 1.6 + (hikeProgress * 2.6); 
       } else { 
         // Higher for longer, Yield Curve Inversion
         target2Y = 4.95 + Math.sin(portion * 20) * 0.2;
         target10Y = 4.2 + Math.cos(portion * 15) * 0.2;
       }

       // High-frequency noise overlay
       const noise2Y = Math.sin(i * 0.1) * 0.08 + Math.cos(i * 0.05) * 0.05;
       const noise10Y = Math.cos(i * 0.12) * 0.08 + Math.sin(i * 0.04) * 0.05;

       let final2Y = target2Y + noise2Y;
       let final10Y = target10Y + noise10Y;

       // Snap exactly to today's data for the current period
       if (i <= 2) {
         final2Y = spreadDetails.y2;
         final10Y = spreadDetails.y10;
       }
       
       output.push({
         date: date.toISOString().split('T')[0],
         y2: parseFloat(final2Y.toFixed(2)),
         y10: parseFloat(final10Y.toFixed(2))
       });
    }
    return output;
  }, [spreadDetails]);

  const statusColor = spreadDetails.isInverted ? 'text-red-500' : 'text-emerald-500';
  const statusBg = spreadDetails.isInverted ? 'bg-red-950/20' : 'bg-emerald-950/20';
  const statusBorder = spreadDetails.isInverted ? 'border-red-900/50' : 'border-emerald-900/50';

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark');
    }

    const dates = historicalData.map(d => d.date);
    const y2Data = historicalData.map(d => d.y2);
    const y10Data = historicalData.map(d => d.y10);

    const option = {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          let html = `<div style="font-family: monospace; font-size: 8px;">`;
          html += `<span style="color:#a1a1aa">${params[0].name}</span><br/>`;
          params.forEach((p: any) => {
            html += `<span style="color:${p.color}">${p.seriesName}: </span>`;
            html += `<strong style="color:${p.color}">${p.value.toFixed(2)}%</strong><br/>`;
          });
          html += `</div>`;
          return html;
        },
        backgroundColor: '#000000',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
      grid: {
        top: 20,
        bottom: 25,
        left: 25,
        right: 15,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          show: true,
          color: '#71717a',
          fontFamily: 'monospace',
          fontSize: 7,
          formatter: (value: string) => {
            const d = new Date(value);
            return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
          }
        }
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: { color: 'rgba(255,255,255,0.03)', type: 'dashed' }
        },
        axisLabel: {
          color: '#71717a',
          fontFamily: 'monospace',
          fontSize: 7,
          formatter: '{value}%'
        }
      },
      color: ['#10b981', '#60a5fa'],
      legend: {
        data: ['2 Year', '10 Year'],
        textStyle: { color: '#a1a1aa', fontSize: 8, fontFamily: 'monospace' },
        icon: 'circle',
        itemWidth: 6,
        top: 0
      },
      series: [
        {
          name: '2 Year',
          type: 'line',
          showSymbol: false,
          data: y2Data,
          lineStyle: { width: 1.5 }
        },
        {
          name: '10 Year',
          type: 'line',
          showSymbol: false,
          data: y10Data,
          lineStyle: { width: 1.5 }
        }
      ]
    };

    chartInstance.current.setOption(option, true);

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);
    
    let resizeObserver: ResizeObserver | null = null;
    if (chartRef.current) {
      resizeObserver = new ResizeObserver(() => {
        window.requestAnimationFrame(() => handleResize());
      });
      resizeObserver.observe(chartRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [historicalData, spreadDetails, compact]);

  if (compact) {
    return (
      <div 
        id="yield-curve-monitor-compact" 
        className="flex items-center gap-2 border border-neutral-900 bg-black p-1 px-2 rounded-sm h-7 select-none shrink-0 font-mono text-neutral-300"
      >
        <div className="flex items-center gap-1 shrink-0">
          <TrendingUp className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span className="text-[7.5px] text-emerald-550 font-bold tracking-wider hidden xl:inline uppercase">
            {activeYields.country || "YIELD"}
          </span>
          {spreadDetails.isInverted ? (
            <span className="text-[6.5px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-px rounded-3xs" title="Yield Curve Inverted">
              INVERTED
            </span>
          ) : (
            <span className="text-[6.5px] font-black text-emerald-500/60 bg-emerald-500/5 border border-emerald-500/10 px-1 py-px rounded-3xs" title="Yield Curve Normal">
              NORMAL
            </span>
          )}
        </div>

        {/* Vector Metrics (10Y-2Y and CORE CB Rate) */}
        <div className="flex items-center gap-1.5 text-[7px] shrink-0">
          <div className="flex items-center gap-1 px-1 py-0.5 bg-black border border-neutral-800 rounded-2xs">
            <span className="text-neutral-500 block text-[6px]">10Y-2Y</span>
            <span className={cn("font-black", statusColor)}>
              {spreadDetails.spread > 0 ? "+" : ""}{spreadDetails.spread.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center gap-1 px-1 py-0.5 bg-black border border-neutral-800 rounded-2xs">
            <span className="text-zinc-400 font-black text-[6px] py-0.5">{activeYields.country}</span>
            <span className="text-neutral-500 block text-[6px]">
              {activeYields.country === "USA" ? "FED_RATE" : "CB_RATE"}
            </span>
            <span className={cn("font-black", statusColor)}>
              {(activeYields.interestRate ?? 5.50).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Small Sparkline Chart */}
        <div className="relative w-12 sm:w-16 md:w-20 lg:w-24 h-5 bg-zinc-950/40 rounded-2xs overflow-hidden border border-zinc-900/40 shrink-0">
          <div ref={chartRef} className="w-full h-full relative z-10" />
          {analysisStatus !== "NORMAL" && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
              <span className="text-[5px] text-emerald-500 font-mono font-black animate-pulse">
                {analysisStatus === "RECALIBRATING" ? "TUNING..." : "STRESS..."}
              </span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="hidden md:flex gap-0.5 shrink-0">
          <button
            onClick={() => runAnalysis("RECALIBRATING")}
            disabled={analysisStatus !== "NORMAL"}
            title="Recalibrate yield curve matrix"
            className="px-1 py-0.5 text-[6px] font-mono font-bold text-zinc-500 border border-zinc-900 hover:border-emerald-500/40 hover:text-emerald-400 bg-zinc-950/25 transition-all rounded-2xs cursor-pointer disabled:pointer-events-none disabled:opacity-20"
          >
            RECAL
          </button>
          <button
            onClick={() => runAnalysis("STRESSING")}
            disabled={analysisStatus !== "NORMAL"}
            title="Stress test extreme scenario"
            className="px-1 py-0.5 text-[6px] font-mono font-bold text-zinc-500 border border-zinc-900 hover:border-emerald-500/40 hover:text-emerald-400 bg-zinc-950/25 transition-all rounded-2xs cursor-pointer disabled:pointer-events-none disabled:opacity-20"
          >
            STRESS
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="yield-curve-monitor" className="font-mono text-[9px] select-none text-neutral-300 w-full h-full min-h-0 flex flex-col">
      {/* Col 1: Yield Chart */}
      <div className="flex flex-col flex-1 w-full min-h-0">
        <div className="flex items-center justify-between mb-2 pb-1 border-b border-zinc-900/60 shrink-0">
            <div className={cn("text-[8px] font-extrabold uppercase tracking-[0.2em] flex items-center gap-1.5", statusColor)}>
              <TrendingUp className="w-2.5 h-2.5" /> YIELD_CHART: Yield Curve Tracking
            </div>
            
            <div className="flex items-center gap-1">
              <div className={cn("flex items-center gap-1 px-1.5 py-0.5 border text-[7px] font-black uppercase tracking-tighter rounded-sm", statusColor, statusBg, statusBorder)}>
                {spreadDetails.isInverted ? <AlertTriangle className="w-1.5 h-1.5" /> : <CheckCircle className="w-1.5 h-1.5" />}
                <span className="hidden sm:inline">[{spreadDetails.isInverted ? "Inverted" : "Normal"}]</span>
              </div>
            </div>
          </div>

          <div className="relative w-full flex-1 min-h-0 bg-zinc-950/30 rounded-sm overflow-hidden border border-zinc-900/60 shadow-inner">
             <div ref={chartRef} className="w-full h-full relative z-10" />
             {analysisStatus !== "NORMAL" && (
               <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
                 <div className="flex flex-col items-center gap-2">
                   <div className="w-12 h-1 bg-zinc-900 overflow-hidden relative">
                     <div className="absolute inset-y-0 left-0 bg-emerald-500 w-1/2" />
                   </div>
                   <span className="text-[6px] text-emerald-500 font-mono font-black tracking-[0.2em] uppercase">
                     {analysisStatus === "RECALIBRATING" ? "Recalibrating..." : "Stress Script..."}
                   </span>
                 </div>
               </div>
             )}
          </div>
        </div>
    </div>
  );
};
