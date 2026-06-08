import React, { useEffect, useRef, useMemo, useState } from "react";
import * as echarts from "echarts";
import { TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

interface YieldCurveMonitorProps {
  yields: {
    interestRate?: number;
    treasuries?: Record<string, number>;
    country?: string;
    updatedAt?: string;
  } | null;
}

export const YieldCurveMonitor = React.memo(({ yields }: YieldCurveMonitorProps) => {
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

  const runSimulation = (mode: "RECALIBRATING" | "STRESSING") => {
    setAnalysisStatus(mode);
    setTimeout(() => setAnalysisStatus("NORMAL"), 3000);
  };

  // Construct the full term structure maturities: 1M, 3M, 6M, 1Y, 2Y, 5Y, 7Y, 10Y, 20Y, 30Y
  const curveData = useMemo(() => {
    const cbRate = activeYields.interestRate ?? 5.50;
    const treasuries = activeYields.treasuries || {};
    
    // Explicit anchor points
    let y2 = treasuries['2Y'] ?? 4.82;
    let y5 = treasuries['5Y'] ?? 4.45;
    let y10 = treasuries['10Y'] ?? 4.42;
    let y30 = treasuries['30Y'] ?? 4.56;

    if (analysisStatus === "STRESSING") {
      y2 += 0.5;
      y5 += 0.1;
      y10 -= 0.2;
      y30 -= 0.3;
    }

    // Derived values for other maturities to form a continuous, realistic term structure
    const isUSorSimilar = cbRate > y2; 

    let y1M, y3M, y6M, y1Y, y7Y, y20Y;

    if (isUSorSimilar) {
      // Inverted profile derivation
      y1M = cbRate - 0.15;
      y3M = cbRate - 0.20;
      y6M = cbRate - 0.30;
      y1Y = (y6M + y2) / 2;
      y7Y = (y5 + y10) / 2 - 0.02;
      y20Y = (y10 + y30) / 2 - 0.05;
    } else {
      // Normal/Upward sloping profile derivation
      y1M = cbRate + 0.15;
      y3M = cbRate + 0.30;
      y6M = cbRate + 0.45;
      y1Y = (y6M + y2) / 2;
      y7Y = (y5 + y10) / 2 + 0.05;
      y20Y = (y10 + y30) / 2 + 0.10;
    }

    const maturities = [
      { term: '1M', yield: y1M },
      { term: '3M', yield: y3M },
      { term: '6M', yield: y6M },
      { term: '1Y', yield: y1Y },
      { term: '2Y', yield: y2 },
      { term: '5Y', yield: y5 },
      { term: '7Y', yield: y7Y },
      { term: '10Y', yield: y10 },
      { term: '20Y', yield: y20Y },
      { term: '30Y', yield: y30 }
    ];

    return maturities.map(m => ({
      term: m.term,
      yieldVal: parseFloat(m.yield.toFixed(3))
    }));
  }, [activeYields, analysisStatus]);

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

  useEffect(() => {
    if (!chartRef.current) return;

    // Wait slightly to ensure containment layout bounds are ready
    const timer = setTimeout(() => {
      if (!chartRef.current) return;
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current, 'dark');
      }

      const isInverted = spreadDetails.isInverted;
      
      // Dynamic Theme Color Mapping
      const themeColor = isInverted ? '#f59e0b' : '#06b6d4'; // warning Amber vs crisp Cyan
      const glowIntensity = isInverted ? 'rgba(245, 158, 11, 0.4)' : 'rgba(6, 182, 212, 0.4)';
      const gradientStart = isInverted ? 'rgba(245, 158, 11, 0.18)' : 'rgba(6, 182, 212, 0.18)';

      const categories = curveData.map(d => d.term);
      const values = curveData.map(d => d.yieldVal);

      const option = {
        backgroundColor: 'transparent',
        animation: false,
        animationDuration: 600,
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'line',
            lineStyle: {
              color: 'rgba(255, 255, 255, 0.1)',
              width: 1,
              type: 'dashed'
            }
          },
          formatter: (params: any) => {
            const item = params[0];
            return `<div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 8px; padding: 4px; background: #000; border: 1px solid ${themeColor}80; min-width: 120px;">
              <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 2px; margin-bottom: 4px; color: ${themeColor}; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase;">[ TERM_POINT ]</div>
              <div style="display: flex; justify-between; align-items: center; margin-bottom: 2px;">
                <span style="color: #555; font-size: 7px; text-transform: uppercase;">Maturity:</span>
                <span style="color: #fff; margin-left: auto;">${item.name}</span>
              </div>
              <div style="display: flex; justify-between; align-items: center;">
                <span style="color: #555; font-size: 7px; text-transform: uppercase;">Yield_VAL:</span>
                <span style="color: ${themeColor}; font-weight: bold; margin-left: auto;">${parseFloat(item.data).toFixed(3)}%</span>
              </div>
              <div style="margin-top: 4px; height: 1px; background: rgba(16, 185, 129, 0.2); overflow: hidden; position: relative;">
                 <div style="position: absolute; inset: 0; background: ${themeColor}; opacity: 0.3; animation: loading-bar 2s ease-in-out infinite;"></div>
              </div>
            </div>`;
          },
          backgroundColor: '#000000',
          borderColor: 'rgba(255, 255, 255, 0.12)',
          borderWidth: 1,
          textStyle: {
            color: '#ffffff',
            fontSize: 8
          }
        },
        grid: {
          top: 20,
          bottom: 25,
          left: 30,
          right: 15,
          containLabel: false
        },
        xAxis: {
          type: 'category',
          data: categories,
          axisLine: {
            lineStyle: {
              color: '#3f3f46' // zinc-700
            }
          },
          axisTick: {
            show: false
          },
          axisLabel: {
            color: '#a1a1aa', // zinc-405
            fontFamily: 'var(--font-sans)',
            fontSize: 8,
            margin: 6
          }
        },
        yAxis: {
          type: 'value',
          scale: true,
          axisLine: {
            show: false
          },
          axisTick: {
            show: false
          },
          splitLine: {
            lineStyle: {
              color: '#1e293b', // slate-800
              type: 'dashed'
            }
          },
          axisLabel: {
            color: '#71717a', // zinc-500
            fontFamily: 'var(--font-sans)',
            fontSize: 8,
            formatter: '{value}%'
          }
        },
        series: [
          {
            name: 'Yield',
            type: 'line',
            smooth: false, // sharper lines
            showSymbol: true,
            symbol: 'circle',
            symbolSize: 5,
            itemStyle: {
              color: themeColor,
              borderWidth: 1,
              borderColor: '#000'
            },
            data: values,
            lineStyle: {
              color: themeColor,
              width: 2,
              shadowBlur: 10,
              shadowColor: glowIntensity
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: gradientStart },
                { offset: 1, color: 'rgba(0, 0, 0, 0)' }
              ])
            }
          }
        ]
      };

      chartInstance.current.setOption(option, true);
      chartInstance.current.resize();
    }, 100);

    const resizeObserver = new ResizeObserver(() => {
      chartInstance.current?.resize();
    });

    if (chartRef.current) {
      resizeObserver.observe(chartRef.current);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [curveData, spreadDetails]);

  return (
    <div id="yield-curve-monitor" className="p-2 border-b border-zinc-900 bg-zinc-950/40 font-sans text-[9px] select-none">
      <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-zinc-900">
        <div className="text-[8px] text-emerald-500 font-black uppercase tracking-[0.2em] flex items-center gap-1.5">
          <TrendingUp className="w-2.5 h-2.5 text-emerald-400" /> Treasury Term Structure
        </div>
        
        {/* Inversion Status Badge Indicator */}
        <div className="flex items-center gap-1">
          {spreadDetails.isInverted ? (
            <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-1.5 py-0.5 border border-amber-500/20 text-[7px] font-black uppercase tracking-tighter rounded-sm shadow-[0_0_8px_rgba(245,158,11,0.2)]">
              <AlertTriangle className="w-1.5 h-1.5" /> [Inverted]
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-cyan-950/40 text-cyan-400 px-1.5 py-0.5 border border-cyan-500/20 text-[7px] font-black uppercase tracking-tighter rounded-sm shadow-[0_0_8px_rgba(6,182,212,0.15)]">
              <CheckCircle className="w-1.5 h-1.5" /> [Normal]
            </div>
          )}
        </div>
      </div>

      {/* Prominent Rate Ticker */}
      <div className="flex gap-1.5 mb-2 h-8 overflow-x-auto scrollbar-none pb-1">
        {[
          { label: "2Y", val: spreadDetails.y2 },
          { label: "5Y", val: activeYields.treasuries?.['5Y'] ?? 4.45 },
          { label: "10Y", val: spreadDetails.y10 },
          { label: "30Y", val: activeYields.treasuries?.['30Y'] ?? 4.56 },
        ].map((item) => (
          <div 
            key={item.label}
            className="flex-1 min-w-[50px] bg-black/60 border border-zinc-900 px-1.5 py-0.5 flex flex-col justify-center rounded-xs"
          >
            <div className="text-[6px] text-zinc-650 font-black tracking-tighter uppercase whitespace-nowrap">{item.label} TREASURY</div>
            <div className="text-[9px] text-emerald-400 font-bold font-mono tracking-tight">
              {item.val.toFixed(2)}%
            </div>
          </div>
        ))}
      </div>

      {/* Yield Curve Chart Rendering Stage */}
      <div className="relative w-full h-32 bg-zinc-950/30 rounded-sm overflow-hidden border border-zinc-900/60 shadow-inner">
         <div ref={chartRef} className="w-full h-full relative z-10" />
         {analysisStatus !== "NORMAL" && (
           <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
             <div className="flex flex-col items-center gap-2">
               <div className="w-12 h-1 bg-zinc-900 overflow-hidden relative">
                 <div className="absolute inset-y-0 left-0 bg-emerald-500 w-1/2" />
               </div>
               <span className="text-[6px] text-emerald-500 font-mono font-black tracking-[0.2em] uppercase">
                 {analysisStatus === "RECALIBRATING" ? "Recalibrating Term Structure..." : "Running Stress Script: HI_VOL_SIM..."}
               </span>
             </div>
           </div>
         )}
      </div>

      <div className="mt-1.5 flex justify-between gap-1.5">
        <button 
          onClick={() => runSimulation("RECALIBRATING")}
          disabled={analysisStatus !== "NORMAL"}
          className="flex-1 py-1 text-[7px] font-sans text-zinc-500 bg-zinc-950/50 border border-zinc-900 hover:border-emerald-500/30 hover:text-emerald-400 font-bold tracking-widest uppercase transition-all disabled:opacity-30 cursor-pointer"
        >
          Recalibrate
        </button>
        <button 
          onClick={() => runSimulation("STRESSING")}
          disabled={analysisStatus !== "NORMAL"}
          className="flex-1 py-1 text-[7px] font-sans text-zinc-500 bg-zinc-950/50 border border-zinc-900 hover:border-emerald-500/30 hover:text-emerald-400 font-bold tracking-widest uppercase transition-all disabled:opacity-30 cursor-pointer"
        >
          Stress Test
        </button>
      </div>

      <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[7px] text-zinc-500 tracking-wider">
        <div className="flex justify-between bg-zinc-900/40 px-1.5 py-1 border border-zinc-800/80">
          <span className="uppercase text-[6px] text-zinc-600 font-black tracking-widest pt-0.5">Vector (10Y-2Y)</span>
          <span className={`font-black ${spreadDetails.spread < 0 ? "text-amber-500" : "text-emerald-500"}`}>
            {spreadDetails.spread > 0 ? "+" : ""}{spreadDetails.spread.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between bg-zinc-900/40 px-1.5 py-1 border border-zinc-800/80">
          <span className="uppercase text-[6px] text-zinc-600 font-black tracking-widest pt-0.5">Core CB Rate</span>
          <span className="text-zinc-300 font-black">{(activeYields.interestRate ?? 5.50).toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
});
