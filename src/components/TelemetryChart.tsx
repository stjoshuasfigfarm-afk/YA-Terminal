import React, { useEffect, useRef, useMemo } from "react";
import * as echarts from "echarts";
import { Activity } from "lucide-react";

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
    if (!chartRef.current) return;

    const timer = setTimeout(() => {
      if (!chartRef.current) return;
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current, 'dark');
      }

      const option = {
        backgroundColor: 'transparent',
        animation: false,
        grid: {
          top: 0,
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
          scale: true
        },
        series: [
          {
            name: 'Price',
            type: 'line',
            smooth: true,
            symbol: 'none',
            data: chartData,
            lineStyle: { 
              color: '#10b981', 
              width: 2,
              shadowBlur: 10,
              shadowColor: 'rgba(16, 185, 129, 0.4)'
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(16, 185, 129, 0.5)' },
                { offset: 1, color: 'rgba(16, 185, 129, 0)' }
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
  }, [chartData]);

  if (!data || data.length < 2) return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-zinc-900/30">
      <Activity className="w-10 h-10 text-zinc-800 mb-3 animate-pulse" />
      <div className="font-mono text-[9px] text-zinc-600 uppercase tracking-widest text-center">
        Establishing_Neural_Sync...
      </div>
    </div>
  );

  return (
    <div 
      ref={chartRef} 
      className="w-full h-full bg-black/40 relative z-10" 
      style={{ minHeight: '60px' }}
    />
  );
};
