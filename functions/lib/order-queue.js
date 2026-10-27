import { FieldValue } from "firebase-admin/firestore";
// orderQueue/{orderId} is a no-personal-info copy of each in-progress order (venue, service mode, status, placed
// time) so a patron can see their place in line without reading other patrons' orders. These are the rules for
// keeping it true to the orders, kept apart from index.ts so they can be tested.
export const QUEUE_STATUSES = ["Placed", "Preparing", "Out for Delivery"];
// What the queue should hold for this order. null: it should not be in the queue. undefined: not decided yet (a
// card order starts as a bare record from the payment webhook with no service mode, and joins once the patron's
// browser adds its details), so leave the queue as it is.
export function queueEntryFor(order) {
    if (!order || !QUEUE_STATUSES.includes(order.status))
        return null;
    if (!order.sellerId || !order.menuType)
        return undefined;
    return { sellerId: order.sellerId, menuType: order.menuType, status: order.status, createdAt: order.createdAt || FieldValue.serverTimestamp() };
}
// Brings one queue entry in line with its order, reading the order as it is right now. Doing this inside a
// transaction (rather than trusting the data on the change event) matters because change events for the same
// order are not guaranteed to be handled in the order they happened: a "Delivered" event could be handled before
// an earlier "Placed" one, and acting on the event data would leave a "Placed" entry in the queue for good.
export async function syncQueueEntry(db, orderId) {
    const orderRef = db.collection("orders").doc(orderId);
    const queueRef = db.collection("orderQueue").doc(orderId);
    await db.runTransaction(async (tx) => {
        const [snap, queued] = await Promise.all([tx.get(orderRef), tx.get(queueRef)]);
        const entry = queueEntryFor(snap.exists ? snap.data() : null);
        if (entry === undefined)
            return;
        if (entry === null) {
            if (queued.exists)
                tx.delete(queueRef);
            return;
        }
        // A patron's phone updates its order about every 30 seconds with GPS; nothing here changes then, so skip the write.
        const current = queued.data();
        if (current && current.status === entry.status && current.menuType === entry.menuType && current.sellerId === entry.sellerId && current.createdAt)
            return;
        tx.set(queueRef, entry);
    });
}
// Which orders have a queue entry that is missing, left over, or out of date. These are only candidates: each is
// re-checked against its order by syncQueueEntry before anything is changed.
export function queueMismatches(inProgress, queue) {
    const queued = new Map(queue.map((q) => [q.id, q.data]));
    const ids = new Set();
    const expected = new Set();
    for (const o of inProgress) {
        if (!o.data.sellerId || !o.data.menuType)
            continue;
        expected.add(o.id);
        const q = queued.get(o.id);
        if (!q || q.status !== o.data.status || q.menuType !== o.data.menuType || q.sellerId !== o.data.sellerId)
            ids.add(o.id);
    }
    for (const q of queue)
        if (!expected.has(q.id))
            ids.add(q.id);
    return Array.from(ids);
}
// A safety net that finds and fixes any queue entry that has drifted from its order, whatever the cause.
export async function reconcileOrderQueue(db) {
    const [ordersSnap, queueSnap] = await Promise.all([
        db.collection("orders").where("status", "in", QUEUE_STATUSES).get(),
        db.collection("orderQueue").get(),
    ]);
    const ids = queueMismatches(ordersSnap.docs.map((d) => ({ id: d.id, data: d.data() })), queueSnap.docs.map((d) => ({ id: d.id, data: d.data() })));
    for (const id of ids)
        await syncQueueEntry(db, id);
    return { checked: queueSnap.size, fixed: ids.length };
}
//# sourceMappingURL=order-queue.js.map