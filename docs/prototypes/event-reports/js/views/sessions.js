import * as store from '../store.js';
import { esc, num, pct } from '../format.js';
import { reportMenu } from '../ui.js';

const fmtTime = (iso) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function sessions(_ctx, host) {
  const body = host.querySelector('#sessionsBody');
  const menuReports = store.reportsForScope('session');

  const rows = store.events().flatMap((e) =>
    store.sessions(e.id).map((s) => ({ event: e, session: s })));

  body.innerHTML = rows.map(({ event, session }) => {
    const rate = pct(session.checkedIn, session.capacity);
    const menu = reportMenu(menuReports, (r) => `#/events/${event.id}/sessions/${session.id}/reports/${r.key}`);
    return `<tr>
      <td><span class="fw-semibold">${esc(session.name)}</span>
        <div style="font-size:12px;color:var(--muted);">${esc(event.name)}</div></td>
      <td class="text-secondary">${fmtTime(session.startsAt)}</td>
      <td class="num">${num(session.capacity)}</td>
      <td class="num">${num(session.checkedIn)}</td>
      <td><div class="d-flex align-items-center gap-2" style="min-width:150px;">
        <div class="progress-x flex-grow-1"><span style="width:${rate}%"></span></div>
        <span style="font-size:12.5px;font-weight:600;min-width:34px;">${rate}%</span></div></td>
      <td class="text-end">${menu}</td>
    </tr>`;
  }).join('');
}
