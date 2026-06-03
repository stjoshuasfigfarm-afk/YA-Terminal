import React, { useEffect, useState, useMemo } from 'react';
import { X, Network, Box, Map, ArrowRight, ArrowDown, Activity, Zap, Layers, RefreshCw } from 'lucide-react';
import { COMPANIES, Company } from '../data/companies';
import { cn } from '../lib/utils';
import { motion } from "motion/react";

// Helper to resolve company symbols for nodes
const getCompanySymbolText = (symbol: string) => {
  return symbol.slice(0, 2).toUpperCase();
};

interface SupplyChainModalProps {
  company: Company;
  onClose: () => void;
  onSelectNode: (c: Company) => void;
}

export const SupplyChainModal: React.FC<SupplyChainModalProps> = ({ company, onClose, onSelectNode }) => {
  // Compute Tier 1 and Tier 2 relationships
  const suppliersT1 = useMemo(() => COMPANIES.filter(c => c.partners?.includes(company.symbol)), [company]);
  const customersT1 = useMemo(() => {
    return company.partners ? COMPANIES.filter(c => company.partners!.includes(c.symbol)) : [];
  }, [company]);

  const suppliersT2 = useMemo(() => {
    const symbolsT1 = suppliersT1.map(s => s.symbol);
    return COMPANIES.filter(c => c.partners?.some(p => symbolsT1.includes(p)) && c.symbol !== company.symbol && !symbolsT1.includes(c.symbol));
  }, [suppliersT1, company]);

  const customersT2 = useMemo(() => {
    const symbolsT1 = customersT1.map(c => c.symbol);
    return COMPANIES.filter(c => symbolsT1.some(sT1 => {
      const src = COMPANIES.find(x => x.symbol === sT1);
      return src?.partners?.includes(c.symbol);
    }) && c.symbol !== company.symbol && !symbolsT1.includes(c.symbol));
  }, [customersT1, company]);

  // Determine active commodity theme
  const commodityTheme = useMemo(() => {
    const sector = (company.sector || "").toLowerCase();
    if (sector.includes("semi") || sector.includes("chips")) {
      return {
        name: "Rare Earths & Advanced Silicon Value Chain",
        m1: "Silicon & Rare Earths",
        m2: "Polysilicon Wafers",
        m3: "Die Fabrication",
        m4: "Enterprise AI & Consumers",
        companies: {
          m1: ["ASML", "AMAT", "VALE"],
          m2: ["TSM", "INTC", "SKHYNIX"],
          m3: ["NVDA", "AMD", "SMC"],
          m4: ["AAPL", "MSFT", "GOOGL", "META", "AMZN"]
        }
      };
    } else if (sector.includes("energy") || sector.includes("oil") || sector.includes("gas")) {
      return {
        name: "Petrochemicals & Raw Energy Vectors",
        m1: "Crude Extraction",
        m2: "Drilling Refinement",
        m3: "Cracking & Liquified Gas",
        m4: "Logistics Fleet & EV Recharging",
        companies: {
          m1: ["ARAMCO", "XOM", "CVX"],
          m2: ["SHEL", "TOT", "BP"],
          m3: ["CATL", "XOM", "SMC"],
          m4: ["TSLA", "TM", "UPS", "FDX", "AMZN"]
        }
      };
    } else if (sector.includes("auto") || sector.includes("vehicle") || sector.includes("industrials")) {
      return {
        name: "Lithium-Ion & Carbon-Steel Supply Line",
        m1: "Lithium & Nickel Metallurgy",
        m2: "Anode/Cathode Battery Cells",
        m3: "Chassis Fabrication",
        m4: "Retail Fleet & Distribution",
        companies: {
          m1: ["VALE", "RIO", "BHP"],
          m2: ["CATL", "PANASONIC", "BYD"],
          m3: ["TSLA", "TM", "RIVN"],
          m4: ["AMZN", "UPS", "FDX"]
        }
      };
    } else {
      return {
        name: "Global Macro Commodity & Technology Chain",
        m1: "Basic Chemicals & Metals",
        m2: "Microprocessing Units",
        m3: "System Integrators",
        m4: "Consumer Marketplaces",
        companies: {
          m1: ["VALE", "ASML", "CATL"],
          m2: ["TSM", "NVDA", "INTC"],
          m3: ["AAPL", "SMC", "META", "MSFT"],
          m4: ["AMZN", "LVMH", "NKE", "ADDYY"]
        }
      };
    }
  }, [company]);


  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-xl flex items-center justify-center p-3 md:p-6 lg:p-10 font-sans select-none"
    >
      <motion.div 
        initial={{ y: 20, scale: 0.98, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 20, scale: 0.98, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-7xl h-full max-h-[850px] border border-zinc-800 bg-zinc-950 flex flex-col relative overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.95)]"
      >
        {/* Decorative Grid Line Overlay */}
        <div className="absolute inset-0 bg-cyber-grid pointer-events-none opacity-5" />
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/5 via-transparent to-transparent pointer-events-none" />

        {/* ========================================================== */}
        {/* DIALOG HEADER                                              */}
        {/* ========================================================== */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-900 bg-black/40 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs md:text-sm text-zinc-100 font-extrabold tracking-widest uppercase">
                DEEP COMMODITY & MATERIAL SUPPLY CHAIN WORLD MATRIX
              </h2>
              <div className="text-[9px] text-zinc-500 font-mono flex items-center gap-2">
                SYS_AUDIT &gt; NODE: {company.symbol} // STATUS: ACTIVE_TRACE
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="px-3 py-1.5 border border-zinc-800 text-[10px] font-mono text-zinc-400 hover:text-white hover:bg-zinc-900 hover:border-zinc-600 transition-all uppercase bg-zinc-950 active:scale-95"
          >
            [CLOSE MATRIX]
          </button>
        </div>

        {/* ========================================================== */}
        {/* MASTER SCROLL PANEL                                        */}
        {/* ========================================================== */}
        <div className="flex-grow flex flex-col overflow-y-auto custom-scrollbar p-3 md:p-6 space-y-6">

          {/* MAIN GRAPH NODE CONNECTIONS TRACKER */}
          <div className="border border-zinc-900 bg-black/20 p-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-1.5 font-mono text-[7px]">
                <span className="text-zinc-500">FLOW_CAPACITY:</span>
                <span className="text-emerald-500">92%</span>
                <div className="w-12 h-1 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
                  <div className="h-full bg-emerald-500 w-[92%]" />
                </div>
              </div>
            </div>
            <div className="text-[10px] text-emerald-450 font-mono font-black tracking-widest uppercase mb-4 border-b border-zinc-900 pb-2 select-none flex items-center justify-between">
              <span>PANEL J-1: MULTI-TIER CORPORATE SUPPLY LINK VECTORS</span>
              <div className="flex items-center gap-2">
                <span className="text-[8px] text-zinc-650 tracking-normal capitalize">Status:</span>
                <span className="text-[8px] text-emerald-500 flex items-center gap-1 animate-pulse">
                  <Activity className="w-2.5 h-2.5" /> NOMINAL
                </span>
              </div>
            </div>

            <div className="w-full py-6">
              <div className="flex flex-col gap-5 relative items-center w-full max-w-md mx-auto">
                
                {/* Visual vertical backbone cable */}
                <div className="absolute left-1/2 top-0 bottom-0 w-[1.5px] bg-gradient-to-b from-yellow-500/10 via-emerald-500/20 to-green-500/10 -translate-x-1/2 z-0 opacity-40" />
                
                {/* Animated Flow Particles */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 z-0 overflow-hidden">
                  <div className="absolute inset-0 flex flex-col justify-around">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="w-full h-8 bg-gradient-to-b from-transparent via-emerald-500/40 to-transparent animate-supply-flow" style={{ animationDelay: `${i * 1.5}s` }} />
                    ))}
                  </div>
                </div>

                {/* Tier 2 Suppliers */}
                <div className="w-full flex flex-col gap-3 relative z-10">
                  <div className="text-center text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest bg-zinc-950 px-2 py-1 border border-zinc-900">
                    Tier 2 Suppliers
                  </div>
                  {suppliersT2.length === 0 && (
                    <div className="text-[8.5px] text-zinc-700 text-center italic py-4 bg-zinc-900/10 border border-zinc-900 border-dashed rounded-none uppercase">
                      NO BACKSTAGE SIGNALS
                    </div>
                  )}
                  {suppliersT2.slice(0, 4).map(c => (
                    <SupplyChainNode key={`t2-sup-${c.symbol}`} data={c} type="supplier" onClick={() => onSelectNode(c)} />
                  ))}
                </div>
                
                <div className="flex justify-center z-10"><ArrowDown className="w-4 h-4 text-zinc-700" /></div>

                {/* Tier 1 Suppliers */}
                <div className="w-full flex flex-col gap-3 relative z-10">
                  <div className="text-center text-[8px] font-mono font-bold text-yellow-500/60 uppercase tracking-widest bg-zinc-950 px-2 py-1 border border-yellow-500/25">
                    Tier 1 Suppliers
                  </div>
                  {suppliersT1.length === 0 && (
                    <div className="text-[8.5px] text-zinc-700 text-center italic py-4 bg-zinc-900/10 border border-zinc-900 border-dashed rounded-none uppercase">
                      NO DIRECT INPUTS
                    </div>
                  )}
                  {suppliersT1.slice(0, 4).map(c => (
                    <SupplyChainNode key={`t1-sup-${c.symbol}`} data={c} type="supplier" highlight onClick={() => onSelectNode(c)} />
                  ))}
                </div>

                <div className="flex justify-center z-10"><ArrowDown className="w-4 h-4 text-yellow-500/40" style={{ animationDelay: "150ms" }} /></div>

                {/* Focal Company */}
                <div className="w-full flex flex-col relative z-10 shrink-0">
                  <div className="text-center text-[8px] font-mono font-bold text-emerald-400 uppercase tracking-widest bg-zinc-950 px-2 py-1 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.1)] mb-1">
                    Focal Operator Node
                  </div>
                  <div 
                    className="bg-zinc-950 border-2 border-emerald-500/85 p-4 flex flex-col items-center justify-center text-center shadow-[0_0_20px_rgba(16,185,129,0.1)] relative group cursor-pointer" 
                    onClick={() => onSelectNode(company)}
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t-2 border-l-2 border-emerald-400" />
                    <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t-2 border-r-2 border-emerald-400" />
                    <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b-2 border-l-2 border-emerald-400" />
                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b-2 border-r-2 border-emerald-400" />
                    
                    <div className="w-11 h-11 bg-black border border-zinc-800 flex items-center justify-center text-xl font-black text-emerald-400 group-hover:scale-105 transition-transform overflow-hidden font-mono">
                      <span>{company.symbol.slice(0, 2)}</span>
                    </div>
                    <h3 className="text-xs font-bold text-zinc-100 tracking-tight leading-none mb-1">{company.name}</h3>
                    <div className="flex items-center gap-1 text-[8.5px] font-mono text-emerald-400 font-semibold mb-2">
                      <Activity className="w-2.5 h-2.5" />
                      {company.symbol} • {company.sector}
                    </div>

                    <div className="w-full flex items-center justify-between text-[8px] text-zinc-500 uppercase border-t border-zinc-900/60 pt-2 font-mono">
                      <span className="flex items-center gap-1"><Map className="w-2.5 h-2.5" /> {company.country}</span>
                      <span>{company.workforce || "N/A"} EMP</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center z-10"><ArrowDown className="w-4 h-4 text-emerald-500/40" style={{ animationDelay: "300ms" }} /></div>

                {/* Tier 1 Customers */}
                <div className="w-full flex flex-col gap-3 relative z-10">
                  <div className="text-center text-[8px] font-mono font-bold text-green-500/60 uppercase tracking-widest bg-zinc-950 px-2 py-1 border border-green-500/25">
                    Tier 1 Customers
                  </div>
                  {customersT1.length === 0 && (
                    <div className="text-[8.5px] text-zinc-700 text-center italic py-4 bg-zinc-900/10 border border-zinc-900 border-dashed rounded-none uppercase">
                      NO DIRECT OUTPUTS
                    </div>
                  )}
                  {customersT1.slice(0, 4).map(c => (
                    <SupplyChainNode key={`t1-cust-${c.symbol}`} data={c} type="customer" highlight onClick={() => onSelectNode(c)} />
                  ))}
                </div>

                <div className="flex justify-center z-10"><ArrowDown className="w-4 h-4 text-zinc-800" /></div>

                {/* Tier 2 Customers */}
                <div className="w-full flex flex-col gap-3 relative z-10">
                  <div className="text-center text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest bg-zinc-950 px-2 py-1 border border-zinc-900">
                    Tier 2 Customers
                  </div>
                  {customersT2.length === 0 && (
                    <div className="text-[8.5px] text-zinc-700 text-center italic py-4 bg-zinc-900/10 border border-zinc-900 border-dashed rounded-none uppercase">
                      NO DOWNSTREAM CHANNELS
                    </div>
                  )}
                  {customersT2.slice(0, 4).map(c => (
                    <SupplyChainNode key={`t2-cust-${c.symbol}`} data={c} type="customer" onClick={() => onSelectNode(c)} />
                  ))}
                </div>

              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* PANEL J-2: COMMODITY FLOW PLOT & BRAND MATRICES            */}
          {/* ========================================================== */}
          <div className="border border-zinc-900 bg-black/40 p-5 rounded-none">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-900 pb-3 mb-4 gap-2">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] text-emerald-400 font-mono font-black tracking-widest uppercase">
                  PANEL J-2: DEEP COMMODITY FLOWS AND VALUE CHAINS
                </span>
              </div>
              <div className="text-[9px] font-mono text-zinc-500 uppercase">
                Active Value Pipeline: <span className="text-zinc-300 font-bold">{commodityTheme.name}</span>
              </div>
            </div>

            {/* Visual Commodity Sequence Horizontal Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch relative">
              
              {/* STAGE 1 */}
              <div className="border border-zinc-900/80 bg-zinc-950/40 p-3 h-full flex flex-col justify-between group/stage hover:border-zinc-700 transition-all relative">
                <div className="absolute top-0 right-0 w-8 h-8 bg-emerald-500/5 rotate-45 translate-x-4 -translate-y-4 border border-emerald-500/10 pointer-events-none" />
                <div>
                  <div className="flex items-center justify-between text-[7.5px] text-zinc-500 uppercase mb-1.5 font-mono">
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full border border-zinc-800 flex items-center justify-center text-[5px] font-black">01</span>
                      <span>RESOURCES</span>
                    </div>
                    <span className="text-[#eab308] font-bold">RAW INPUT</span>
                  </div>
                  <div className="text-zinc-200 text-[10.5px] uppercase tracking-wider font-extrabold font-mono border-b border-zinc-900 pb-1.5 mb-2.5">
                    {commodityTheme.m1}
                  </div>
                </div>
                
                <div className="mb-4">
                   <div className="flex justify-between items-center text-[6px] font-mono text-zinc-650 uppercase mb-1">
                      <span>Supply Health</span>
                      <span className="text-emerald-500">Optimal</span>
                   </div>
                   <div className="h-0.5 bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500/40 w-[88%]" />
                   </div>
                </div>
                
                <div>
                  <div className="text-[7.5px] text-zinc-650 uppercase font-mono mb-1.5">Corporate Integrations</div>
                  <div className="flex flex-wrap gap-1.5">
                    {commodityTheme.companies.m1.map(sym => {
                      return (
                        <div key={`com-m1-${sym}`} className="flex items-center gap-1.5 px-1.5 py-1 bg-black border border-zinc-900 hover:border-zinc-700 transition-colors">
                          <div className="w-5 h-5 bg-zinc-900 flex items-center justify-center font-black text-[7px] text-emerald-500/60 overflow-hidden shrink-0 border border-zinc-800">
                            {sym.slice(0, 2)}
                          </div>
                          <span className="text-[8px] text-zinc-355 font-mono font-bold">{sym}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* STAGE 2 */}
              <div className="border border-zinc-900/80 bg-zinc-950/40 p-3 h-full flex flex-col justify-between group/stage hover:border-zinc-700 transition-all relative">
                <div className="absolute top-0 right-0 w-8 h-8 bg-yellow-500/5 rotate-45 translate-x-4 -translate-y-4 border border-yellow-500/10 pointer-events-none" />
                <div>
                  <div className="flex items-center justify-between text-[7.5px] text-zinc-500 uppercase mb-1.5 font-mono">
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full border border-zinc-800 flex items-center justify-center text-[5px] font-black">02</span>
                      <span>FABRICATION</span>
                    </div>
                    <span className="text-yellow-500 font-bold">REFINEMENT</span>
                  </div>
                  <div className="text-zinc-200 text-[10.5px] uppercase tracking-wider font-extrabold font-mono border-b border-zinc-900 pb-1.5 mb-2.5">
                    {commodityTheme.m2}
                  </div>
                </div>
                
                <div className="mb-4">
                   <div className="flex justify-between items-center text-[6px] font-mono text-zinc-650 uppercase mb-1">
                      <span>Throughput</span>
                      <span className="text-yellow-500">82% Cap</span>
                   </div>
                   <div className="h-0.5 bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500/40 w-[82%]" />
                   </div>
                </div>
                
                <div>
                  <div className="text-[7.5px] text-zinc-655 uppercase font-mono mb-1.5">Processing Networks</div>
                  <div className="flex flex-wrap gap-1.5">
                    {commodityTheme.companies.m2.map(sym => {
                      return (
                        <div key={`com-m2-${sym}`} className="flex items-center gap-1.5 px-1.5 py-1 bg-black border border-zinc-900 hover:border-zinc-700 transition-colors">
                          <div className="w-5 h-5 bg-zinc-900 flex items-center justify-center font-black text-[7px] text-emerald-500/60 overflow-hidden shrink-0 border border-zinc-800">
                            {sym.slice(0, 2)}
                          </div>
                          <span className="text-[8px] text-zinc-350 font-mono font-bold">{sym}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* STAGE 3 */}
              <div className="border border-zinc-900/80 bg-zinc-950/40 p-3 h-full flex flex-col justify-between group/stage hover:border-zinc-700 transition-all relative">
                <div className="absolute top-0 right-0 w-8 h-8 bg-emerald-500/5 rotate-45 translate-x-4 -translate-y-4 border border-emerald-500/10 pointer-events-none" />
                <div>
                  <div className="flex items-center justify-between text-[7.5px] text-zinc-500 uppercase mb-1.5 font-mono">
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full border border-zinc-800 flex items-center justify-center text-[5px] font-black">03</span>
                      <span>INTEGRATION</span>
                    </div>
                    <span className="text-emerald-400 font-bold">SUB-ASSEMBLY</span>
                  </div>
                  <div className="text-zinc-200 text-[10.5px] uppercase tracking-wider font-extrabold font-mono border-b border-zinc-900 pb-1.5 mb-2.5">
                    {commodityTheme.m3}
                  </div>
                </div>
                
                <div className="mb-4">
                   <div className="flex justify-between items-center text-[6px] font-mono text-zinc-650 uppercase mb-1">
                      <span>Reliability</span>
                      <span className="text-emerald-500">95%</span>
                   </div>
                   <div className="h-0.5 bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500/40 w-[95%]" />
                   </div>
                </div>
                
                <div>
                  <div className="text-[7.5px] text-zinc-650 uppercase font-mono mb-1.5">Assembly Handshakes</div>
                  <div className="flex flex-wrap gap-1.5">
                    {commodityTheme.companies.m3.map(sym => {
                      return (
                        <div key={`com-m3-${sym}`} className="flex items-center gap-1.5 px-1.5 py-1 bg-black border border-zinc-900 hover:border-zinc-700 transition-colors">
                          <div className="w-5 h-5 bg-zinc-900 flex items-center justify-center font-black text-[7px] text-emerald-500/60 overflow-hidden shrink-0 border border-zinc-800">
                            {sym.slice(0, 2)}
                          </div>
                          <span className="text-[8px] text-zinc-350 font-mono font-bold">{sym}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* STAGE 4 */}
              <div className="border border-zinc-900/80 bg-zinc-950/40 p-3 h-full flex flex-col justify-between group/stage hover:border-zinc-700 transition-all relative">
                <div className="absolute top-0 right-0 w-8 h-8 bg-green-500/5 rotate-45 translate-x-4 -translate-y-4 border border-green-500/10 pointer-events-none" />
                <div>
                  <div className="flex items-center justify-between text-[7.5px] text-zinc-500 uppercase mb-1.5 font-mono">
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full border border-zinc-800 flex items-center justify-center text-[5px] font-black">04</span>
                      <span>CONSUMPTION</span>
                    </div>
                    <span className="text-green-400 font-bold">FINAL DEPLOYMENT</span>
                  </div>
                  <div className="text-zinc-200 text-[10.5px] uppercase tracking-wider font-extrabold font-mono border-b border-zinc-900 pb-1.5 mb-2.5">
                    {commodityTheme.m4}
                  </div>
                </div>
                
                <div className="mb-4">
                   <div className="flex justify-between items-center text-[6px] font-mono text-zinc-650 uppercase mb-1">
                      <span>Market Demand</span>
                      <span className="text-green-400">High</span>
                   </div>
                   <div className="h-0.5 bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500/40 w-[91%]" />
                   </div>
                </div>
                
                <div>
                  <div className="text-[7.5px] text-zinc-655 uppercase font-mono mb-1.5">Downstream Markets</div>
                  <div className="flex flex-wrap gap-1.5">
                    {commodityTheme.companies.m4.map(sym => {
                      return (
                        <div key={`com-m4-${sym}`} className="flex items-center gap-1.5 px-1.5 py-1 bg-black border border-zinc-900 hover:border-zinc-700 transition-colors">
                          <div className="w-5 h-5 bg-zinc-900 flex items-center justify-center font-black text-[7px] text-emerald-500/60 overflow-hidden shrink-0 border border-zinc-800">
                            {sym.slice(0, 2)}
                          </div>
                          <span className="text-[8px] text-zinc-350 font-mono font-bold">{sym}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
};

// Subcomponent for generic nodes with text symbols
const SupplyChainNode = ({ data, type, highlight = false, onClick }: { data: Company, type: 'supplier' | 'customer', highlight?: boolean, onClick: () => void }) => {
  const baseColor = type === 'supplier' ? 'yellow' : 'green';
  const colorClass = type === 'supplier' ? 'text-yellow-500 border-yellow-500/20 hover:border-yellow-500/60' : 'text-green-500 border-green-500/20 hover:border-green-500/60';

  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-2.5 flex items-start gap-2.5 border transition-all cursor-pointer group shadow-sm bg-black/60 hover:bg-zinc-900 relative",
        colorClass,
        highlight ? "opacity-100 border-zinc-700 font-bold" : "opacity-75 border-zinc-900"
      )}
    >
      <div className={cn(
        "w-8 h-8 shrink-0 flex items-center justify-center font-black text-[9px] border overflow-hidden font-mono",
        highlight 
          ? (type === 'supplier' ? 'bg-yellow-950/50 border-yellow-700/60 text-yellow-400' : 'bg-green-950/50 border-green-700/60 text-green-400') 
          : 'bg-zinc-900 border-zinc-800 text-zinc-500 group-hover:text-zinc-400'
      )}>
        <span>{data.symbol.slice(0, 2)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold tracking-tight truncate text-zinc-300 group-hover:text-white transition-colors">{data.name}</div>
        <div className="flex items-center gap-1.5 text-[7px] font-mono text-zinc-500 uppercase">
          <span className="font-bold text-zinc-450">{data.symbol}</span>
          <span>•</span>
          <span className="truncate">{data.sector}</span>
        </div>
      </div>
    </div>
  );
};
