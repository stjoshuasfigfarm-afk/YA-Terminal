const fs = require('fs');
let code = fs.readFileSync('src/components/OrbitalMap.tsx', 'utf8');

// 1. Remove useState for openVesselManifests
code = code.replace(/const \[openVesselManifests, setOpenVesselManifests\].*\n/, '');

// 2. Remove the condition that skips standard popup for pinned vessels
const skipCondition = `    // If this vessel is already pinned in openVesselManifests, we do not show the standard popup
    if (openVesselManifests.some(pv => (pv.mmsi || pv.name) === key)) {
      return;
    }`;
code = code.replace(skipCondition, '');

// 3. Remove MANIFEST button from popup
code = code.replace(/<button id="btn-popup-vessel-manifest"[\s\S]*?<\/button>/, '');
code = code.replace(/const btnManifest = document\.getElementById\('btn-popup-vessel-manifest'\);/, '');
code = code.replace(/\|\| btnManifest/g, '');
const btnManifestLogic = `          if (btnManifest) {
            btnManifest.onclick = (e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent('app-pin-manifest', { detail: vessel }));
              // Close standard popup when promoting to a pinned manifest!
              setSelectedVessel(null);
            };
          }`;
code = code.replace(btnManifestLogic, '');

// 4. Remove the useEffect that manages openVesselManifests popups
const popupEffectRegex = /\/\/ Synchronize multiple openVesselManifests popups on the map[\s\S]*?\}, \[openVesselManifests, vesselFilterCategories, isStyleLoaded\]\);/;
code = code.replace(popupEffectRegex, '');

// 5. Remove the PINNED BREAKDOWNS JSX in the UI
const pinnedBreakdownsJSX = /\{\s*openVesselManifests\.length > 0 && \([\s\S]*?<\/motion\.div>\s*\)\s*\}/;
code = code.replace(pinnedBreakdownsJSX, '');

// 6. Clean up useEffect dependencies
code = code.replace(/,\s*openVesselManifests/g, '');

fs.writeFileSync('src/components/OrbitalMap.tsx', code);
console.log("Patched OrbitalMap.tsx");
