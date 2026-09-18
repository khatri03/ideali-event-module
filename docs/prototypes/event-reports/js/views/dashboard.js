import * as store from '../store.js';
import * as charts from '../charts.js';
import { usd, initials, esc, STATUS_BADGE } from '../format.js';

export default function dashboard() {
  const orders = store.invoices();
  document.getElementById('recentOrders').innerHTML = orders.slice(0, 6).map((o) =>
    `<tr><td><span class="avatar-sm">${initials(o.buyer)}</span>${esc(o.buyer)}</td>
     <td class="text-secondary">${esc(store.event(o.eventId)?.name ?? '—')}</td>
     <td><span class="badge-x ${STATUS_BADGE[o.status] || 'b-muted'}"><span class="dot"></span>${o.status}</span></td>
     <td class="num fw-semibold">${usd(o.amount)}</td></tr>`).join('');

  document.getElementById('sellSnapshot').innerHTML = store.events().map((e) => {
    const pct = Math.round((e.sold / e.capacity) * 100);
    return `<div class="mb-3">
      <div class="d-flex justify-content-between mb-1" style="font-size:13.5px;">
        <span class="fw-semibold">${esc(e.name)}</span>
        <span class="text-secondary">${e.sold.toLocaleString()} / ${e.capacity.toLocaleString()} · ${pct}%</span>
      </div><div class="progress-x"><span style="width:${pct}%"></span></div></div>`;
  }).join('');

  const seg = document.getElementById('revSeg');
  charts.revenue('chartRevenue', seg.querySelector('button.active').dataset.metric);
  seg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    seg.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    charts.revenue('chartRevenue', b.dataset.metric);
  }));

  const mix = store.salesByType(store.events()[0].id).map((r) => [r.type, r.sold]);
  charts.mix('chartMix', 'mixLegend', mix);
}
