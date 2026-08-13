
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

/**
 * Programmatic Notification Sound
 * Uses Web Audio API to generate a clean notification chime.
 * Higher reliability than base64 assets and works without external files.
 */
export function playNotificationSound() {
  if (typeof window === 'undefined') return;
  
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    // Frequency: 880Hz (A5) for a clear, piercing notification tone
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.7);
    
    // Resume context if suspended (browser security)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  } catch (e) {
    console.warn("Audio play blocked by browser policy", e);
  }
}

/**
 * Returns a deterministic hex color for a driver based on their ID.
 * Used for map markers to distinguish multiple staff members.
 */
export function getDriverColor(id: string): string {
  const colors = [
    '#4f46e5', // indigo-600
    '#2563eb', // blue-600
    '#9333ea', // purple-600
    '#db2777', // pink-600
    '#0891b2', // cyan-600
    '#c026d3', // fuchsia-600
    '#7c3aed', // violet-600
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
