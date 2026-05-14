import React from 'react';
import { AssetMap } from './AssetMap';
import { Maximize2, Minimize2, Settings, Download } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export function MainContent({ selectedSymbol }: { selectedSymbol: string }) {
  return (
    <main className="flex flex-col flex-1 border-x border-terminal-border bg-black relative overflow-hidden h-full">
      <div className="px-3 py-1 border-b border-terminal-border/20 bg-zinc-950/50 flex justify-between items-center z-20">
        <span className="text-[6px] text-terminal-accent/50 font-mono tracking-widest">[SERVICE: GEO_ORBITAL_V5]</span>
        <span className="text-[5px] text-[#444] font-mono">SAT_LINK: STEADY</span>
      </div>
      {/* Map (Strict Center) */}
      <div className="flex-1 w-full h-full relative group bg-[#050505]">
        <div className="absolute inset-0 opacity-10 pointer-events-none z-[5]" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
        
        <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md border border-[#333] p-2 text-[10px] z-[1000] font-mono shadow-2xl">
          <div className="text-terminal-accent mb-1 uppercase tracking-widest font-bold">Vector_Node: {selectedSymbol}</div>
          <div className="flex gap-4">
            <div className="text-zinc-500">COORD: <span className="text-zinc-100">0.0.0.0</span></div>
            <div className="text-zinc-500">STATE: <span className="text-terminal-accent">ACTIVE</span></div>
          </div>
        </div>

        <div className="absolute top-3 right-3 z-[1000] flex gap-2">
           <div className="px-2 py-1 bg-black/60 backdrop-blur-md border border-[#333] text-[9px] text-terminal-accent animate-pulse">
             OPEN FEED
           </div>
        </div>

        <AssetMap symbol={selectedSymbol} />
      </div>
    </main>
  );
}
