// Builds a believable run of past orders for a demo golf venue, so the venue admin charts have something
// to show in a sales demo. Pure: it takes the venue's menu, staff and settings and returns order records;
// the callable in index.ts writes them. Every order is Delivered (or occasionally Cancelled) in the past,
// is marked isDemoSeed, and uses made-up patrons with fictional phone numbers.
export const DEMO_SEED_SELLER_ID = 'demo-course';
export const DEMO_SEED_MODES = ['Beverage Cart', 'Clubhouse'];
const TIME_ZONE = 'America/New_York';
// A small seeded random number generator, so the same inputs always give the same story.
export function makeRng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function tzOffsetMs(date) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: TIME_ZONE, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
    }).formatToParts(date).reduce((acc, p) => { if (p.type !== 'literal')
        acc[p.type] = Number(p.value); return acc; }, {});
    const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}
// The moment that is y-m-d h:mm on the clock at the venue.
export function localTime(y, m, d, hour, minute) {
    const naive = Date.UTC(y, m, d, hour, minute);
    let utc = naive - tzOffsetMs(new Date(naive));
    utc = naive - tzOffsetMs(new Date(utc));
    return new Date(utc);
}
const FIRST = ['Mike', 'Chris', 'Dave', 'Jason', 'Brian', 'Kevin', 'Steve', 'Tom', 'Mark', 'Jeff', 'Greg', 'Scott', 'Rob', 'Dan', 'Matt', 'Tim', 'Andy', 'Pat', 'Sarah', 'Jen', 'Lisa', 'Karen', 'Amy', 'Beth', 'Laura', 'Megan', 'Kelly', 'Susan', 'Nicole', 'Erin', 'Ryan', 'Jim', 'Bill', 'Tony', 'Frank', 'Paul', 'Eric', 'Sean', 'Josh', 'Nate'];
const LAST = ['Miller', 'Johnson', 'Brown', 'Davis', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright', 'Scott', 'Green', 'Baker', 'Adams', 'Nelson', 'Hill', 'Campbell', 'Mitchell', 'Roberts', 'Carter', 'Phillips', 'Evans', 'Turner', 'Parker'];
const CATEGORY_WEIGHTS = {
    'Beverage Cart': { Beer: 42, 'Soft Drinks': 14, Spirits: 14, Snacks: 14, Handhelds: 12 },
    Clubhouse: { Handhelds: 32, Beer: 20, 'Soft Drinks': 14, Spirits: 10, Snacks: 10, Entrees: 8, Appetizers: 8, Salad: 5, Pizza: 8 },
};
const HOUR_WEIGHTS = {
    // index 0 = 8:00 hour
    'Beverage Cart': [0, 1, 2, 4, 5, 5, 4, 3, 2, 1, 0],
    Clubhouse: [1, 1, 1, 4, 6, 5, 3, 3, 3, 2, 1],
};
const DAY_BASE = {
    // Sun..Sat
    'Beverage Cart': [38, 16, 17, 18, 19, 25, 42],
    Clubhouse: [28, 10, 11, 12, 13, 18, 30],
};
const CLUBHOUSE_SPOTS = ['Patio', 'Dining Room', 'Putting Green', 'Driving Range', 'Bar Area'];
const DRIVE_MEAN_MIN = { 'Beverage Cart': 13, Clubhouse: 16 };
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const round2 = (n) => Math.round(n * 100) / 100;
export function generateDemoOrders(input) {
    const rng = makeRng(input.seed ?? 20260401);
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    const weighted = (arr, weight) => {
        const total = arr.reduce((s, t) => s + weight(t), 0);
        let r = rng() * total;
        for (const t of arr) {
            r -= weight(t);
            if (r <= 0)
                return t;
        }
        return arr[arr.length - 1];
    };
    const normal = () => { const u = Math.max(rng(), 1e-9); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()); };
    // Patrons: some play every week, most a handful of times.
    const patrons = Array.from({ length: 140 }, (_, i) => {
        const first = FIRST[i % FIRST.length];
        const last = LAST[(i * 7 + Math.floor(i / FIRST.length) * 3) % LAST.length];
        return {
            uid: `seed-patron-${i + 1}`,
            name: `${first} ${last}`,
            phone: `5550100${String(i).padStart(3, '0')}`, // not a real number
            email: `${first}.${last}${i + 1}@example.com`.toLowerCase(),
            weight: 1 / Math.pow(i + 1, 0.7),
        };
    });
    const itemsByMode = {};
    const popularity = new Map();
    input.items.forEach(i => popularity.set(i.id, 0.4 + rng() * 1.6));
    DEMO_SEED_MODES.forEach(mode => { itemsByMode[mode] = input.items.filter(i => i.availableOn?.includes(mode)); });
    const staff = input.staffNames.length >= 2 ? input.staffNames : ['Jake', 'Maria', 'Tyler', 'Dana'];
    // Anchor on today's date at the venue.
    const nowParts = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric' })
        .formatToParts(input.now).reduce((acc, p) => { if (p.type !== 'literal')
        acc[p.type] = Number(p.value); return acc; }, {});
    const todayUtc = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day);
    const orders = [];
    for (let back = input.days - 1; back >= 0; back--) {
        const dayUtc = new Date(todayUtc - back * 86400000);
        const y = dayUtc.getUTCFullYear(), m = dayUtc.getUTCMonth(), d = dayUtc.getUTCDate();
        const dow = dayUtc.getUTCDay();
        const progress = input.days > 1 ? 1 - back / (input.days - 1) : 1; // 0 = oldest day, 1 = today
        const growth = 0.82 + 0.36 * progress;
        const rainy = rng() < 0.12;
        const weather = rainy ? 0.25 + rng() * 0.25 : 0.85 + rng() * 0.3;
        // Service gets quicker over the period: a story the charts can tell.
        const ackQuality = clamp(0.82 + 0.1 * progress + (rng() - 0.5) * 0.08, 0.7, 0.99);
        const driveQuality = clamp(0.9 + 0.05 * progress + (rng() - 0.5) * 0.06, 0.8, 0.99);
        for (const mode of DEMO_SEED_MODES) {
            const menu = itemsByMode[mode];
            if (!menu || menu.length < 3)
                continue;
            const base = DAY_BASE[mode][dow] * growth * weather;
            const count = Math.max(0, Math.round(base + normal() * Math.sqrt(base)));
            const hours = HOUR_WEIGHTS[mode];
            const code = mode === 'Beverage Cart' ? 'bev' : 'club';
            const fee = input.serviceFees[mode] ?? 0;
            const taxRate = input.taxRates[mode] ?? 6;
            for (let n = 0; n < count; n++) {
                const hourIdx = weighted(hours.map((_, i) => i), i => hours[i]);
                const created = localTime(y, m, d, 8 + hourIdx, Math.floor(rng() * 60));
                created.setSeconds(Math.floor(rng() * 60));
                if (created.getTime() > input.now.getTime() - 60_000)
                    continue;
                const cancelled = rng() < 0.02;
                const patron = weighted(patrons, p => p.weight);
                // Basket
                const lineCount = rng() < 0.45 ? 1 : rng() < 0.7 ? 2 : rng() < 0.85 ? 3 : 4;
                const chosen = [];
                for (let l = 0; l < lineCount; l++) {
                    const item = weighted(menu, i => (CATEGORY_WEIGHTS[mode][i.category] ?? 6) * (popularity.get(i.id) ?? 1));
                    const existing = chosen.find(c => c.item.id === item.id);
                    const qty = item.category === 'Beer' || item.category === 'Soft Drinks' ? (rng() < 0.4 ? 2 : 1) : 1;
                    if (existing)
                        existing.quantity += qty;
                    else
                        chosen.push({ item, quantity: qty });
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
                    : 26 + rng() * 12;
                const acknowledgedAt = new Date(created.getTime() + ackSec * 1000);
                const deliveredAt = new Date(Math.max(created.getTime() + driveMin * 60_000, acknowledgedAt.getTime() + 180_000));
                if (!cancelled && deliveredAt.getTime() > input.now.getTime() - 30_000)
                    continue;
                const driver = pick(staff);
                const prep = pick(staff);
                const location = mode === 'Beverage Cart' ? { deliveryHole: String(1 + Math.floor(rng() * 18)) } : { menuTypeLocation: pick(CLUBHOUSE_SPOTS) };
                const data = {
                    sellerId: DEMO_SEED_SELLER_ID,
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
                    ...(!cancelled && mode === 'Clubhouse' ? { preparedByStaffId: `seed-staff-${prep}`, preparedByStaffName: prep } : {}),
                    isDemoSeed: true,
                };
                orders.push({
                    id: `seed-${y}${String(m + 1).padStart(2, '0')}${String(d).padStart(2, '0')}-${code}-${n + 1}`,
                    createdAt: created,
                    ...(cancelled ? {} : { acknowledgedAt, deliveredAt }),
                    data,
                });
            }
        }
    }
    return orders;
}
//# sourceMappingURL=demo-seed.js.map