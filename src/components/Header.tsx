import React, { useEffect, useState } from "react";
import { Shield, Activity, Globe } from "lucide-react";
import { cn } from "../lib/utils";

interface HeaderProps {
  selectedStock?: any;
}

export const Header: React.FC<HeaderProps> = ({ selectedStock }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-9 border-b border-zinc-800 flex items-center bg-black shrink-0 relative overflow-hidden z-20">
      <div className="flex items-center px-4 h-full border-r border-zinc-800 bg-zinc-900 z-10 space-x-2 shrink-0">
        <img src="/logo.svg" alt="Logo" className="w-7 h-7 object-contain" />
        <span className="text-[#22ab94] font-black tracking-tighter text-sm whitespace-nowrap uppercase">Y ANALYSIS TERMINAL</span>
      </div>
      
      <div className="flex-1 flex items-center h-full px-0 overflow-hidden bg-zinc-950/50">
        <div className="flex h-full items-center overflow-hidden">
          <div className="ticker-scroll flex items-center space-x-8 px-4 whitespace-nowrap">
            {[1, 2, 3].map(i => (
              <React.Fragment key={i}>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-600 font-mono text-[9px] tracking-widest uppercase">NIKKEI 225</span>
                  <span className="text-red-500 font-mono text-[10px] font-bold">38,720.50</span>
                  <span className="text-red-900 font-mono text-[8px]">-0.12%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-600 font-mono text-[9px] tracking-widest uppercase">S&P 500</span>
                  <span className="text-[#22ab94] font-mono text-[10px] font-bold">5,123.44</span>
                  <span className="text-[#22ab94]/50 font-mono text-[8px]">+0.82%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-600 font-mono text-[9px] tracking-widest uppercase">HANG SENG</span>
                  <span className="text-[#22ab94] font-mono text-[10px] font-bold">16,725.10</span>
                  <span className="text-[#22ab94]/50 font-mono text-[8px]">+1.23%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-600 font-mono text-[9px] tracking-widest uppercase">DAX 40</span>
                  <span className="text-red-500 font-mono text-[10px] font-bold">18,175.22</span>
                  <span className="text-red-900 font-mono text-[8px]">-0.05%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-600 font-mono text-[9px] tracking-widest uppercase">BTC/USD</span>
                  <span className="text-[#22ab94] font-mono text-[10px] font-bold">64,210</span>
                  <span className="text-[#22ab94]/50 font-mono text-[8px]">+2.44%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500 font-mono text-[9px] font-black italic tracking-tighter opacity-20 uppercase">PROTOCOL_V9_CONNECTED</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="px-3 flex items-center space-x-2 border-l border-zinc-800 h-full bg-black/80">
        <div className="w-1.5 h-1.5 rounded-full bg-[#22ab94] animate-pulse"></div>
        <span className="text-[9px] font-mono text-[#22ab94] uppercase tracking-tighter opacity-80">Link_Active</span>
      </div>
    </header>
  );
};
