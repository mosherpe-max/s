// The lead card's form: what it holds, how a saved lead fills it in, and how it turns back into what is saved.
// Number fields are kept as the text typed, so "blank" and "0" stay different things.

import { z } from 'zod';
import type { Lead } from '@/lib/types';
import { LEAD_STAGES } from '@/lib/crm';
import { isValidEmail } from '@/lib/checkout-validation';

const numText = z.string().refine((v) => v.trim() === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0), 'Enter a number, or leave it blank');

export const leadFormSchema = z.object({
  venueType: z.enum(['Golf Course', 'Bowling Center']),
  venueName: z.string().trim().min(2, 'Venue name is required'),
  streetAddress: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  county: z.string(),
  contactName: z.string(),
  phone: z.string(),
  posSystem: z.string(),
  email: z.string().refine((v) => v.trim() === '' || isValidEmail(v), 'That email does not look right'),
  stage: z.enum(LEAD_STAGES as [string, ...string[]]),
  launchFeeQuoted: numText,
  monthlyFeeQuoted: numText,
  // golf
  holes: numText,
  rackRatePeak: numText,
  hasBevCart: z.boolean(),
  hasClubhouseKitchen: z.boolean(),
  bevCartCount: numText,
  bevCartOperators: numText,
  bevCartRevenuePerRound: numText,
  roundsAnnually: numText,
  // bowling
  lanesCount: numText,
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;

const text = (n: number | null | undefined): string => (n == null ? '' : String(n));
const toNum = (v: string): number | null => (v.trim() === '' ? null : Number(v));

export function leadToFormValues(lead: Lead | null): LeadFormValues {
  const golf = lead?.marketFitData?.golf;
  const bowling = lead?.marketFitData?.bowling;
  return {
    venueType: lead?.venueType || 'Golf Course',
    venueName: lead?.venueName || '',
    streetAddress: lead?.streetAddress || '',
    city: lead?.city || '',
    state: lead?.state || '',
    zip: lead?.zip || '',
    county: lead?.county || '',
    contactName: lead?.contactName || '',
    phone: lead?.phone || '',
    email: lead?.email || '',
    posSystem: lead?.posSystem || '',
    stage: lead?.stage || 'Cold Lead',
    launchFeeQuoted: text(lead?.launchFeeQuoted),
    monthlyFeeQuoted: text(lead?.monthlyFeeQuoted),
    holes: text(golf?.holes),
    rackRatePeak: text(golf?.rackRatePeak),
    hasBevCart: !!golf?.hasBevCart,
    hasClubhouseKitchen: !!golf?.hasClubhouseKitchen,
    bevCartCount: text(golf?.bevCartCount),
    bevCartOperators: text(golf?.bevCartOperators),
    bevCartRevenuePerRound: text(golf?.bevCartRevenuePerRound),
    roundsAnnually: text(golf?.roundsAnnually),
    lanesCount: text(bowling?.lanesCount),
  };
}

// The fields to save (without ids and timestamps). Only the venue type's own details are written, and nothing
// is ever undefined, which Firestore refuses.
export function leadFormToFields(v: LeadFormValues) {
  return {
    venueType: v.venueType,
    venueName: v.venueName.trim(),
    streetAddress: v.streetAddress.trim(),
    city: v.city.trim(),
    state: v.state,
    zip: v.zip.trim(),
    county: v.county.trim(),
    contactName: v.contactName.trim(),
    phone: v.phone.trim(),
    email: v.email.trim(),
    posSystem: v.posSystem.trim(),
    stage: v.stage as Lead['stage'],
    launchFeeQuoted: toNum(v.launchFeeQuoted),
    monthlyFeeQuoted: toNum(v.monthlyFeeQuoted),
    marketFitData: v.venueType === 'Golf Course'
      ? {
          golf: {
            holes: toNum(v.holes),
            rackRatePeak: toNum(v.rackRatePeak),
            hasBevCart: v.hasBevCart,
            hasClubhouseKitchen: v.hasClubhouseKitchen,
            bevCartCount: toNum(v.bevCartCount),
            bevCartOperators: toNum(v.bevCartOperators),
            bevCartRevenuePerRound: toNum(v.bevCartRevenuePerRound),
            roundsAnnually: toNum(v.roundsAnnually),
          },
        }
      : { bowling: { lanesCount: toNum(v.lanesCount) } },
  };
}
