import * as store from './store.js';
import { init } from './router.js';
import { toast } from './ui.js';

import dashboard from './views/dashboard.js';
import events from './views/events.js';
import sessions from './views/sessions.js';
import sales from './views/sales.js';
import orders from './views/orders.js';
import unpaid from './views/unpaid.js';
import attendance from './views/attendance.js';
import sellthrough from './views/sellthrough.js';
import refunds from './views/refunds.js';
import coupons from './views/coupons.js';
import payouts from './views/payouts.js';
import attendees from './views/attendees.js';

const controllers = {
  dashboard, events, sessions, sales, orders, unpaid,
  attendance, sellthrough, refunds, coupons, payouts, attendees,
};

const REPORT_KEYS = ['sales', 'orders', 'unpaid', 'attendance', 'sellthrough', 'refunds', 'coupons'];

function currentReport() {
  const seg = location.hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean);
  const idx = seg.indexOf('reports');
  return idx >= 0 ? seg[idx + 1] : null;
}

function wireShell() {
  const picker = document.getElementById('eventPicker');
  picker.addEventListener('change', () => {
    const report = currentReport();
    const eventId = picker.value;
    if (report && REPORT_KEYS.includes(report)) {
      location.hash = eventId === 'all' ? `#/reports/${report}` : `#/events/${eventId}/reports/${report}`;
    } else {
      toast(`Filter: ${picker.options[picker.selectedIndex].text}`);
    }
  });

  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('backdrop').classList.add('show');
  });
  document.getElementById('backdrop').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('backdrop').classList.remove('show');
  });
  document.getElementById('exportBtn').addEventListener('click', () => toast('Export queued — CSV will download shortly.'));
}

function fillEventPicker() {
  const picker = document.getElementById('eventPicker');
  picker.innerHTML = '<option value="all">All events</option>'
    + store.events().map((e) => `<option value="${e.id}">${e.name}</option>`).join('');
}

(async function boot() {
  try {
    await store.load();
  } catch (err) {
    document.getElementById('viewHost').innerHTML =
      `<div class="empty-state"><i class="bi bi-database-x"></i>
        <p class="mt-2 mb-1">Prototype data failed to load.</p>
        <p class="mb-0" style="font-size:12.5px;">${err.message}. Serve this folder over http — e.g. <code>python -m http.server</code> — not file://.</p></div>`;
    return;
  }
  fillEventPicker();
  wireShell();
  init(controllers);
})();
