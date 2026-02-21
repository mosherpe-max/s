import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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

export function getNumericOrderId(id: string) {
  if (!id) return '0000';
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (Math.abs(hash) % 10000).toString().padStart(4, '0');
}

/**
 * Returns the most recent 4:00 AM EST date.
 */
export function getMostRecent4AmEst(): Date {
  const now = new Date();
  
  // Convert current time to a string in EST to find the current date in New York
  const estDateStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const estNow = new Date(estDateStr);
  
  // Create a 4:00 AM marker for "today" in EST
  const resetTime = new Date(estNow);
  resetTime.setHours(4, 0, 0, 0);
  
  // If we haven't reached 4 AM EST today yet, the most recent reset was 4 AM yesterday
  if (estNow < resetTime) {
    resetTime.setDate(resetTime.getDate() - 1);
  }
  
  return resetTime;
}

/**
 * Checks if a timestamp is before the most recent 4:00 AM EST reset.
 */
export function isStaffSessionStale(lastActive: Date | null | undefined): boolean {
  if (!lastActive) return true;
  const threshold = getMostRecent4AmEst();
  return lastActive < threshold;
}
