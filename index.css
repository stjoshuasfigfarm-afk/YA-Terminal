import React from 'react';
import { Search, List, Star, Clock, Filter, Plus, Activity, ChevronRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export function SidebarLeft({ onSelect, selectedSymbol }: { onSelect: (symbol: string) => void, selectedSymbol: string }) {
  const [search, setSearch] = React.useState('');
  const [prices, setPrices] = React.useState<Record<string, { price: string, change: string }>>({});
  
  const allAssets = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corp.' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.' },
    { symbol: 'TSLA', name: 'Tesla, Inc.' },
    { symbol: 'AMD', name: 'Advanced Micro Devices' },
    { symbol: 'META', name: 'Meta Platforms' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'NFLX', name: 'Netflix, Inc.' },
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'COIN', name: 'Coinbase Global' },
    { symbol: 'HOOD', name: 'Robinhood Markets' },
    { symbol: 'PLTR', name: 'Palantir Tech' },
    { symbol: 'MSTR', name: 'MicroStrategy' },
    { symbol: 'SMCI', name: 'Super Micro' },
    { symbol: 'ARM', name: 'Arm Holdings' },
    { symbol: 'TSM', name: 'TSMC' },
    { symbol: 'AVGO', name: 'Broadcom Inc.' },
    { symbol: 'ORCL', name: 'Oracle Corp.' },
    { symbol: 'TME', name: 'Tencent Music' },
    { symbol: 'SPOT', name: 'Spotify Tech' },
    { symbol: 'SONY', name: 'Sony Group' },
    { symbol: 'ASML', name: 'ASML Holding' },
    { symbol: 'SAP', name: 'SAP SE' },
    { symbol: 'TM', name: 'Toyota Motor' },
    { symbol: 'SHOP', name: 'Shopify Inc.' },
    { symbol: 'SNOW', name: 'Snowflake Inc.' },
    { symbol: 'ABNB', name: 'Airbnb, Inc.' },
    { symbol: 'UBER', name: 'Uber Tech' },
    { symbol: 'PYPL', name: 'PayPal Holdings' },
  ];

  const assets = allAssets.filter(a => 
    a.symbol.toLowerCase().includes(search.toLowerCase()) || 
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="terminal-panel border-r border-terminal-border flex flex-col bg-black overflow-hidden h-full">
      <div className="px-3 py-1 border-b border-terminal-border/20 bg-zinc-950/50 flex justify-between items-center">
        <span className="text-[6px] text-terminal-accent/50 font-mono tracking-widest">[SERVICE: MARKET_TICK_L1]</span>
        <div className="flex gap-1">
          <div className="w-0.5 h-0.5 bg-terminal-accent/30"></div>
          <div className="w-0.5 h-0.5 bg-terminal-accent animate-pulse"></div>
        </div>
      </div>
      <div className="p-3 border-b border-terminal-border bg-zinc-950/50">
        <div className="text-[10px] text-terminal-muted uppercase tracking-[0.2em] mb-2 font-bold">Market Navigator</div>
        <div className="bg-[#0A0A0A] border border-[#222] px-2 py-1.5 flex items-center text-[10px] group focus-within:border-terminal-accent transition-colors">
          <Search className="w-3 h-3 mr-2 text-[#444] group-focus-within:text-terminal-accent" />
          <input 
            type="text" 
            placeholder="FILTER_POOL..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-zinc-100 placeholder-[#333] w-full uppercase font-mono"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
        <div className="px-3 py-2 text-terminal-muted uppercase text-[9px] tracking-widest border-b border-[#1A1A1D] flex justify-between items-center bg-[#050505] sticky top-0 z-10 font-bold">
          <span>Active Watchlist</span>
          <Filter className="w-3 h-3 text-zinc-500 hover:text-white cursor-pointer" />
        </div>
        <div className="flex flex-col">
          {assets.map((asset) => {
            return (
              <div 
                key={asset.symbol} 
                onClick={() => onSelect(asset.symbol)}
                className={cn(
                  "px-2 py-0.5 border-b border-[#1A1A1D] flex justify-between hover:bg-[#1A1A1D] cursor-pointer transition-all group relative",
                  selectedSymbol === asset.symbol ? "bg-[#1A1A1D] border-l-2 border-l-terminal-accent" : ""
                )}
              >
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className={cn(
                      "font-mono text-[7px] font-bold group-hover:text-terminal-accent transition-colors",
                      selectedSymbol === asset.symbol && "text-terminal-accent"
                    )}>
                      {asset.symbol}.O
                    </span>
                    {selectedSymbol === asset.symbol && <Activity className="w-1 h-1 text-terminal-accent" />}
                  </div>
                  <span className="text-[6px] text-[#333] uppercase truncate block leading-tight">{asset.name}</span>
                </div>
                <div className="flex items-center">
                  {selectedSymbol === asset.symbol && <ChevronRight className="w-1.5 h-1.5 text-terminal-accent" />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-auto p-3">
          <div className="bg-[#1A1A1D] p-3 border border-[#333] rounded">
            <div className="text-[9px] text-terminal-muted mb-1 uppercase tracking-widest">System Status</div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-terminal-accent shadow-[0_0_5px_var(--color-terminal-accent)]"></div>
              <span className="text-[10px] text-[#AAA] tracking-tight">FEED: ONLINE (ACTIVE)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-2 border-t border-terminal-border bg-terminal-bg/50">
        <div className="flex items-center gap-4 justify-center py-1">
           <Star className="w-4 h-4 text-terminal-muted hover:text-yellow-500 cursor-pointer" />
           <Clock className="w-4 h-4 text-terminal-muted hover:text-white cursor-pointer" />
           <Activity className="w-4 h-4 text-terminal-muted hover:text-emerald-500 cursor-pointer" />
        </div>
      </div>
    </aside>
  );
}
