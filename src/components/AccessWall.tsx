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
          className="absolute inset-0 z-[10000] flex items-center justify-center h-full w-full bg-black font-sans overflow-hidden"
        >
      {/* Background: Globe Showcase */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-70 saturate-150">
          {webglSupported ? (
            <OrbitalMap autoRotate={true} is3D={true} entities={COMPANIES} />
          ) : (
            <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center p-8">
              <span className="text-zinc-500 font-mono text-sm animate-pulse">⊕</span>
              <div className="text-emerald-500/40 font-mono text-[8px] tracking-[0.3em] uppercase text-center mt-4">
                TACTICAL NETWORK OFFLINE IN STANDALONE MODE
              </div>
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.85)_100%)] z-10" />
        <div className="absolute inset-0 bg-black/40 z-10" />
      </div>

      {/* Centered Authorization Terminal */}
      <div className="relative z-20 w-full max-w-md p-6 sm:p-10 mx-4">
        <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-2xl border border-zinc-800/80 rounded-xl shadow-2xl shadow-emerald-950/20" />
        
        {/* Hardware Corner Accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-emerald-500/50 rounded-tl-xl m-[1px]" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-emerald-500/50 rounded-tr-xl m-[1px]" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-emerald-500/50 rounded-bl-xl m-[1px]" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-emerald-500/50 rounded-br-xl m-[1px]" />

        <div className="relative flex flex-col items-center z-10">
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-white uppercase text-center leading-[1.1] mb-2">
            Bigger Data,<br/>For a Smaller World
          </h1>
          <div className="text-[9px] text-emerald-500 font-bold tracking-[0.3em] mt-3 uppercase text-center flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 animate-pulse rounded-full" />
            SECURE ACCESS PORTAL
          </div>
          <div className="text-[8.5px] text-zinc-400 font-sans tracking-[0.1em] mt-3 uppercase text-center leading-relaxed px-2 max-w-[280px]">
            No Noise News Agent. Company Vectors for finding Upstream/Downstream Bottlenecks
          </div>
          
          <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent my-6" />
          
          <form className="w-full space-y-4" onSubmit={verifyAccessCode}>
            <div className="relative">
              <input 
                type="password" 
                value={accessCode} 
                onChange={(e) => setAccessCode(e.target.value)} 
                placeholder="Enter Access Code" 
                className="w-full bg-black/80 border border-zinc-800 px-4 py-3.5 text-center text-emerald-400 tracking-[0.2em] focus:outline-none focus:border-emerald-500/50 text-xs font-mono rounded-lg transition-all placeholder:text-zinc-700 placeholder:tracking-widest"
              />
            </div>

            <div className="flex flex-col gap-3">
              <button 
                type="submit"
                className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[10px] uppercase tracking-[0.25em] transition-all border border-zinc-800 hover:border-zinc-700 font-bold rounded-lg"
              >
                Sign In
              </button>
              
              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-zinc-800/80"></div>
                <span className="flex-shrink mx-4 text-zinc-600/80 text-[8px] tracking-[0.25em]">OR</span>
                <div className="flex-grow border-t border-zinc-800/80"></div>
              </div>

              <button 
                type="button"
                onClick={() => {
                  localStorage.setItem('terminal_auth_token', 'free_trial_token');
                  setIsUnlocked(true);
                }}
                className="w-full py-3.5 bg-emerald-600/90 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-[0.3em] transition-all border border-emerald-400/30 rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.15)] relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative">Enter Terminal</span>
              </button>
              
              <div className="text-center text-[8.5px] text-emerald-400/90 font-mono tracking-[0.25em] uppercase mt-1 animate-pulse">
                — FREE UNTIL OCTOBER 15 —
              </div>

              <div className="mt-2 p-3 bg-black/40 border border-zinc-900 rounded-lg text-center">
                <div className="text-[8px] text-zinc-500 tracking-widest uppercase leading-relaxed mb-2">
                  Maintain the system <span className="text-emerald-500">Free of charge</span>
                </div>
                <a 
                  href="https://cash.app/$omiahj" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[9.5px] text-emerald-400 font-bold tracking-widest uppercase border-b border-emerald-500/30 pb-0.5 cursor-pointer hover:text-emerald-300 transition-colors inline-block"
                >
                  CashApp: $omiahj
                </a>
              </div>
            </div>
          </form>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full text-[9px] text-red-500 font-bold tracking-widest text-center uppercase font-mono bg-red-950/20 border border-red-500/20 py-2.5 rounded-lg mt-4 animate-pulse"
            >
              ⚠ ACCESS_DENIED :: INVALID TERMINAL KEY
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
    )}
    </AnimatePresence>
  );
};
