import React from 'react';

export function Ticker() {
  const items = [
    { symbol: 'SPX', price: '5,123.44', change: '+1.2%', up: true },
    { symbol: 'NDX', price: '18,234.12', change: '+0.8%', up: true },
    { symbol: 'BTC', price: '67,234', change: '-2.1%', up: false },
    { symbol: 'GOLD', price: '2,341.20', change: '+0.3%', up: true },
    { symbol: 'OIL', price: '82.44', change: '-1.4%', up: false },
    { symbol: 'USD/JPY', price: '154.22', change: '+0.1%', up: true },
  ];

  return (
    <div className="w-full overflow-hidden flex items-center h-full">
      <div className="flex animate-marquee whitespace-nowrap gap-8">
        {[...items, ...items].map((item, i) => (
          <div key={i} className="flex items-center gap-4">
            <span className="font-mono text-[13px] font-black text-white">{item.symbol}</span>
            <span className="font-mono text-[13px] text-white font-bold">{item.price}</span>
            <span className={`font-mono text-[10px] font-bold ${item.up ? 'bg-terminal-accent/20 text-terminal-accent px-1' : 'bg-rose-500/20 text-rose-500 px-1'}`}>
              {item.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
