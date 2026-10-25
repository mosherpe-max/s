// Koop admin Sales CRM: the pipeline numbers and list handling, kept free of Firebase and the screen so they can
// be tested. Dates are 'yyyy-MM-dd' strings (the day something happened), never times.

import type { Lead, LeadContactType, LeadStage } from '@/lib/types';

export const LEAD_STAGES: LeadStage[] = ['Cold Lead', 'On-Site Meeting', 'Demo', 'Offer', 'Closed', 'Dead'];
// Still being worked. Closed is won, Dead is lost.
export const OPEN_STAGES: LeadStage[] = ['Cold Lead', 'On-Site Meeting', 'Demo', 'Offer'];
export const CONTACT_TYPES: LeadContactType[] = ['Call', 'Text', 'Email', 'Visit', 'Demo', 'Meeting'];

type Fees = Pick<Lead, 'launchFeeQuoted' | 'monthlyFeeQuoted'>;

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

// What has been quoted for the first year: the launch fee plus twelve months. null until a fee has been quoted.
// This is the fee income only; it is not the fuller estimate from the venue's rounds and beverage cart sales.
export function firstYearValue(lead: Fees): number | null {
  if (lead.launchFeeQuoted == null && lead.monthlyFeeQuoted == null) return null;
  return Math.round((num(lead.launchFeeQuoted) + 12 * num(lead.monthlyFeeQuoted)) * 100) / 100;
}

const DAY_MS = 86_400_000;
const parseKey = (key: string) => { const [y, m, d] = key.split('-').map(Number); return Date.UTC(y, m - 1, d); };

// Whole days from a date to today. null when there is no date; never negative.
export function daysSince(date: string | null | undefined, today: string): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return Math.max(0, Math.round((parseKey(today) - parseKey(date)) / DAY_MS));
}

export function latestDate(dates: (string | null | undefined)[]): string | null {
  const valid = dates.filter((d): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  return valid.length ? valid[valid.length - 1] : null;
}

export interface PipelineSummary {
  byStage: Record<LeadStage, { count: number; value: number }>;
  open: { count: number; value: number };
  closed: { count: number; value: number };
}

export function summarizePipeline(leads: Pick<Lead, 'stage' | 'launchFeeQuoted' | 'monthlyFeeQuoted'>[]): PipelineSummary {
  const byStage = Object.fromEntries(LEAD_STAGES.map((s) => [s, { count: 0, value: 0 }])) as PipelineSummary['byStage'];
  for (const l of leads) {
    const bucket = byStage[l.stage];
    if (!bucket) continue;
    bucket.count += 1;
    bucket.value += firstYearValue(l) ?? 0;
  }
  const sum = (stages: LeadStage[]) => stages.reduce((t, s) => ({ count: t.count + byStage[s].count, value: t.value + byStage[s].value }), { count: 0, value: 0 });
  return { byStage, open: sum(OPEN_STAGES), closed: sum(['Closed']) };
}

export type LeadSort = 'updated' | 'quiet' | 'name';

export function filterLeads(
  leads: Lead[],
  filter: { term?: string; stage?: LeadStage | 'All'; type?: Lead['venueType'] | 'All' },
): Lead[] {
  const t = (filter.term || '').trim().toLowerCase();
  const digits = t.replace(/\D/g, '');
  return leads.filter((l) => {
    if (filter.stage && filter.stage !== 'All' && l.stage !== filter.stage) return false;
    if (filter.type && filter.type !== 'All' && l.venueType !== filter.type) return false;
    if (!t) return true;
    return (
      (l.venueName || '').toLowerCase().includes(t) ||
      (l.city || '').toLowerCase().includes(t) ||
      (l.county || '').toLowerCase().includes(t) ||
      (l.contactName || '').toLowerCase().includes(t) ||
      (l.email || '').toLowerCase().includes(t) ||
      (l.posSystem || '').toLowerCase().includes(t) ||
      (digits.length >= 3 && (l.phone || '').replace(/\D/g, '').includes(digits))
    );
  });
}

// Common point-of-sale systems, offered as suggestions while typing. Anything else can be typed in.
export const POS_SUGGESTIONS: Record<Lead['venueType'], string[]> = {
  'Golf Course': ['Square', 'Toast', 'Clover', 'Lightspeed', 'GolfNow', 'ForeUP', 'Club Prophet', 'Northstar', 'Jonas', 'PAR Brink', 'NCR Aloha', 'Oracle Micros', 'Heartland', 'Cash register only'],
  'Bowling Center': ['Square', 'Toast', 'Clover', 'Lightspeed', 'Bowl.com', 'QubicaAMF Conqueror', 'Brunswick Vector', 'NCR Aloha', 'Heartland', 'Cash register only'],
};

// 'quiet' puts the leads that have gone longest without a contact first, and leads never contacted before those.
export function sortLeads(leads: Lead[], sort: LeadSort): Lead[] {
  const copy = [...leads];
  switch (sort) {
    case 'name':
      return copy.sort((a, b) => (a.venueName || '').localeCompare(b.venueName || ''));
    case 'quiet':
      return copy.sort((a, b) => {
        const ad = a.lastContactDate || '', bd = b.lastContactDate || '';
        return ad === bd ? (a.venueName || '').localeCompare(b.venueName || '') : ad < bd ? -1 : 1;
      });
    default:
      return copy.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
  }
}
