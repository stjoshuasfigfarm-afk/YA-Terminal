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
    const historical = [...chartHistory].filter(d => 
      d.timestamp > 0 && 
      typeof d.price === 'number' && 
      !isNaN(d.price) && 
      d.price > 0
    );
    
    // Concatenate historical and live heartbeat telemetry and filter NaN prices
    const merged = [...historical, ...liveTicks]
      .filter(d => typeof d.price === 'number' && !isNaN(d.price))
      .sort((a, b) => a.timestamp - b.timestamp);
    
    if (merged.length === 0) return [];
    
    return merged;
  }, [chartHistory, liveTicks]);

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
            <TrendingUp className={cn("w-2 h-2", stats.isPositive ? "text-emerald-500" : "text-rose-500")} />
            <span className={`text-[11px] font-mono font-black ${stats.isPositive ? "text-emerald-400" : "text-rose-400"} tracking-tighter`}>
              {stats.isPositive ? "+" : ""}{stats.change}%
            </span>
            {isFetching && (
              <RefreshCw className="w-2.5 h-2.5 text-emerald-500/60 animate-spin ml-1.5" />
            )}
          </div>
        </div>
      </div>

      {/* Timeframe Selector */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        {['1D', '1W', '1M', '1Y', '5Y'].map(tf => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`text-[6px] px-1 py-0.5 font-mono font-bold border transition-all ${
              timeframe === tf 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-extrabold' 
                : 'bg-black/60 border-zinc-900 text-zinc-600 hover:border-zinc-800 hover:text-zinc-400'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      <div className={cn(
        "flex-1 w-full mt-5 -mb-1 transition-opacity duration-150 relative", 
        isFetching ? "opacity-30" : "opacity-80 group-hover:opacity-100"
      )}>
        {isFetching && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20">
            <span className="text-[10px] font-mono text-emerald-500 tracking-widest font-black uppercase">REFRESHING</span>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={stats.isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.2}/>
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
              tick={{ fill: '#3f3f46', fontSize: 6 }}
              tickFormatter={(t) => new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            />
            <YAxis 
              hide={isFocusMode} 
              orientation="right"
              width={isFocusMode ? 0 : 30}
              domain={['auto', 'auto']} 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#3f3f46', fontSize: 6 }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.95)', 
                border: `1px solid ${stats.isPositive ? '#10b98122' : '#ef444422'}`,
                borderRadius: '0px',
                fontSize: '8px',
                fontFamily: 'monospace',
                padding: '4px 6px',
                boxShadow: `0 0 10px ${stats.isPositive ? '#10b98111' : '#ef444411'}`
              }}
              itemStyle={{ color: stats.isPositive ? '#10b981' : '#ef4444', padding: 0 }}
              labelStyle={{ color: '#71717a', fontSize: '7px', fontWeight: 'bold', fontFamily: 'monospace', marginBottom: '2px' }}
              labelFormatter={formatTooltipLabel}
              cursor={{ stroke: '#27272a', strokeWidth: 1 }}
              formatter={(value: any) => [
                <span className="font-bold">{`$${parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}</span>, 
                'QUOTE'
              ]}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const company = COMPANIES.find(c => c.symbol === ticker);
                  const val = parseFloat(payload[0].value as any);
                  const isPos = stats.isPositive;
                  
                  return (
                    <div className="bg-black/95 border border-zinc-900 p-2 font-mono text-[8px] min-w-[120px] shadow-2xl">
                      <div className="flex justify-between items-center border-b border-zinc-900 pb-1 mb-2">
                        <span className="text-zinc-500 font-bold uppercase tracking-widest">{formatTooltipLabel(label)}</span>
                        <div className="flex items-center gap-1">
                          <div className={cn("w-1 h-1 rounded-full", isPos ? "bg-emerald-500" : "bg-rose-500")} />
                          <span className={isPos ? "text-emerald-500" : "text-rose-500"}>SYNCED</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between mb-1.5">
                        <span className="text-zinc-600 uppercase">PRICE_NODE</span>
                        <span className="text-white font-black tracking-tight">${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>

                      {company && (
                        <div className="mt-2 pt-2 border-t border-zinc-900 space-y-1.5">
                           <div className="flex justify-between">
                             <span className="text-zinc-600 uppercase">TURNOVER_RATE</span>
                             <span className="text-rose-400 font-bold">{company.turnover || "12.4%"}</span>
                           </div>
                           <div className="flex justify-between">
                             <span className="text-zinc-600 uppercase">HIRING_LKL</span>
                             <span className={cn(
                               "font-black tracking-tight",
                               company.hiringLikelihood === "High" ? "text-emerald-400" : 
                               company.hiringLikelihood === "Moderate" ? "text-blue-400" : "text-zinc-500"
                             )}>
                               {(company.hiringLikelihood || "STABLE").toUpperCase()}
                             </span>
                           </div>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area 
              type="linear" 
              dataKey="price" 
              stroke={stats.isPositive ? "#10b981" : "#ef4444"} 
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorPrice)"
              dot={false}
              connectNulls={true}
              activeDot={{ r: 2, fill: stats.isPositive ? "#10b981" : "#ef4444", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

TelemetryChart.displayName = "TelemetryChart";
