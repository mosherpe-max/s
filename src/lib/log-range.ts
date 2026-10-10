import { startOfDay, startOfYear, subDays, subMonths } from 'date-fns';

export type LogRange = 'today' | '7d' | 'month' | 'year';

export const LOG_RANGES: { id: LogRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Past 7 Days' },
  { id: 'month', label: 'Past Month' },
  { id: 'year', label: 'Year to Date' },
];

// When each Fulfillment Log range begins; every range runs through now.
// Past 7 days counts today plus the six days before it, matching the Sales Report's
// "Last 7 Days"; Past Month is the same date one month back.
export function logRangeStart(range: LogRange, now: Date = new Date()): Date {
  const today = startOfDay(now);
  switch (range) {
    case 'today': return today;
    case '7d': return subDays(today, 6);
    case 'month': return subMonths(today, 1);
    case 'year': return startOfYear(today);
  }
}
