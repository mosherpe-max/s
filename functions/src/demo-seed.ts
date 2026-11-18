// Builds a believable run of past orders for the demo golf course and the demo bowling center, so the venue admin
// charts (and the Ratings screen) have something to show in a sales demo. Pure: it takes the venue's menu, staff and
// settings and returns order records; the callable in index.ts writes them. Every order is Delivered (or occasionally
// Cancelled) in the past, is marked isDemoSeed, and uses made-up patrons with fictional phone numbers. Orders from the
// last month also carry a patron rating, some of them already followed up on by the venue.

export const DEMO_SEED_SELLER_ID = 'demo-course';
export const DEMO_SEED_BOWLING_SELLER_ID = 'demo-bowling-alley';
export const DEMO_SEED_MODES = ['Beverage Cart', 'Clubhouse'] as const;
export const DEMO_SEED_BOWLING_MODES = ['Lane Delivery'] as const;
export type DemoVenueKind = 'golf' | 'bowling';
export const DEMO_SEED_VENUES: { sellerId: string; kind: DemoVenueKind; modes: readonly string[] }[] = [
  { sellerId: DEMO_SEED_SELLER_ID, kind: 'golf', modes: DEMO_SEED_MODES },
  { sellerId: DEMO_SEED_BOWLING_SELLER_ID, kind: 'bowling', modes: DEMO_SEED_BOWLING_MODES },
];
// Patron ratings are seeded on orders from this many days back (the Ratings screen opens on the last 30 days).
export const DEMO_RATING_DAYS = 30;
const TIME_ZONE = 'America/New_York';

export interface SeedMenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  availableOn?: string[];
}

export interface SeedInputs {
  now: Date;
  days: number;
  seed?: number;
  items: SeedMenuItem[];
  staffNames: string[];
  serviceFees: Record<string, number>; // per mode, dollars
  taxRates: Record<string, number>; // per mode, percent
  venue?: DemoVenueKind; // default golf
  laneCount?: number; // bowling only
  ratingDays?: number; // default DEMO_RATING_DAYS; 0 seeds no ratings
}

export interface SeedRating {
  score: 'up' | 'down';
  reason?: string;
  comment?: string;
  ratedAt: Date;
  handledAt?: Date;
  handledBy?: string;
  handledNote?: string;
}

export interface SeedOrder {
  id: string;
  createdAt: Date;
  acknowledgedAt?: Date;
  deliveredAt?: Date;
  rating?: SeedRating; // the caller turns its Dates into Timestamps
  data: Record<string, any>; // everything but the Date fields, which the caller turns into Timestamps
}

