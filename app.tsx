<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Asset Intelligence - Orbital Dashboard</title>
    <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        
        :root {
            --terminal-accent: #00FF41;
            --terminal-border: #1a1a1a;
            --terminal-muted: #666;
        }

        body {
            background-color: #000;
            color: #fff;
            font-family: 'Inter', sans-serif;
            overflow: hidden;
            height: 100vh;
        }

        .font-mono { font-family: 'JetBrains Mono', monospace; }

        .terminal-panel {
            background: #000;
            border-color: var(--terminal-border);
        }

        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #222; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #333; }

        #map {
            width: 100%;
            height: 100%;
            background: #050505 !important;
        }

        .leaflet-container { background: #050505 !important; }
        .leaflet-tile-pane { filter: invert(100%) hue-rotate(180deg) brightness(0.6) contrast(1.2) opacity(0.3); }

        @keyframes scanline {
            from { transform: translateY(-100%); }
            to { transform: translateY(100%); }
        }
        .animate-scanline { animation: scanline 8s linear infinite; }

        .terminal-popup .leaflet-popup-content-wrapper {
            background: #000;
            color: #fff;
            border: 1px solid #1a1a1a;
            border-radius: 0;
            padding: 0;
        }
        .terminal-popup .leaflet-popup-tip { background: #1a1a1a; }
        .terminal-popup .leaflet-popup-content { margin: 0; }
    </style>
</head>
<body class="flex flex-col h-screen">
    <!-- Top Bar -->
    <header class="h-10 border-b border-zinc-800 flex items-center justify-between px-4 bg-black z-50">
        <div class="flex items-center gap-3">
            <div class="w-1.5 h-1.5 bg-terminal-accent rounded-full animate-pulse"></div>
            <h1 class="text-xs font-bold tracking-[0.3em] uppercase opacity-80">Orbital Data Ops</h1>
        </div>
        <div class="flex items-center gap-6">
            <div id="top-price-display" class="text-right hidden">
                <span id="price-ticker" class="font-mono text-xs font-bold text-terminal-accent">---</span>
                <span id="price-change" class="text-[8px] font-mono ml-2">---</span>
            </div>
            <div class="text-[8px] font-mono text-[#333] tracking-widest uppercase">
                System Time: <span id="clock">00:00:00</span>
            </div>
        </div>
    </header>

    <div class="flex flex-1 overflow-hidden">
        <!-- Sidebar Left (Assets) -->
        <aside class="w-56 border-r border-zinc-900 flex flex-col bg-black">
            <div class="px-3 py-1 border-b border-zinc-900/50 bg-zinc-950/50 flex justify-between items-center whitespace-nowrap">
                <span class="text-[6px] text-terminal-accent/50 font-mono tracking-widest">[SERVICE: MARKET_TICK_L1]</span>
            </div>
            <div class="p-3 border-b border-zinc-900 bg-zinc-950/50">
                <div class="text-[10px] text-zinc-600 uppercase tracking-[0.2em] mb-2 font-bold">Market Navigator</div>
                <input type="text" id="asset-search" placeholder="SEARCH NODE..." class="w-full bg-[#0A0A0A] border border-[#222] px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-terminal-accent transition-colors">
            </div>
            <div id="asset-list" class="flex-1 overflow-y-auto custom-scrollbar">
                <!-- Assets populated by JS -->
            </div>
        </aside>

        <!-- Main Content (Map) -->
        <main class="flex-1 relative flex flex-col bg-black">
            <div class="px-3 py-1 border-b border-zinc-900/50 bg-zinc-950/50 flex justify-between items-center z-20">
                <span class="text-[6px] text-terminal-accent/50 font-mono tracking-widest">[SERVICE: GEO_ORBITAL_V5]</span>
                <span class="text-[5px] text-[#444] font-mono uppercase">Sat_Link: Steady</span>
            </div>
            <div class="flex-1 relative">
                <div id="map"></div>
                <!-- UI Overlays -->
                <div class="absolute top-2 left-0 right-0 z-[400] px-3 pointer-events-none">
                    <div class="flex justify-between items-center border-b border-terminal-accent/10 pb-0.5">
                        <span class="text-[5px] text-terminal-accent/30 font-mono">[LAYER: ASSET_OVERLAY_P3]</span>
                        <span class="text-[5px] text-terminal-accent/20 font-mono">RENDER_QUAL: HIGH</span>
                    </div>
                </div>
                <div class="absolute inset-0 pointer-events-none border-x border-[#111] z-[401]"></div>
                <!-- Scanline -->
                <div class="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,255,65,0.03)_1px,transparent_1px)] bg-[size:100%_4px] animate-scanline z-[402] opacity-20"></div>
            </div>
        </main>

        <!-- Sidebar Right (Details) -->
        <aside id="sidebar-right" class="w-72 border-l border-zinc-900 flex flex-col bg-black">
            <div class="px-3 py-1 border-b border-zinc-900/50 bg-zinc-950 flex justify-between items-center">
                <span class="text-[6px] text-terminal-accent/60 font-mono tracking-widest">[SERVICE: ASSET_INTELLIGENCE_L3]</span>
            </div>
            <div id="no-selection" class="flex-1 flex items-center justify-center p-6 text-center">
                <div class="space-y-4">
                    <div class="w-12 h-12 border-2 border-dashed border-[#222] mx-auto flex items-center justify-center opacity-40">
                        <div class="w-6 h-6 bg-[#111] rounded-full"></div>
                    </div>
                    <p class="text-[10px] text-[#444] uppercase tracking-[0.2em] font-bold">Select target node for deep packet inspection</p>
                </div>
            </div>
            <div id="asset-details" class="flex-1 flex flex-col hidden overflow-hidden">
                <div class="p-4 border-b border-zinc-900 bg-zinc-950/80">
                   <h2 id="detail-name" class="text-lg font-bold tracking-tight text-white leading-none">---</h2>
                   <div class="flex items-center gap-2 mt-1">
                       <span id="detail-symbol" class="text-[10px] bg-terminal-accent/10 text-terminal-accent border border-terminal-accent/20 px-1 font-mono font-bold tracking-widest text-white">---</span>
                       <span id="detail-sector" class="text-[8px] text-[#555] uppercase tracking-widest">---</span>
                   </div>
                </div>
                <div class="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
                    <!-- Charts and Intel -->
                    <div>
                        <div class="text-[9px] text-[#444] uppercase tracking-widest font-bold mb-2">Fundamental Profile</div>
                        <div id="stats-grid" class="grid grid-cols-2 gap-2">
                            <!-- Stats by JS -->
                        </div>
                    </div>
                    <div>
                        <div class="text-[9px] text-[#444] uppercase tracking-widest font-bold mb-2">Supply Chain Intelligence</div>
                        <div id="supply-chain-intel" class="space-y-2">
                            <!-- Supply chain by JS -->
                        </div>
                    </div>
                    <div>
                        <div class="text-[9px] text-[#444] uppercase tracking-widest font-bold mb-2">Intraday Analytics</div>
                        <div id="chart-container" class="h-32 border border-zinc-900 bg-zinc-950/50">
                            <!-- Chart by JS -->
                        </div>
                    </div>
                    <div class="pt-2 border-t border-zinc-900">
                        <p id="detail-desc" class="text-[9px] leading-relaxed text-[#777] uppercase"></p>
                    </div>
                </div>
            </div>
        </aside>
    </div>

    <script src="/app.js"></script>
</body>
</html>
