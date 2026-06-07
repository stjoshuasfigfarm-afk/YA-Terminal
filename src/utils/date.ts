/**
 * Formats a raw date string or timestamp safely.
 * Gracefully handles invalid dates, relative strings (e.g. "Just now"), and null/undefined inputs
 * without throwing RangeErrors or breaking the application.
 */
export function formatSafeTime(dateStr: any, fallback: string = ""): string {
  if (!dateStr) return fallback;
  
  try {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    }
  } catch (e) {
    console.warn("[DateUtils] Failed to parse date string:", dateStr, e);
  }

  // If parsing failed but the string already contains a time-like pattern (e.g. hh:mm), return as-is
  if (typeof dateStr === "string" && dateStr.includes(":")) {
    return dateStr;
  }
  
  return fallback;
}
