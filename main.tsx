@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
  
  --color-terminal-bg: #0A0A0B;
  --color-terminal-panel: #0F0F11;
  --color-terminal-border: #2A2A2A;
  --color-terminal-accent: #00FF41;
  --color-terminal-muted: #666666;
  --color-terminal-header: #121214;
}

@layer base {
  html, body {
    height: 100%;
    margin: 0;
    padding: 0;
  }
  body {
    @apply bg-terminal-bg text-[#E0E0E0] font-mono selection:bg-terminal-accent/30 overflow-hidden h-full w-full;
  }
}

@layer components {
  .terminal-grid {
    @apply grid h-screen w-screen overflow-hidden bg-[#050505];
    grid-template-rows: 42px 1fr 20px;
    grid-template-columns: 240px 1fr 340px;
  }

  .target-crosshair {
    @apply pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center;
  }

  .target-line-v {
    @apply absolute w-px h-full bg-terminal-accent/40;
  }

  .target-line-h {
    @apply absolute h-px w-full bg-terminal-accent/40;
  }

  .target-square {
    @apply absolute border-2 border-terminal-accent w-[200px] h-[200px] animate-[target-shrink_1.5s_ease-out_forwards];
  }

  @keyframes target-shrink {
    0% {
      width: 400px;
      height: 400px;
      opacity: 0;
      transform: scale(1.5);
    }
    20% {
      opacity: 1;
    }
    100% {
      width: 24px;
      height: 24px;
      opacity: 1;
      transform: scale(1);
    }
  }

  .terminal-panel {
    @apply bg-terminal-panel border-terminal-border flex flex-col;
  }

  .panel-header {
    @apply h-8 border-b border-terminal-border px-3 flex items-center justify-between;
  }

  .panel-title {
    @apply text-[10px] font-mono uppercase tracking-widest text-terminal-muted;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    @apply bg-transparent;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    @apply bg-terminal-border rounded-full hover:bg-terminal-muted transition-colors;
  }

  .animate-marquee {
    animation: marquee 30s linear infinite;
  }

  .animate-scanline {
    animation: scanline 4s linear infinite;
  }

  @keyframes scanline {
    from { transform: translateY(-100%); }
    to { transform: translateY(100%); }
  }

  @keyframes marquee {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }

  /* Custom Popup Styling */
  .terminal-popup .leaflet-popup-content-wrapper {
    @apply bg-transparent! p-0! rounded-none! shadow-none!;
  }

  .terminal-popup .leaflet-popup-content {
    @apply m-0!;
  }

  .terminal-popup .leaflet-popup-tip-container {
    @apply hidden!;
  }

  .terminal-popup .leaflet-popup-close-button {
    @apply hidden!;
  }
}

/* Leaflet dark theme tweaks */
.leaflet-container {
  @apply h-full w-full bg-terminal-bg!;
}

.leaflet-tile-pane {
  filter: grayscale(100%) invert(100%) contrast(90%);
}

.leaflet-control-attribution {
  @apply hidden;
}
