import * as store from '../store.js';
import * as charts from '../charts.js';
import { usd, esc, num } from '../format.js';
import { mountReport } from '../report-shell.js';

const STATE = { ok: ['b-ok', 'Active'], soon: ['b-warn', 'Expiring'], off: ['b-muted', 'Unused'] };

export default function coupons(ctx, host) {
  mountReport(host, ctx, () => {
    const rows = store.coupons(ctx.eventId);
    const redeemed = rows.reduce((a, r) => a + r.redemptions, 0);
    const revenue = rows.reduce((a, r) => a + r.revenue, 0);
    const active = rows.filter((r) => r.state !== 'off').length;

    host.querySelector('#cpRedeemed').textContent = num(redeemed);
    host.querySelector('#cpRevenue').textContent = usd(revenue);
    host.querySelector('#cpActive').textContent = num(active);

    host.querySelector('#couponsBody').innerHTML = rows.map((r) => {
      const st = STATE[r.state] || STATE.off;
      return `<tr><td><span class="badge-x b-info" style="font-family:monospace;">${esc(r.code)}</span></td>
       <td class="text-secondary">${esc(r.kind)}</td>
       <td class="num">${num(r.redemptions)}</td><td class="num">${usd(r.revenue)}</td>
       <td class="num">${esc(r.discountRate)}</td>
       <td><span class="badge-x ${st[0]}">${st[1]}</span></td></tr>`;
    }).join('');

    charts.couponBars('chartCoupon', rows);
  });
}
