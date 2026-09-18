import * as store from '../store.js';
import { esc, initials, num } from '../format.js';
import { reportMenu } from '../ui.js';

const STATUS = {
  ongoing: ['b-ok', 'Ongoing'], published: ['b-info', 'Published'],
  draft: ['b-muted', 'Draft'], completed: ['b-muted', 'Completed'], cancelled: ['b-danger', 'Cancelled'],
};

export default function events(_ctx, host) {
  const grid = host.querySelector('#eventsGrid');
  const menuReports = store.reportsForScope('event');

  grid.innerHTML = store.events().map((e) => {
    const pct = Math.round((e.sold / e.capacity) * 100);
    const st = STATUS[e.status] || STATUS.draft;
    const menu = reportMenu(menuReports, (r) => `#/events/${e.id}/reports/${r.key}`);
    return `<div class="col-12 col-md-6 col-xl-4">
      <div class="card-x event-card">
        <div class="head">
          <div class="thumb">${initials(e.name)}</div>
          <div style="min-width:0;">
            <div class="title">${esc(e.name)}</div>
            <div class="meta"><i class="bi bi-geo-alt"></i> ${esc(e.venue)}</div>
            <div class="meta"><i class="bi bi-people"></i> ${num(e.sold)} / ${num(e.capacity)} sold · ${pct}%</div>
          </div>
          <span class="badge-x ${st[0]} ms-auto">${st[1]}</span>
        </div>
        <div class="progress-x"><span style="width:${pct}%"></span></div>
        <div class="foot">
          <a class="btn-brand" href="#/events/${e.id}/reports/sales"><i class="bi bi-graph-up-arrow"></i> Open reports</a>
          ${menu}
          <a class="btn-ghost ms-auto" href="#/sessions"><i class="bi bi-calendar3"></i> ${store.sessions(e.id).length} sessions</a>
        </div>
      </div>
    </div>`;
  }).join('');
}
