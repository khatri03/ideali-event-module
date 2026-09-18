import * as store from '../store.js';
import * as charts from '../charts.js';
import { usd, esc, num } from '../format.js';
import { mountReport } from '../report-shell.js';

export default function refunds(ctx, host) {
  mountReport(host, ctx, () => {
    const rows = store.refunds(ctx.eventId);
    const total = rows.reduce((a, r) => a + r.amount, 0);
    const cancellations = rows.filter((r) => r.kind === 'Cancellation').length;
    const avg = rows.length ? total / rows.length : 0;

    host.querySelector('#rfTotal').textContent = usd(total);
    host.querySelector('#rfCount').textContent = `${rows.length} orders`;
    host.querySelector('#rfCancellations').textContent = num(cancellations);
    host.querySelector('#rfAvg').textContent = usd(avg);

    host.querySelector('#refundsBody').innerHTML = rows.map((r) =>
      `<tr><td class="fw-semibold">${esc(r.invoice)}</td><td>${esc(r.buyer)}</td>
       <td class="text-secondary">${esc(r.reason)}</td>
       <td><span class="badge-x ${r.kind === 'Refund' ? 'b-danger' : 'b-warn'}">${r.kind}</span></td>
       <td class="text-secondary">${esc(r.at)}</td>
       <td class="num fw-semibold text-danger">−${usd(r.amount)}</td></tr>`).join('');

    charts.refundTrend('chartRefundTrend');
    charts.reasons('chartReasons', 'reasonLegend');
  });
}
