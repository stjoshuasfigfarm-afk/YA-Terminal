# AGENTS.md

Welcome to the **Yield Terminal: Supply Intelligence** codebase. This file serves as the permanent system-level memory and architectural reference for Gemini and all Antigravity coding agents. Read this file first before making structural modifications or adding new features.

---

## 📸 1. Application Identity & Vision
**Yield Terminal: Supply Intelligence** is a premium, tactical, and highly atmospheric command-and-control dashboard designed for global supply chain resilience, corporate node tracking, and macroeconomic security.

- **Theme & Aesthetic**: Low-light, high-contrast tactical telemetry dashboard. It utilizes deep blacks/charcoals (`#050505`), futuristic glowing greens (`emerald-400 / emerald-500`), cyber cyans (`cyan-400`), and warm risk warning colors (`orange-500 / yellow-500`).
- **Typography Matrix**: Inter for generic UI controls and system-wide legibility; JetBrains Mono for data tables, ticker telemetry, clock updates, and terminal feeds.
- **Architectural Honesty**: It focuses on high-precision layout, smooth motion transitions, tactical sound designs (beep/chime/warning), and real strategic information. Fake placeholder "larping" stats are replaced with real intelligence briefings powered by Gemini.

---

## 🏗️ 2. Architectural Structure
The application is a full-stack SPA powered by **Vite/React** on the frontend and an **Express** server on the backend with a bundled, self-contained deployment format.

### Key Directories & Files
- `/server.ts` & `/server/routes/`: Backend API routers covering real-time news retrieval, Gemini-powered strategic briefings, market sentiment analysis, and enhanced Text-to-Speech (TTS) voice generation.
- `/src/App.tsx`: The primary state hub of the client application, integrating telemetry hearts, the interactive globe controllers, sidebars, and system-wide state sync.
- `/src/components/OrbitalMap.tsx` & `/src/components/MapLayer.tsx`: The geospatial vector node core, loading a custom 3D projection globe powered by MapLibre GL.
- `/src/components/IntelligenceSidebar.tsx`: Handles tactical agency AI chat queries, node-specific intelligence briefings, sentiment analysis displays, and live sound/speech controllers.
- `/src/components/DataSidebar.tsx` & `/src/components/Header.tsx`: Houses the live corporate node register, macroeconomic stress toggles (e.g., Taiwan Strait blockade, Suez Canal closure), and unified global yield curves.

---

## 🔒 3. System Constraints & Guidelines

### A. 3D Globe Geospatial Controls (Strict Spatial Locks)
The Globe component in `src/components/OrbitalMap.tsx` incorporates permanent physical camera constraints to ensure stability and eliminate geometric inversions/flips in 3D space:
1. **Lock True North (Bearing Key)**: Zero-bearing orientation is strictly locked (`bearing: 0`). Manual bearing rotation is disabled or countered to ensure the North Pole always points directly to the top of the viewport.
2. **Latitude Clamping Bounds**: Map coordinate adjustments and manual pan movements are strictly clamped to a maximum/minimum latitude of `[-82, 82]`. This prevents the camera path from crossing straight over the poles, which induces visual axis flipping.
3. **Restrict Maximum Tilt (Pitch)**: Maximum pitch is capped at `82` degrees (and slider limited to `80` degrees). Capping below 90 degrees avoids rendering artifacts and ground-plane inversions.
4. **Panning & Tilt Freedom**: Standard click-and-drag panning across the world and manual tilt/pitch mechanics (using the slider controls or right-click vertical drag) must remain perfectly fluid within these bounds.

### B. Network Connection Render Architecture
To prevent cluttered visualizations and map performance degradation, network connection paths (connecting suppliers, customers, and trade lanes on the globe) conform to this directive:
- **Rule of Exclusive Activation**: Global networks and node lines must *only* render when the user explicitly enables them via the designated **Global Network** button control (`showGlobalNetwork` flag in state).
- **Line Renderer Guidelines**: Avoid displaying hover-state links or temporary overlay paths on general click behaviors unless this global network context is explicitly armed.

### C. Autopilot (Neural Autocycle)
The terminal has a built-in Autopilot system that mimics a real-time cybersecurity or freight intelligence analyst cycling through active alerts:
- **Cinematic Zoom Flow**: The cycle is split into transition phases. Upon selection, the globe zooms out broad for a wide perspective (cinematic fade), increments the active news index, and then centers on the next partner node, zooming back in to load an AI strategic briefing.
- **State Preservation & Anti-Infinite Loops**: The autocycle effects must be protected via refs (`marketDataRef`, `handleSelectNodeRef`) and limited dependency arrays. Do not hook full objects into the timer dependencies to prevent infinite state re-triggers or duplicate background fetch runs.

### D. Audio & Speech Synthesis
- **Dual TTS Pipeline**: Employs an advanced web-service pipeline targeting the server-side Gemini `/api/ai/tts` route. It falls back gracefully to standard browser UI SpeechSynthesis (`window.speechSynthesis`) when offline or rate-limited.
- **Audio Clashes & Interruption**: All speech triggers must cancel existing vocalization instances to prevent double-audio overlaps. Respect the vocalizer toggle (`isVocalizerEnabled` state) globally.

---

## ⚡ 4. Build, Build Configuration & Scripts
To make the application fully compatible with production deployment:
- **The Bundle Mandate**: `npm run build` runs `vite build` followed by a custom `esbuild` build of the backend TypeScript server into a streamlined `dist/server.cjs` format.
- **Local Port Injection**: Express listener binds specifically to `0.0.0.0:3000`. Do not change the internal routing port under any circumstance.
- **Esm-to-Cjs bundling**: Use `--packages=external` inside the bundler to keep heavyweight dependencies clean while maintaining type strip properties automatically.

Maintain this baseline standard for all iterations! Feel free to query current metadata or state patterns if additional components are introduced.
