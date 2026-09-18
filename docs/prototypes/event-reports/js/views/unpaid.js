import * as store from '../store.js';
import { usd, esc, num } from '../format.js';
import { mountReport } from '../report-shell.js';
import { toast } from '../ui.js';

const AGE_BADGE = { over: 'b-danger', warn: 'b-warn', soon: 'b-warn', ok: 'b-ok' };

export default function unpaid(ctx, host) {
  mountReport(host, ctx, () => {
    const rows = store.unpaidInvoices(ctx.eventId).slice().sort((a, b) => b.ageDays - a.ageDays);
    const total = rows.reduce((a, r) => a + r.amount, 0);
    const atRisk = rows.filter((r) => r.ageBand === 'over');

    host.querySelector('#unpaidTotal').textContent = usd(total);
    host.querySelector('#unpaidCount').textContent = num(rows.length);
    host.querySelector('#unpaidRisk').textContent = usd(atRisk.reduce((a, r) => a + r.amount, 0));
    host.querySelector('#unpaidRiskCount').textContent = `${atRisk.length} invoice${atRisk.length === 1 ? '' : 's'}`;

    host.querySelector('#unpaidBody').innerHTML = rows.map((r) =>
      `<tr><td class="fw-semibold">${esc(r.number)}</td><td>${esc(r.buyer)}</td>
       <td class="text-secondary">${esc(store.event(r.eventId)?.name ?? '—')}</td>
       <td class="text-secondary">${esc(r.placedAt)}</td>
       <td class="num"><span class="badge-x ${AGE_BADGE[r.ageBand]}">${r.ageDays}d</span></td>
       <td class="num fw-semibold">${usd(r.amount)}</td>
       <td class="num"><button class="btn-ghost btn-remind" style="padding:5px 11px;"><i class="bi bi-send"></i> Remind</button></td></tr>`).join('');

    host.querySelectorAll('.btn-remind').forEach((b) =>
      b.addEventListener('click', () => toast('Payment reminder sent.')));
  });
}