// A small seeded random number generator, so the same inputs always give the same story.
export function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tzOffsetMs(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(date).reduce<Record<string, number>>((acc, p) => { if (p.type !== 'literal') acc[p.type] = Number(p.value); return acc; }, {});
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

// The moment that is y-m-d h:mm on the clock at the venue.
export function localTime(y: number, m: number, d: number, hour: number, minute: number): Date {
  const naive = Date.UTC(y, m, d, hour, minute);
  let utc = naive - tzOffsetMs(new Date(naive));
  utc = naive - tzOffsetMs(new Date(utc));
  return new Date(utc);
}

const FIRST = ['Mike', 'Chris', 'Dave', 'Jason', 'Brian', 'Kevin', 'Steve', 'Tom', 'Mark', 'Jeff', 'Greg', 'Scott', 'Rob', 'Dan', 'Matt', 'Tim', 'Andy', 'Pat', 'Sarah', 'Jen', 'Lisa', 'Karen', 'Amy', 'Beth', 'Laura', 'Megan', 'Kelly', 'Susan', 'Nicole', 'Erin', 'Ryan', 'Jim', 'Bill', 'Tony', 'Frank', 'Paul', 'Eric', 'Sean', 'Josh', 'Nate'];
const LAST = ['Miller', 'Johnson', 'Brown', 'Davis', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright', 'Scott', 'Green', 'Baker', 'Adams', 'Nelson', 'Hill', 'Campbell', 'Mitchell', 'Roberts', 'Carter', 'Phillips', 'Evans', 'Turner', 'Parker'];

const CATEGORY_WEIGHTS: Record<string, Record<string, number>> = {
  'Beverage Cart': { Beer: 42, 'Soft Drinks': 14, Spirits: 14, Snacks: 14, Handhelds: 12 },
  Clubhouse: { Handhelds: 32, Beer: 20, 'Soft Drinks': 14, Spirits: 10, Snacks: 10, Entrees: 8, Appetizers: 8, Salad: 5, Pizza: 8 },
  'Lane Delivery': { Beer: 32, Pizza: 20, Appetizers: 20, Handhelds: 14, 'Soft Drinks': 10, Snacks: 6, Spirits: 6 },
};
const HOUR_WEIGHTS: Record<string, number[]> = {
  // index 0 = 8:00 hour
  'Beverage Cart': [0, 1, 2, 4, 5, 5, 4, 3, 2, 1, 0],
  Clubhouse: [1, 1, 1, 4, 6, 5, 3, 3, 3, 2, 1],
  // index 0 = 11:00 hour; the evening rush
  'Lane Delivery': [1, 2, 2, 2, 3, 5, 7, 8, 8, 6, 4, 2],
};
const HOUR_START: Record<string, number> = { 'Beverage Cart': 8, Clubhouse: 8, 'Lane Delivery': 11 };
const DAY_BASE: Record<string, number[]> = {
  // Sun..Sat
  'Beverage Cart': [38, 16, 17, 18, 19, 25, 42],
  Clubhouse: [28, 10, 11, 12, 13, 18, 30],
  'Lane Delivery': [34, 14, 26, 16, 28, 48, 62], // league nights on Tuesday and Thursday, weekends busiest
};
const MODE_CODE: Record<string, string> = { 'Beverage Cart': 'bev', Clubhouse: 'club', 'Lane Delivery': 'lane' };
// Modes where a kitchen prepares the order before it goes out.
const PREPARED_MODES = ['Clubhouse', 'Lane Delivery'];
// Rain keeps golfers home and bowlers busy.
const WEATHER: Record<DemoVenueKind, { rainy: [number, number]; dry: [number, number] }> = {
  golf: { rainy: [0.25, 0.25], dry: [0.85, 0.3] },
  bowling: { rainy: [1.15, 0.25], dry: [0.85, 0.3] },
};
const CLUBHOUSE_SPOTS = ['Patio', 'Dining Room', 'Putting Green', 'Driving Range', 'Bar Area'];
const DRIVE_MEAN_MIN: Record<string, number> = { 'Beverage Cart': 13, Clubhouse: 16, 'Lane Delivery': 11 };
// What counts as a slow delivery, and where the occasional slow ones start (minutes).
const SLOW_MIN: Record<string, number> = { 'Beverage Cart': 25, Clubhouse: 25, 'Lane Delivery': 20 };
const SLOW_BASE_MIN: Record<string, number> = { 'Beverage Cart': 26, Clubhouse: 26, 'Lane Delivery': 22 };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

// ---- patron ratings -------------------------------------------------------------------------------------------

const DAY_MS = 86_400_000;
const RATING_RESPONSE_RATE = 0.35;
const UP_COMMENTS: Record<DemoVenueKind, string[]> = {
  golf: ['Found us on the course in minutes!', 'Ice cold beer on the back nine, perfect.', 'So much easier than walking to the clubhouse.', 'Fast and friendly!', 'Great service.', 'Order was perfect.'],
  bowling: ['Food hit our lane before the next frame, nice!', 'Pizza was hot and fast.', 'Never had to leave our game.', 'Fast and friendly!', 'Great service.', 'Order was perfect.'],
};
const DOWN_REASON_WEIGHTS = { 'Wrong or missing item': 30, 'Quality problem': 28, 'Took too long': 6, 'Staff service': 10, Other: 12 } as Record<string, number>;
const DOWN_COMMENTS: Record<string, string[]> = {
  'Wrong or missing item': ['Missing one of our drinks.', 'Got a regular instead of the diet.', 'The fries were left out of the order.'],
  'Quality problem': ['Food was lukewarm.', 'The beer was warm.', 'Burger was overcooked.'],
  'Took too long': ['Waited about 35 minutes.', 'Took way longer than the estimate.', 'Almost gave up waiting.'],
  'Staff service': ['Delivery was rushed and no one said a word.', 'Hard to flag down and no apology.'],
  Other: ['Prices were higher than I expected.', 'Checkout was a little confusing.'],
};
const HANDLED_NOTES = ['Called and apologized, comped the next round.', 'Refunded the missing item.', 'Talked it over with the staff member.', 'Left a voicemail.', 'Replaced the order at no charge.', 'Spoke with the patron, all good now.'];

function hashString(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h;
}

export interface DemoRatingContext {
  id: string; kind: DemoVenueKind; mode: string; seed: number; now: Date;
  deliveredAt: Date; driveMin: number; ackSec: number;
  driver: string; starStaff: string; weakStaff: string;
  progress: number; // 0 = start of the rated period, 1 = now
}

// Whether the patron rated this order and how. A patron who got a slow delivery is far more likely to give a thumbs
// down; one staff member is a little better and one a little worse than the rest; the whole venue improves over the
// month; and the thumbs-downs older than a few days (three) have all been followed up on, so the dashboard shows a few
// open ones and a history of handled ones. Uses its own random stream (from the order id), so it never changes the orders.
export function demoRating(c: DemoRatingContext): SeedRating | undefined {
  const r = makeRng((hashString(c.id) ^ c.seed) >>> 0);
  const pickFrom = <T,>(arr: T[]): T => arr[Math.floor(r() * arr.length)];
  if (r() >= RATING_RESPONSE_RATE) return undefined;
  const slow = c.driveMin > SLOW_MIN[c.mode];
  const raw = 0.07 + (slow ? 0.35 : 0) + (c.ackSec > 120 ? 0.08 : 0) + (c.driver === c.weakStaff ? 0.07 : 0) - (c.driver === c.starStaff ? 0.03 : 0);
  const pDown = clamp(raw * (1.35 - 0.6 * c.progress), 0.01, 0.6);
  const down = r() < pDown;
  const ratedAt = new Date(Math.min(c.deliveredAt.getTime() + (2 + r() * 88) * 60_000, c.now.getTime() - 60_000));
  if (ratedAt.getTime() <= c.deliveredAt.getTime()) return undefined; // delivered moments ago: not rated yet

  if (!down) {
    return { score: 'up', ...(r() < 0.28 ? { comment: pickFrom(UP_COMMENTS[c.kind]) } : {}), ratedAt };
  }
  const weights: Record<string, number> = { ...DOWN_REASON_WEIGHTS, 'Took too long': slow ? 120 : 6, 'Staff service': c.driver === c.weakStaff ? 30 : 10 };
  const reasons = Object.keys(weights);
  let pickW = r() * reasons.reduce((n, k) => n + weights[k], 0);
  let reason = reasons[reasons.length - 1];
  for (const k of reasons) { pickW -= weights[k]; if (pickW <= 0) { reason = k; break; } }
  const rating: SeedRating = { score: 'down', reason, ...(r() < 0.7 ? { comment: pickFrom(DOWN_COMMENTS[reason]) } : {}), ratedAt };
  const recent = c.now.getTime() - ratedAt.getTime() < 3 * DAY_MS;
  if (!recent) {
    rating.handledAt = new Date(Math.min(ratedAt.getTime() + (1 + r() * 20) * 3_600_000, c.now.getTime() - 60_000));
    rating.handledBy = 'Venue manager';
    rating.handledNote = pickFrom(HANDLED_NOTES);
  }
  return rating;
}

export function generateDemoOrders(input: SeedInputs): SeedOrder[] {
  const seed = input.seed ?? 20260401;
  const kind: DemoVenueKind = input.venue ?? 'golf';
  const venue = DEMO_SEED_VENUES.find(v => v.kind === kind)!;
  const modes = venue.modes;
  const ratingDays = input.ratingDays ?? DEMO_RATING_DAYS;
  const rng = makeRng(seed);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
  const weighted = <T,>(arr: T[], weight: (t: T) => number): T => {
    const total = arr.reduce((s, t) => s + weight(t), 0);
    let r = rng() * total;
    for (const t of arr) { r -= weight(t); if (r <= 0) return t; }
    return arr[arr.length - 1];
  };
  const normal = () => { const u = Math.max(rng(), 1e-9); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()); };

  // Patrons: some play every week, most a handful of times.
  const patrons = Array.from({ length: 140 }, (_, i) => {
    const first = FIRST[i % FIRST.length];
    const last = LAST[(i * 7 + Math.floor(i / FIRST.length) * 3) % LAST.length];
    return {
      uid: kind === 'golf' ? `seed-patron-${i + 1}` : `seed-patron-b${i + 1}`,
      name: `${first} ${last}`,
      phone: `${kind === 'golf' ? '5550100' : '5550200'}${String(i).padStart(3, '0')}`, // not a real number
      email: `${first}.${last}${kind === 'golf' ? '' : 'b'}${i + 1}@example.com`.toLowerCase(),
      weight: 1 / Math.pow(i + 1, 0.7),
    };
  });

  const itemsByMode: Record<string, SeedMenuItem[]> = {};
  const popularity = new Map<string, number>();
  input.items.forEach(i => popularity.set(i.id, 0.4 + rng() * 1.6));
  modes.forEach(mode => { itemsByMode[mode] = input.items.filter(i => i.availableOn?.includes(mode)); });

  const staff = input.staffNames.length >= 2 ? input.staffNames : ['Jake', 'Maria', 'Tyler', 'Dana'];
  // For the ratings story: one member of staff a little stronger than the rest, one a little weaker.
  const sortedStaff = [...staff].sort();
  const starStaff = sortedStaff[0], weakStaff = sortedStaff[sortedStaff.length - 1];
  const ratingStartMs = input.now.getTime() - ratingDays * DAY_MS;

  // Anchor on today's date at the venue.
  const nowParts = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric' })
    .formatToParts(input.now).reduce<Record<string, number>>((acc, p) => { if (p.type !== 'literal') acc[p.type] = Number(p.value); return acc; }, {});
  const todayUtc = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day);

  const orders: SeedOrder[] = [];

  for (let back = input.days - 1; back >= 0; back--) {
    const dayUtc = new Date(todayUtc - back * 86400000);
    const y = dayUtc.getUTCFullYear(), m = dayUtc.getUTCMonth(), d = dayUtc.getUTCDate();
    const dow = dayUtc.getUTCDay();
    const progress = input.days > 1 ? 1 - back / (input.days - 1) : 1; // 0 = oldest day, 1 = today
    const growth = 0.82 + 0.36 * progress;
    const rainy = rng() < 0.12;
    const wx = WEATHER[kind];
    const weather = rainy ? wx.rainy[0] + rng() * wx.rainy[1] : wx.dry[0] + rng() * wx.dry[1];
    // Service gets quicker over the period: a story the charts can tell.
    const ackQuality = clamp(0.82 + 0.1 * progress + (rng() - 0.5) * 0.08, 0.7, 0.99);
    const driveQuality = clamp(0.9 + 0.05 * progress + (rng() - 0.5) * 0.06, 0.8, 0.99);

    for (const mode of modes) {
      const menu = itemsByMode[mode];
      if (!menu || menu.length < 3) continue;
      const base = DAY_BASE[mode][dow] * growth * weather;
      const count = Math.max(0, Math.round(base + normal() * Math.sqrt(base)));
      const hours = HOUR_WEIGHTS[mode];
      const code = MODE_CODE[mode];
      const fee = input.serviceFees[mode] ?? 0;
      const taxRate = input.taxRates[mode] ?? 6;

      for (let n = 0; n < count; n++) {
        const hourIdx = weighted(hours.map((_, i) => i), i => hours[i]);
        const created = localTime(y, m, d, HOUR_START[mode] + hourIdx, Math.floor(rng() * 60));
        created.setSeconds(Math.floor(rng() * 60));
        if (created.getTime() > input.now.getTime() - 60_000) continue;

        const cancelled = rng() < 0.02;
        const patron = weighted(patrons, p => p.weight);

        // Basket
        const lineCount = rng() < 0.45 ? 1 : rng() < 0.7 ? 2 : rng() < 0.85 ? 3 : 4;
        const chosen: { item: SeedMenuItem; quantity: number }[] = [];
        for (let l = 0; l < lineCount; l++) {
          const item = weighted(menu, i => (CATEGORY_WEIGHTS[mode][i.category] ?? 6) * (popularity.get(i.id) ?? 1));
          const existing = chosen.find(c => c.item.id === item.id);
          const qty = item.category === 'Beer' || item.category === 'Soft Drinks' ? (rng() < 0.4 ? 2 : 1) : 1;
          if (existing) existing.quantity += qty; else chosen.push({ item, quantity: qty });
        }
        const orderItems = chosen.map((c, idx) => ({
          id: c.item.id, name: c.item.name, description: c.item.description || '', price: c.item.price,
          category: c.item.category, imageUrl: c.item.imageUrl || '', quantity: c.quantity,
          cartId: `seed-${idx}-${c.item.id}`,
        }));
        const subtotal = round2(orderItems.reduce((s, i) => s + i.price * i.quantity, 0));
        const tax = Math.round(subtotal * taxRate) / 100;
        const digital = rng() < 0.74;
        const tipPct = digital ? [0, 0.1, 0.15, 0.18, 0.2, 0.2, 0.25][Math.floor(rng() * 7)] : (rng() < 0.3 ? 0.1 : 0);
        const tip = round2(subtotal * tipPct);
        const total = round2(subtotal + fee + tax + tip);

        // Timing
        const ackSec = rng() < ackQuality ? Math.round(12 + Math.min(95, -Math.log(1 - rng() * 0.97) * 38)) : Math.round(125 + rng() * 170);
        const driveMin = rng() < driveQuality
          ? clamp(DRIVE_MEAN_MIN[mode] + normal() * 3.5, 6, 24)
          : SLOW_BASE_MIN[mode] + rng() * 12;
        const acknowledgedAt = new Date(created.getTime() + ackSec * 1000);
        const deliveredAt = new Date(Math.max(created.getTime() + driveMin * 60_000, acknowledgedAt.getTime() + 180_000));
        if (!cancelled && deliveredAt.getTime() > input.now.getTime() - 30_000) continue;

        const driver = pick(staff);
        const prep = pick(staff);
        const location = mode === 'Beverage Cart' ? { deliveryHole: String(1 + Math.floor(rng() * 18)) }
          : mode === 'Lane Delivery' ? { menuTypeLocation: `Lane ${1 + Math.floor(rng() * Math.max(1, input.laneCount ?? 24))}` }
          : { menuTypeLocation: pick(CLUBHOUSE_SPOTS) };

        const data: Record<string, any> = {
          sellerId: venue.sellerId,
          buyerProfileId: patron.uid,
          customerName: patron.name,
          customerPhone: patron.phone,
          customerEmail: patron.email,
          menuType: mode,
          ...location,
          items: orderItems,
          subtotal,
          serviceFee: fee,
          tax,
          tip,
          total,
          status: cancelled ? 'Cancelled' : 'Delivered',
          paymentMethod: digital ? 'Digital Payment' : 'Pay at Delivery',
          paymentStatus: cancelled ? 'Cancelled' : 'Paid',
          ...(digital && !cancelled ? { stripePaymentIntentId: `pi_demo_${y}${m + 1}${d}_${code}_${n}` } : {}),
          ...(cancelled ? { notes: 'Cancelled by venue.' } : { assignedStaffId: `seed-staff-${driver}`, assignedStaffName: driver }),
          ...(!cancelled && PREPARED_MODES.includes(mode) ? { preparedByStaffId: `seed-staff-${prep}`, preparedByStaffName: prep } : {}),
          isDemoSeed: true,
        };
        const id = `seed-${y}${String(m + 1).padStart(2, '0')}${String(d).padStart(2, '0')}-${code}-${n + 1}`;
        const rating = !cancelled && ratingDays > 0 && created.getTime() >= ratingStartMs
          ? demoRating({
            id, kind, mode, seed, now: input.now, deliveredAt, driveMin: (deliveredAt.getTime() - created.getTime()) / 60_000, ackSec,
            driver, starStaff, weakStaff, progress: clamp((created.getTime() - ratingStartMs) / (input.now.getTime() - ratingStartMs), 0, 1),
          })
          : undefined;
        orders.push({
          id,
          createdAt: created,
          ...(cancelled ? {} : { acknowledgedAt, deliveredAt }),
          ...(rating ? { rating } : {}),
          data,
        });
      }
    }
  }
  return orders;
}
