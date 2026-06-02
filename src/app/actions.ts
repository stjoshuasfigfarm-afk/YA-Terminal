/**
 * Next.js-style Server Action simulation for Express full-stack rehydration.
 * Directly triggers 'The Harvester' orchestrator on the server to update the Firestore Silo.
 */

import { getApiBaseUrl } from "../lib/utils";

export async function rehydrateSilo(symbol: string, retries = 3, delay = 1000) {
  if (!symbol) return null;
  
  const baseUrl = getApiBaseUrl();
  const timestamp = Date.now();
  const url = `${baseUrl}/api/silo/rehydrate?_t=${timestamp}`;

  for (let i = 1; i <= retries; i++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        },
        body: JSON.stringify({ symbol })
      });

      if (!response.ok) {
        throw new Error(`Rehydration failed with status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (i === retries) {
        console.error(`[SERVER_ACTION_REHYDRATE] Failed to trigger live rehydration for ${symbol} after ${retries} attempts:`, error);
        throw error;
      }
      console.warn(`[SERVER_ACTION_REHYDRATE] Retrying rehydration for ${symbol} (${i}/${retries})...`);
      await new Promise(r => setTimeout(r, delay * i));
    }
  }
}

