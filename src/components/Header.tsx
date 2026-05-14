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
    <header className="h-12 border-b border-zinc-800 flex items-center bg-black shrink-0 relative overflow-hidden z-20">
      <div className="flex items-center px-4 h-full border-r border-zinc-800 bg-zinc-900 z-10">
        <span className="text-[#22ab94] font-black tracking-tighter text-xl">Y // ANALYSIS TERMINAL</span>
      </div>
      
      <div className="flex-1 flex items-center px-4 space-x-6 overflow-hidden">
        <div className="flex-1 overflow-hidden relative">
          <div className="marquee flex gap-12 text-zinc-500 font-mono text-[10px] uppercase items-center">
            {[1, 2].map(i => (
              <React.Fragment key={i}>
                <span>// NIKKEI 225: 38,720.50 (-0.12%)</span>
                <span>// FTSE 100: 7,930.92 (+0.45%)</span>
                <span>// HANG SENG: 16,725.10 (+1.23%)</span>
                <span>// DAX: 18,175.22 (+0.10%)</span>
                <span>// GLOBAL_INTELLIGENCE: SIGNAL_STABLE_ENCRYPTED</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 flex items-center space-x-2 border-l border-zinc-800 h-full">
        <div className="w-2 h-2 rounded-full bg-[#22ab94] animate-pulse"></div>
        <span className="text-[10px] font-mono text-[#22ab94] uppercase tracking-tighter">Neural Link Live</span>
      </div>
    </header>
  );
};
