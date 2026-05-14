import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Info, BarChart3, Globe, Briefcase, DollarSign, PieChart, ShieldCheck } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { ChartWidget } from './ChartWidget';

function MiniEarningsChart({ symbol }: { symbol: string }) {
  const [chartData, setChartData] = React.useState<any[]>([]);

  useEffect(() => {
    // Generate more extreme patterns based on symbol hash for better visual depth
    const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const newData = [
      { q: 'Q1', v: 5 + (hash % 15) },
      { q: 'Q2', v: 45 + (hash % 25) },
      { q: 'Q3', v: 15 + ((hash * 7) % 40) },
      { q: 'Q4', v: 85 + (hash % 15) },
    ];
    setChartData(newData);
  }, [symbol]);

  const max = Math.max(...chartData.map(d => d.v), 1);

  return (
    <div className="flex flex-col mt-2">
      <div className="flex gap-2 h-20 relative overflow-hidden group/chart pr-1 mb-2">
        {/* Y-Axis Labels */}
        <div className="flex flex-col justify-between text-[5px] text-[#444] font-bold border-r border-terminal-border/20 pr-1 pb-4 mb-1">
          <span>{max.toFixed(0)}B</span>
          <span>{(max/2).toFixed(0)}B</span>
          <span>0B</span>
        </div>

        <div className="flex-1 flex gap-2 items-end border-b border-terminal-border/20 pl-1 pb-1 relative">
          {/* Dynamic scanline overlay */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,255,65,0.05)_1px,transparent_1px)] bg-[size:100%_4px] animate-scanline z-20 opacity-20"></div>
          
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5">
            <div className="border-t border-terminal-accent w-full"></div>
            <div className="border-t border-terminal-accent w-full"></div>
            <div className="border-t border-terminal-accent w-full"></div>
          </div>
          
          {chartData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center z-10 h-full justify-end">
              <div 
                className="w-full bg-terminal-accent/30 border-t-2 border-terminal-accent shadow-[0_0_15px_rgba(0,255,65,0.2)] hover:bg-terminal-accent/60 transition-all duration-700 ease-out relative" 
                style={{ 
                  height: `${(d.v / max) * 100}%`,
                  transitionDelay: `${i * 150}ms`
                }}
              >
                {/* Value glow pulse */}
                <div className="absolute top-0 left-0 w-full h-1 bg-terminal-accent animate-pulse"></div>
              </div>
              <span className="text-[5px] text-terminal-muted mt-1 font-bold tracking-tighter uppercase">{d.q}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SidebarRight({ symbol }: { symbol: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetchData = () => {
      fetch(`/api/financials/${symbol}`)
        .then(res => res.json())
        .then(json => {
          setData(json);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // 10s refresh
    return () => clearInterval(interval);
  }, [symbol]);

  if (loading) return (
    <aside className="terminal-panel border-l p-3 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-2 border-terminal-accent/20 border-t-terminal-accent rounded-full animate-spin" />
      <span className="font-mono text-[10px] animate-pulse">TERMINAL_SYMBOLOGY_INIT... {symbol}</span>
    </aside>
  );

  const priceNum = typeof data?.price === 'number' ? data.price : parseFloat(data?.price || '0');
  const changeNum = typeof data?.change === 'number' ? data.change : parseFloat(data?.change || '0');

  return (
    <aside className="terminal-panel border-l border-terminal-border flex flex-col bg-black overflow-hidden h-full">
      {/* Global Metadata */}
      <div className="px-3 py-1 border-b border-terminal-border/20 bg-zinc-950 flex justify-between items-center">
        <span className="text-[6px] text-terminal-accent/60 font-mono tracking-widest">[SERVICE: ASSET_INTELLIGENCE_L3]</span>
        <span className="text-[5px] text-[#333] font-mono">ENCRYPTION: AES-256</span>
      </div>

      {/* Header Section: Ticker and Price */}
      <div className="p-3 border-b border-terminal-border bg-zinc-950/80 backdrop-blur-sm z-20 flex-shrink-0">
        <div className="flex justify-between items-start mb-1">
          <div>
            <h1 className="text-xl font-black text-white tracking-tighter leading-none mb-1">{symbol}</h1>
            <div className="text-[8px] text-terminal-accent uppercase tracking-[0.2em] font-bold">
              NODE_ID: {symbol}.OS
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-white tracking-tight font-mono">${(!isNaN(priceNum) ? priceNum.toFixed(2) : '0.00')}</div>
            <div className={cn(
              "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded inline-block mt-1",
              (changeNum >= 0) ? "bg-emerald-500/10 text-terminal-accent" : "bg-rose-500/10 text-rose-500"
            )}>
              {(changeNum >= 0) ? '▲' : '▼'} {Math.abs(changeNum).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content (Compressed to fit) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <div className="p-2.5 space-y-2.5">
          <div className="space-y-1">
            <div className="text-[9px] text-[#444] uppercase tracking-widest font-bold">Intraday Analytics</div>
            <div className="h-32 w-full border border-terminal-border rounded-sm overflow-hidden bg-black">
              <ChartWidget symbol={symbol === 'BTC' ? 'BINANCE:BTCUSDT' : `NASDAQ:${symbol}`} />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="space-y-1.5">
              <div className="text-[9px] text-[#444] uppercase tracking-widest font-bold">Earnings Momentum</div>
              <MiniEarningsChart symbol={symbol} />
            </div>

            <div className="space-y-1.5">
              <div className="text-[9px] text-[#444] uppercase tracking-widest font-bold">Order Depth Metrics</div>
              <div className="flex flex-col gap-0.5 text-[9px]">
                <div className="flex justify-between items-center">
                  <span className="text-terminal-muted uppercase">ASK</span>
                  <span className="text-rose-400 font-mono">{(priceNum + 0.15).toFixed(2)}</span>
                  <span className="text-[#444] font-mono text-[8px]">{(Math.random() * 5).toFixed(1)}K</span>
                </div>
                <div className="h-1 w-full bg-[#1A1A1D] overflow-hidden">
                   <div className="bg-rose-900 h-full" style={{ width: `${Math.random() * 60 + 20}%` }}></div>
                </div>
                <div className="flex justify-between items-center mt-0.5">
                  <span className="text-terminal-muted uppercase">BID</span>
                  <span className="text-terminal-accent font-mono">{(priceNum - 0.12).toFixed(2)}</span>
                  <span className="text-[#444] font-mono text-[8px]">{(Math.random() * 5).toFixed(1)}K</span>
                </div>
                <div className="h-1 w-full bg-[#1A1A1D] overflow-hidden">
                   <div className="bg-emerald-900 h-full" style={{ width: `${Math.random() * 60 + 20}%` }}></div>
                </div>
              </div>
            </div>

            <div className="bg-[#0A0A0A] p-2 border border-[#222]">
              <div className="text-[9px] text-[#444] uppercase mb-1 font-bold tracking-widest">Global Supply Chain Intelligence</div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="space-y-1">
                  <span className="text-[7px] text-zinc-500 block uppercase">Upstream Partners</span>
                  <div className="flex flex-wrap gap-1">
                    {data.supplyChain?.upstream?.map((s: string) => (
                      <span key={s} className="text-[8px] font-mono text-terminal-accent bg-terminal-accent/5 px-1 border border-terminal-accent/20">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[7px] text-zinc-500 block uppercase">Downstream Partners</span>
                  <div className="flex flex-wrap gap-1">
                    {data.supplyChain?.downstream?.map((s: string) => (
                      <span key={s} className="text-[8px] font-mono text-rose-500 bg-rose-500/5 px-1 border border-rose-500/20">{s}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-[9px] text-[#444] uppercase mb-1 font-bold tracking-widest">Fundamental Profile</div>
              <div className="space-y-1">
                <div className="flex justify-between items-center pb-0.5 border-b border-[#222]">
                   <span className="text-[9px] font-bold font-mono text-zinc-100">{data.companyName || data.symbol}</span>
                   <span className="text-[7px] font-mono text-terminal-accent/70 uppercase">Node_L1</span>
                </div>
                
                <div className="grid grid-cols-2 gap-y-0.5 text-[7px] uppercase font-mono">
                  <div>
                    <span className="text-[#444] block">Headquarters</span>
                    <span className="text-zinc-300 truncate">{data.hq || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[#444] block">Sector</span>
                    <span className="text-zinc-300 truncate">{data.sector || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[#444] block">CEO</span>
                    <span className="text-zinc-300 truncate">{data.ceo || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[#444] block">Employees</span>
                    <span className="text-zinc-300 truncate">{data.employees || 'N/A'}</span>
                  </div>
                </div>

                <p className="text-[8px] text-zinc-500 leading-tight uppercase font-sans border-t border-[#111] pt-1 mt-1">
                  {data.description || "Primary exposure to high-yield technology."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(data.stats || {}).map(([key, val]: [any, any]) => (
                <div key={key} className="bg-[#0A0A0A] p-1.5 border border-[#222]">
                  <span className="text-[7px] text-[#444] block uppercase mb-0.5 font-bold">{key}</span>
                  <span className="text-[8px] font-mono text-zinc-100">{val}</span>
                </div>
              ))}
            </div>

            <div className="bg-[#0A0A0A] p-1.5 border border-[#222]">
              <div className="text-[9px] text-[#444] uppercase mb-0.5 font-bold tracking-widest">System Logs</div>
              <div className="text-[7px] font-mono space-y-0.5">
                <div className="text-terminal-accent/80">[OK] {symbol}_RESOLVED</div>
                <div className="text-[#444] block">FEED: {data.realTime ? 'LIVE' : 'MOCK'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
