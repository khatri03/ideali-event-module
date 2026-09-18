import * as store from '../store.js';
import { usd, esc, initials, STATUS_BADGE } from '../format.js';
import { mountReport } from '../report-shell.js';

export default function orders(ctx, host) {
  mountReport(host, ctx, () => {
    const all = store.invoices(ctx.eventId);

    const draw = () => {
      const status = host.querySelector('#orderFilter button.active').dataset.status;
      const q = host.querySelector('#orderSearch').value.toLowerCase().trim();
      const rows = all.filter((o) =>
        (status === 'all' || o.status === status)
        && (!q || (o.number + ' ' + o.buyer).toLowerCase().includes(q)));

      host.querySelector('#ordersBody').innerHTML = rows.map((o) => {
        const cls = STATUS_BADGE[o.status] || 'b-muted';
        return `<tr>
          <td><span class="fw-semibold">${esc(o.number)}</span></td>
          <td><span class="avatar-sm">${initials(o.buyer)}</span>${esc(o.buyer)}</td>
          <td class="text-secondary">${esc(store.event(o.eventId)?.name ?? '—')}</td>
          <td><span class="badge-x b-muted">${esc(o.method)}</span></td>
          <td class="text-secondary">${esc(o.placedAt)}</td>
          <td><span class="badge-x ${cls}"><span class="dot"></span>${o.status}</span></td>
          <td class="num fw-semibold">${usd(o.amount)}</td></tr>`;
      }).join('');
      host.querySelector('#ordersEmpty').hidden = rows.length > 0;
    };

    host.querySelectorAll('#orderFilter button').forEach((b) => b.addEventListener('click', () => {
      host.querySelectorAll('#orderFilter button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      draw();
    }));
    host.querySelector('#orderSearch').addEventListener('input', draw);
    draw();
  });
}
