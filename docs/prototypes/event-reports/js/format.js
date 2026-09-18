export const usd = (n) => '$' + Math.round(n).toLocaleString('en-US');
export const num = (n) => Number(n).toLocaleString('en-US');
export const initials = (name) => name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

const AMP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => AMP[c]);

export const STATUS_BADGE = {
  Paid: 'b-ok', Pending: 'b-warn', Refunded: 'b-danger', 'In transit': 'b-info',
};

export function pct(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}
