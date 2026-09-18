/* Chart.js builders. Each destroys any prior instance under the same key. */

const PALETTE = ['#5b5bd6', '#8b5cf6', '#0891b2', '#16a34a', '#d97706', '#dc2626', '#db2777'];
const GRID = '#eef1f6';

Chart.defaults.font.family = 'Inter, sans-serif';
Chart.defaults.color = '#64748b';
Chart.defaults.font.size = 12;

const live = {};
function destroy(id) { if (live[id]) { live[id].destroy(); delete live[id]; } }

/* Called before a view swap so stale canvases never leak. */
export function destroyAll() { Object.keys(live).forEach(destroy); }

function areaGradient(ctx, color) {
  const g = ctx.createLinearGradient(0, 0, 0, 260);
  g.addColorStop(0, color + '33');
  g.addColorStop(1, color + '00');
  return g;
}

const baseLine = (extra) => Object.assign({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
    y: { grid: { color: GRID }, border: { display: false }, ticks: { callback: (v) => '$' + v / 1000 + 'k' } },
  },
}, extra || {});

export const days30 = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2026, 7, 18 + i);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
});
export const grossSeries = [4100, 5200, 4800, 6100, 7200, 9800, 11200, 8600, 7400, 6900, 8100, 9200, 10400, 12800, 14100, 9600, 8200, 7600, 8900, 10200, 11800, 13400, 15200, 11600, 9800, 8700, 9900, 11400, 12900, 14600];
export const netSeries = grossSeries.map((v) => Math.round(v * 0.937));

export function revenue(canvasId, metric) {
  destroy(canvasId);
  const ctx = document.getElementById(canvasId).getContext('2d');
  const ds = [];
  if (metric !== 'net') ds.push({ label: 'Gross', data: grossSeries, borderColor: '#5b5bd6', backgroundColor: areaGradient(ctx, '#5b5bd6'), fill: true, tension: .38, borderWidth: 2, pointRadius: 0 });
  if (metric !== 'gross') ds.push({ label: 'Net', data: netSeries, borderColor: '#16a34a', backgroundColor: areaGradient(ctx, '#16a34a'), fill: metric === 'net', tension: .38, borderWidth: 2, pointRadius: 0 });
  live[canvasId] = new Chart(ctx, { type: 'line', data: { labels: days30, datasets: ds }, options: baseLine() });
}

export function mix(canvasId, legendId, rows) {
  destroy(canvasId);
  live[canvasId] = new Chart(document.getElementById(canvasId), {
    type: 'doughnut',
    data: { labels: rows.map((m) => m[0]), datasets: [{ data: rows.map((m) => m[1]), backgroundColor: PALETTE, borderWidth: 0, hoverOffset: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '66%', plugins: { legend: { display: false } } },
  });
  document.getElementById(legendId).innerHTML = rows.map((m, i) =>
    `<span class="k"><span class="swatch" style="background:${PALETTE[i]}"></span>${m[0]}</span>`).join('');
}

export function salesTrend(canvasId) {
  destroy(canvasId);
  const ctx = document.getElementById(canvasId).getContext('2d');
  live[canvasId] = new Chart(ctx, {
    type: 'line',
    data: { labels: days30, datasets: [{ label: 'Gross', data: grossSeries, borderColor: '#5b5bd6', backgroundColor: areaGradient(ctx, '#5b5bd6'), fill: true, tension: .38, borderWidth: 2, pointRadius: 0 }] },
    options: baseLine(),
  });
}

export function channel(canvasId) {
  destroy(canvasId);
  live[canvasId] = new Chart(document.getElementById(canvasId), {
    type: 'bar',
    data: { labels: ['Direct', 'Email', 'Social', 'Partner', 'Widget'], datasets: [{ data: [98400, 62200, 41800, 28600, 17930], backgroundColor: '#5b5bd6', borderRadius: 8, barThickness: 34 }] },
    options: baseLine({ scales: { x: { grid: { display: false } }, y: { grid: { color: GRID }, border: { display: false }, ticks: { callback: (v) => '$' + v / 1000 + 'k' } } } }),
  });
}

export function checkin(canvasId) {
  destroy(canvasId);
  const labels = ['08:00', '08:15', '08:30', '08:45', '09:00', '09:15', '09:30', '10:00', '10:30', '11:00', '13:00', '16:00'];
  live[canvasId] = new Chart(document.getElementById(canvasId), {
    type: 'bar',
    data: { labels, datasets: [{ data: [80, 240, 412, 360, 280, 190, 150, 220, 140, 90, 96, 52], backgroundColor: '#0891b2', borderRadius: 6, barThickness: 18 }] },
    options: baseLine({ scales: { x: { grid: { display: false } }, y: { grid: { color: GRID }, border: { display: false }, ticks: {} } } }),
  });
}

export function pace(canvasId, capacity) {
  destroy(canvasId);
  const labels = Array.from({ length: 12 }, (_, i) => 'Wk ' + (i + 1));
  const cumulative = [120, 340, 610, 980, 1420, 1980, 2540, 3080, 3520, 3860, 4060, 4182];
  live[canvasId] = new Chart(document.getElementById(canvasId), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Sold', data: cumulative, borderColor: '#5b5bd6', backgroundColor: 'transparent', tension: .35, borderWidth: 2.5, pointRadius: 0 },
        { label: 'Capacity', data: labels.map(() => capacity), borderColor: '#cbd5e1', borderDash: [6, 6], borderWidth: 1.5, pointRadius: 0 },
      ],
    },
    options: baseLine({ scales: { x: { grid: { display: false } }, y: { grid: { color: GRID }, border: { display: false }, ticks: { callback: (v) => (v / 1000) + 'k' } } } }),
  });
}

export function refundTrend(canvasId) {
  destroy(canvasId);
  live[canvasId] = new Chart(document.getElementById(canvasId), {
    type: 'bar',
    data: { labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6'], datasets: [{ data: [640, 980, 1200, 760, 1440, 1390], backgroundColor: '#dc2626', borderRadius: 8, barThickness: 30 }] },
    options: baseLine({ scales: { x: { grid: { display: false } }, y: { grid: { color: GRID }, border: { display: false }, ticks: { callback: (v) => '$' + v } } } }),
  });
}

export function reasons(canvasId, legendId) {
  destroy(canvasId);
  const rows = [['Could not attend', 14], ['Event changed', 9], ['Wrong tier', 7], ['Duplicate', 4], ['Other', 3]];
  live[canvasId] = new Chart(document.getElementById(canvasId), {
    type: 'doughnut',
    data: { labels: rows.map((r) => r[0]), datasets: [{ data: rows.map((r) => r[1]), backgroundColor: PALETTE, borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '64%', plugins: { legend: { display: false } } },
  });
  document.getElementById(legendId).innerHTML = rows.map((r, i) =>
    `<span class="k"><span class="swatch" style="background:${PALETTE[i]}"></span>${r[0]}</span>`).join('');
}

export function couponBars(canvasId, rows) {
  destroy(canvasId);
  const active = rows.filter((c) => c.redemptions > 0);
  live[canvasId] = new Chart(document.getElementById(canvasId), {
    type: 'bar',
    data: { labels: active.map((c) => c.code), datasets: [{ data: active.map((c) => c.redemptions), backgroundColor: '#5b5bd6', borderRadius: 8, barThickness: 30 }] },
    options: Object.assign(baseLine(), {
      indexAxis: 'y',
      scales: { x: { grid: { color: GRID }, border: { display: false } }, y: { grid: { display: false } } },
    }),
  });
}

export { PALETTE };
