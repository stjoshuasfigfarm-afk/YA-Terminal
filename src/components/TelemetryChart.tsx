import React, { useMemo, useRef, useState, useEffect } from "react";
import { Activity, TrendingUp, RefreshCw } from "lucide-react";
import { cn } from "../lib/utils";
import { useTerminal } from "../context/TerminalContext";

interface TelemetryChartProps {
  data: any[];
  aiForecast?: number[];
  ticker: string;
  isFocusMode?: boolean;
}

export const TelemetryChart = React.memo(({ data, ticker, isFocusMode = true }: TelemetryChartProps) => {
  const { marketData } = useTerminal();
  const [timeframe, setTimeframe] = useState('1D');
  const [chartHistory, setChartHistory] = useState<any[]>(data);
  const [liveTicks, setLiveTicks] = useState<{ timestamp: number; price: number }[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{ time: number; value: number; x: number; y: number } | null>(null);
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setLiveTicks([]);
    setChartHistory(data);
  }, [ticker, data]);

  useEffect(() => {
    let active = true;
    setIsFetching(true);
    fetch(`/api/history?symbol=${ticker}&timeframe=${timeframe}`)
      .then(res => res.json())
      .then(resData => {
        if (active && resData?.processed) setChartHistory(resData.processed);
      })
      .catch(err => {
        console.warn(err);
        if (active && timeframe === '1M') setChartHistory(data);
      })
      .finally(() => { if (active) setIsFetching(false); });
    return () => { active = false; };
  }, [ticker, timeframe]);

  useEffect(() => {
    const quote = marketData.quote;
    if (!quote || quote.symbol !== ticker || !quote.price) return;
    const newTick = { timestamp: Math.floor(Date.now() / 1000), price: Number(quote.price) };
    setLiveTicks(prev => {
        const updated = [...prev, newTick];
        return updated.slice(-100);
    });
  }, [marketData.quote, ticker]);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    observer.observe(chartContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const chartData = useMemo(() => {
    const filter = (arr: any[]) => {
      if (ticker === 'WTI') {
        return arr.filter(d => d.price >= 10);
      }
      return arr.filter(d => d.price > 0);
    };

    const historical = filter([...chartHistory]);
    const live = filter([...liveTicks]);
    
    return [...historical, ...live]
      .map(d => ({ 
        time: (d.timestamp > 100000000000 ? Math.floor(d.timestamp / 1000) : d.timestamp), 
        value: Number(d.price) 
      }))
      .filter(d => !isNaN(d.value) && isFinite(d.value) && !isNaN(d.time) && isFinite(d.time))
      .sort((a, b) => (a.time as number) - (b.time as number));
  }, [chartHistory, liveTicks, ticker]);

  const paddingY = 22;
  const paddingX = 10;

  const { svgPath, minPrice, maxPrice } = useMemo(() => {
    if (chartData.length < 2 || containerSize.width === 0 || containerSize.height === 0) return { svgPath: "", minPrice: 0, maxPrice: 1 };
    
    const minTime = chartData[0].time as number;
    const maxTime = chartData[chartData.length - 1].time as number;
    const prices = chartData.map(d => d.value);
    const minP = Math.min(...prices) * 0.995;
    const maxP = Math.max(...prices) * 1.005;
    const priceRange = maxP - minP || 1;

    const points = chartData.map(d => {
      const x = paddingX + (((d.time as number) - minTime) / (maxTime - minTime || 1) * (containerSize.width - paddingX * 2));
      const y = paddingY + ((containerSize.height - paddingY * 2) * (1 - (d.value - minP) / priceRange));
      return `${x},${y}`;
    }).join(" L ");

    return { svgPath: `M ${points}`, minPrice: minP, maxPrice: maxP };
  }, [chartData, containerSize, paddingY, paddingX]);

  const stats = useMemo(() => {
    if (chartData.length < 2) return { change: 0, isPositive: true };
    const first = chartData[0].value;
    const last = chartData[chartData.length - 1].value;
    const change = first === 0 ? 0 : ((last - first) / first) * 100;
    return { change: change.toFixed(2), isPositive: change >= 0 };
  }, [chartData]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (chartData.length < 2 || containerSize.width === 0 || containerSize.height === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    const minTime = chartData[0].time as number;
    const maxTime = chartData[chartData.length - 1].time as number;
    const timeRange = maxTime - minTime || 1;

    // Calculate approximate hover time based on width mapping
    const relativeX = (mouseX - paddingX) / (containerSize.width - paddingX * 2);
    const hoverTime = minTime + Math.max(0, Math.min(1, relativeX)) * timeRange;

    // Binary / linear search for closest point
    let closestPoint = chartData[0];
    let minDiff = Math.abs(closestPoint.time - hoverTime);
    for (let i = 1; i < chartData.length; i++) {
      const diff = Math.abs(chartData[i].time - hoverTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestPoint = chartData[i];
      }
    }

    const prices = chartData.map(d => d.value);
    const minP = Math.min(...prices) * 0.995;
    const maxP = Math.max(...prices) * 1.005;
    const priceRange = maxP - minP || 1;

    const x = paddingX + (((closestPoint.time as number) - minTime) / timeRange * (containerSize.width - paddingX * 2));
    const y = paddingY + ((containerSize.height - paddingY * 2) * (1 - (closestPoint.value - minP) / priceRange));

    setHoveredPoint({
      time: closestPoint.time,
      value: closestPoint.value,
      x,
      y
    });
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  const formattedHoverTime = useMemo(() => {
    if (!hoveredPoint) return "";
    const date = new Date(hoveredPoint.time * 1000);
    if (timeframe === "1D") {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: '2-digit' }) + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }, [hoveredPoint, timeframe]);

  return (
    <div className="relative w-full h-full bg-black flex flex-col overflow-hidden border border-zinc-900 shadow-inner rounded-sm">
      {/* Background Matrix Pattern Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[linear-gradient(rgba(0,255,136,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,136,0.15)_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      {/* Top Left Stats & Telemetry Delta Header */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2 pointer-events-none">
        <div className="flex flex-col">
          <span className="text-[6.5px] text-zinc-600 font-mono tracking-widest uppercase font-black">SIG_VAL_DELTA</span>
          <div className="flex items-center gap-1.5">
            <TrendingUp className={cn("w-2.5 h-2.5", stats.isPositive ? "text-emerald-500 animate-pulse" : "text-rose-500")} />
            <span className={`text-[11px] font-mono font-black ${stats.isPositive ? "text-[#00ff88]" : "text-rose-400"}`}>
              {stats.isPositive ? "+" : ""}{stats.change}%
            </span>
            {isFetching && (
              <span className="text-[7px] text-[#00ff88]/60 font-mono tracking-tighter flex items-center gap-1 ml-2">
                <RefreshCw className="w-2 h-2 animate-spin" />
                RECON_SYS...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Top Right Controls & Frame Actions */}
      <div className="absolute top-2 right-2 z-10 flex gap-2 items-center">
        {liveTicks.length > 0 && (
            <div className="flex items-center gap-1 bg-emerald-950/20 border border-[#00ff88]/30 px-1 py-0.5 rounded-xs">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff88] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00ff88]"></span>
                </span>
                <span className="text-[6px] font-mono font-bold text-[#00ff88] tracking-widest">LIVE</span>
            </div>
        )}
        <div className="flex gap-1 bg-black/60 p-0.5 border border-zinc-900 rounded-xs">
        {['1D', '1W', '1M', '1Y', '5Y'].map(tf => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`text-[8px] px-1 py-0.5 font-mono font-bold transition-all ${
              timeframe === tf 
                ? 'bg-[#00ff88]/10 text-[#00ff88] font-extrabold border-b border-[#00ff88]/50' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tf}
          </button>
        ))}
        </div>
      </div>

      {/* Main SVG Plot Canvas Container */}
      <div className="flex-1 w-full relative mt-9" ref={chartContainerRef}>
        {chartData.length < 2 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
            <Activity className="w-5 h-5 text-zinc-800 animate-pulse mb-1.5" />
            <span className="text-[7.5px] text-zinc-600 uppercase tracking-widest animate-pulse">Awaiting Stream Synchronization...</span>
          </div>
        ) : (
          svgPath && (
            <svg 
              className="absolute inset-0 w-full h-full cursor-crosshair select-none" 
              preserveAspectRatio="none"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <defs>
                {/* Glowing neon green ambient gradient beneath line */}
                <linearGradient id="line-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00ff88" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
                </linearGradient>
                {/* High precision glow filter to emulate cathode ray oscilloscope flare */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Gridlines Layer */}
              <line x1="0" y1={paddingY} x2={containerSize.width} y2={paddingY} stroke="#121214" strokeWidth="1" strokeDasharray="2,2" />
              <line x1="0" y1={containerSize.height / 2} x2={containerSize.width} y2={containerSize.height / 2} stroke="#121214" strokeWidth="1" strokeDasharray="2,2" />
              <line x1="0" y1={containerSize.height - paddingY} x2={containerSize.width} y2={containerSize.height - paddingY} stroke="#121214" strokeWidth="1" strokeDasharray="2,2" />
              
              {/* Dynamic Path Area & Outline */}
              <path 
                d={`${svgPath} L ${containerSize.width - paddingX},${containerSize.height - paddingY} L ${paddingX},${containerSize.height - paddingY} Z`} 
                fill="url(#line-gradient)" 
                className="transition-all duration-300"
              />
              <path 
                d={svgPath} 
                fill="none" 
                stroke="#00ff88" 
                strokeWidth="1.2" 
                filter="url(#glow)" 
                className="transition-all duration-300"
              />

              {/* Min/Max Y-Axis Labels placed out of drawing way */}
              <text x={paddingX + 2} y={paddingY - 6} fill="#52525b" fontSize="8" fontFamily="monospace" className="font-bold opacity-80">{maxPrice.toFixed(2)}</text>
              <text x={paddingX + 2} y={containerSize.height - paddingY + 12} fill="#52525b" fontSize="8" fontFamily="monospace" className="font-bold opacity-80">{minPrice.toFixed(2)}</text>

              {/* Dynamic Tooltip & Interactive Reticle */}
              {hoveredPoint && (
                <>
                  {/* Vertical Reticle Axis Line */}
                  <line 
                    x1={hoveredPoint.x} 
                    y1={paddingY - 4} 
                    x2={hoveredPoint.x} 
                    y2={containerSize.height - paddingY + 4} 
                    stroke="#00ff88" 
                    strokeWidth="0.8" 
                    strokeDasharray="3,3"
                    className="opacity-60"
                  />
                  {/* Horizontal Reticle Axis Line */}
                  <line 
                    x1={paddingX} 
                    y1={hoveredPoint.y} 
                    x2={containerSize.width - paddingX} 
                    y2={hoveredPoint.y} 
                    stroke="#00ff88" 
                    strokeWidth="0.8" 
                    strokeDasharray="3,3"
                    className="opacity-40"
                  />
                  {/* Dynamic Pointer Flare */}
                  <circle 
                    cx={hoveredPoint.x} 
                    cy={hoveredPoint.y} 
                    r="4" 
                    fill="#00ff88" 
                    filter="url(#glow)" 
                  />
                  <circle 
                    cx={hoveredPoint.x} 
                    cy={hoveredPoint.y} 
                    r="1.5" 
                    fill="#ffffff" 
                  />

                  {/* Floating Digital Reticle Overlay Tooltip */}
                  <g transform={`translate(${Math.max(10, Math.min(containerSize.width - 110, hoveredPoint.x - 50))}, ${hoveredPoint.y < 55 ? hoveredPoint.y + 12 : hoveredPoint.y - 38})`}>
                    <rect 
                      width="100" 
                      height="26" 
                      fill="#000000" 
                      stroke="#00ff88" 
                      strokeWidth="1" 
                      rx="2"
                    />
                    <text x="5" y="10" fill="#00ff88" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
                      VAL: {hoveredPoint.value.toFixed(2)}
                    </text>
                    <text x="5" y="20" fill="#52525b" fontSize="6.5" fontFamily="monospace">
                      {formattedHoverTime}
                    </text>
                  </g>
                </>
              )}
            </svg>
          )
        )}
      </div>
    </div>
  );
});

TelemetryChart.displayName = "TelemetryChart";


