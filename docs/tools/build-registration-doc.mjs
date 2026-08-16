import { readFileSync, writeFileSync } from "node:fs"
import { registrationIntro, registrationSections } from "./registration-copy.mjs"

const inventory = JSON.parse(readFileSync(new URL("./endpoints.reflected.json", import.meta.url), "utf8"))
const summaries = JSON.parse(readFileSync(new URL("./summaries.json", import.meta.url), "utf8"))

const OUTPUT = process.argv[2]

/**
 * Every controller the registration journey touches, in journey order, with the stage each one
 * belongs to. Anything listed here is rendered in full in the appendix, so a route cannot be
 * silently left out of the document.
 */
const REGISTRATION_CONTROLLERS = [
  { name: "EventRegistrationController", stage: "1. Reading the event", note: "The six reads behind the registration wizard's tabs. Nothing is created by any of them." },
  { name: "EventTicketSalesController", stage: "1. Reading the event", note: "Only <code>availability</code> belongs to the current journey. The three checkout routes are the earlier single-line purchase path, kept for compatibility." },
  { name: "EventCartController", stage: "2. The cart", note: "The cart itself: create, read, add and remove lines, name attendees, answer the questionnaire, upload files, and price." },
  { name: "EventCheckoutController", stage: "3. Payment", note: "Turning a priced cart into money, and confirming the result." },
  { name: "StripeController", stage: "3. Payment", note: "The publishable key the browser needs, the bank-payment intents, and the webhook that actually settles an order." },
  { name: "StripeWebhookController", stage: "3. Payment", note: "Logs and nothing else. Listed so nobody wires Stripe to it by mistake." },
  { name: "EventRevenuePlanController", stage: "3. Payment", note: "The platform's charges for an organizer, readable before a cart exists." },
  { name: "EventOrderController", stage: "4. After the sale", note: "The buyer's confirmation page, polled while a bank payment settles." },
  { name: "EventTicketViewController", stage: "4. After the sale", note: "One issued ticket, rendered for its attendee." },
  { name: "EventInvoiceController", stage: "4. After the sale", note: "The organizer's view of orders, and the resend paths used when an email did not arrive." },
  { name: "EventTicketCheckInController", stage: "4. After the sale", note: "Scanning a ticket at the door." },
]

const ADJACENT_CONTROLLERS = [
  { name: "ImageController", why: "Serves the event banner shown on the registration page." },
  { name: "PdfController", why: "Renders a page to PDF; used for ticket and receipt output." },
  { name: "QrCodeController", why: "Generates the QR code printed on a ticket." },
]

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

function controllerByName(name) {
  const found = inventory.Controllers.find((controller) => controller.Name === name)
  if (!found) throw new Error(`Controller ${name} is not in the endpoint inventory`)
  return found
}

function accessBadge(action) {
  if (action.Anonymous) return '<span class="badge text-bg-light border access-anon">Public</span>'
  if (action.Policy) {
    return `<span class="badge text-bg-light border access-policy">${escape(action.Policy.split(", ")[0])}</span>`
  }
  return '<span class="badge text-bg-light border">Signed in</span>'
}

function parameterCell(action) {
  if (action.Parameters.length === 0) return '<span class="text-body-secondary">—</span>'

  return action.Parameters.map((parameter) => {
    const source = parameter.Source ? `<span class="param-source">${escape(parameter.Source.toLowerCase())}</span> ` : ""
    return `${source}<code>${escape(parameter.Name)}</code><span class="text-body-secondary"> : ${escape(parameter.Type)}</span>`
  }).join("<br>")
}

