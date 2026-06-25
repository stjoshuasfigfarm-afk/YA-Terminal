import React, { useEffect, useRef, useMemo } from "react";
import * as echarts from "echarts";

export const SectorRotation = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const sectorRotationData = useMemo(() => {
    // RRG style data: RS-Ratio (x-axis), RS-Momentum (y-axis)
    return [
      { name: 'XLK', ratio: 105.2, momentum: 103.1, color: '#10b981' }, // Leading
      { name: 'XLE', ratio: 102.8, momentum: 101.4, color: '#10b981' }, 
      { name: 'XLC', ratio: 101.5, momentum: 98.2, color: '#eab308' }, // Weakening
      { name: 'XLP', ratio: 103.1, momentum: 97.5, color: '#eab308' }, 
      { name: 'XLF', ratio: 98.4, momentum: 96.2, color: '#ef4444' }, // Lagging
      { name: 'XLI', ratio: 96.5, momentum: 99.1, color: '#ef4444' }, 
      { name: 'XLY', ratio: 97.2, momentum: 95.8, color: '#ef4444' }, 
      { name: 'XLV', ratio: 98.1, momentum: 102.5, color: '#3b82f6' }, // Improving
      { name: 'XLU', ratio: 99.2, momentum: 104.1, color: '#3b82f6' }, 
      { name: 'XLB', ratio: 95.4, momentum: 101.8, color: '#3b82f6' }, 
    ];
  }, []);

  useEffect(() => {
    if (chartRef.current) {
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current, 'dark');
      }

      const option = {
        backgroundColor: 'transparent',
        animation: false,
        tooltip: {
          trigger: 'item',
          formatter: (params: any) => {
            const item = params.data;
            if (!item) return '';
            return `<div style="font-family: monospace; font-size: 8px;">
              <span style="color:#a1a1aa">${item.name}</span><br/>
              <span style="color:#71717a">RS-Ratio:</span> <strong style="color:#fff">${item.value[0]}</strong><br/>
              <span style="color:#71717a">RS-Mom:</span> <strong style="color:#fff">${item.value[1]}</strong>
            </div>`;
          },
          backgroundColor: '#000000',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
        },
        grid: {
          top: 15,
          bottom: 25,
          left: 30,
          right: 30,
          containLabel: true
        },
        xAxis: {
          type: 'value',
          min: 94,
          max: 106,
          name: 'RS-Ratio',
          nameLocation: 'middle',
          nameGap: 15,
          nameTextStyle: {
            color: '#71717a',
            fontSize: 7,
            fontFamily: 'monospace'
          },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: {
            color: '#71717a',
            fontFamily: 'monospace',
            fontSize: 7,
            formatter: '{value}'
          }
        },
        yAxis: {
          type: 'value',
          min: 94,
          max: 106,
          name: 'RS-Momentum',
          nameLocation: 'middle',
          nameGap: 20,
          nameTextStyle: {
            color: '#71717a',
            fontSize: 7,
            fontFamily: 'monospace'
          },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: {
            color: '#71717a',
            fontFamily: 'monospace',
            fontSize: 7,
            formatter: '{value}'
          }
        },
        series: [
          {
            type: 'scatter',
            symbolSize: 6,
            label: {
              show: true,
              formatter: '{b}',
              position: 'right',
              color: '#a1a1aa',
              fontSize: 7,
              fontFamily: 'monospace',
              distance: 4
            },
            data: sectorRotationData.map(d => ({
              name: d.name,
              value: [d.ratio, d.momentum],
              itemStyle: {
                color: d.color,
                shadowBlur: 8,
                shadowColor: d.color
              }
            })),
            markLine: {
              animation: false,
              silent: true,
              symbol: ['none', 'none'],
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.15)',
                type: 'dashed',
                width: 1
              },
              data: [
                { xAxis: 100 },
                { yAxis: 100 }
              ]
            },
            markArea: {
              silent: true,
              label: {
                show: true,
                position: 'inside',
                color: 'rgba(255,255,255,0.08)',
                fontSize: 9,
                fontFamily: 'monospace',
                fontWeight: 'bold'
              },
              data: [
                [
                  { name: 'LEADING', xAxis: 100, yAxis: 100, itemStyle: { color: 'rgba(16, 185, 129, 0.05)' } },
                  { xAxis: 110, yAxis: 110 }
                ],
                [
                  { name: 'WEAKENING', xAxis: 100, yAxis: 90, itemStyle: { color: 'rgba(234, 179, 8, 0.05)' } },
                  { xAxis: 110, yAxis: 100 }
                ],
                [
                  { name: 'LAGGING', xAxis: 90, yAxis: 90, itemStyle: { color: 'rgba(239, 68, 68, 0.05)' } },
                  { xAxis: 100, yAxis: 100 }
                ],
                [
                  { name: 'IMPROVING', xAxis: 90, yAxis: 100, itemStyle: { color: 'rgba(59, 130, 246, 0.05)' } },
                  { xAxis: 100, yAxis: 110 }
                ]
              ]
            }
          }
        ]
      };

      chartInstance.current.setOption(option);
    }

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
  }, [sectorRotationData]);

  return <div ref={chartRef} className="w-full h-full relative z-10" />;
};
