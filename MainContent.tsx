import React, { useState } from 'react';
import { Layout as LayoutIcon, Search, Bell, User, Layers, Globe, Activity, TrendingUp, Info, Map as MapIcon } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Ticker } from './Ticker';
import { SidebarLeft } from './SidebarLeft';
import { SidebarRight } from './SidebarRight';
import { MainContent } from './MainContent';

export default function Layout() {
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');

  return (
    <div className="terminal-grid">
      {/* Header */}
      <header className="col-span-3 h-[42px] border-b border-terminal-border bg-terminal-header flex items-center justify-between px-4 z-50 overflow-hidden">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex-shrink-0">
            <div className="text-terminal-accent font-black tracking-tighter text-base uppercase whitespace-nowrap">HY-Terminal <span className="text-white/50 font-normal ml-1">v1.0.4</span></div>
          </div>
          <div className="h-4 w-px bg-terminal-border mx-2 hidden sm:block" />
          <nav className="hidden md:flex items-center gap-4">
            {['Markets', 'Analytics', 'Strategy'].map((item) => (
              <button key={item} className="text-[10px] uppercase tracking-widest text-terminal-muted hover:text-terminal-accent transition-colors whitespace-nowrap">
                {item}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 px-8 hidden sm:block overflow-hidden">
          <Ticker />
        </div>

        <div className="flex items-center gap-4 text-[10px] text-terminal-muted flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">LATENCY: 12ms</span>
            <span className="w-1.5 h-1.5 rounded-full bg-terminal-accent shadow-[0_0_5px_rgba(0,255,65,0.5)]" />
          </div>
          <span className="hidden sm:inline">14:22:10 UTC</span>
          <div className="w-7 h-7 rounded-full bg-[#1A1A1D] border border-zinc-700 flex items-center justify-center text-[10px] text-white flex-shrink-0">JD</div>
        </div>
      </header>

      {/* Sidebar Left */}
      <SidebarLeft onSelect={setSelectedSymbol} selectedSymbol={selectedSymbol} />

      {/* Main Area */}
      <MainContent selectedSymbol={selectedSymbol} />

      {/* Sidebar Right */}
      <SidebarRight symbol={selectedSymbol} />

      {/* Footer */}
      <footer className="col-span-3 h-5 bg-terminal-accent text-black flex items-center px-4 justify-between text-[10px] font-bold">
        <div className="flex gap-4">
          <span>TERMINAL STATUS: READY</span>
          <span>STREAM: LIVE</span>
        </div>
        <div className="flex gap-4">
          <span>S&P 500: 5,475.22 (+0.23%)</span>
          <span>NASDAQ: 17,862.15 (+0.12%)</span>
        </div>
      </footer>
    </div>
  );
}
