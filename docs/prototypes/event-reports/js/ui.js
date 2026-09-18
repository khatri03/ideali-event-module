export function toast(msg) {
  const host = document.getElementById('toastHost');
  const el = document.createElement('div');
  el.className = 'toast-x';
  el.innerHTML = `<i class="bi bi-check-circle-fill" style="color:#4ade80;"></i>${msg}`;
  host.appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .2s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 220); }, 2600);
}

/* Builds the scope-aware "Reports" dropdown menu for an event or session row. */
export function reportMenu(reports, hrefFor) {
  const items = reports.map((r) =>
    `<li><a class="dropdown-item" href="${hrefFor(r)}"><i class="bi bi-file-earmark-bar-graph"></i> ${r.label}</a></li>`).join('');
  return `<div class="dropdown">
    <button class="btn-ghost dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
      <i class="bi bi-file-earmark-bar-graph"></i> Reports
    </button>
    <ul class="dropdown-menu dropdown-menu-end report-menu">
      <li class="dropdown-header">Jump to report</li>
      ${items}
    </ul>
  </div>`;
}
