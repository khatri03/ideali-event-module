import * as store from '../store.js';
import { usd, esc } from '../format.js';

const BADGE = { Paid: 'b-ok', 'In transit': 'b-info' };

export default function payouts(_ctx, host) {
  host.querySelector('#payoutsBody').innerHTML = store.payouts().map((r) =>
    `<tr><td class="fw-semibold">${esc(r.number)}</td><td class="text-secondary">${esc(r.period)}</td>
     <td><span class="badge-x b-muted">${esc(r.method)}</span></td>
     <td class="text-secondary">${esc(r.at)}</td>
     <td><span class="badge-x ${BADGE[r.status] || 'b-muted'}"><span class="dot"></span>${r.status}</span></td>
     <td class="num fw-semibold">${usd(r.amount)}</td></tr>`).join('');
}
