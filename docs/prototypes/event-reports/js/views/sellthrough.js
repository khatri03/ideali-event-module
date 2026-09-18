import * as store from '../store.js';
import * as charts from '../charts.js';
import { esc, num, pct } from '../format.js';
import { mountReport } from '../report-shell.js';

export default function sellthrough(ctx, host) {
  mountReport(host, ctx, () => {
    const rows = store.sellthrough(ctx.eventId);
    const event = ctx.event || store.events()[0];
    const capacity = rows.reduce((a, r) => a + r.capacity, 0);
    const sold = rows.reduce((a, r) => a + r.sold, 0);
    const held = rows.reduce((a, r) => a + r.held, 0);
    const soldOutTypes = rows.filter((r) => r.capacity - r.sold - r.held <= 0).length;

    host.querySelector('#stOverall').textContent = `${pct(sold, capacity)}%`;
    host.querySelector('#stOverallSub').textContent = `${num(sold)} / ${num(capacity)}`;
    host.querySelector('#stHeld').textContent = num(held);
    host.querySelector('#stSoldOut').textContent = num(soldOutTypes);
    host.querySelector('#stSoldOutSub').textContent = `of ${rows.length}`;

    host.querySelector('#sellthroughBody').innerHTML = rows.map((r) => {
      const soldPct = (r.sold / r.capacity) * 100;
      const heldPct = (r.held / r.capacity) * 100;
      const avail = r.capacity - r.sold - r.held;
      const soldOut = avail <= 0;
      return `<div class="mb-3">
        <div class="d-flex justify-content-between mb-1" style="font-size:13.5px;">
          <span class="fw-semibold">${esc(r.type)} ${soldOut ? '<span class="badge-x b-danger ms-1">Sold out</span>' : ''}</span>
          <span class="text-secondary">${num(r.sold)} sold · ${r.held} held · ${Math.max(avail, 0)} left</span>
        </div>
        <div class="progress-x" style="height:12px;"><div style="display:flex;height:100%;">
          <span style="width:${soldPct}%;background:linear-gradient(90deg,var(--brand),#8b5cf6);"></span>
          <span style="width:${heldPct}%;background:#fbbf24;"></span>
        </div></div></div>`;
    }).join('') + `<div class="legend mt-3">
      <span class="k"><span class="swatch" style="background:var(--brand);"></span> Sold</span>
      <span class="k"><span class="swatch" style="background:#fbbf24;"></span> Held (Seats.io)</span>
      <span class="k"><span class="swatch" style="background:#eef1f6;"></span> Available</span></div>`;

    charts.pace('chartPace', event.capacity);
  });
}
