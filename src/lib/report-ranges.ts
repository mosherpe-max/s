import { endOfMonth, endOfQuarter, format, startOfMonth, startOfQuarter, startOfWeek, startOfYear, subDays, subMonths, subQuarters, subWeeks } from 'date-fns';

// Quick date ranges for the Sales Report, the ones bookkeepers actually close on.
export type ReportPreset = 'today' | 'yesterday' | '7d' | 'lastWeek' | 'month' | 'lastMonth' | 'quarter' | 'lastQuarter' | 'year';

export const REPORT_PRESETS: { id: ReportPreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d', label: 'Last 7 Days' },
  { id: 'lastWeek', label: 'Last Week (Mon-Sun)' },
  { id: 'month', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'quarter', label: 'This Quarter' },
  { id: 'lastQuarter', label: 'Last Quarter' },
  { id: 'year', label: 'Year to Date' },
];

const key = (d: Date) => format(d, 'yyyy-MM-dd');

// Inclusive 'yyyy-MM-dd' bounds. "This" ranges run through today; "Last" ranges are
// the complete previous week, month or quarter.
export function reportRange(preset: ReportPreset, now: Date = new Date()): { from: string; to: string } {
  switch (preset) {
    case 'today': return { from: key(now), to: key(now) };
    case 'yesterday': { const y = subDays(now, 1); return { from: key(y), to: key(y) }; }
    case '7d': return { from: key(subDays(now, 6)), to: key(now) };
    case 'lastWeek': {
      const start = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 1);
      return { from: key(start), to: key(subDays(startOfWeek(now, { weekStartsOn: 1 }), 1)) };
    }
    case 'month': return { from: key(startOfMonth(now)), to: key(now) };
    case 'lastMonth': { const m = subMonths(now, 1); return { from: key(startOfMonth(m)), to: key(endOfMonth(m)) }; }
    case 'quarter': return { from: key(startOfQuarter(now)), to: key(now) };
    case 'lastQuarter': { const q = subQuarters(now, 1); return { from: key(startOfQuarter(q)), to: key(endOfQuarter(q)) }; }
    case 'year': return { from: key(startOfYear(now)), to: key(now) };
  }
}
