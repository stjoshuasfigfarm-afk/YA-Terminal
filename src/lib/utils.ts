import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: any) {
  const num = Number(value);
  if (isNaN(num)) return "---";
  if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  return num.toLocaleString();
}

export function formatPercent(value: any) {
  const num = Number(value);
  if (isNaN(num)) return "0.00%";
  return (num > 0 ? "+" : "") + num.toFixed(2) + "%";
}
