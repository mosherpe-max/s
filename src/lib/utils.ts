
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Global Solution Administrator Identity.
 * This UID bypasses all Firestore Security Rules via 'God Mode'.
 */
export const SUPER_ADMIN_ID = 'o9vAQy0aFRPSNPoG0ETvjiGt9If1';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDriverColor(id: string): string {
  const colors = [
    'indigo-600',
    'blue-600',
    'purple-600',
    'pink-600',
    'cyan-600',
    'fuchsia-600',
    'violet-600',
  ];
  
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

/**
 * Returns a hex color code based on signal age and solution thresholds.
 * GREEN = Hot (Good)
 * AMBER = Warm (Concern)
 * RED = Cold (Bad)
 * GRAY = Stale (Lost)
 */
export function getSignalColor(
  lastActive: Date | null | undefined, 
  thresholds?: { hot: number; warm: number; cold: number }
): string {
  if (!lastActive) return '#94a3b8'; // slate-400 (Inactive)
  
  const now = Date.now();
  const secondsElapsed = (now - lastActive.getTime()) / 1000;
  
  const t = thresholds || { hot: 60, warm: 300, cold: 600 };

  if (secondsElapsed <= t.hot) return '#22c55e'; // green-500
  if (secondsElapsed <= t.warm) return '#f59e0b'; // amber-500
  if (secondsElapsed <= t.cold) return '#ef4444'; // red-500
  return '#94a3b8'; // slate-400 (Stale/Lost)
}

export function getNumericOrderId(id: string) {
  if (!id) return '0000';
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (Math.abs(hash) % 10000).toString().padStart(4, '0');
}

/**
 * Returns the most recent occurrence of the specified reset hour (local time zone).
 * Defaults to 4:00 AM EST for Cloud Function consistency.
 */
export function getMostRecentResetTime(resetHour: number = 4): Date {
  const now = new Date();
  
  // Calculate relative to solution timezone (EST)
  const estDateStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const estNow = new Date(estDateStr);
  
  const resetTime = new Date(estNow);
  resetTime.setHours(resetHour, 0, 0, 0);
  
  // If we haven't reached the reset hour today yet, the most recent reset was yesterday
  if (estNow < resetTime) {
    resetTime.setDate(resetTime.getDate() - 1);
  }
  
  return resetTime;
}

/**
 * Checks if a timestamp is before the most recent daily reset.
 */
export function isStaffSessionStale(lastActive: Date | null | undefined, resetHour: number = 4): boolean {
  if (!lastActive) return false;
  const threshold = getMostRecentResetTime(resetHour);
  return lastActive < threshold;
}

/**
 * Calculates distance between two points in meters (Haversine formula).
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
