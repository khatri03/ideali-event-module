import { readFileSync, writeFileSync } from "node:fs"

const inventory = JSON.parse(readFileSync(new URL("./endpoints.reflected.json", import.meta.url), "utf8"))
const summaries = JSON.parse(readFileSync(new URL("./summaries.json", import.meta.url), "utf8"))
const { prose } = await import("./doc-copy.mjs")

const OUTPUT = process.argv[2]

const escape = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

const VERB_STYLE = {
  GET: "text-bg-primary",
  POST: "text-bg-success",
  PUT: "text-bg-warning",
  PATCH: "text-bg-warning",
  DELETE: "text-bg-danger",
}

function humanise(name) {
  return name
    .replace(/Async$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase())
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function accessBadge(action) {
  if (action.Anonymous) {
    return '<span class="badge text-bg-light border access-anon">Public</span>'
  }
  if (action.Policy) {
    return `<span class="badge text-bg-light border access-policy" title="Authorization policy">${escape(
      action.Policy.split(", ")[0]
    )}</span>`
  }
  if (action.RequiresAuth) {
    return '<span class="badge text-bg-light border">Signed in</span>'
  }
  return '<span class="badge text-bg-light border">Signed in</span>'
}

function parameterCell(action) {
  if (action.Parameters.length === 0) {
    return '<span class="text-body-secondary">—</span>'
  }

  return action.Parameters.map((parameter) => {
    const source = parameter.Source ? `<span class="param-source">${escape(parameter.Source.toLowerCase())}</span> ` : ""
    return `${source}<code>${escape(parameter.Name)}</code><span class="text-body-secondary"> : ${escape(
      parameter.Type
    )}</span>`
  }).join("<br>")
}

const areaOrder = prose.areas.map((area) => area.key)

const grouped = new Map()
for (const controller of inventory.Controllers) {
  if (!grouped.has(controller.Area)) grouped.set(controller.Area, [])
  grouped.get(controller.Area).push(controller)
}

const areas = [...grouped.keys()].sort((left, right) => {
  const leftIndex = areaOrder.indexOf(left)
  const rightIndex = areaOrder.indexOf(right)
  return (leftIndex < 0 ? 99 : leftIndex) - (rightIndex < 0 ? 99 : rightIndex) || left.localeCompare(right)
})

function renderController(controller) {
  const id = `c-${slug(controller.Area)}-${slug(controller.Name)}`
  const summary = summaries[controller.Name]
  const note = prose.controllerNotes[controller.Name]

  const rows = controller.Actions.map((action) => {
    const actionSummary = summaries[`${controller.Name}::${action.Name}`]
    return `
              <tr>
                <td class="text-nowrap"><span class="badge badge-method ${
                  VERB_STYLE[action.Verb] || "text-bg-secondary"
                }">${action.Verb}</span></td>
                <td><code class="path">${escape(action.Path)}</code>${
                  action.Flags.length
                    ? ` <span class="badge text-bg-light border flag" title="Extra filters on this endpoint">${escape(
                        action.Flags.join(" · ")
                      )}</span>`
                    : ""
                }${actionSummary ? `<div class="action-doc">${escape(actionSummary)}</div>` : ""}</td>
                <td>${escape(humanise(action.Name))}</td>
                <td>${accessBadge(action)}</td>
                <td class="small">${parameterCell(action)}</td>
              </tr>`
  }).join("")

  return `
        <article id="${id}" class="card mb-4 endpoint">
          <div class="card-header endpoint-head">
            <span class="fw-semibold">${escape(controller.Name)}</span>
            <code class="path text-body-secondary">${escape(controller.BaseRoute)}</code>
            <span class="badge text-bg-secondary ms-auto">${controller.Actions.length} endpoint${
              controller.Actions.length === 1 ? "" : "s"
            }</span>
          </div>
          <div class="card-body">
            ${note ? `<p class="mb-3">${note}</p>` : ""}
            ${summary ? `<div class="plain">${escape(summary)}</div>` : ""}
            <div class="table-responsive">
              <table class="table table-sm table-bordered align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th style="width:5.5rem">Method</th>
                    <th>Route</th>
                    <th style="width:14rem">What it does</th>
                    <th style="width:11rem">Who can call it</th>
                    <th style="width:18rem">Inputs</th>
                  </tr>
                </thead>
                <tbody>${rows}
                </tbody>
              </table>
            </div>
          </div>
        </article>`
}

const referenceSections = areas
  .map((area) => {
    const meta = prose.areas.find((entry) => entry.key === area) || {
      key: area,
      title: area,
      blurb: "",
    }
    const controllers = grouped.get(area).sort((left, right) => left.Name.localeCompare(right.Name))
    const count = controllers.reduce((sum, controller) => sum + controller.Actions.length, 0)

    return `
      <section id="area-${slug(area)}">
        <h2>${escape(meta.title)} <span class="badge text-bg-secondary align-middle fs-6">${count}</span></h2>
        ${meta.blurb ? `<p class="lead-sm">${meta.blurb}</p>` : ""}
        ${controllers.map(renderController).join("")}
      </section>`
  })
  .join("")

const referenceNav = areas
  .map((area) => {
    const meta = prose.areas.find((entry) => entry.key === area) || { title: area }
    const controllers = grouped.get(area).sort((left, right) => left.Name.localeCompare(right.Name))
    return `
        <a class="nav-link" href="#area-${slug(area)}">${escape(meta.title)}</a>
        ${controllers
          .map(
            (controller) =>
              `<a class="nav-link ms-3 small" href="#c-${slug(area)}-${slug(controller.Name)}">${escape(
                controller.Name.replace(/Controller$/, "")
              )}</a>`
          )
          .join("")}`
  })
  .join("")

const areaSummaryRows = areas
  .map((area) => {
    const meta = prose.areas.find((entry) => entry.key === area) || { title: area, blurb: "" }
    const controllers = grouped.get(area)
    const count = controllers.reduce((sum, controller) => sum + controller.Actions.length, 0)
    const prefixes = [...new Set(controllers.map((controller) => controller.BaseRoute.split("/").slice(0, 3).join("/")))]
    return `
                  <tr>
                    <td><a href="#area-${slug(area)}">${escape(meta.title)}</a></td>
                    <td><code>${prefixes.map(escape).join("</code> <code>")}</code></td>
                    <td class="text-end">${controllers.length}</td>
                    <td class="text-end">${count}</td>
                  </tr>`
  })
  .join("")

const html = `<!doctype html>
<html lang="en" data-bs-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ideali Backend — Developer Handbook</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    :root { --doc-max: 1240px; }
    body { scroll-behavior: smooth; }
    .doc-shell { max-width: var(--doc-max); }
    .sidebar { position: sticky; top: 1rem; max-height: calc(100dvh - 2rem); overflow-y: auto; }
    .sidebar .nav-link { padding: .28rem .6rem; font-size: .875rem; border-radius: .375rem; }
    .sidebar .nav-link:hover { background: var(--bs-secondary-bg); }
    .sidebar .nav-link.small { font-size: .8125rem; opacity: .85; }
    .endpoint { scroll-margin-top: 1rem; }
    .endpoint-head { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
    code.path { font-size: .875rem; word-break: break-all; }
    pre { background: var(--bs-tertiary-bg); border: 1px solid var(--bs-border-color); border-radius: .5rem; padding: 1rem; overflow-x: auto; font-size: .8125rem; margin-bottom: 0; }
    pre code { color: inherit; }
    .badge-method { font-family: var(--bs-font-monospace); letter-spacing: .04em; }
    h2 { scroll-margin-top: 1rem; border-bottom: 1px solid var(--bs-border-color); padding-bottom: .5rem; margin-top: 3rem; }
    h3 { margin-top: 2rem; scroll-margin-top: 1rem; }
    h4 { margin-top: 1.5rem; }
    .table td, .table th { vertical-align: top; }
    .plain { background: var(--bs-info-bg-subtle); border-left: 4px solid var(--bs-info); padding: .85rem 1rem; border-radius: .375rem; margin: 1rem 0; }
    .plain::before { content: "In plain words"; display: block; font-weight: 600; font-size: .8125rem; text-transform: uppercase; letter-spacing: .04em; opacity: .75; margin-bottom: .3rem; }
    .dont { background: var(--bs-danger-bg-subtle); border-left: 4px solid var(--bs-danger); padding: .85rem 1rem; border-radius: .375rem; margin: 1rem 0; }
    .dont::before { content: "Trap"; display: block; font-weight: 600; font-size: .8125rem; text-transform: uppercase; letter-spacing: .04em; opacity: .75; margin-bottom: .3rem; }
    .rule { background: var(--bs-success-bg-subtle); border-left: 4px solid var(--bs-success); padding: .85rem 1rem; border-radius: .375rem; margin: 1rem 0; }
    .rule::before { content: "Rule"; display: block; font-weight: 600; font-size: .8125rem; text-transform: uppercase; letter-spacing: .04em; opacity: .75; margin-bottom: .3rem; }
    .must { background: var(--bs-warning-bg-subtle); border: 2px solid var(--bs-warning); border-left-width: 8px; padding: 1rem 1.15rem; border-radius: .375rem; margin: 1.25rem 0; }
    .must::before { content: "Do this or nothing works"; display: block; font-weight: 700; font-size: .8125rem; text-transform: uppercase; letter-spacing: .06em; margin-bottom: .45rem; }
    .must > :last-child { margin-bottom: 0; }
    .step-rail { counter-reset: step; list-style: none; padding-left: 0; }
    .step-rail > li { position: relative; padding-left: 3rem; padding-bottom: 1.5rem; border-left: 2px solid var(--bs-border-color); margin-left: 1rem; }
    .step-rail > li:last-child { border-left-color: transparent; padding-bottom: 0; }
    .step-rail > li::before { counter-increment: step; content: counter(step); position: absolute; left: -1.05rem; top: -.15rem; width: 2.1rem; height: 2.1rem; border-radius: 50%; background: var(--bs-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: .875rem; }
    .glossary dt { margin-top: .85rem; }
    .lead-sm { font-size: 1.02rem; color: var(--bs-secondary-color); }
    .action-doc { font-size: .8125rem; color: var(--bs-secondary-color); margin-top: .25rem; }
    .param-source { display: inline-block; font-size: .6875rem; text-transform: uppercase; letter-spacing: .04em; padding: 0 .3rem; border-radius: .25rem; background: var(--bs-secondary-bg); color: var(--bs-secondary-color); }
    .access-anon { color: var(--bs-danger) !important; border-color: var(--bs-danger-border-subtle) !important; }
    .access-policy { font-family: var(--bs-font-monospace); font-size: .6875rem; }
    .flag { font-size: .6875rem; }
    .diagram { border: 1px solid var(--bs-border-color); border-radius: .5rem; padding: 1rem; margin: 1.25rem 0; overflow-x: auto; background: var(--bs-body-bg); }
    .diagram svg { display: block; min-width: 640px; width: 100%; height: auto; color: var(--bs-body-color); }
    .diagram text { fill: var(--bs-body-color); }
    .diagram .muted { fill: var(--bs-secondary-color); font-size: 11px; }
    .diagram rect { stroke-width: 1.25; }
    .diagram .box-read { fill: var(--bs-primary-bg-subtle); stroke: var(--bs-primary-border-subtle); }
    .diagram .box-write { fill: var(--bs-secondary-bg); stroke: var(--bs-border-color); }
    .diagram .box-money { fill: var(--bs-warning-bg-subtle); stroke: var(--bs-warning-border-subtle); }
    .diagram .box-auto { fill: var(--bs-success-bg-subtle); stroke: var(--bs-success-border-subtle); }
    .layer { border: 1px solid var(--bs-border-color); border-radius: .5rem; padding: .75rem 1rem; margin-bottom: .5rem; }
    .layer h5 { margin: 0 0 .25rem; font-size: .95rem; }
    .layer p { margin: 0; font-size: .875rem; color: var(--bs-secondary-color); }
    @media (max-width: 991.98px) { .sidebar { position: static; max-height: none; } }
  </style>
</head>
<body>

<nav class="navbar navbar-expand bg-body-tertiary border-bottom sticky-top">
  <div class="container doc-shell">
    <span class="navbar-brand fw-semibold mb-0">Ideali Backend — Developer Handbook</span>
    <span class="ms-auto badge text-bg-secondary">${inventory.Total} endpoints · ${inventory.Controllers.length} controllers</span>
  </div>
</nav>

<div class="container doc-shell my-4">
  <div class="row g-4">
    <div class="col-lg-3">
      <nav class="sidebar nav flex-column">
        <a class="nav-link fw-semibold" href="#start">1. Start here</a>
        <a class="nav-link fw-semibold" href="#run">2. Run it locally</a>
        <a class="nav-link fw-semibold" href="#shape">3. How the code is arranged</a>
        <a class="nav-link fw-semibold" href="#lifecycle">4. What happens to a request</a>
        <a class="nav-link fw-semibold" href="#glossary">5. Words you must know</a>
        <a class="nav-link fw-semibold" href="#conventions">6. Rules every endpoint follows</a>
        <a class="nav-link fw-semibold" href="#auth">7. Login and permissions</a>
        <a class="nav-link fw-semibold" href="#data">8. The database layer</a>
        <a class="nav-link fw-semibold" href="#background">9. Work that runs on its own</a>
        <a class="nav-link fw-semibold" href="#payments">10. Money and Stripe</a>
        <a class="nav-link fw-semibold" href="#platform">11. Files, email, realtime, limits</a>
        <a class="nav-link fw-semibold" href="#recipe">12. Adding a new endpoint</a>
        <a class="nav-link fw-semibold" href="#traps">13. Traps that bite everyone</a>
        <a class="nav-link fw-semibold" href="#registration">14. Event registration, end to end</a>
        <a class="nav-link ms-3 small" href="#reg-map">14.1 The journey at a glance</a>
        <a class="nav-link ms-3 small" href="#reg-endpoints">14.2 Every endpoint in the journey</a>
        <a class="nav-link ms-3 small" href="#reg-cart">14.3 How the cart actually works</a>
        <a class="nav-link ms-3 small" href="#reg-pricing">14.4 How the total is calculated</a>
        <a class="nav-link ms-3 small" href="#reg-questions">14.5 Attendees, questions and files</a>
        <a class="nav-link ms-3 small" href="#reg-settlement">14.6 Payment and settlement</a>
        <a class="nav-link ms-3 small" href="#reg-automatic">14.7 What runs automatically</a>
        <a class="nav-link ms-3 small" href="#reg-shapes">14.8 Every response, field by field</a>
        <a class="nav-link ms-3 small" href="#reg-traps">14.9 Registration-specific traps</a>
        <a class="nav-link fw-semibold" href="#reference">15. Every endpoint</a>
        ${referenceNav}
        <a class="nav-link fw-semibold mt-2" href="#upkeep">16. Keeping this page true</a>
      </nav>
    </div>

    <main class="col-lg-9">
${prose.body}

      <section id="reference">
        <h2>15. Every endpoint</h2>
        <p class="lead-sm">
          Every route the API exposes, grouped the way the code is grouped. This list is generated
          straight from the compiled controllers, so it cannot quietly fall behind the code.
        </p>

        <div class="table-responsive mb-4">
          <table class="table table-sm table-bordered align-middle">
            <thead class="table-light">
              <tr><th>Area</th><th>Route prefix</th><th class="text-end">Controllers</th><th class="text-end">Endpoints</th></tr>
            </thead>
            <tbody>${areaSummaryRows}
              <tr class="table-light fw-semibold">
                <td>Total</td><td></td>
                <td class="text-end">${inventory.Controllers.length}</td>
                <td class="text-end">${inventory.Total}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>How to read the tables</h3>
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <tbody>
              <tr><th style="width:12rem">Method</th><td>The HTTP verb. <code>GET</code> reads, <code>POST</code> creates or performs an action, <code>PUT</code> replaces, <code>DELETE</code> removes.</td></tr>
              <tr><th>Route</th><td>The full path, already including every prefix. <code>{name:guid}</code> means that segment is a GUID you substitute.</td></tr>
              <tr><th>What it does</th><td>The controller method's name in plain words. Where the code carries a documentation comment, it is shown underneath the route.</td></tr>
              <tr><th>Who can call it</th><td><span class="badge text-bg-light border access-anon">Public</span> needs no login. <span class="badge text-bg-light border">Signed in</span> needs a valid token. A monospace name is the authorization policy that must pass — see <a href="#auth">section 7</a>.</td></tr>
              <tr><th>Inputs</th><td>The method's parameters, with where each is read from: <span class="param-source">route</span>, <span class="param-source">query</span>, <span class="param-source">body</span>, <span class="param-source">form</span>, <span class="param-source">header</span>. A parameter with no tag is bound by the framework's default rules — simple types from the query string, complex types from the body.</td></tr>
            </tbody>
          </table>
        </div>
${referenceSections}
      </section>

${prose.upkeep}
    </main>
  </div>
</div>

<footer class="border-top py-4">
  <div class="container doc-shell text-body-secondary small">
    Ideali backend handbook · generated from the compiled controllers of <code>Ideas.API</code> ·
    ${inventory.Total} endpoints across ${inventory.Controllers.length} controllers.
  </div>
</footer>

</body>
</html>
`

writeFileSync(OUTPUT, html)
console.log(`written ${OUTPUT} (${(html.length / 1024).toFixed(0)} KB)`)
