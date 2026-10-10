import type { OrderFulfillmentThresholds } from '@/lib/types';

// Fallbacks when neither the venue nor Koop has set a value.
export const DEFAULT_THRESHOLDS = {
  maxOrderAcknowledgeSeconds: 120,
  warningOrderProcessingMinutes: 15,
  maxOrderProcessingMinutes: 25,
};

// A venue can override just one of its limits, so each is resolved on its own:
// the venue's value, else Koop's default for the mode, else the built-in fallback.
export function resolveThresholds(
  venueOverride?: Partial<OrderFulfillmentThresholds> | null,
  koopDefault?: Partial<OrderFulfillmentThresholds> | null
) {
  const pick = (key: keyof typeof DEFAULT_THRESHOLDS) => {
    const v = venueOverride?.[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const k = koopDefault?.[key];
    if (typeof k === 'number' && Number.isFinite(k)) return k;
    return DEFAULT_THRESHOLDS[key];
  };
  return {
    maxOrderAcknowledgeSeconds: pick('maxOrderAcknowledgeSeconds'),
    warningOrderProcessingMinutes: pick('warningOrderProcessingMinutes'),
    maxOrderProcessingMinutes: pick('maxOrderProcessingMinutes'),
  };
}

// Share of values at or under the limit, as a percentage to one decimal. Null when
// there is nothing to measure yet, so the screen shows a dash instead of 0%.
export function percentWithin(values: number[], max: number): number | null {
  if (values.length === 0) return null;
  const within = values.filter(v => v <= max).length;
  return Math.round((within / values.length) * 1000) / 10;
}
