/**
 * Detects if WebGL (either WebGL 2 or WebGL 1) is fully supported, allowed,
 * and functional under the current browser and sandboxing environment.
 * Gracefully handles disabled WebGL, blocked WebGL, or headless sandbox environments.
 * 
 * DESIGN DECISIONS:
 * 1. Memoized to run exactly once, minimizing resource depletion and context lockups.
 * 2. Avoids instantiating `THREE.WebGLRenderer` inside the detector itself to prevent 
 *    un-catchable console.error pollution logged by Three.js core.
 * 3. Actively cleanses contexts using 'WEBGL_lose_context' to free GPU slots instantly.
 */

let cachedResult: boolean | null = null;

export function isWebGLSupported(): boolean {
  if (cachedResult !== null) {
    return cachedResult;
  }

  if (typeof window === "undefined" || !window.document) {
    cachedResult = false;
    return false;
  }

  try {
    const canvas = window.document.createElement("canvas");
    if (!canvas) {
      cachedResult = false;
      return false;
    }

    // Attempt creation of raw WebGL contexts
    const gl = canvas.getContext("webgl2") || 
               canvas.getContext("webgl") || 
               canvas.getContext("experimental-webgl");
             
    if (!gl) {
      cachedResult = false;
      return false;
    }

    const anyGl = gl as any;
    
    // Check if context was immediately lost or blocked
    if (typeof anyGl.isContextLost === "function" && anyGl.isContextLost()) {
      cachedResult = false;
      return false;
    }

    // Query standard context parameters
    const VERSION = anyGl.VERSION || 0x1F02;
    const RENDERER = anyGl.RENDERER || 0x1F01;
    const VENDOR = anyGl.VENDOR || 0x1F00;

    const glRenderer = anyGl.getParameter(RENDERER);
    const glVendor = anyGl.getParameter(VENDOR);
    const glVersion = anyGl.getParameter(VERSION);

    if (!glRenderer || !glVendor || !glVersion) {
      cleanupContext(anyGl);
      cachedResult = false;
      return false;
    }

    const rendererStr = String(glRenderer).toLowerCase();
    const vendorStr = String(glVendor).toLowerCase();
    const versionStr = String(glVersion).toLowerCase();

    // Check for "disabled", "null", "undefined", or blank indicators in standard info
    const isDisabled = 
      rendererStr.includes("disabled") || 
      vendorStr.includes("disabled") ||
      rendererStr.trim() === "" ||
      vendorStr.trim() === "";

    if (isDisabled) {
      cleanupContext(anyGl);
      cachedResult = false;
      return false;
    }

    // Check optional WebGL Debug Info parameters for sandboxed environments
    const debugInfo = anyGl.getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      const dbgVendor = anyGl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL || 0x9245);
      const dbgRenderer = anyGl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL || 0x9246);
      
      if (dbgVendor || dbgRenderer) {
        const dbgVendorStr = String(dbgVendor || "").toLowerCase();
        const dbgRendererStr = String(dbgRenderer || "").toLowerCase();
        
        if (dbgVendorStr.includes("disabled") || dbgRendererStr.includes("disabled")) {
          cleanupContext(anyGl);
          cachedResult = false;
          return false;
        }
      }
    }

    // Ensure getContextAttributes handles required features or is valid
    const attribs = anyGl.getContextAttributes ? anyGl.getContextAttributes() : null;
    if (!attribs) {
      cleanupContext(anyGl);
      cachedResult = false;
      return false;
    }

    // Everything looks good! Clean up and cache the success state
    cleanupContext(anyGl);
    cachedResult = true;
    return true;
  } catch (e) {
    cachedResult = false;
    return false;
  }
}

/**
 * Safely lose the WebGL context using 'WEBGL_lose_context' extension
 * to immediately release GPU hardware capabilities and context memory slots.
 */
function cleanupContext(gl: any): void {
  try {
    if (gl) {
      const ext = gl.getExtension("WEBGL_lose_context");
      if (ext && typeof ext.loseContext === "function") {
        ext.loseContext();
      }
    }
  } catch (e) {
    // Fail-safe silent containment
  }
}
