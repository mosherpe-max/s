// Pure helpers behind the order timing records (orderTimings/{orderId}): what each order looked like
// when it was placed, when each step happened, and a first check of whether the data can be trusted.
// Kept free of Firebase so it can be tested directly. See recordOrderTiming in index.ts.
export const IN_PROGRESS_STATUSES = ['Placed', 'Preparing', 'Out for Delivery'];
// Same food / beverage grouping as CATEGORY_SUPERTYPE in src/lib/types.ts (functions/ is a separate
// project and can't import from src/).
const FOOD_CATEGORIES = new Set(['Snacks', 'Handhelds', 'Appetizers', 'Entrees', 'Pizza', 'Salad', 'Dessert', 'Kids']);
const DRINK_CATEGORIES = new Set(['Beer', 'Spirits', 'Soft Drinks']);
export const TIMING_TIME_ZONE = 'America/New_York';
export function summarizeItems(items) {
    const list = Array.isArray(items) ? items : [];
    let quantity = 0, modifierCount = 0, foodCount = 0, drinkCount = 0;
    for (const item of list) {
        const qty = Number.isFinite(item?.quantity) && item.quantity > 0 ? item.quantity : 1;
        quantity += qty;
        if (item?.selectedModifiers) {
            for (const options of Object.values(item.selectedModifiers))
                modifierCount += Array.isArray(options) ? options.length : 0;
        }
        if (item?.category && FOOD_CATEGORIES.has(item.category))
            foodCount += qty;
        else if (item?.category && DRINK_CATEGORIES.has(item.category))
            drinkCount += qty;
    }
    return { itemCount: list.length, quantity, modifierCount, foodCount, drinkCount, hasFood: foodCount > 0, hasDrink: drinkCount > 0 };
}
// About 10 metres. Enough to work out distances, and less precise than the exact fix.
export function roundCoord(value) {
    return typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 1e4) / 1e4 : null;
}
// GPS is the normal case. A hole is only given when the patron won't share their location.
export function placementLocation(order) {
    const lat = roundCoord(order.deliveryLocation?.latitude);
    const lng = roundCoord(order.deliveryLocation?.longitude);
    if (lat !== null && lng !== null)
        return { source: 'gps', hole: order.deliveryHole || null, lat, lng };
    if (order.deliveryHole)
        return { source: 'hole', hole: order.deliveryHole, lat: null, lng: null };
    return { source: 'none', hole: null, lat: null, lng: null };
}
// Local date, hour and weekday in the venues' time zone (all current venues are in Michigan).
export function localTimeParts(date, timeZone = TIMING_TIME_ZONE) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short',
    }).formatToParts(date);
    const get = (type) => parts.find(p => p.type === type)?.value || '';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
        localDate: `${get('year')}-${get('month')}-${get('day')}`,
        localHour: parseInt(get('hour'), 10) % 24,
        dayOfWeek: dayNames.indexOf(get('weekday')),
    };
}
// The nightly reset cancels any order still open (see performOperationalReset in index.ts). Those are not real
// cancellations and must never count as one.
export function cancelReasonOf(order) {
    return typeof order.notes === 'string' && order.notes.startsWith('Operational Reset') ? 'operational-reset' : 'other';
}
// Which seller flags belong to which service mode.
export function modeFlagPrefix(menuType) {
    if (menuType === 'Beverage Cart')
        return 'bevcart';
    if (menuType === 'Clubhouse')
        return 'clubhouse';
    if (menuType === 'Lane Delivery')
        return 'lanedelivery';
    return null;
}
export const isDemoSeller = (sellerId, venueIsDemo) => !!venueIsDemo || sellerId.startsWith('demo-');
const diffSec = (from, to) => typeof from === 'number' && typeof to === 'number' && to >= from ? Math.round((to - from) / 1000) : null;
// Total time, time to acknowledge, time preparing, and time from leaving to delivered.
export function computeDurations(t) {
    return {
        totalSec: diffSec(t.placed, t.delivered),
        ackSec: diffSec(t.placed, t.acknowledged ?? t.preparing),
        prepSec: diffSec(t.preparing ?? t.acknowledged, t.outForDelivery),
        deliverySec: diffSec(t.outForDelivery, t.delivered),
    };
}
// Staff sometimes tap through the steps in a row, which makes the step times meaningless for modelling.
export function suspectReasons(t) {
    const reasons = [];
    const total = diffSec(t.placed, t.delivered);
    if (total !== null && total < 30)
        reasons.push('delivered-under-30s-after-placed');
    const prepToOut = diffSec(t.preparing ?? t.acknowledged, t.outForDelivery);
    if (prepToOut !== null && prepToOut < 5)
        reasons.push('out-for-delivery-under-5s-after-preparing');
    const outToDelivered = diffSec(t.outForDelivery, t.delivered);
    if (outToDelivered !== null && outToDelivered < 5)
        reasons.push('delivered-under-5s-after-out-for-delivery');
    if (typeof t.delivered === 'number' && typeof t.placed === 'number' && t.delivered < t.placed)
        reasons.push('delivered-before-placed');
    return reasons;
}
// Whether a record should be left out of analysis. Demo venues, nightly-reset cancellations and
// suspicious step times are excluded; the record itself is still kept.
export function isExcluded(r) {
    return !!r.isDemo || r.cancelReason === 'operational-reset' || !!r.suspect;
}
//# sourceMappingURL=order-timing.js.map