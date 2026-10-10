// Sales tax is set by each venue, per service mode. A mode with its own rate in
// seller.taxRates uses it (0 means no tax is charged for that mode); a mode without
// one falls back to the venue's original single rate (seller.taxRate), then to 6%.
export const DEFAULT_TAX_RATE = 6.0;

interface TaxSettings {
  taxRate?: number;
  taxRates?: Record<string, number>;
}

const isValidRate = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100;

export function getTaxRate(seller: TaxSettings | null | undefined, mode?: string | null): number {
  const perMode = mode ? seller?.taxRates?.[mode] : undefined;
  if (isValidRate(perMode)) return perMode;
  if (isValidRate(seller?.taxRate)) return seller!.taxRate!;
  return DEFAULT_TAX_RATE;
}

// Tax in dollars, rounded to the cent (a rate like 5.5% would otherwise leave
// fractions of a cent in the total that gets charged).
export function computeTax(subtotal: number, ratePercent: number): number {
  return Math.round(subtotal * ratePercent) / 100;
}
