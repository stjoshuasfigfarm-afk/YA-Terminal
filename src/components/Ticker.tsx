import React from 'react';
import { motion } from 'motion/react';
import { COMPANIES, Company } from '../data/companies';

interface TickerProps {
  marketData: Record<string, any>;
  onSelect: (company: Company) => void;
}

export const Ticker: React.FC<TickerProps> = ({ marketData, onSelect }) => {
  const items = COMPANIES.map(c => ({
    company: c,
    symbol: c.symbol,
    data: marketData[c.symbol]
  }));

  // Duplicate items for seamless loop
  const displayItems = [...items, ...items, ...items];

  return (
    <div className="h-8 bg-black/80 backdrop-blur-md border-t border-emerald-500/20 flex items-center overflow-hidden whitespace-nowrap z-30 select-none">
      <div className="bg-emerald-500 text-black font-mono text-[9px] font-bold px-2 h-full flex items-center shrink-0 z-10">
        LIVE_FEED
      </div>
      <motion.div 
        className="flex gap-8 px-4"
        animate={{
          x: [0, -100 * items.length],
        }}
        transition={{
          duration: items.length * 2,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {displayItems.map((item, idx) => {
          const price = item.data?.c || "---";
          const change = parseFloat(item.data?.dp || 0);
          const isPositive = change >= 0;

          return (
            <div 
              key={idx} 
              onClick={() => onSelect(item.company)}
              className="flex items-center gap-2 font-mono hover:bg-white/5 cursor-pointer px-2 transition-colors group"
            >
              <span className="text-white/40 text-[9px] group-hover:text-white transition-colors">{item.symbol}</span>
              <span className="text-white text-[10px] font-bold">{price}</span>
              <span className={`text-[9px] ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                {isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
};
