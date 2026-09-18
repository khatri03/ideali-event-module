import * as store from '../store.js';
import * as charts from '../charts.js';
import { usd, esc, num } from '../format.js';
import { mountReport } from '../report-shell.js';

export default function sales(ctx, host) {
  mountReport(host, ctx, () => {
    const rows = store.salesByType(ctx.eventId);
    const gross = rows.reduce((a, r) => a + r.gross, 0);
    const refunds = rows.reduce((a, r) => a + r.refunds, 0);
    const take = gross * 0.05;
    const fees = gross * 0.0133;
    const net = gross - take - fees;

    host.querySelector('#kpiGross').textContent = usd(gross);
    host.querySelector('#kpiTake').textContent = usd(take);
    host.querySelector('#kpiFees').textContent = usd(fees);
    host.querySelector('#kpiNet').textContent = usd(net);

    host.querySelector('#salesByType').innerHTML = rows.map((r) =>
      `<tr><td class="fw-semibold">${esc(r.type)}</td>
       <td class="num">${num(r.sold)}</td>
       <td class="num">${usd(r.gross)}</td>
       <td class="num text-danger">${r.refunds ? '−' + usd(r.refunds) : '—'}</td>
       <td class="num fw-semibold">${usd(r.net)}</td></tr>`).join('');

    charts.salesTrend('chartSalesTrend');
    charts.channel('chartChannel');
  });
}
