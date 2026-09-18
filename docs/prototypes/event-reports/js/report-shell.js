import { esc } from './format.js';

/*
 * Applies the optional-GUID run rule to a report partial.
 * Partial must contain [data-results] and [data-primed] with a [data-run] button.
 * ctx.shouldRun true (event GUID in route) -> fill immediately.
 * false (no GUID) -> show primed panel; fill only when the user clicks Run.
 */
export function mountReport(host, ctx, fill) {
  const results = host.querySelector('[data-results]');
  const primed = host.querySelector('[data-primed]');
  const runBtn = host.querySelector('[data-run]');
  const context = host.querySelector('[data-context]');

  if (context) {
    context.innerHTML = ctx.event
      ? `<span class="context-chip"><i class="bi bi-calendar-event"></i> ${esc(ctx.event.name)}${ctx.session ? ' · ' + esc(ctx.session.name) : ''}
           <a class="x" href="#/reports/${esc(ctx.report)}" title="Clear event filter"><i class="bi bi-x-lg"></i></a></span>`
      : '<span class="text-secondary" style="font-size:12.5px;">All events</span>';
  }

  let ran = false;
  const run = () => {
    if (ran) return;
    ran = true;
    if (primed) primed.hidden = true;
    if (results) results.hidden = false;
    fill();
  };

  if (ctx.shouldRun) {
    run();
  } else {
    if (results) results.hidden = true;
    if (primed) primed.hidden = false;
    if (runBtn) runBtn.addEventListener('click', run);
  }
}
