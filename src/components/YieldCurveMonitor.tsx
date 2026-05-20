import React, { useEffect, useRef, useMemo } from "react";
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

export const YieldCurveMonitor: React.FC<YieldCurveMonitorProps> = ({ yields }) => {
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

  // Construct the full term structure maturities: 1M, 3M, 6M, 1Y, 2Y, 5Y, 7Y, 10Y, 20Y, 30Y
  const curveData = useMemo(() => {
    const cbRate = activeYields.interestRate ?? 5.50;
    const treasuries = activeYields.treasuries || {};
    
    // Explicit anchor points
    const y2 = treasuries['2Y'] ?? 4.82;
    const y5 = treasuries['5Y'] ?? 4.45;
    const y10 = treasuries['10Y'] ?? 4.42;
    const y30 = treasuries['30Y'] ?? 4.56;

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
  }, [activeYields]);

  // Spread Check validation (2-Year vs 10-Year yield)
  const spreadDetails = useMemo(() => {
    const treasuries = activeYields.treasuries || {};
    const y2 = treasuries['2Y'] ?? 4.82;
    const y10 = treasuries['10Y'] ?? 4.42;
    const spread = y10 - y2;
    const isInverted = y2 > y10;
    return {
      y2,
      y10,
      spread: parseFloat(spread.toFixed(3)),
      isInverted
    };
  }, [activeYields]);

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
        animation: true,
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
            return `<div style="font-family: var(--font-mono); font-size: 8px; font-weight: bold; padding: 1px 3px;">
              MATURITY: ${item.name}<br/>
              YIELD: <span style="color: ${themeColor}">${item.data}%</span>
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
          top: 15,
          bottom: 20,
          left: 28,
          right: 8,
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
            fontFamily: 'var(--font-mono)',
            fontSize: 7,
            margin: 8
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
            color: '#a1a1aa',
            fontFamily: 'var(--font-mono)',
            fontSize: 7,
            formatter: '{value}%'
          }
        },
        series: [
          {
            name: 'Yield',
            type: 'line',
            smooth: true,
            showSymbol: true,
            symbol: 'circle',
            symbolSize: 4,
            itemStyle: {
              color: themeColor
            },
            data: values,
            lineStyle: {
              color: themeColor,
              width: 1.5,
              shadowBlur: 8,
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
    };
  }, [curveData, spreadDetails]);

  return (
    <div id="yield-curve-monitor" className="p-2 border-b border-zinc-900 bg-zinc-950/40 font-mono text-[9px] select-none">
      <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-zinc-900">
        <div className="text-[8px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1">
          <TrendingUp className="w-2.5 h-2.5" /> Term_Structure_Yields
        </div>
        
        {/* Inversion Status Badge Indicator */}
        <div className="flex items-center gap-1">
          {spreadDetails.isInverted ? (
            <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-1 py-0.5 border border-amber-500/20 text-[7px] font-bold uppercase tracking-tighter rounded-sm">
              <AlertTriangle className="w-1.5 h-1.5" /> [Inverted]
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-cyan-950/40 text-cyan-400 px-1 py-0.5 border border-cyan-500/20 text-[7px] font-bold uppercase tracking-tighter rounded-sm">
              <CheckCircle className="w-1.5 h-1.5" /> [Normal]
            </div>
          )}
        </div>
      </div>

      {/* Yield Curve Chart Rendering Stage */}
      <div className="relative w-full h-24 bg-zinc-950/30 rounded-sm overflow-hidden border border-zinc-900/60">
        <div ref={chartRef} className="w-full h-full" />
      </div>

      <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[7px] text-zinc-500 uppercase tracking-tight">
        <div className="flex justify-between bg-zinc-950/20 px-1 py-0.5 border border-zinc-900/40">
          <span>Spread (10Y - 2Y):</span>
          <span className={`font-bold ${spreadDetails.spread < 0 ? "text-amber-500" : "text-emerald-500"}`}>
            {spreadDetails.spread > 0 ? "+" : ""}{spreadDetails.spread.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between bg-zinc-950/20 px-1 py-0.5 border border-zinc-900/40">
          <span>Anchor rate (CB):</span>
          <span className="text-zinc-300 font-bold">{(activeYields.interestRate ?? 5.50).toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
};
