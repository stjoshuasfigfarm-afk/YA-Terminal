import React, { useEffect, useMemo, useState } from "react";
import { Activity, TrendingUp } from "lucide-react";
import { formatCurrency, cn } from "../lib/utils";
import { useTerminal } from "../context/TerminalContext";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

interface TelemetryChartProps {
  data: any[];
  aiForecast?: number[];
  ticker: string;
}

export const TelemetryChart = React.memo(({ data, ticker }: TelemetryChartProps) => {
  const { marketData } = useTerminal();
  const [timeframe, setTimeframe] = useState('1M');
  const [liveTicks, setLiveTicks] = useState<{ timestamp: number; price: number }[]>([]);
  
  // Reset live tracking when the ticker context changes to a new asset
  useEffect(() => {
    setLiveTicks([]);
  }, [ticker]);

  // Intercept the 10-second heartbeat and append it to our local live buffer
  useEffect(() => {
    const quote = marketData.quote;
    if (!quote || quote.symbol !== ticker || !quote.price) return;

    const newTick = {
      timestamp: Date.now(),
      price: Number(quote.price)
    };

    setLiveTicks(prev => {
      // Prevent duplicate ticks if the heartbeat hasn't progressed or value is identical in tight window
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        const isIdentical = Math.abs(last.price - newTick.price) < 0.0001;
        const isTooSoon = (newTick.timestamp - last.timestamp) < 8000; // Heartbeat is 10s
        if (isIdentical && isTooSoon) return prev;
      }
      
      // Maintain a rolling window of the last 100 live ticks to prevent memory bloat
      const updated = [...prev, newTick];
      return updated.slice(-100);
    });
  }, [marketData.quote, ticker]);

  const chartData = useMemo(() => {
    // Process historical data
    const historical = [...data].map(d => ({
      timestamp: d.time ? Number(d.time) * 1000 : new Date(d.date).getTime(),
      price: d.close || d.price || 0,
    })).filter(d => !isNaN(d.timestamp) && d.timestamp > 0);

    // Merge historical with live heartbeat telemetry
    const merged = [...historical, ...liveTicks]
       .sort((a, b) => a.timestamp - b.timestamp);

    if (merged.length === 0) return [];
    
    const now = Date.now();
    const msInDay = 24 * 60 * 60 * 1000;
    
    let filtered = merged;
    if (timeframe === '1D') filtered = filtered.filter(d => (now - d.timestamp) <= msInDay);
    else if (timeframe === '1W') filtered = filtered.filter(d => (now - d.timestamp) <= 7 * msInDay);
    else if (timeframe === '1M') filtered = filtered.filter(d => (now - d.timestamp) <= 30 * msInDay);
    else if (timeframe === '1Y') filtered = filtered.filter(d => (now - d.timestamp) <= 365 * msInDay);

    // If historical data is too old/sparse for the selected timeframe, ensure we at least show live ticks
    if (filtered.length < 2 && liveTicks.length > 0) {
        return liveTicks;
    }

    return filtered;
  }, [data, liveTicks, timeframe]);

  const stats = useMemo(() => {
    if (chartData.length < 2) return { change: 0, isPositive: true };
    const first = chartData[0].price;
    const last = chartData[chartData.length - 1].price;
    const change = first === 0 ? 0 : ((last - first) / first) * 100;
    return { change: change.toFixed(2), isPositive: change >= 0 };
  }, [chartData]);

  if (chartData.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-zinc-950/40 border border-zinc-900 shadow-inner">
      <Activity className="w-6 h-6 text-zinc-900 mb-2" />
      <span className="text-[8px] font-mono text-zinc-700 uppercase tracking-widest">Awaiting Telemetry...</span>
    </div>
  );

  return (
    <div className="relative w-full h-full bg-black/40 flex flex-col overflow-hidden group border border-zinc-900 shadow-inner">
      {/* Tactical scanline effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:100%_4px] opacity-20 z-0" />
      
      {/* HUD Stats */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-[6px] text-zinc-650 font-mono tracking-widest uppercase font-black">SIG_VAL_DELTA</span>
          <div className="flex items-center gap-1">
            <TrendingUp className={cn("w-2 h-2", stats.isPositive ? "text-emerald-500" : "text-rose-500")} />
            <span className={`text-[11px] font-mono font-black ${stats.isPositive ? "text-emerald-400" : "text-rose-400"} tracking-tighter`}>
              {stats.isPositive ? "+" : ""}{stats.change}%
            </span>
          </div>
        </div>
      </div>

      {/* Timeframe Selector */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        {['1W', '1M', '1Y'].map(tf => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`text-[6px] px-1 py-0.5 font-mono font-bold border transition-all ${
              timeframe === tf 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-black/60 border-zinc-900 text-zinc-600 hover:border-zinc-800'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      <div className="flex-1 w-full mt-4 -mb-1 opacity-80 transition-opacity group-hover:opacity-100">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={stats.isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.15}/>
                <stop offset="95%" stopColor={stats.isPositive ? "#10b981" : "#ef4444"} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
            <XAxis hide dataKey="timestamp" />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#09090b', 
                border: '1px solid #27272a',
                borderRadius: '0px',
                fontSize: '8px',
                fontFamily: 'monospace'
              }}
              itemStyle={{ color: stats.isPositive ? '#10b981' : '#ef4444' }}
              labelStyle={{ display: 'none' }}
              formatter={(value: any) => [`$${parseFloat(value).toFixed(2)}`, 'PRICE']}
            />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke={stats.isPositive ? "#10b981" : "#ef4444"} 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#chartGradient)" 
              dot={false}
              activeDot={{ r: 3, fill: stats.isPositive ? "#10b981" : "#ef4444", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

TelemetryChart.displayName = "TelemetryChart";
