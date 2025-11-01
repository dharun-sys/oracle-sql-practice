import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatLocalDateTime(iso?: string | null) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    // en-GB yields dd/mm/yyyy by default; set hour12 false for 24h time
    return d.toLocaleString("en-GB", { hour12: false });
  } catch (e) {
    return String(iso);
  }
}