function renderControllerCard(entry) {
  const controller = controllerByName(entry.name)
  const summary = summaries[controller.Name]

  const rows = controller.Actions.map((action) => {
    const actionSummary = summaries[`${controller.Name}::${action.Name}`]
    return `
              <tr>
                <td class="text-nowrap"><span class="badge badge-method ${VERB_STYLE[action.Verb] || "text-bg-secondary"}">${action.Verb}</span></td>
                <td><code class="path">${escape(action.Path)}</code>${
                  action.Flags.length
                    ? ` <span class="badge text-bg-light border flag">${escape(action.Flags.join(" · "))}</span>`
                    : ""
                }${actionSummary ? `<div class="action-doc">${escape(actionSummary)}</div>` : ""}</td>
                <td>${escape(humanise(action.Name))}</td>
                <td>${accessBadge(action)}</td>
                <td class="small">${parameterCell(action)}</td>
              </tr>`
  }).join("")

  return `
        <article id="ep-${slug(controller.Name)}" class="card mb-4 endpoint">
          <div class="card-header endpoint-head">
            <span class="fw-semibold">${escape(controller.Name)}</span>
            <code class="path text-body-secondary">${escape(controller.BaseRoute)}</code>
            <span class="badge text-bg-secondary ms-auto">${controller.Actions.length} endpoint${controller.Actions.length === 1 ? "" : "s"}</span>
          </div>
          <div class="card-body">
            <p class="mb-3">${entry.note}</p>
            ${summary ? `<div class="plain">${escape(summary)}</div>` : ""}
            <div class="table-responsive">
              <table class="table table-sm table-bordered align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th style="width:5.5rem">Method</th>
                    <th>Route</th>
                    <th style="width:13rem">What it does</th>
                    <th style="width:10rem">Who can call it</th>
                    <th style="width:17rem">Inputs</th>
                  </tr>
                </thead>
                <tbody>${rows}
                </tbody>
              </table>
            </div>
          </div>
        </article>`
}

const stages = [...new Set(REGISTRATION_CONTROLLERS.map((entry) => entry.stage))]

const appendixBody = stages
  .map((stage) => {
    const entries = REGISTRATION_CONTROLLERS.filter((entry) => entry.stage === stage)
    const count = entries.reduce((sum, entry) => sum + controllerByName(entry.name).Actions.length, 0)
    return `
        <h3 id="ap-${slug(stage)}">${escape(stage)} <span class="badge text-bg-secondary align-middle fs-6">${count}</span></h3>
        ${entries.map(renderControllerCard).join("")}`
  })
  .join("")

const adjacentRows = ADJACENT_CONTROLLERS.map((entry) => {
  const controller = controllerByName(entry.name)
  return `
                  <tr>
                    <td><code>${escape(controller.BaseRoute)}</code></td>
                    <td>${escape(controller.Name)}</td>
                    <td>${entry.why}</td>
                  </tr>`
}).join("")

const totalEndpoints = REGISTRATION_CONTROLLERS.reduce(
  (sum, entry) => sum + controllerByName(entry.name).Actions.length,
  0
)

const sectionOffset = 3 // sections 1 and 2 are the standalone-only opener

const narrative = registrationSections
  .map((entry, index) => `      <h2 id="${entry.id}">${index + sectionOffset}. ${entry.title}</h2>\n${entry.html}`)
  .join("\n")

const narrativeNav = registrationSections
  .map((entry, index) => {
    const top = `        <a class="nav-link fw-semibold" href="#${entry.id}">${index + sectionOffset}. ${escape(entry.title)}</a>`
    const subs = (entry.subs ?? [])
      .map((sub) => `        <a class="nav-link ms-3 small" href="#${sub.id}">${escape(sub.title)}</a>`)
      .join("\n")
    return subs ? `${top}\n${subs}` : top
  })
  .join("\n")

const appendixNumber = registrationSections.length + sectionOffset
const upkeepNumber = appendixNumber + 1

