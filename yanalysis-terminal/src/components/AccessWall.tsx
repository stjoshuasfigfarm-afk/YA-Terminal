import React, { useState, useEffect } from 'react';
import { Globe } from './Globe';
import { COMPANIES } from '../data/companies';
import { motion, AnimatePresence } from 'motion/react';
import { getApiBaseUrl } from '../lib/utils';

export const AccessWall: React.FC = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState(false);

  // Default props for a "living" globe on the login page
  const globeProps = {
    selectedStock: null,
    onSelectNode: () => {},
    viewportLock: false,
    setViewportLock: () => {},
    autoRotateEnabled: true,
    setAutoRotateEnabled: () => {},
    marketData: {},
    newsData: [],
    showAllConnections: true,
    presentationMode: true
  };

  useEffect(() => {
    const verifyToken = async (token: string) => {
        try {
            const baseUrl = getApiBaseUrl();
            const response = await fetch(`${baseUrl}/api/verify/verify-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
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
          <Globe {...globeProps} />
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
          <div className="flex flex-col items-center mb-12 relative group">
            <h2 className="text-2xl font-black tracking-[0.4em] text-white uppercase text-glow">Yield Analysis Terminal</h2>
            <div className="text-[10px] text-emerald-500 font-black tracking-[0.2em] mt-2 uppercase text-glow opacity-80">The terminal you were looking for</div>
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
              placeholder="Enter Access Code" 
              className="w-full bg-zinc-950 border border-zinc-800 p-3 text-center text-emerald-500 tracking-widest focus:outline-none focus:border-emerald-500 text-xs text-center font-sans"
            />
            <div className="grid grid-cols-1 gap-2.5">
              <button 
                type="submit"
                className="w-full py-3 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 text-xs uppercase tracking-widest transition-all border border-zinc-800 font-bold"
              >
                Sign In
              </button>
              
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-zinc-900"></div>
                <span className="flex-shrink mx-4 text-zinc-600 text-[8px] tracking-[0.2em]">OR</span>
                <div className="flex-grow border-t border-zinc-900"></div>
              </div>

              <button 
                type="button"
                onClick={() => {
                  localStorage.setItem('terminal_auth_token', 'free_trial_token');
                  setIsUnlocked(true);
                }}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs uppercase tracking-[0.3em] transition-all border border-emerald-400/50 rounded-sm font-black shadow-[0_0_30px_rgba(16,185,129,0.2)]"
              >
                ENTER TERMINAL
              </button>
              <div className="mt-4 p-4 border border-zinc-900 bg-black/50 rounded-sm">
                <div className="text-[9px] text-zinc-500 text-center tracking-widest uppercase leading-relaxed">
                  Donations help us continue to bring you this product <span className="text-emerald-500">Completely Free</span>
                </div>
                <div className="text-center mt-2">
                  <a 
                    href="https://cash.app/$omiahj" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase border-b border-emerald-500/30 pb-0.5 cursor-pointer hover:text-emerald-300 transition-colors inline-block"
                  >
                    CashApp: $omiahj
                  </a>
                </div>
              </div>
            </div>
          </form>
          
          {error && <div className="text-xs text-red-500 font-bold tracking-widest">Invalid Access Code</div>}
        </div>
      </div>
    </motion.div>
    )}
    </AnimatePresence>
  );
};
