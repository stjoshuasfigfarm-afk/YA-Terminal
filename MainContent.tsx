import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface ChartWidgetProps {
  symbol?: string;
}

export function ChartWidget({ symbol = "AAPL" }: ChartWidgetProps) {
  // Generate "dense" mock data
  const data = useMemo(() => {
    const points = [];
    let price = symbol === 'BTC' ? 65000 : 150 + Math.random() * 100;
    const volatility = symbol === 'BTC' ? 500 : 2;
    
    for (let i = 0; i < 24; i++) {
      const hour = i % 12 || 12;
      const ampm = i < 12 ? 'AM' : 'PM';
      price += (Math.random() - 0.5) * volatility;
      points.push({
        time: `${hour}${ampm}`,
        value: parseFloat(price.toFixed(2))
      });
    }
    return points;
  }, [symbol]);

  return (
    <div className="w-full h-full bg-[#0A0A0B] border border-[#2A2A2A] relative overflow-hidden group">
      <div className="absolute top-2 left-2 z-10 flex gap-2">
        <span className="text-[8px] font-mono text-zinc-500 bg-black/50 px-1 border border-zinc-500/30">INTRA_60M</span>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 5, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00FF41" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#00FF41" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="#444"
            fontSize={8}
            tickLine={false}
            axisLine={{ stroke: '#222' }}
            tick={{ fill: '#666' }}
            minTickGap={20}
            dy={10}
          />
          <YAxis 
            domain={['auto', 'auto']} 
            stroke="#444"
            fontSize={8}
            tickLine={false}
            axisLine={{ stroke: '#222' }}
            tick={{ fill: '#666' }}
            width={30}
            tickFormatter={(val) => `$${val}`}
            mirror={false}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#121214', 
              border: '1px solid #2A2A2A', 
              fontSize: '10px', 
              fontFamily: 'JetBrains Mono' 
            }}
            itemStyle={{ color: '#00FF41' }}
            labelClassName="hidden"
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#00FF41" 
            strokeWidth={1.5}
            fillOpacity={1} 
            fill="url(#colorValue)" 
            animationDuration={800}
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