const html = `<!doctype html>
<html lang="en" data-bs-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Event Registration — Backend Guide</title>
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
    <span class="navbar-brand fw-semibold mb-0">Event Registration — Backend Guide</span>
    <span class="ms-auto badge text-bg-secondary">${totalEndpoints} endpoints</span>
  </div>
</nav>

<div class="container doc-shell my-4">
  <div class="row g-4">
    <div class="col-lg-3">
      <nav class="sidebar nav flex-column">
        <a class="nav-link fw-semibold" href="#start">1. What this covers</a>
        <a class="nav-link fw-semibold" href="#model">2. The pieces involved</a>
${narrativeNav}
        <a class="nav-link fw-semibold" href="#appendix">${appendixNumber}. Endpoint appendix</a>
        <a class="nav-link ms-3 small" href="#ap-1-reading-the-event">Stage 1 — reading the event</a>
        <a class="nav-link ms-3 small" href="#ap-2-the-cart">Stage 2 — the cart</a>
        <a class="nav-link ms-3 small" href="#ap-3-payment">Stage 3 — payment</a>
        <a class="nav-link ms-3 small" href="#ap-4-after-the-sale">Stage 4 — after the sale</a>
        <a class="nav-link fw-semibold" href="#upkeep">${upkeepNumber}. Keeping this page true</a>
      </nav>
    </div>

    <main class="col-lg-9">

      <section id="start">
        <h2>1. What this covers</h2>
        <p class="lead-sm">
          Everything the backend does between a visitor opening an event page and an attendee being
          scanned in at the door. Every endpoint involved, the service method behind each one, how the
          cart holds seats, exactly how each payment method's total is built, and what runs on its own
          afterwards.
        </p>

        <div class="must">
          <p class="mb-2">
            Before deploying this module anywhere, including a laptop:
            <strong><code>EventCartCapability:SigningKey</code> must be set</strong> or the API will not
            start. Before writing a frontend that talks to it: <strong>the axios client needs
            <code>withCredentials: true</code></strong> or every cart call after creation returns
            <code>403</code>.
          </p>
          <p class="mb-0">
            Both come from the same feature — carts are anonymous and are guarded by a signed cookie
            instead of a login. <a href="#reg-cart-capability" class="fw-semibold">Who is allowed to touch
            a cart</a> explains why, with the failure modes for each.
          </p>
        </div>

        <h3>Who this is for</h3>
        <p>
          Backend developers working on the Event module, and frontend developers who need to know
          what the server will and will not do for them. No prior knowledge of the codebase is
          assumed — every term is defined in section 2 before it is used.
        </p>

        <h3>Where this sits</h3>
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead class="table-light"><tr><th style="width:24rem">Document</th><th>Answers</th></tr></thead>
            <tbody>
              <tr>
                <td><strong>This page</strong></td>
                <td>"What does the backend do during event registration?" Endpoints, services, money, background work.</td>
              </tr>
              <tr>
                <td><code>backend-developer-handbook.bootstrap.html</code></td>
                <td>"How does the whole backend work?" Architecture, authentication, database layer, and all ${inventory.Total} endpoints across every module. Registration appears there too, as section 14 — the same words as here, from one shared source.</td>
              </tr>
              <tr>
                <td><code>event-registration-api.bootstrap.html</code></td>
                <td>"How do I build the ticket-buying screens?" The frontend's call-by-call walkthrough of the same journey.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>The shape of it, in six sentences</h3>
        <ol class="step-rail">
          <li>A visitor opens an event page; the server returns the event and which steps this particular event has.</li>
          <li>They create a <strong>cart</strong> — which is really an unpaid invoice — and add lines to it, each line taking a real hold on seats.</li>
          <li>If the organizer asked for them, the buyer names each attendee and answers the questionnaire.</li>
          <li>The cart is priced, producing a different total for each payment method.</li>
          <li>They pay; Stripe confirms it to the server through a webhook, which is the only thing the server trusts.</li>
          <li>Tickets are issued and emailed by background jobs — no browser required.</li>
        </ol>

        <div class="rule">
          Two rules underpin everything below. The server prices the cart; a total supplied by the
          browser is never trusted. And the Stripe webhook — not the buyer's redirect — is the
          authority on whether money arrived.
        </div>
      </section>

      <section id="model">
        <h2>2. The pieces involved</h2>
        <p class="lead-sm">
          Every term used later, defined once. Skim it now and come back when a name is unfamiliar.
        </p>

        <h3>What the organizer sets up first</h3>
        <dl class="glossary row">
          <div class="col-md-6">
            <dt>Organizer</dt>
            <dd>The customer organisation running the event. Everything belongs to one.</dd>

            <dt>Event</dt>
            <dd>What is advertised. Owns the branding, the terms, the custom forms and questions, the payment methods and the charge rules.</dd>

            <dt>Session</dt>
            <dd>A dated occurrence of the event. Tickets are sold against a session, not the event, because an event may run over several days. Carries the <code>RequiresAttendeeInfo</code> flag.</dd>

            <dt>Ticket type</dt>
            <dd>A sellable class of seat inside a session — "Early bird", "Student". Holds the full price, the capacity, the per-order quantity limits and the sale window.</dd>

            <dt>Ticket price period</dt>
            <dd>A dated price for a ticket type, so the price can change on a schedule without editing the ticket type itself.</dd>
          </div>
          <div class="col-md-6">
            <dt>Payment account</dt>
            <dd>The organizer's connected Stripe account and currency. Which methods are offered comes from the event's own <code>EventPaymentMethod</code> rows.</dd>

            <dt>Charge rule</dt>
            <dd>An extra fee the organizer adds — a booking fee, a service charge. Defined once as an <code>OrganizerChargeRule</code> and switched on per event as an <code>EventChargeRule</code>.</dd>

            <dt>Revenue plan</dt>
            <dd>What the <em>platform</em> charges. Its rules say whether the buyer or the organizer pays. Assigned to an organizer per module.</dd>

            <dt>Processor fee</dt>
            <dd>What the organizer adds to cover the payment gateway's own cut. Configured per payment method, which is why totals differ between methods.</dd>

            <dt>Discount coupon</dt>
            <dd>A code the buyer can enter. Validated at pricing time and only actually spent when the order settles.</dd>
          </div>
        </dl>

        <h3>What the buyer's journey creates</h3>
        <dl class="glossary row">
          <div class="col-md-6">
            <dt>Cart</dt>
            <dd>Not its own table. A cart <strong>is</strong> an <code>Invoice</code> with status <code>PendingPayment</code>. Its <code>uniqueId</code> is the buyer's only handle on it.</dd>

            <dt>Cart line</dt>
            <dd>Three rows together: an <code>InvoiceItem</code> for the money, an <code>EventInvoiceItem</code> for what was bought, and a <code>TicketReservation</code> for the actual seat hold.</dd>

            <dt>Reservation</dt>
            <dd>The stock hold. <code>Active</code> until it is confirmed, cancelled or expires. Everything that counts availability counts these.</dd>

            <dt>Attendee</dt>
            <dd>An <code>EventInvoiceItemAttendee</code>, one per seat, submitted before payment. Becomes the named holder of a ticket at issuance.</dd>
          </div>
          <div class="col-md-6">
            <dt>Submission</dt>
            <dd>The questionnaire answers for the whole order — one <code>EventPurchaseSubmission</code>, regardless of how many tickets.</dd>

            <dt>Charge snapshot</dt>
            <dd>A <code>PaymentChargeSnapshot</code> recording <em>why</em> a charge was made — the rule, its value, its label, the currency — frozen at that moment so later edits never rewrite history.</dd>

            <dt>Payment attempt</dt>
            <dd>An <code>InvoicePayment</code>. Its <code>ReferenceNo</code> is the Stripe payment intent id, which is how settlement finds the invoice again.</dd>

            <dt>Ticket</dt>
            <dd>An <code>EventTicket</code>, created only once payment is settled. Carries the code scanned at the door.</dd>
          </div>
        </dl>

        <div class="plain">
          The single most useful thing to internalise: <strong>a cart is an invoice, and a seat hold is
          a reservation</strong>. Almost every question about registration resolves once those two
          are clear.
        </div>

        <h3>The services you will be reading</h3>
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead class="table-light"><tr><th style="width:22rem">Service</th><th>Owns</th></tr></thead>
            <tbody>
              <tr><td><code>EventRegistrationService</code></td><td>The read-only registration page — tabs, sessions, questionnaire definitions.</td></tr>
              <tr><td><code>EventCartService</code></td><td>Creating the cart and adding or removing lines, including the seat holds.</td></tr>
              <tr><td><code>EventCartPricingService</code></td><td>Discounts, charges and the per-method totals.</td></tr>
              <tr><td><code>EventCartAttendeeService</code></td><td>Per-seat attendee details.</td></tr>
              <tr><td><code>EventCartAnswerService</code></td><td>Questionnaire answers and answer-file uploads.</td></tr>
              <tr><td><code>EventCheckoutService</code></td><td>Payment intents, cheques, and the confirm fast-path.</td></tr>
              <tr><td><code>EventPaymentSettlementService</code></td><td>What happens once the money is settled — or fails.</td></tr>
              <tr><td><code>EventOrderStatusService</code></td><td>The buyer's confirmation page. A projection only.</td></tr>
              <tr><td><code>TicketingShared</code></td><td>The rules every path shares: cart gates, availability, issuance, hold duration.</td></tr>
              <tr><td><code>BuyerChargeCalculator</code></td><td>The arithmetic for every charge. One place, no duplicates.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

${narrative}

      <section id="appendix">
        <h2>${appendixNumber}. Endpoint appendix</h2>
        <p class="lead-sm">
          Every endpoint on every controller the registration journey touches — not only the ones the
          narrative highlights. Generated from the compiled controllers, so nothing can be missing.
        </p>

        <div class="table-responsive mb-4">
          <table class="table table-sm table-bordered">
            <tbody>
              <tr><th style="width:12rem">Method</th><td>The HTTP verb.</td></tr>
              <tr><th>Route</th><td>The full path, prefixes included. <code>{name:guid}</code> is a GUID you substitute.</td></tr>
              <tr><th>What it does</th><td>The controller method's name in plain words, with its documentation comment underneath where the code carries one.</td></tr>
              <tr><th>Who can call it</th><td><span class="badge text-bg-light border access-anon">Public</span> needs no login — most of the buyer journey. A monospace name is the authorization policy that must pass.</td></tr>
              <tr><th>Inputs</th><td>Parameters and where each is read from: <span class="param-source">route</span>, <span class="param-source">query</span>, <span class="param-source">body</span>, <span class="param-source">form</span>.</td></tr>
            </tbody>
          </table>
        </div>
${appendixBody}

        <h3 id="ap-adjacent">Adjacent endpoints</h3>
        <p>
          Not part of the journey, but called by pages that are part of it.
        </p>
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead class="table-light"><tr><th style="width:16rem">Route prefix</th><th style="width:14rem">Controller</th><th>Why it matters here</th></tr></thead>
            <tbody>${adjacentRows}
            </tbody>
          </table>
        </div>
      </section>

      <section id="upkeep">
        <h2>${upkeepNumber}. Keeping this page true</h2>
        <p class="lead-sm">
          A stale document is worse than none, because people still trust it. This one is built so
          drift is cheap to fix.
        </p>

        <h3>What is generated and what is written</h3>
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead class="table-light"><tr><th style="width:24rem">File</th><th>Role</th></tr></thead>
            <tbody>
              <tr><td><code>docs/tools/registration-copy.mjs</code></td><td>The narrative — sections ${sectionOffset} to ${appendixNumber - 1}. <strong>Edit this</strong> when the flow changes. Shared with the backend handbook, so one edit updates both documents.</td></tr>
              <tr><td><code>docs/tools/endpoints.reflected.json</code></td><td>The route table, produced by reflecting over the compiled API. Generated — never edit.</td></tr>
              <tr><td><code>docs/tools/summaries.json</code></td><td>Documentation comments harvested from the controllers. Generated — never edit.</td></tr>
              <tr><td><code>docs/tools/build-registration-doc.mjs</code></td><td>Builds this page. The <code>REGISTRATION_CONTROLLERS</code> list at the top decides which controllers appear in the appendix — add to it when the journey grows a new controller.</td></tr>
              <tr><td><code>docs/event-registration-backend.bootstrap.html</code></td><td>This page. Generated — never edit by hand.</td></tr>
            </tbody>
          </table>
        </div>

        <h3>How to regenerate</h3>
        <ol class="step-rail">
          <li>
            <strong>Refresh the route table</strong> if endpoints changed. In the backend repository,
            remove the <code>Skip</code> from <code>tests/Ideas.API.Tests/EndpointInventoryDump.cs</code> and run:
<pre><code>$env:ENDPOINT_DUMP_PATH = "&lt;this-repo&gt;/docs/tools/endpoints.reflected.json"
dotnet test ./tests/Ideas.API.Tests/Ideas.API.Tests.csproj \\
  --filter FullyQualifiedName~EndpointInventoryDump</code></pre>
            Put the <code>Skip</code> back afterwards.
          </li>
          <li>
            <strong>Refresh the documentation comments:</strong>
<pre><code>cd docs/tools
node extract-summaries.mjs summaries.json</code></pre>
          </li>
          <li>
            <strong>Rebuild both documents</strong> — they share the narrative, so always do both:
<pre><code>node build-registration-doc.mjs ../event-registration-backend.bootstrap.html
node build-backend-doc.mjs ../backend-developer-handbook.bootstrap.html</code></pre>
          </li>
        </ol>

        <div class="plain">
          Want a better one-line description beside a route? Do not edit the generated HTML — it will
          be overwritten. Write a <code>/// &lt;summary&gt;</code> comment above the controller action
          instead. It then serves the code and both documents at once, and can never disagree with the
          code it sits on.
        </div>

        <div class="rule">
          Regenerate in the same commit as the change that made it necessary. A separate "update the
          docs" task is a task that does not happen.
        </div>
      </section>
    </main>
  </div>
</div>

<footer class="border-top py-4">
  <div class="container doc-shell text-body-secondary small">
    Event registration backend guide · endpoint tables generated from the compiled controllers of
    <code>Ideas.API</code> · ${totalEndpoints} endpoints across ${REGISTRATION_CONTROLLERS.length} controllers.
  </div>
</footer>

</body>
</html>
`

writeFileSync(OUTPUT, html)
console.log(`written ${OUTPUT} (${(html.length / 1024).toFixed(0)} KB, ${totalEndpoints} endpoints)`)
