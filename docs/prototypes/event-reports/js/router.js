import * as store from './store.js';
import { destroyAll } from './charts.js';

const REPORT_KEYS = ['sales', 'orders', 'unpaid', 'attendance', 'sellthrough', 'refunds', 'coupons'];
const PLAIN_META = {
  dashboard: ['Dashboard', 'Performance across your events'],
  events: ['Events', 'Pick an event to jump into its reports'],
  sessions: ['Sessions', 'Per-session attendance and sell-through'],
  payouts: ['Payouts', 'Transfers to your connected account'],
  attendees: ['Attendees', 'Ticket holders and their check-in state'],
};

function parse() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  const seg = path.split('/').filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(qs || ''));

  if (seg[0] === 'events' && seg[1] && seg[2] === 'sessions' && seg[4] === 'reports') {
    return { report: seg[5], eventId: seg[1], sessionId: seg[3], query };
  }
  if (seg[0] === 'events' && seg[1] && seg[2] === 'reports') {
    return { report: seg[3], eventId: seg[1], sessionId: null, query };
  }
  if (seg[0] === 'reports' && seg[1]) {
    return { report: seg[1], eventId: null, sessionId: null, query };
  }
  const view = seg[0] || 'dashboard';
  return { view, eventId: null, sessionId: null, query };
}

async function loadPartial(name) {
  const res = await fetch(`views/${name}.html`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`view ${name} missing (${res.status})`);
  return res.text();
}

function setChrome(title, sub, activeKey) {
  document.getElementById('viewTitle').textContent = title;
  document.getElementById('viewSub').textContent = sub;
  document.querySelectorAll('.nav-link').forEach((a) => {
    a.classList.toggle('active', a.dataset.nav === activeKey);
  });
}

function syncPicker(eventId) {
  const picker = document.getElementById('eventPicker');
  if (picker) picker.value = eventId || 'all';
}

export function init(controllers) {
  const host = document.getElementById('viewHost');

  async function route() {
    const r = parse();
    destroyAll();

    let key = r.report || r.view;
    const isReport = REPORT_KEYS.includes(r.report);

    // Guard: unknown key, or a route GUID that resolves to no event.
    if (!controllers[key]) key = 'dashboard';
    const eventOk = !r.eventId || !!store.event(r.eventId);

    const ctx = {
      report: r.report,
      view: r.view,
      eventId: eventOk ? r.eventId : null,
      sessionId: r.sessionId,
      query: r.query,
      event: eventOk && r.eventId ? store.event(r.eventId) : null,
      session: r.sessionId ? store.session(r.sessionId) : null,
      shouldRun: isReport ? eventOk && !!r.eventId : true,
      navKey: isReport ? r.report : key,
      notFound: !eventOk,
    };

    if (isReport) {
      const def = store.report(r.report);
      setChrome(def.label, def.sub, ctx.navKey);
    } else {
      const meta = PLAIN_META[key] || PLAIN_META.dashboard;
      setChrome(meta[0], meta[1], ctx.navKey);
    }
    syncPicker(ctx.eventId);

    host.innerHTML = '<div class="view-skeleton"><i class="bi bi-arrow-repeat"></i> Loading…</div>';
    try {
      const markup = await loadPartial(key);
      host.innerHTML = markup;
      if (ctx.notFound) {
        host.querySelector('[data-context]')?.insertAdjacentHTML('afterbegin',
          '<span class="badge-x b-danger"><i class="bi bi-exclamation-triangle"></i> Event not found — showing all events</span> ');
      }
      await controllers[key](ctx, host);
    } catch (err) {
      host.innerHTML = `<div class="empty-state"><i class="bi bi-plug"></i>
        <p class="mt-2 mb-1">Could not load this view.</p>
        <p class="mb-0" style="font-size:12.5px;">${err.message}. Serve the folder over http (not file://).</p></div>`;
    }
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('backdrop')?.classList.remove('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  window.addEventListener('hashchange', route);
  if (!location.hash) location.hash = '#/dashboard';
  route();
}
