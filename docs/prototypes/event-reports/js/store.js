/* Loads db.json once, exposes read-only getters filtered by event / session. */

let db = null;

export async function load() {
  if (db) return db;
  const res = await fetch('db.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`db.json failed to load (${res.status})`);
  db = await res.json();
  return db;
}

const byEvent = (rows, eventId) => (eventId ? rows.filter((r) => r.eventId === eventId) : rows.slice());
const bySession = (rows, sessionId) => (sessionId ? rows.filter((r) => r.sessionId === sessionId) : rows);

export const reports = () => db.reports.slice();
export const reportsForScope = (scope) => db.reports.filter((r) => r.scope === scope);
export const report = (key) => db.reports.find((r) => r.key === key) || null;

export const events = () => db.events.slice();
export const event = (id) => db.events.find((e) => e.id === id) || null;

export const sessions = (eventId) => byEvent(db.sessions, eventId);
export const session = (id) => db.sessions.find((s) => s.id === id) || null;

export const invoices = (eventId) => byEvent(db.invoices, eventId);
export const unpaidInvoices = (eventId) => byEvent(db.unpaidInvoices, eventId);
export const salesByType = (eventId) => byEvent(db.salesByType, eventId);
export const refunds = (eventId) => byEvent(db.refunds, eventId);
export const coupons = (eventId) => byEvent(db.coupons, eventId);
export const payouts = () => db.payouts.slice();

export const sellthrough = (eventId, sessionId) => bySession(byEvent(db.sellthrough, eventId), sessionId);
export const attendees = (eventId, sessionId) => bySession(byEvent(db.attendees, eventId), sessionId);

/* Attendance is derived from session capacity/check-in counts. */
export function attendance(eventId, sessionId) {
  let rows = byEvent(db.sessions, eventId);
  if (sessionId) rows = rows.filter((s) => s.id === sessionId);
  return rows.map((s) => ({
    sessionId: s.id,
    name: s.name,
    startsAt: s.startsAt,
    sold: s.capacity,
    checkedIn: s.checkedIn,
  }));
}
