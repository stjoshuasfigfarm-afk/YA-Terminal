import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getApiBaseUrl(): string {
  // Check build environment first VITE_API_BASE_URL
  const metaEnv = (import.meta as any).env;
  let baseUrl = metaEnv ? (metaEnv.VITE_API_BASE_URL || metaEnv.API_BASE_URL) : undefined;
  
  if (!baseUrl && typeof window !== "undefined") {
    // Check global config object fallback
    baseUrl = (window as any).TERMINAL_CONFIG?.API_BASE_URL;
    
    if (!baseUrl) {
      // Check current window context safely
      try {
        const origin = window.location.origin;
        if (origin && origin !== "null" && !origin.startsWith("blob:")) {
          baseUrl = origin;
        } else {
          const href = window.location.href || document.URL;
          if (href && href.startsWith("http")) {
            const urlObj = new URL(href);
            if (urlObj.origin && urlObj.origin !== "null") baseUrl = urlObj.origin;
          }
        }
      } catch (e) {
        // Ignore
      }
    }
  }
  
  if (!baseUrl || baseUrl === "/") return ""; 
  // Ensure no trailing slash to avoid double slashes in concat
  return baseUrl.replace(/\/$/, "");
}

export function formatCurrency(value: number | undefined) {
  if (value === undefined || value === null) return "N/A";
  if (value >= 1e12) return (value / 1e12).toFixed(2) + "T";
  if (value >= 1e9) return (value / 1e9).toFixed(2) + "B";
  if (value >= 1e6) return (value / 1e6).toFixed(2) + "M";
  return value.toLocaleString();
}

export function formatPercent(value: number) {
  return (value > 0 ? "+" : "") + value.toFixed(2) + "%";
}
