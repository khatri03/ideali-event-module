import * as store from '../store.js';
import * as charts from '../charts.js';
import { esc, num, pct } from '../format.js';
import { mountReport } from '../report-shell.js';
import { toast } from '../ui.js';

const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

export default function attendance(ctx, host) {
  mountReport(host, ctx, () => {
    const rows = store.attendance(ctx.eventId, ctx.sessionId);
    const sold = rows.reduce((a, r) => a + r.sold, 0);
    const inCount = rows.reduce((a, r) => a + r.checkedIn, 0);

    host.querySelector('#attCheckedIn').textContent = num(inCount);
    host.querySelector('#attCheckedInPct').textContent = `${pct(inCount, sold)}% of expected`;
    host.querySelector('#attNotArrived').textContent = num(sold - inCount);

    host.querySelector('#attendanceBody').innerHTML = rows.map((r) => {
      const rate = pct(r.checkedIn, r.sold);
      return `<tr><td class="fw-semibold">${esc(r.name)}</td>
       <td class="text-secondary">${fmtTime(r.startsAt)}</td>
       <td class="num">${num(r.sold)}</td><td class="num">${num(r.checkedIn)}</td>
       <td><div class="d-flex align-items-center gap-2"><div class="progress-x flex-grow-1"><span style="width:${rate}%"></span></div>
       <span style="font-size:12.5px;font-weight:600;min-width:34px;">${rate}%</span></div></td></tr>`;
    }).join('');

    host.querySelector('#sessionRates').innerHTML = rows.map((r) => {
      const rate = pct(r.checkedIn, r.sold);
      return `<div class="d-flex justify-content-between align-items-center mb-3">
        <div><div style="font-size:13.5px;font-weight:600;">${esc(r.name)}</div>
        <div style="font-size:12px;color:var(--muted);">${r.checkedIn} of ${r.sold}</div></div>
        <span class="badge-x ${rate >= 60 ? 'b-ok' : rate >= 30 ? 'b-warn' : 'b-muted'}">${rate}%</span></div>`;
    }).join('');

    charts.checkin('chartCheckin');
    host.querySelector('#liveCheckinBtn')?.addEventListener('click', () => toast('Opening live check-in scanner…'));
  });
}
