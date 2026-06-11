import React, { useState } from 'react';
import { cn, getApiBaseUrl } from '../lib/utils';
import { useCompanies } from '../context/CompaniesContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapLayers: { hq: boolean; arcs: boolean; satellite: boolean; borders: boolean };
  toggleMapLayer: (layer: string) => void;
  viewportLock: boolean;
  setViewportLock: (val: boolean) => void;
  autoRotateEnabled: boolean;
  setAutoRotateEnabled: (val: boolean) => void;
  logs?: string[];
  terminalScale: number;
  setTerminalScale: (val: number) => void;
}

const DEFAULT_MODELS = [
  'openai/gpt-4o-mini',
  'google/gemini-1.5-flash',
  'google/gemini-3.1-pro-preview',
  'meta-llama/llama-3.3-70b-instruct',
  'qwen/qwen-2.5-72b-instruct',
  'deepseek/deepseek-chat'
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  mapLayers, 
  toggleMapLayer,
  viewportLock,
  setViewportLock,
  autoRotateEnabled,
  setAutoRotateEnabled,
  logs = [],
  terminalScale,
  setTerminalScale
}) => {
  const { companies, tickerLimit, setTickerLimit, totalAvailable } = useCompanies();

  const [orKey, setOrKey] = useState(() => localStorage.getItem('openrouter_api_key') || '');
  const [orModel, setOrModel] = useState(() => {
    const saved = localStorage.getItem('openrouter_model') || 'openai/gpt-4o-mini';
    return DEFAULT_MODELS.includes(saved) ? saved : 'custom';
  });
  const [customModel, setCustomModel] = useState(() => {
    const saved = localStorage.getItem('openrouter_model') || 'openai/gpt-4o-mini';
    return DEFAULT_MODELS.includes(saved) ? '' : saved;
  });

  const [pingStatus, setPingStatus] = useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [pingMsg, setPingMsg] = useState('');

  if (!isOpen) return null;

  const updateKey = (key: string) => {
    setOrKey(key);
    // Remove whitespaces to avoid typos inside copy paste keys
    const trimmedKey = key.trim();
    if (trimmedKey) {
      localStorage.setItem('openrouter_api_key', trimmedKey);
    } else {
      localStorage.removeItem('openrouter_api_key');
    }
  };

  const updateModel = (model: string) => {
    setOrModel(model);
    if (model !== 'custom') {
      localStorage.setItem('openrouter_model', model);
    } else if (customModel) {
      localStorage.setItem('openrouter_model', customModel.trim());
    }
  };

  const updateCustomModel = (model: string) => {
    setCustomModel(model);
    localStorage.setItem('openrouter_model', model.trim());
  };

  const handlePing = async () => {
    setPingStatus('TESTING');
    setPingMsg('');
    const modelToUse = orModel === 'custom' ? customModel.trim() : orModel;
    const baseUrl = getApiBaseUrl();
    try {
      const response = await fetch(`${baseUrl}/api/ai/ping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OpenRouter-API-Key': orKey.trim(),
          'X-OpenRouter-Model': modelToUse
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setPingStatus('SUCCESS');
        setPingMsg(data.message || 'Uplink active!');
      } else {
        setPingStatus('ERROR');
        setPingMsg(data.error || 'Connection rejected.');
      }
    } catch (err: any) {
      setPingStatus('ERROR');
      setPingMsg(err.message || 'Transmission failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto font-sans">
      <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 shadow-2xl relative my-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
          <h2 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">System Configuration</h2>
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors text-[10px]"
          >
            [ Close ]
          </button>
        </div>
        
        <div className="p-5 space-y-6 max-h-[80vh] overflow-y-auto font-sans">
          {/* General Settings */}
          <div className="space-y-4">
            <h3 className="text-[8px] font-bold text-zinc-650 uppercase tracking-[0.2em]">System Status</h3>
            <div className="flex justify-between items-center group">
              <span className="text-zinc-500 uppercase text-[9px] tracking-wider group-hover:text-zinc-400">Price Update Rate</span>
              <div className="text-emerald-500/70 text-[10px] font-bold">30s</div>
            </div>
            <div className="flex justify-between items-center group">
              <span className="text-zinc-500 uppercase text-[9px] tracking-wider group-hover:text-zinc-400">Chart Refresh</span>
              <div className="text-emerald-500/70 text-[10px] font-bold">1m</div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 uppercase text-[9px] tracking-wider">Audio Output</span>
              <button className="text-zinc-400 border border-zinc-800 px-3 py-1 hover:border-emerald-500 hover:text-emerald-500 text-[9px] uppercase tracking-wider transition-all">Toggle</button>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 uppercase text-[9px] tracking-wider">Connection Protocol</span>
              <button className="text-emerald-500 border border-emerald-500 px-3 py-1 bg-emerald-950/10 text-[9px] uppercase tracking-wider transition-all">Live Stream</button>
            </div>
          </div>

          {/* AI Intelligence Uplink Settings */}
          <div className="border-t border-zinc-900 pt-5 space-y-4">
            <h3 className="text-[8px] font-bold text-emerald-500 uppercase tracking-[0.2em] flex items-center justify-between">
              <span>AI Intelligence Connection</span>
              {orKey.trim() ? (
                <span className="text-[7px] text-emerald-400 px-1 bg-emerald-950/40 border border-emerald-500/20">Configured</span>
              ) : (
                <span className="text-[7px] text-zinc-600 px-1 bg-zinc-950 border border-zinc-900">Standby</span>
              )}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-zinc-500 uppercase text-[8px] tracking-wider block mb-1">OpenRouter API Key</label>
                <input 
                  type="password"
                  value={orKey}
                  onChange={(e) => updateKey(e.target.value)}
                  placeholder="Paste sk-or-v1-... key"
                  className="w-full bg-black border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-350 focus:outline-none focus:border-emerald-500 rounded-sm font-sans tracking-wider"
                />
                <span className="text-[7px] text-zinc-600 mt-0.5 block leading-relaxed">
                  Keys are used securely server-side for AI analysis. Get one at <a href="https://openrouter.ai/workspaces/default/keys" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-500 underline">OpenRouter</a>.
                </span>
              </div>

              <div>
                <label className="text-zinc-500 uppercase text-[8px] tracking-wider block mb-1">Select Model</label>
                <select 
                  value={orModel}
                  onChange={(e) => updateModel(e.target.value)}
                  className="w-full bg-black border border-zinc-800 px-2 py-1.5 text-xs text-zinc-350 focus:outline-none focus:border-emerald-500 rounded-sm font-sans"
                >
                  <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                  <option value="google/gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="google/gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
                  <option value="meta-llama/llama-3.3-70b-instruct">Llama 3.3 70B</option>
                  <option value="qwen/qwen-2.5-72b-instruct">Qwen 2.5 72B</option>
                  <option value="deepseek/deepseek-chat">DeepSeek Chat</option>
                  <option value="custom">-- Custom Model ID --</option>
                </select>
              </div>

              {orModel === 'custom' && (
                <div>
                  <label className="text-zinc-500 uppercase text-[8px] tracking-wider block mb-1">Custom Model ID</label>
                  <input 
                    type="text"
                    value={customModel}
                    onChange={(e) => updateCustomModel(e.target.value)}
                    placeholder="e.g. mistralai/pixtral-large"
                    className="w-full bg-black border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-350 focus:outline-none focus:border-emerald-500 rounded-sm"
                  />
                </div>
              )}

              {/* Ping Uplink Action */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handlePing}
                  disabled={pingStatus === 'TESTING' || !orKey.trim()}
                  className={cn(
                    "w-full py-1.5 border font-bold text-[9px] uppercase tracking-wider rounded-sm transition-all flex items-center justify-center gap-1.5",
                    !orKey.trim() 
                      ? "text-zinc-650 border-zinc-900 bg-zinc-950/20 cursor-not-allowed"
                      : pingStatus === 'TESTING'
                        ? "text-zinc-400 border-zinc-800 bg-zinc-900"
                        : "text-emerald-500 border-emerald-500/40 bg-emerald-950/10 hover:bg-emerald-950/30 cursor-pointer"
                  )}
                >
                  {pingStatus === 'TESTING' ? 'Connecting...' : 'Test Connection'}
                </button>

                {pingMsg && (
                  <div className={cn(
                    "mt-2 px-2.5 py-1.5 border text-[8px] font-semibold leading-relaxed rounded-sm",
                    pingStatus === 'SUCCESS' 
                      ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400"
                      : "bg-red-950/20 border-red-500/30 text-red-400"
                  )}>
                    {pingMsg}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Map Settings */}
          <div className="border-t border-zinc-900 pt-5 space-y-4">
             <h3 className="text-[8px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-3">Map Layers</h3>
             {[
               { id: 'hq', label: 'Company HQ' },
               { id: 'arcs', label: 'Trade Arcs' },
               { id: 'satellite', label: 'Satellite (Globe)' },
               { id: 'borders', label: 'Land/Borders' }
             ].map((layer) => (
                <div key={layer.id} className="flex justify-between items-center">
                  <span className="text-zinc-400 text-[10px] uppercase tracking-wider">{layer.label}</span>
                  <button 
                    onClick={() => toggleMapLayer(layer.id)} 
                    className={cn(
                      "border px-3 py-1 text-[9px] uppercase tracking-wider transition-all min-w-[70px]", 
                      mapLayers[layer.id as keyof typeof mapLayers] 
                        ? "text-emerald-400 border-emerald-500/50 bg-emerald-950/20 cursor-pointer" 
                        : "text-zinc-600 border-zinc-900 hover:border-zinc-700 hover:text-zinc-400 cursor-pointer"
                    )}
                  >
                    {mapLayers[layer.id as keyof typeof mapLayers] ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
             ))}
          </div>

          {/* Ticker Range / Capacity Control */}
          <div className="border-t border-zinc-900 pt-5 space-y-4">
             <div className="flex justify-between items-center">
                <h3 className="text-[8px] font-bold text-emerald-500 uppercase tracking-[0.2em]">Ticker Capacity</h3>
                <span className="text-[7.5px] text-zinc-500 font-mono tracking-wider">{companies.length} / {totalAvailable} ACTIVE</span>
             </div>
             
             <div className="space-y-3">
               <div className="space-y-1.5">
                 <div className="flex justify-between text-[9px]">
                   <span className="text-zinc-400">LOAD LIMIT</span>
                   <span className="text-emerald-400 font-bold font-mono">
                     {tickerLimit <= 0 ? 'UNRESTRICTED' : `${tickerLimit} ASSETS`}
                   </span>
                 </div>
                 <input 
                   type="range"
                   min="10"
                   max={Math.max(500, totalAvailable)} 
                   step="10"
                   value={tickerLimit <= 0 ? Math.max(500, totalAvailable) : tickerLimit}
                   onChange={(e) => {
                     const val = parseInt(e.target.value, 10);
                     if (val >= Math.max(500, totalAvailable)) {
                       setTickerLimit(0); // 0 means All / Unrestricted
                     } else {
                       setTickerLimit(val);
                     }
                   }}
                   className="w-full accent-emerald-500 h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer"
                 />
               </div>

               {/* Preset shortcuts */}
               <div className="grid grid-cols-4 gap-1">
                 {[50, 150, 300, 0].map((preset) => (
                   <button
                     key={preset}
                     onClick={() => setTickerLimit(preset)}
                     className={cn(
                       "py-1 text-[8px] font-bold uppercase tracking-wider border rounded-sm transition-all cursor-pointer",
                       tickerLimit === preset
                         ? "text-emerald-400 border-emerald-500/50 bg-emerald-950/20 shadow-[0_0_5px_rgba(16,185,129,0.15)]"
                         : "text-zinc-500 border-zinc-900 hover:border-zinc-805 hover:text-zinc-400"
                     )}
                   >
                     {preset === 0 ? "ALL" : preset}
                   </button>
                 ))}
               </div>
               
               <p className="text-[7px] text-zinc-500 leading-normal font-sans">
                 Adjust display threshold to prevent performance drops when syncing high-volume asset repositories from remote workspace storage.
               </p>
             </div>
          </div>

          {/* Camera Settings */}
          <div className="border-t border-zinc-900 pt-5 space-y-4">
             <h3 className="text-[8px] font-bold text-emerald-500/80 uppercase tracking-[0.2em] mb-3">Camera Viewport</h3>
             
             <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-[10px] uppercase tracking-wider">Fixed Focus</span>
                <button 
                  onClick={() => setViewportLock(!viewportLock)} 
                  className={cn(
                    "border px-3 py-1 text-[9px] uppercase tracking-wider transition-all min-w-[70px]", 
                    viewportLock 
                      ? "text-emerald-400 border-emerald-500/50 bg-emerald-950/20 cursor-pointer" 
                      : "text-zinc-600 border-zinc-900 hover:border-zinc-700 hover:text-zinc-400 cursor-pointer"
                  )}
                >
                  {viewportLock ? 'LOCKED' : 'FREE'}
                </button>
             </div>

             <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-[10px] uppercase tracking-wider">Auto Rotate</span>
                <button 
                  onClick={() => setAutoRotateEnabled(!autoRotateEnabled)} 
                  className={cn(
                    "border px-3 py-1 text-[9px] uppercase tracking-wider transition-all min-w-[70px]", 
                    autoRotateEnabled 
                      ? "text-emerald-400 border-emerald-500/50 bg-emerald-950/20 cursor-pointer" 
                      : "text-zinc-600 border-zinc-900 hover:border-zinc-700 hover:text-zinc-400 cursor-pointer"
                  )}
                >
                  {autoRotateEnabled ? 'ENABLED' : 'DISABLED'}
                </button>
             </div>
          </div>

          {/* Terminal Layout Sizing */}
          <div className="border-t border-zinc-900 pt-5 space-y-4">
             <h3 className="text-[8px] font-bold text-emerald-500 uppercase tracking-[0.2em] mb-3">Terminal Layout Scale</h3>
             
             <div className="grid grid-cols-5 gap-1">
               {[0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2].map((scale) => (
                 <button
                   key={scale}
                   onClick={() => setTerminalScale(scale)}
                   className={cn(
                     "py-1 text-[8.5px] font-bold uppercase tracking-wider border rounded-sm transition-all cursor-pointer",
                     Math.abs(terminalScale - scale) < 0.01
                       ? "text-emerald-400 border-emerald-500/50 bg-emerald-950/20 shadow-[0_0_5px_rgba(16,185,129,0.15)]"
                       : "text-zinc-500 border-zinc-900 hover:border-zinc-805 hover:text-zinc-400"
                   )}
                 >
                   {Math.round(scale * 100)}%
                 </button>
               ))}
             </div>
             
             <p className="text-[7px] text-zinc-500 leading-normal font-sans">
               Adjust core dashboard viewport multiplier to fit smaller laptops or expansive high-density monitors.
             </p>
          </div>

          {/* Telemetry Logs Section */}
          <div className="border-t border-zinc-900 pt-5 space-y-3">
             <div className="flex justify-between items-center">
                <h3 className="text-[8px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Telemetry Logs</h3>
                <span className="text-[7px] text-zinc-700 font-mono">{logs.length} ENTRIES</span>
             </div>
             
             <div className="bg-black/40 border border-zinc-900 rounded-sm h-40 overflow-y-auto p-2 font-mono scrollbar-none">
                {logs.length > 0 ? (
                  <div className="space-y-1.5">
                    {logs.slice().reverse().map((log, i) => (
                      <div key={i} className="flex gap-2 text-[8px] leading-tight">
                        <span className="text-zinc-700 shrink-0 select-none">[{logs.length - i}]</span>
                        <span className="text-zinc-500 break-words tracking-tighter">{log}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-800 text-[8px] uppercase tracking-widest">
                    No active telemetry
                  </div>
                )}
             </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-4 py-2 border-t border-zinc-900 bg-zinc-900/50 text-[8px] text-zinc-600 flex justify-between font-sans">
          <button 
            onClick={() => {
              localStorage.removeItem('terminal_auth_token');
              window.location.reload();
            }}
            className="text-red-500 hover:text-red-400 uppercase tracking-wider cursor-pointer"
          >
            [ Reset Auth ]
          </button>
          <span>Version 4.8.2</span>
          <span>Status: Active</span>
        </div>
      </div>
    </div>
  );
};
