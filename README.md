# Yield Terminal: Supply Intelligence

A premium, tactical, and highly atmospheric command-and-control command center designed for global supply chain resilience, corporate node tracking, and macroeconomic security.

This full-stack terminal provides real-time geospatial partner tracking, interactive risk simulation matrix, yield telemetry monitoring, and neural strategic briefings designed to visualize critical points of failure in global manufacturing networks.

---

## 🌟 Core Features & capabilities

### 1. Interactive 3D Geospatial Globe
* **Geospatial Vector Core**: Features an elegant 3D projection world map using **MapLibre GL** for tracing corporate geographic nodes, logistics pipelines, trade routes, and factories.
* **Camera Safety locks**: Enforces permanent geometric and physical camera constraints (strictly locked zero-bearing True North orientation, pitch limit capped below 82°, and coordinate latitude clamping within `[-82, 82]`) to stabilize rendering projection and eliminate mathematical inversions.

### 2. Global Macroeconomic Stressors
* **Historical Shocks Simulation**: Real-time evaluation of major supply corridor bottlenecks such as:
  * **Taiwan Strait Blockade**: Shuts down direct trade flows across crucial semiconductor choke-points.
  * **Suez Canal Closure**: Diverts oceanic tankers around regional routes, raising shipping durations and fuel premiums.
  * **Hormuz Strait Disruption**: Drastically affects energy logistics and energy-adjacent raw material pipelines.
* **Corridor Monitoring**: Interactive toggles allow instant impact simulation on connected enterprise yield curves, prices, and partner risks.

### 3. Neural Strategic Briefing Desk
* **AI-Generated Intelligence Reports**: Live connection to **Gemini / OpenRouter API models** analyzes active news alerts, risk indicators, and partners to generate in-depth, tactical enterprise briefings.
* **Vocalized Dual-TTS Pipeline**: Reads aloud report updates in standard English over a premium server-side Gemini text-to-speech engine (`/api/ai/tts`) with an automated fallback to standard client-side browser speech engines (`window.speechSynthesis`).

### 4. Interactive Enterprise & Yield Registry
* **Deep Logistics Node Profiles**: Complete catalog of critical corporate components with customizable supplier/customer networks and financial metrics.
* **Yield Telemetry Indexing**: Elegant charts highlighting sovereign bond fluctuations alongside custom-calculated enterprise cost yields under current macroeconomic scenarios.
* **Global Network Tracker**: Seamlessly draws real-time connection nodes (incoming suppliers and outgoing customers) on the 3D globe only when explicitly engaged via the tactically animated **Global Network** action utility.

### 5. Automated Intelligence Autopilot
* **Neural Autocycle**: Periodic simulated monitor looping through active global news alerts, triggering panoramic cinematic camera fly-ins directly to the affected partner node, and auto-initiating AI strategic reports.

---

## 🏗️ Technical Architecture

### Tech Stack Matrix
* **Frontend SPA**: React 18 with Vite, Tailwind CSS, customized tactical utility classes, and custom frame scaling.
* **Animations**: Fluid motion transitions and layout morphing powered by `motion` (`motion/react`).
* **Geospatial Engine**: MapLibre GL configured for WebGL performance.
* **Backend API Server**: Express.js server bundled in a modular ESM/CJS esbuild pipeline. Includes router handlers for market tickers, live news stream enrichment, sentiment evaluation, and synthesis audio.

---

## 🚀 Environment Setup & Local Installation

### Prerequisites
* **Node.js**: `v18` or newer is recommended.
* **API Secrets**: To access Gemini-powered briefings and advanced voice TTS synthesis, ensure your `GEMINI_API_KEY` is specified in your shell environment.

### Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development environment:
   ```bash
   npm run dev
   ```
   *The Express server boots on standard port `3000` under `0.0.0.0`.*

3. Package and Bundle for Distribution:
   ```bash
   npm run build
   ```
   *Compiles front-end static components to `/dist` and compiles node routes into a unified `/dist/server.cjs` script.*

---

*Designed for tactical operations and real-time logistics analytics.*
