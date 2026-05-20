import React, { useEffect, useState } from "react";
import { Shield, Activity, Globe } from "lucide-react";
import { cn } from "../lib/utils";

interface HeaderProps {
  selectedStock?: any;
  yields?: any;
}

export const Header: React.FC<HeaderProps> = ({ selectedStock, yields }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const treasuryData = yields?.treasuries || { '2Y': 4.82, '10Y': 4.42, '30Y': 4.56 };

  return (
    <header className="h-7 border-b border-zinc-800 flex items-center bg-black shrink-0 relative overflow-hidden z-20">
      <div className="flex items-center px-3 h-full border-r border-zinc-800 bg-zinc-900 z-10 space-x-2 shrink-0">
        <img src="/logo.png" alt="Logo" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
        <span className="text-white font-black tracking-tighter text-xs whitespace-nowrap uppercase">Y ANALYSIS TERMINAL</span>
      </div>
      
      <div className="flex-1 flex items-center h-full px-0 overflow-hidden bg-zinc-950/50">
        <div className="flex h-full items-center overflow-hidden">
          <div className="ticker-scroll flex items-center space-x-6 px-3 whitespace-nowrap">
            {[1, 2, 3].map(i => (
              <React.Fragment key={i}>
                <div className="flex items-center gap-1.5 grayscale opacity-60">
                  <span className="text-white font-mono text-[8px] font-bold tracking-widest uppercase">US TREASURIES</span>
                  {Object.entries(treasuryData).map(([key, val]: [string, any]) => (
                    <div key={key} className="flex items-center gap-1">
                      <span className="text-zinc-500 font-mono text-[7px]">{key}:</span>
                      <span className="text-white font-mono text-[8px] font-bold">{val}%</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-600 font-mono text-[8px] tracking-widest uppercase">NIKKEI 225</span>
                  <span className="text-red-500 font-mono text-[9px] font-bold">38,720.50</span>
                  <span className="text-red-900 font-mono text-[7px]">-0.12%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-600 font-mono text-[8px] tracking-widest uppercase">S&P 500</span>
                  <span className="text-white font-mono text-[9px] font-bold">5,123.44</span>
                  <span className="text-white/50 font-mono text-[7px]">+0.82%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-600 font-mono text-[8px] tracking-widest uppercase">HANG SENG</span>
                  <span className="text-white font-mono text-[9px] font-bold">16,725.10</span>
                  <span className="text-white/50 font-mono text-[7px]">+1.23%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-600 font-mono text-[8px] tracking-widest uppercase">DAX 40</span>
                  <span className="text-red-500 font-mono text-[9px] font-bold">18,175.22</span>
                  <span className="text-red-900 font-mono text-[7px]">-0.05%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-600 font-mono text-[8px] tracking-widest uppercase">BTC/USD</span>
                  <span className="text-white font-mono text-[9px] font-bold">64,210</span>
                  <span className="text-white/50 font-mono text-[7px]">+2.44%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500 font-mono text-[8px] font-black italic tracking-tighter opacity-20 uppercase">PROTOCOL_V9_CONNECTED</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="px-3 flex items-center space-x-2 border-l border-zinc-800 h-full bg-black/80">
        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
        <span className="text-[9px] font-mono text-white uppercase tracking-tighter opacity-80">Link_Active</span>
      </div>
    </header>
  );
};
