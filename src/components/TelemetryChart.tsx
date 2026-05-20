import React, { useEffect, useRef, useMemo } from "react";
import * as echarts from "echarts";

interface TelemetryChartProps {
  data: any[];
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({ data }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const chartData = useMemo(() => {
    if (!data || data.length < 2) return [];
    return [...data]
      .map(d => {
        let timestamp = 0;
        if (d.time) timestamp = Number(d.time) * 1000;
        else if (d.date) timestamp = new Date(d.date).getTime();
        return [timestamp, d.close || d.price || 0];
      })
      .filter(d => !isNaN(d[0]) && d[0] > 0)
      .sort((a, b) => a[0] - b[0])
      .slice(-60);
  }, [data]);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;

    const initChart = () => {
      const dom = chartRef.current;
      if (!dom) {
        console.warn("[CHART_DEBUG] NO_DOM_REF");
        return;
      }

      // 2. CONTAINER VISIBILITY VALIDATION
      console.log('[CHART_DEBUG] Container dimensions:', dom.clientWidth, dom.clientHeight);
      
      if (dom.clientHeight < 50 || dom.clientWidth < 50) {
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`[CHART_DEBUG] Collapsed or tiny container detected (${dom.clientWidth}x${dom.clientHeight}). Retry ${retryCount}/${maxRetries} in 100ms...`);
          setTimeout(initChart, 100);
          return;
        }
        console.error("[CHART_DEBUG] INITIALIZATION_ATTEMPT :: FAIL (Container too small after retries)");
        return;
      }

      try {
        if (!chartInstance.current) {
          chartInstance.current = echarts.init(dom, 'dark');
          console.log("[CHART_DEBUG] INITIALIZATION_ATTEMPT :: SUCCESS");
        }

        const option = {
          backgroundColor: 'transparent',
          tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            borderColor: '#333',
            textStyle: { color: '#fff', fontSize: 10, fontFamily: 'JetBrains Mono' },
            formatter: (params: any) => {
              const [val] = params;
              const date = new Date(val.value[0]);
              return `<div style="padding: 2px;">
                <div style="color: #666; font-size: 8px;">${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <div style="font-weight: bold;">$${val.value[1].toLocaleString()}</div>
              </div>`;
            }
          },
          grid: {
            top: 5,
            bottom: 0,
            left: 0,
            right: 0,
            containLabel: false
          },
          xAxis: {
            type: 'time',
            show: false,
            boundaryGap: false
          },
          yAxis: {
            type: 'value',
            show: false,
            scale: true,
            boundaryGap: false
          },
          series: [
            {
              name: 'Price',
              type: 'line',
              smooth: true,
              symbol: 'none',
              data: chartData,
              lineStyle: { color: '#ffffff', width: 1 },
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(255, 255, 255, 0.3)' },
                  { offset: 1, color: 'rgba(255, 255, 255, 0)' }
                ])
              }
            }
          ]
        };

        chartInstance.current.setOption(option);
      } catch (err) {
        console.error("[CHART_DEBUG] INITIALIZATION_ATTEMPT :: FAIL", err);
      }
    };

    // 1. DOM CONTENT READINESS
    const timer = setTimeout(initChart, 100);

    // 4. CLEANUP & LOGGING
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [chartData]);

  if (!data || data.length < 2) return (
    <div className="flex-1 flex items-center justify-center font-mono text-[8px] text-zinc-500 uppercase tracking-widest animate-pulse p-4 text-center">
      Establishing_Neural_Link...
    </div>
  );

  return (
    <>
      {/* 3. Z-INDEX & DISPLAY OVERRIDES */}
      <style>{`
        #terminal-chart-container {
          display: block !important;
          visibility: visible !important;
          min-height: 180px !important;
          width: 100% !important;
          height: 100% !important;
          z-index: 40;
          position: relative;
        }
      `}</style>
      <div 
        ref={chartRef} 
        id="terminal-chart-container" 
        className="w-full h-full bg-zinc-950/20" 
      />
    </>
  );
};
