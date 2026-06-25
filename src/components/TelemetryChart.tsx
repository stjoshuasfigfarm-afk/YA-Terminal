import React, { useEffect, useMemo, useState } from "react";
import { Activity, TrendingUp, RefreshCw, UserCheck, Users, Briefcase } from "lucide-react";
import { formatCurrency, cn } from "../lib/utils";
import { useTerminal } from "../context/TerminalContext";
import { COMPANIES } from "../data/companies";
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
  isFocusMode?: boolean;
}

export const TelemetryChart = React.memo(({ data, ticker, isFocusMode = true }: TelemetryChartProps) => {
  const { marketData } = useTerminal();
  const [timeframe, setTimeframe] = useState('1D');
  const [chartHistory, setChartHistory] = useState<any[]>(data);
  const [liveTicks, setLiveTicks] = useState<{ timestamp: number; price: number }[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  
  // Reset live tracking and initial data when the ticker context changes to a new asset
  useEffect(() => {
    setLiveTicks([]);
    setChartHistory(data);
  }, [ticker, data]);

  // Fetch dynamic history upon timeframe or ticker coordinate shifts
  useEffect(() => {
    let active = true;
    setIsFetching(true);

    fetch(`/api/history?symbol=${ticker}&timeframe=${timeframe}`)
      .then(res => {
        if (!res.ok) throw new Error("Telemetry history failure");
        return res.json();
      })
      .then(resData => {
        if (active && resData?.processed) {
          setChartHistory(resData.processed);
        }
      })
      .catch(err => {
        console.warn("Failed to load historical charts, using fallback data", err);
        if (active && timeframe === '1M') {
          setChartHistory(data);
        }
      })
      .finally(() => {
        if (active) setIsFetching(false);
      });

    return () => {
      active = false;
    };
  }, [ticker, timeframe]);

  // Intercept the 10-second heartbeat and append it to our local live buffer
  useEffect(() => {
    const quote = marketData.quote;
    if (!quote || quote.symbol !== ticker || !quote.price) return;

    const newTick = {
      timestamp: Date.now(),
      price: Number(quote.price)
    };

    const livePrice = Number(quote.price);
    if (livePrice > 0 && newTick.price < (livePrice * 0.1)) return;

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
    let historical = [...chartHistory].filter(d => 
      d.timestamp > 0 && 
      typeof d.price === 'number' && 
      !isNaN(d.price) && 
      d.price > 0
    );

    // Dynamic relative boundary filter: drop frames < 10% of active live price
    const livePrice = marketData.quote?.price ? Number(marketData.quote.price) : 0;
    if (livePrice > 0) {
      historical = historical.filter(d => d.price > (livePrice * 0.1));
    }
    
    // Concatenate historical and live heartbeat telemetry and filter NaN prices
    const merged = [...historical, ...liveTicks]
      .filter(d => typeof d.price === 'number' && !isNaN(d.price))
      .sort((a, b) => a.timestamp - b.timestamp);
    
    if (merged.length === 0) return [];
    
    return merged;
  }, [chartHistory, liveTicks, marketData.quote?.price]);

  const stats = useMemo(() => {
    if (chartData.length < 2) return { change: 0, isPositive: true };
    const first = chartData[0].price;
    const last = chartData[chartData.length - 1].price;
    const change = first === 0 ? 0 : ((last - first) / first) * 100;
    return { change: change.toFixed(2), isPositive: change >= 0 };
  }, [chartData]);

  const companyStats = useMemo(() => {
    const company = COMPANIES.find(c => c.symbol === ticker);
    const hash = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    return {
      turnover: company?.turnover || `${(10 + (hash % 10) + (hash % 5) / 10).toFixed(1)}%`,
      hiring: company?.hiringLikelihood || (hash % 3 === 0 ? "High" : hash % 3 === 1 ? "Moderate" : "Stable")
    };
  }, [ticker]);

  // Custom adaptive label formatter for tooltips based on the active timeframe
  const formatTooltipLabel = (timestamp: any) => {
    if (!timestamp) return "";
    const date = new Date(Number(timestamp));
    if (timeframe === "1D") {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (timeframe === "1W") {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else if (timeframe === "1M") {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    }
  };

  if (chartData.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-zinc-950/40 border border-zinc-900 shadow-inner">
      <Activity className="w-6 h-6 text-zinc-900 mb-2" />
      <span className="text-[8px] font-mono text-zinc-700 uppercase tracking-widest">Awaiting Telemetry...</span>
    </div>
  );

  return (
    <div className="relative w-full h-full bg-black/40 flex flex-col overflow-hidden group border border-zinc-900 shadow-inner">
      {/* Tactical scanline effect */}
      {isFocusMode && (
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:100%_4px] opacity-20 z-0" />
      )}
      
      {/* HUD Stats */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-[6px] text-zinc-650 font-mono tracking-widest uppercase font-black">SIG_VAL_DELTA</span>
          <div className="flex items-center gap-1">
            <TrendingUp className={cn("w-2.5 h-2.5", stats.isPositive ? "text-emerald-500" : "text-rose-500")} />
            <span className={`text-[12px] font-mono font-black ${stats.isPositive ? "text-emerald-400" : "text-rose-400"} tracking-tighter`}>
              {stats.isPositive ? "+" : ""}{stats.change}%
            </span>
            {isFetching && (
              <RefreshCw className="w-2.5 h-2.5 text-emerald-500/60 animate-spin ml-1.5" />
            )}
          </div>
        </div>
      </div>

      {/* Timeframe Selector & Status */}
      <div className="absolute top-2 right-2 z-10 flex gap-2 items-center">
        {liveTicks.length > 0 && (
            <div className="flex items-center gap-1 bg-emerald-950/30 border border-emerald-500/30 px-1 py-0.5 animate-pulse">
                <div className="w-1 h-1 rounded-full bg-emerald-500" />
                <span className="text-[6px] font-mono font-bold text-emerald-400">LIVE</span>
            </div>
        )}
        <div className="flex gap-1">
        {['1D', '1W', '1M', '1Y', '5Y'].map(tf => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`text-[8px] px-1.5 py-0.5 font-mono font-bold border transition-all ${
              timeframe === tf 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-extrabold' 
                : 'bg-black/60 border-zinc-900 text-zinc-600 hover:border-zinc-800 hover:text-zinc-400'
            }`}
          >
            {tf}
          </button>
        ))}
        </div>
      </div>

      <div className={cn(
        "flex-1 w-full mt-6 -mb-1 transition-opacity duration-150 relative", 
        isFetching ? "opacity-30" : "opacity-90 group-hover:opacity-100"
      )}>
        {isFetching && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20">
            <span className="text-[10px] font-mono text-emerald-500 tracking-widest font-black uppercase">REFRESHING</span>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={stats.isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.25}/>
                <stop offset="95%" stopColor={stats.isPositive ? "#10b981" : "#ef4444"} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={!isFocusMode} />
            <XAxis 
              hide={isFocusMode} 
              dataKey="timestamp" 
              type="number"
              domain={['dataMin', 'dataMax']}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#52525b', fontSize: 8 }}
              tickFormatter={(t) => new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            />
            <YAxis 
              hide={isFocusMode} 
              orientation="right"
              width={isFocusMode ? 0 : 40}
              domain={['auto', 'auto']} 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#52525b', fontSize: 8 }}
              tickFormatter={(v) => `$${v.toFixed(0)}`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#09090b', 
                border: `1px solid ${stats.isPositive ? '#10b98133' : '#ef444433'}`,
                borderRadius: '0px',
                fontSize: '9px',
                fontFamily: 'monospace',
                padding: '6px 8px',
                boxShadow: `0 0 15px ${stats.isPositive ? '#10b98111' : '#ef444411'}`
              }}
              itemStyle={{ color: stats.isPositive ? '#10b981' : '#ef4444', padding: 0 }}
              labelStyle={{ color: '#71717a', fontSize: '8px', fontWeight: 'bold', fontFamily: 'monospace', marginBottom: '4px' }}
              labelFormatter={formatTooltipLabel}
              cursor={{ stroke: '#3f3f46', strokeWidth: 1, strokeDasharray: '4 4' }}
              formatter={(value: any) => [
                <span className="font-bold">{`$${parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}</span>, 
                'QUOTE'
              ]}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const val = parseFloat(payload[0].value as any);
                  const isPos = stats.isPositive;
                  
                  return (
                    <div className="bg-[#09090b] border border-zinc-800 p-2 font-mono text-[9px] min-w-[140px] shadow-2xl">
                      <div className="flex justify-between items-center border-b border-zinc-900 pb-1.5 mb-2">
                        <span className="text-zinc-400 font-bold uppercase tracking-widest">{formatTooltipLabel(label)}</span>
                        <div className={cn("text-[7px]", isPos ? "text-emerald-500" : "text-rose-500")}>QUOTE_SYNC</div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-600 uppercase">PRICE_NODE</span>
                        <span className="text-white font-black text-[11px]">${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke={stats.isPositive ? "#10b981" : "#ef4444"} 
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorPrice)"
              dot={false}
              connectNulls={true}
              activeDot={{ r: 3, fill: "#fff", stroke: stats.isPositive ? "#10b981" : "#ef4444", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

TelemetryChart.displayName = "TelemetryChart";
