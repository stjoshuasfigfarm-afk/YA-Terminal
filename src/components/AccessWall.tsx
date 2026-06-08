import React, { useState, useEffect } from 'react';
import { OrbitalMap } from './OrbitalMap';
import { COMPANIES } from '../data/companies';
import { isWebGLSupported } from '../utils/webgl';
import { motion, AnimatePresence } from 'motion/react';
import { getApiBaseUrl } from '../lib/utils';

export const AccessWall: React.FC = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState(false);
  const [webglSupported, setWebglSupported] = useState(() => isWebGLSupported());



  useEffect(() => {
    const verifyToken = async (token: string) => {
        try {
            const baseUrl = getApiBaseUrl();
            console.log("baseUrl:", baseUrl);
            const response = await fetch(`${baseUrl}/api/verify/verify-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            console.log("Response status:", response.status);
            const data = await response.json();
            if (data.authorized) {
                setIsUnlocked(true);
            } else {
                localStorage.removeItem('terminal_auth_token');
            }
        } catch (err) {
            console.error("Token verification failed", err);
        }
    };
    
    const token = localStorage.getItem('terminal_auth_token');
    if (token) {
        verifyToken(token);
    }
  }, []);

  const verifyAccessCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: accessCode })
        });
        const data = await response.json();
        
        if (data.authorized) {
            localStorage.setItem('terminal_auth_token', data.token);
            setIsUnlocked(true);
        } else {
            setError(true);
            setAccessCode('');
        }
    } catch (err) {
        setError(true);
        setAccessCode('');
    }
  };

  return (
    <AnimatePresence>
      {!isUnlocked && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed inset-0 z-[10000] grid grid-cols-1 md:grid-cols-2 h-screen w-screen bg-black font-sans"
        >
      {/* Left Panel: Globe Showcase (Simulated Recording Style) */}
      <div className="hidden md:block w-full h-full relative border-r border-zinc-900 bg-zinc-900/10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 z-0 opacity-100 origin-center">
          {webglSupported ? (
            <OrbitalMap autoRotate={true} is3D={true} entities={COMPANIES} />
          ) : (
            <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center p-8">
              <div className="w-10 h-10 border border-zinc-800 rounded-full flex items-center justify-center mb-4">
                <span className="text-zinc-500 font-mono text-sm animate-pulse">⊕</span>
              </div>
              <div className="text-emerald-500/40 font-mono text-[8px] tracking-[0.3em] uppercase text-center max-w-xs leading-relaxed">
                TACTICAL NETWORK OFFLINE IN STANDALONE MODE
              </div>
              <div className="mt-2 text-zinc-600 font-mono text-[7px] tracking-wider text-center max-w-[220px] leading-relaxed">
                WebGL context is unavailable or disabled in this browser runtime. The Yield Terminal is optimized to default to a 2D interface.
              </div>
            </div>
          )}
        </div>
        
        {/* Subtle scanline overlay to simulate a screen/recording */}
        <div className="absolute inset-0 z-10 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%]" />
        
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/40 z-10" />
        
        <div className="absolute bottom-8 left-8 z-20">
            <div className="text-[10px] text-emerald-500 font-black tracking-[0.3em] uppercase opacity-70">
                GLOBAL_YIELD_MAP
            </div>
            <div className="text-[12px] text-zinc-400 font-sans tracking-[0.2em] font-light mt-1">
                Global Data and news your way
            </div>
            <div className="flex gap-1 mt-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 bg-emerald-500/30 rounded-full" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
            </div>
        </div>
      </div>

      {/* Right Panel: Login & Pricing */}
      <div className="flex items-center justify-center p-8 bg-zinc-950 relative overflow-hidden">
        {/* Decorative Grid Right */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full" />

        <div className="w-full max-w-sm space-y-8 z-10 relative">
          <div className="flex flex-col items-center mb-6 relative group">
            <h2 className="text-2xl font-black tracking-[0.4em] text-white uppercase text-glow">Yield Analysis Terminal</h2>
            <div className="text-[9px] text-emerald-400 font-mono tracking-[0.15em] mt-3 uppercase text-center font-bold">
              SYSTEM CAPABILITIES:
            </div>
            
            <div className="w-full grid grid-cols-1 gap-2 mt-4 text-[9px] text-zinc-400 font-mono tracking-wider max-w-xs mx-auto">
              <div className="flex items-start gap-2 bg-black/40 border border-zinc-900 p-2 rounded-sm text-left">
                <span className="text-emerald-500 mt-0.5">◆</span>
                <div>
                  <span className="text-zinc-200 font-bold uppercase block text-[8px] tracking-widest mb-0.5">GEOSPATIAL INTEL</span>
                  Real-time 3D vector-route tracking & logistics pipeline analysis.
                </div>
              </div>
              <div className="flex items-start gap-2 bg-black/40 border border-zinc-900 p-2 rounded-sm text-left">
                <span className="text-emerald-500 mt-0.5">◆</span>
                <div>
                  <span className="text-zinc-200 font-bold uppercase block text-[8px] tracking-widest mb-0.5">YIELD CURVES & STRESSORS</span>
                  Simulated global blockades, macroeconomic shock factors, and sovereign interest bonds.
                </div>
              </div>
              <div className="flex items-start gap-2 bg-black/40 border border-zinc-900 p-2 rounded-sm text-left">
                <span className="text-emerald-500 mt-0.5">◆</span>
                <div>
                  <span className="text-zinc-200 font-bold uppercase block text-[8px] tracking-widest mb-0.5">NEURAL AGENT BRIEFINGS</span>
                  Interactive partner node summaries with voiceovers driven by Gemini & dual TTS.
                </div>
              </div>
            </div>
            <div className="h-[1px] w-12 bg-emerald-500/50 mt-6" />
            <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          
          <p className="text-[10px] text-zinc-500 font-sans tracking-widest text-center uppercase leading-loose">
            Accessing neural market topology and real-time geospatial data requires elevated authorization.
          </p>
          
           <form className="space-y-4" onSubmit={verifyAccessCode}>
            <input 
              type="password" 
              value={accessCode} 
              onChange={(e) => setAccessCode(e.target.value)} 
              placeholder="Enter Access Key" 
              className="w-full bg-zinc-950 border border-zinc-800 p-3 text-center text-emerald-500 tracking-widest focus:outline-none focus:border-emerald-500 text-xs text-center font-sans focus:ring-1 focus:ring-emerald-500/20"
            />
            <div className="grid grid-cols-1 gap-2.5">
              <button 
                type="submit"
                className="w-full py-3 bg-zinc-900/60 hover:bg-zinc-800 hover:border-emerald-500/30 text-emerald-400 text-xs uppercase tracking-widest transition-all border border-zinc-800/80 font-bold font-mono active:scale-[0.98]"
              >
                [ Verify Key ]
              </button>
              
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-zinc-900"></div>
                <span className="flex-shrink mx-4 text-zinc-600 text-[8px] tracking-[0.2em] font-mono">OR</span>
                <div className="flex-grow border-t border-zinc-900"></div>
              </div>

              <button 
                type="button"
                onClick={() => {
                  localStorage.setItem('terminal_auth_token', 'free_trial_token');
                  setIsUnlocked(true);
                }}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 hover:shadow-[0_0_35px_rgba(16,185,129,0.3)] text-white text-xs uppercase tracking-[0.3em] transition-all border border-emerald-400/50 rounded-sm font-black active:scale-[0.99]"
              >
                ACCESS TERMINAL OPERATIONAL_DESK
              </button>
              
              <div className="text-center text-[8.5px] text-emerald-400/90 font-mono tracking-[0.25em] uppercase mt-1.5 animate-pulse">
                — FREE ACCESS ACTIVE —
              </div>
              <div className="mt-4 p-4 border border-zinc-900 bg-black/50 rounded-sm">
                <div className="text-[9px] text-zinc-500 text-center tracking-widest uppercase leading-relaxed font-mono">
                  Donations support operational data server maintenance <span className="text-emerald-500">100% Free Tier</span>
                </div>
                <div className="text-center mt-2">
                  <a 
                    href="https://cash.app/$omiahj" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase border-b border-emerald-500/30 pb-0.5 cursor-pointer hover:text-emerald-300 transition-colors inline-block font-mono"
                  >
                    CashApp: $omiahj
                  </a>
                </div>
              </div>
            </div>
          </form>
          
          {error && (
            <div className="p-3 border border-red-900/40 bg-red-950/10 rounded-sm text-red-500 text-[9px] uppercase font-mono tracking-widest text-center animate-pulse">
              ⚠️ AUTH_ERR: DENIED - INVALID HEX KEYWAY
            </div>
          )}
        </div>
      </div>
    </motion.div>
    )}
    </AnimatePresence>
  );
};
