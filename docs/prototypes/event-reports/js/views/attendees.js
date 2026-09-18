import * as store from '../store.js';
import { esc, initials } from '../format.js';
import { toast } from '../ui.js';

export default function attendees(ctx, host) {
  const all = store.attendees(ctx.eventId, ctx.sessionId);

  const draw = () => {
    const q = host.querySelector('#attendeeSearch').value.toLowerCase().trim();
    const rows = all.filter((a) => !q || (a.name + ' ' + a.email).toLowerCase().includes(q));
    host.querySelector('#attendeesBody').innerHTML = rows.map((r) =>
      `<tr>
       <td><span class="avatar-sm">${initials(r.name)}</span><span class="fw-semibold">${esc(r.name)}</span>
        <div style="font-size:12px;color:var(--muted);margin-left:39px;">${esc(r.email)}</div></td>
       <td class="text-secondary">${esc(r.type)}</td><td class="text-secondary">${esc(r.seat)}</td>
       <td class="text-secondary">${esc(r.invoice)}</td>
       <td>${r.checkedIn ? '<span class="badge-x b-ok"><i class="bi bi-check-lg"></i> Checked in</span>' : '<span class="badge-x b-muted">Not arrived</span>'}</td></tr>`).join('');
    host.querySelector('#attendeesEmpty').hidden = rows.length > 0;
  };

  host.querySelector('#attendeeSearch').addEventListener('input', draw);
  host.querySelector('#attendeeExport')?.addEventListener('click', () => toast('Export queued — CSV will download shortly.'));
  draw();
}
