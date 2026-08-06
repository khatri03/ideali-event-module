import { registrationIntro, registrationSections } from "./registration-copy.mjs"

/** Section 14 of the handbook. The wording lives in registration-copy.mjs, shared with the standalone registration document. */
function renderRegistrationSection() {
  const subsections = registrationSections
    .map((entry, index) => `      <h3 id="${entry.id}">14.${index + 1} ${entry.title}</h3>\n${entry.html}`)
    .join("\n")

  return [
    '      <section id="registration">',
    '        <h2>14. Event registration, end to end</h2>',
    `        ${registrationIntro}`,
    subsections,
    "      </section>",
  ].join("\n")
}

export const prose = {
  areas: [
    {
      key: "Identity",
      title: "Identity — accounts, login, roles",
      blurb:
        "Signing in, signing out, refreshing tokens, two-factor codes, password resets, and the role and permission catalogue. Every other area depends on a token issued here.",
    },
    {
      key: "Organizer",
      title: "Organizer — the tenant's own back office",
      blurb:
        "The largest area by far. Everything an organizer configures for themselves: profile, sub-profiles, venues, sessions, events, polls, payment accounts, tax items, discount coupons, seating charts, contact sync and QuickBooks. Almost all of it requires a signed-in organizer whose account subscribes to the relevant module.",
    },
    {
      key: "Event",
      title: "Event — the public ticket-buying journey",
      blurb:
        "The buyer-facing half of ticketing: browse an event, build a cart, answer the organizer's questions, pay, and receive tickets. Most of the cart routes are deliberately open to anonymous callers, because a buyer does not have an account.",
    },
    {
      key: "Membership",
      title: "Membership — types, members, alerts, documents",
      blurb:
        "Membership types and their wizard, member registration, custom lists, document categories, alerts sent to members, and the alert inbox members read.",
    },
    {
      key: "Donation",
      title: "Donation — campaigns and giving",
      blurb:
        "Donation campaigns and their wizard, the public donate call, recurring donations, and campaign email templates.",
    },
    {
      key: "Donor",
      title: "Donor — the participant's own view",
      blurb:
        "What a donor or member sees about themselves: their donations, their membership, their receipts.",
    },
    {
      key: "Invoice",
      title: "Invoice — one invoice model, three modules",
      blurb:
        "Invoices are shared infrastructure. Donation, membership and event purchases all become an Invoice; these routes read and act on them, with the module-specific parts split into their own controllers.",
    },
    {
      key: "Admin",
      title: "Admin — the platform operator's console",
      blurb:
        "Not the organizer's admin — the platform's. Revenue plans, organizer onboarding, allowed CORS origins, rate limits, platform notifications and shared list items.",
    },
    {
      key: "Public",
      title: "Public — deliberately open reads",
      blurb: "Endpoints intended for unauthenticated visitors.",
    },
    {
      key: "Root",
      title: "Root — cross-cutting and third-party",
      blurb:
        "Things that belong to no single module: Stripe credentials and webhooks, geography lookups, image and PDF and QR generation, social sharing, Unsplash, and the tap-to-pay terminal.",
    },
    {
      key: "Emails",
      title: "Emails",
      blurb: "Email-related utility routes.",
    },
    {
      key: "OpenAI",
      title: "OpenAI",
      blurb: "Assisted content generation.",
    },
  ],

  controllerNotes: {
    EventCartController:
      "The heart of anonymous ticket buying. A cart is an <code>Invoice</code> in an unpaid state; the cart's <code>uniqueId</code> is the only credential the buyer has, which is why creating one is bot-challenged and everything else is scoped to that id.",
    EventCheckoutController:
      "Turns a cart into money. Card payments use Stripe's deferred-intent flow, bank payments (ACH and PAD) settle later, and a zero-total order confirms immediately with no payment at all.",
    EventWizardController:
      "The organizer's multi-step event builder. Each step saves independently, so a half-built event is a normal state rather than an error.",
    SessionWizardController:
      "The same idea as the event wizard, one level down: a session is a dated occurrence of an event and owns the ticket types, pricing periods and seating.",
    StripeWebhookController:
      "Stripe calls this, not your frontend. It is anonymous by necessity and verified by signature instead of by token.",
    StripeController:
      "Hands the frontend the publishable key it needs before any payment exists, and creates bank-payment intents. Anonymous on purpose — a publishable key is public by design.",
    LoginController: "Issues the tokens every other signed-in route expects.",
    AccountController: "Everything about an account that is not the act of logging in.",
    AdminRevenuePlanController:
      "Revenue plans decide what the platform charges an organizer. Rules are snapshotted onto each invoice when it is created, so editing a plan never rewrites history.",
    AllowedOriginsController:
      "The CORS allow-list lives in the database, not in configuration, and is read per request by <code>DynamicCorsPolicyProvider</code>.",
    AdminRateLimitController:
      "Changes the login rate limit at runtime. The values are part of the limiter's partition key, so a save applies on the very next request instead of waiting for a restart.",
    PaymentAccountController:
      "An organizer's connected Stripe account and bank details. No card or bank number ever reaches this API — Stripe holds them.",
    SeatsIoController:
      "Seating charts are hosted by the third-party seats.io service; these routes proxy and mirror them.",
    QuickBooksController:
      "Accounting sync. Note the route sits outside <code>/api</code> because the OAuth callback URL is registered with Intuit.",
  },

  body: `
      <section id="start">
        <h2>1. Start here</h2>
        <p class="lead-sm">
          Read this page top to bottom once. After that you will be able to find any endpoint,
          understand what it returns, and add one of your own without copying the wrong pattern.
        </p>

        <h3>What this system is</h3>
        <p>
          Ideali is a platform that organisations use to run their public-facing money-taking
          activities: selling event tickets, collecting donations, and managing paid memberships.
          One organisation is called an <strong>organizer</strong>. Many organizers share one
          installation of this API, and each one only ever sees its own data.
        </p>
        <p>
          The backend is a single ASP.NET Core 9 application — one process, one database, one
          deployment — but the code inside it is split into modules that are kept apart on purpose.
          This is called a <strong>modular monolith</strong>. You get the simplicity of one
          deployable and most of the discipline of separate services.
        </p>

        <h3>The three revenue modules</h3>
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead class="table-light"><tr><th style="width:12rem">Module</th><th>What it sells</th><th style="width:10rem">Status</th></tr></thead>
            <tbody>
              <tr><td><strong>Donation</strong></td><td>One-off and recurring giving against a campaign.</td><td>Live in production</td></tr>
              <tr><td><strong>Membership</strong></td><td>Paid membership types with applications, approvals and renewals.</td><td>Live in production</td></tr>
              <tr><td><strong>Event</strong></td><td>Ticketed events with sessions, ticket types, seating and check-in.</td><td>Under active development</td></tr>
            </tbody>
          </table>
        </div>
        <div class="dont">
          Donation and Membership are handling real money for real customers right now. A change
          that touches shared code — the invoice model, file storage, the base <code>DbContext</code>,
          authentication — must be additive. Adding a table, a column, a method or a service is fine.
          Changing or removing something those two modules already execute is not, unless that is
          the deliberate and reviewed point of the change.
        </div>

        <h3>Where the code lives</h3>
        <p>
          One repository, <code>ideali.api</code>, with three top-level folders under <code>src/</code>:
        </p>
        <div class="layer"><h5>src/Presentation</h5><p><code>Ideas.API</code> is the web application — controllers, middleware, authorization, startup. <code>Ideas.BackgroundJobs</code> holds the Hangfire wiring.</p></div>
        <div class="layer"><h5>src/Modules</h5><p>One folder per business area: Admin, Donation, Donor, Event, Identity, Invoice, Member, Membership, Organizer, Trip. Each contains up to three projects — Application, Infrastructure, Persistence.</p></div>
        <div class="layer"><h5>src/Shared</h5><p>Code more than one module needs: <code>Ideas.SharedKernel</code> (the plumbing), <code>Ideas.Shared.Domain</code> (the entity classes), <code>Ideas.PaymentGateway</code> (Stripe), <code>Ideas.Notification</code> (email), <code>Ideas.SeasIO</code> (seating charts).</p></div>
        <p>
          The frontend is a separate repository and is not covered here. If you are wiring up the
          event registration screens, read the companion page
          <code>docs/event-registration-api.bootstrap.html</code> in the frontend repo — it explains
          that one journey call by call.
        </p>
      </section>

      <section id="run">
        <h2>2. Run it locally</h2>

        <h3>What you need</h3>
        <ul>
          <li>.NET 9 SDK</li>
          <li>SQL Server reachable from your machine</li>
          <li>Configuration secrets — ask the team; they are not in the repository and must never be committed</li>
        </ul>

        <h3>The commands</h3>
<pre><code>dotnet build                                        # compile everything
dotnet run --project src/Presentation/Ideas.API     # start the API
dotnet test ./tests/Ideas.API.Tests/Ideas.API.Tests.csproj   # run the test suite</code></pre>

        <div class="dont">
          If <code>dotnet build</code> fails with <code>MSB3027</code> or <code>MSB3021</code> saying a
          DLL is locked, the API is still running — from Visual Studio, or a stray
          <code>Ideas.API.exe</code>. Stop it and build again. Nothing is wrong with your code.
        </div>

        <h3>What the app does on startup, before it serves anything</h3>
        <ol class="step-rail">
          <li><strong>Applies database migrations.</strong> <code>IDbMigrationService.MigrateAsync()</code> runs pending EF migrations, so a fresh database becomes a working one by starting the app.</li>
          <li><strong>Warms up Entity Framework.</strong> The first query against a large model is slow; this pays that cost before the first user does.</li>
          <li><strong>Seeds reference data.</strong> <code>IDataSeedService.SeedAllDataAsync()</code> inserts the fixed rows the system needs — countries, modules, control types and similar.</li>
          <li><strong>Loads the rate-limit settings</strong> from the database, so an admin's saved value survives a restart.</li>
          <li><strong>Verifies the ticket PDF fonts exist.</strong> Missing fonts fail the deploy rather than the first buyer's ticket.</li>
        </ol>

        <h3>Two pages worth bookmarking</h3>
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <tbody>
              <tr><th style="width:12rem"><code>/swagger</code></th><td>Live, interactive list of every endpoint with request and response shapes. Use it to try calls. Use <em>this</em> page to understand them.</td></tr>
              <tr><th><code>/hangfire</code></th><td>The background-job dashboard: what ran, what failed, what is scheduled. Open to anyone in development; behind an admin filter elsewhere.</td></tr>
              <tr><th><code>/api/health</code></th><td>Returns <code>{ "status": "Healthy" }</code>. Used by load balancers.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="shape">
        <h2>3. How the code is arranged</h2>
        <p class="lead-sm">
          Every module follows the same three-project shape. Once you know it for one module, you
          know it for all of them.
        </p>

        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead class="table-light"><tr><th style="width:14rem">Project</th><th>Holds</th><th>Never holds</th></tr></thead>
            <tbody>
              <tr>
                <td><code>&lt;Module&gt;.Application</code></td>
                <td>Interfaces (<code>IEventCartService</code>) and request/response models. The contract, nothing else.</td>
                <td>Any logic. Any database access.</td>
              </tr>
              <tr>
                <td><code>&lt;Module&gt;.Infrastructure</code></td>
                <td>The service classes that implement those interfaces. This is where all business logic lives.</td>
                <td>HTTP concepts. A service never sees <code>HttpContext</code> or returns <code>IActionResult</code>.</td>
              </tr>
              <tr>
                <td><code>&lt;Module&gt;.Persistence</code></td>
                <td>The module's <code>DbContext</code>.</td>
                <td>Entity classes — those are shared, in <code>Ideas.Shared.Domain</code>.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>The one-way rule</h3>
        <div class="rule">
          Controller → Service → Unit of work → Database. Each arrow points one way. A controller
          never touches a <code>DbContext</code>. A service never touches HTTP. Break this and the
          code stops being testable, because a test can construct a service but cannot easily
          construct a web request.
        </div>

        <h3>What a controller is allowed to do</h3>
        <p>
          Almost nothing, and that is the point. Look at how thin a real one is:
        </p>
<pre><code>[HttpPost("{cartUniqueId:guid}/lines")]
public async Task&lt;IActionResult&gt; AddLine(
    [FromRoute] Guid cartUniqueId,
    [FromBody] AddEventCartLineRequest request,
    CancellationToken cancellationToken = default)
{
    var result = await eventCartService.AddLineAsync(cartUniqueId, request, cancellationToken);
    return result.Success ? Ok(result) : BadRequest(result);
}</code></pre>
        <p>
          Bind the input, call one service method, map success to <code>200</code> and failure to
          <code>400</code>. If you find yourself writing an <code>if</code> about business meaning
          inside a controller, it belongs in the service.
        </p>

        <h3>Where the shared pieces live</h3>
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead class="table-light"><tr><th style="width:18rem">Project</th><th>What you will find</th></tr></thead>
            <tbody>
              <tr><td><code>Ideas.SharedKernel</code></td><td><code>ServiceResponse</code>, <code>UnitOfWork</code>, <code>Repository</code>, <code>BaseDbContext</code> and its model configuration, <code>ClaimStore</code>, file storage, caching, PDF generation.</td></tr>
              <tr><td><code>Ideas.Shared.Domain</code></td><td>Every entity class in the system, in one <code>Entities</code> folder. All modules read from here.</td></tr>
              <tr><td><code>Ideas.PaymentGateway</code></td><td><code>IStripeService</code> and its implementation, payment entities, the payment <code>DbContext</code>.</td></tr>
              <tr><td><code>Ideas.Notification</code></td><td>Sending email: senders, publishers, consumers, outgoing-email logging.</td></tr>
              <tr><td><code>Ideas.SeasIO</code></td><td>The seats.io seating-chart integration.</td></tr>
            </tbody>
          </table>
        </div>
        <div class="plain">
          Entities are shared but <code>DbContext</code>s are not. Every module can read every table,
          but each module goes through its own context. That is why a change to
          <code>BaseDbContext.Configuration.cs</code> affects everyone at once.
        </div>
      </section>

      <section id="lifecycle">
        <h2>4. What happens to a request</h2>
        <p class="lead-sm">
          A request passes through a fixed pipeline before your controller method runs. Knowing the
          order explains most "why is this null" questions.
        </p>

        <ol class="step-rail">
          <li><strong>HTTPS redirect.</strong> Plain HTTP is bounced to HTTPS.</li>
          <li><strong>CORS.</strong> <code>DynamicCorsPolicyProvider</code> looks the caller's origin up in the <code>OrgAllowedOrigin</code> table. The allow-list is data, not configuration, so onboarding a new frontend domain is an admin action rather than a deploy.</li>
          <li><strong>Routing.</strong> The framework decides which controller method matches the path.</li>
          <li><strong>Rate limiting.</strong> Only for endpoints that opt in by naming a policy — <code>auth</code> for login, <code>public-poll</code> for the order-status page the buyer's browser polls.</li>
          <li><strong>Authentication.</strong> The <code>SmartAuth</code> scheme decides <em>how</em> you are identified: an <code>Authorization: Bearer</code> header, a session cookie, an auth cookie, or — only on the SignalR hub path — an <code>access_token</code> query parameter, because a browser cannot set headers on a WebSocket handshake.</li>
          <li><strong>ClaimStoreMiddleware.</strong> Reads the validated claims and fills a request-scoped <code>ClaimStore</code>. From here on, any service can inject <code>IClaimStore</code> and know who is calling without touching HTTP.</li>
          <li><strong>CorrelationIdMiddleware.</strong> Stamps an id onto the request so every log line from it can be found together.</li>
          <li><strong>Authorization.</strong> The policy named on the endpoint is evaluated. See <a href="#auth">section 7</a>.</li>
          <li><strong>Your controller method runs.</strong></li>
          <li><strong>CustomUnauthorizedMiddleware</strong> turns a rejection into the response shape the frontend expects, instead of an empty <code>401</code>.</li>
        </ol>

        <div class="plain">
          <code>ClaimStore</code> is filled <em>after</em> authentication and <em>before</em>
          authorization. That is why an anonymous endpoint sees <code>OrganizerId = 0</code> rather
          than a null object — and why code that quietly relies on <code>OrganizerId</code> breaks in
          surprising ways on anonymous routes.
        </div>
      </section>

      <section id="glossary">
        <h2>5. Words you must know</h2>
        <p class="lead-sm">
          These terms appear in route names, table names and method names everywhere. Learn them
          once here rather than guessing each time.
        </p>

        <dl class="glossary row">
          <div class="col-md-6">
            <dt>Organizer</dt>
            <dd>One customer organisation. The tenant. Nearly every row in the database belongs to one, through an <code>OrganizerId</code>.</dd>

            <dt>Sub-profile</dt>
            <dd>A division inside an organizer — a chapter, branch or department — that can have its own branding and its own money.</dd>

            <dt>Module</dt>
            <dd>A feature an organizer has bought: Donation, Membership, Event and so on. Stored in <code>OrganizerModule</code>. Most endpoints refuse to run if the organizer has not subscribed to the module they belong to.</dd>

            <dt>Event</dt>
            <dd>The thing being advertised — a conference, a concert. It owns branding, forms and questions.</dd>

            <dt>Session</dt>
            <dd>A dated occurrence of an event. Tickets are sold against a session, not against the event, because an event may run on several days.</dd>

            <dt>Ticket type</dt>
            <dd>A sellable class of seat within a session: "Early bird", "Student". Holds the price, the capacity and the counters.</dd>

            <dt>Ticket price period</dt>
            <dd>A dated price for a ticket type, so a price can change on a schedule without editing the ticket type.</dd>

            <dt>Reservation</dt>
            <dd>A temporary hold on seats while a buyer completes checkout. Expires on a timer and returns the seats to inventory.</dd>

            <dt>Cart</dt>
            <dd>Not a separate table. A cart <em>is</em> an <code>Invoice</code> that has not been paid yet. Its <code>uniqueId</code> is the buyer's only handle on it.</dd>

            <dt>Ticket</dt>
            <dd>Issued only after payment succeeds. One row per attendee, carrying the code that is scanned at the door.</dd>
          </div>
          <div class="col-md-6">
            <dt>Invoice</dt>
            <dd>The shared money record. Donations, memberships and event orders all become one. Module-specific detail hangs off it in <code>DonationCampaignInvoice</code>, <code>MembershipTypeInvoice</code> or <code>EventInvoice</code>.</dd>

            <dt>Member</dt>
            <dd>A person who holds, or has applied for, a membership with an organizer.</dd>

            <dt>Campaign</dt>
            <dd>A fundraising drive that donations are given to.</dd>

            <dt>Custom form / custom question</dt>
            <dd>Extra questions an organizer writes for buyers or applicants. Forms are reusable and shared across modules; questions are defined directly on the thing they belong to. Both are answered once per order.</dd>

            <dt>Charge rule</dt>
            <dd>An organizer's own added fee — a booking fee, a service charge.</dd>

            <dt>Revenue plan</dt>
            <dd>What the <em>platform</em> charges the organizer. The applicable rules are copied onto the invoice when it is created, so later edits never rewrite an old invoice.</dd>

            <dt>Payment account</dt>
            <dd>The organizer's connected Stripe account plus bank details. Where the money lands.</dd>

            <dt>UniqueId</dt>
            <dd>A GUID that every entity carries alongside its integer primary key. <strong>Routes and API payloads always use the GUID.</strong> The integer id never leaves the server.</dd>

            <dt>ClaimStore</dt>
            <dd>A small per-request object holding who is calling: user id, organizer id, roles, allowed modules. Services inject it instead of reading HTTP.</dd>

            <dt>Soft delete</dt>
            <dd>Deleting sets <code>IsDeleted = true</code>; the row stays. Queries hide such rows automatically.</dd>
          </div>
        </dl>
      </section>

      <section id="conventions">
        <h2>6. Rules every endpoint follows</h2>
        <p class="lead-sm">
          These are not suggestions — they are what the existing 578 endpoints already do. Match
          them and your endpoint will look like it belongs.
        </p>

        <h3>Every response has the same envelope</h3>
        <p>
          Services return <code>ServiceResponse</code> or <code>ServiceResponse&lt;T&gt;</code>, and
          the controller serialises it as-is. So a caller always receives the same outer shape,
          whether the call worked or not:
        </p>
<pre><code>{
  "success": true,
  "message": null,
  "errorCode": null,
  "validationErrors": null,
  "meta": null,
  "timestamp": "2026-08-06T12:00:00Z",
  "data": { }            // only on ServiceResponse&lt;T&gt;
}</code></pre>
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <tbody>
              <tr><th style="width:12rem"><code>success</code></th><td>The only field worth branching on. Check it before touching <code>data</code>.</td></tr>
              <tr><th><code>message</code></th><td>Human-readable, safe to show a user. Never a stack trace.</td></tr>
              <tr><th><code>errorCode</code></th><td>Optional machine-readable code for cases the frontend must handle specifically.</td></tr>
              <tr><th><code>validationErrors</code></th><td>Field name to list of problems, for form-level display.</td></tr>
              <tr><th><code>data</code></th><td>The payload. Absent on the non-generic <code>ServiceResponse</code>.</td></tr>
            </tbody>
          </table>
        </div>
        <div class="dont">
          A failed call still returns HTTP <code>400</code> with <code>success: false</code> — not a
          <code>500</code>, and not an HTTP <code>200</code> containing an error. Frontend code that
          only checks the HTTP status will treat a refusal as a crash, and code that only checks
          <code>success</code> will miss a genuine server error. Check both.
        </div>

        <h3>GUIDs in, GUIDs out</h3>
        <div class="rule">
          Never put an integer primary key in a route, a request body or a response. Use the entity's
          <code>UniqueId</code>. Integer ids are sequential and leak how many rows exist and let a
          caller guess a neighbour's id.
        </div>
        <p>
          You will see this in every route: <code>{cartUniqueId:guid}</code>,
          <code>{eventUniqueId:guid}</code>, <code>{invoiceUniqueId:guid}</code>. The <code>:guid</code>
          part is a route constraint — a non-GUID value will not even match the route, so your method
          never runs with rubbish input.
        </p>

        <h3>JSON formatting</h3>
        <ul>
          <li>Property names are <strong>camelCase</strong>, both directions.</li>
          <li>Enums travel as <strong>strings</strong>, not numbers — <code>"Paid"</code>, not <code>3</code>.</li>
          <li>Circular references are ignored rather than throwing.</li>
          <li>Times are UTC. Fields are named <code>...Utc</code> when they are.</li>
        </ul>

        <h3>Money</h3>
        <div class="rule">
          Money is <code>decimal</code> in C# and a string-safe number over the wire. Never
          <code>float</code> or <code>double</code>. Never recompute a fee that was already
          snapshotted onto an invoice — read the stored value, because the rule behind it may have
          changed since.
        </div>

        <h3>Audit columns, on nearly every table</h3>
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <tbody>
              <tr><th style="width:12rem"><code>CreatedBy</code> / <code>CreatedOnUtc</code></th><td>Set automatically when a row is inserted. Never set them yourself.</td></tr>
              <tr><th><code>UpdatedBy</code> / <code>UpdatedOnUtc</code></th><td>Set automatically on modify and on delete.</td></tr>
              <tr><th><code>UniqueId</code></th><td>Filled with a new GUID on insert if you left it empty, and defaulted to <code>NEWID()</code> in the database as well.</td></tr>
              <tr><th><code>RowVersion</code></th><td>Incremented on every change, for optimistic concurrency, where the entity opts in.</td></tr>
              <tr><th><code>IsDeleted</code></th><td>Where the entity opts into soft delete.</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          All of this is applied centrally in <code>BaseDbContext.SaveChangesAsync</code>. You get it
          by inheriting <code>BaseAuditEntity&lt;int&gt;</code> and, where wanted, implementing
          <code>IUniqueId</code>, <code>IRowVersion</code> and <code>ISoftDelete</code>.
        </p>
      </section>

      <section id="auth">
        <h2>7. Login and permissions</h2>

        <h3>How the caller is identified</h3>
        <p>
          A single scheme called <strong>SmartAuth</strong> inspects the request and forwards it to
          the right handler:
        </p>
        <ol>
          <li>An <code>Authorization: Bearer &lt;token&gt;</code> header — the normal case for an API client.</li>
          <li>A session cookie — for browser flows that use cookie auth.</li>
          <li>An auth cookie containing a JWT — the token is lifted out of the cookie.</li>
          <li>An <code>access_token</code> query parameter — accepted <em>only</em> on the SignalR hub path, because a WebSocket handshake cannot carry custom headers.</li>
        </ol>
        <p>
          Tokens are JWTs signed with <strong>RSA</strong>. The private key comes from configuration
          and the application refuses to start without it — a deliberate loud failure rather than a
          silent fallback to an insecure default.
        </p>

        <h3>Three kinds of protection</h3>
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead class="table-light"><tr><th style="width:14rem">Kind</th><th>Looks like</th><th>Means</th></tr></thead>
            <tbody>
              <tr>
                <td><strong>Open</strong></td>
                <td><code>[AllowAnonymous]</code></td>
                <td>No token needed. Used for the buyer journey, webhooks and public reads. Because there is no user to trust, these endpoints have to defend themselves — see the trap below.</td>
              </tr>
              <tr>
                <td><strong>Module policy</strong></td>
                <td><code>[Authorize(Policy = AuthorizationPolicies.MembershipModuleSubscription)]</code></td>
                <td>You must be signed in <em>and</em> your organizer must subscribe to that module. Enforced by <code>SubscribedModuleHandler</code> against the <code>OrganizerModule</code> table.</td>
              </tr>
              <tr>
                <td><strong>Screen permission</strong></td>
                <td><code>[Authorize("membership:alert:create")]</code></td>
                <td>A fine-grained permission checked against the signed-in user's role. Any policy name that is not registered up front is treated as a permission name by <code>PermissionPolicyProvider</code> — which is why these read as plain strings.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>The registered policies</h3>
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead class="table-light"><tr><th style="width:22rem">Policy</th><th>Passes when</th></tr></thead>
            <tbody>
              <tr><td><code>AdminModuleAccess</code></td><td>The caller is a platform administrator.</td></tr>
              <tr><td><code>OrganizerModuleAccess</code></td><td>The caller belongs to an organizer.</td></tr>
              <tr><td><code>AdminOrOrganizerModuleAccess</code></td><td>Either of the above.</td></tr>
              <tr><td><code>DonationModuleSubscription</code></td><td>The organizer subscribes to Donation.</td></tr>
              <tr><td><code>MembershipModuleSubscription</code></td><td>The organizer subscribes to Membership.</td></tr>
              <tr><td><code>UserManagementModuleSubscription</code></td><td>The organizer subscribes to User Management.</td></tr>
              <tr><td><code>SharedOrganizerModuleSubscription</code><br><code>PermissionCatalogModuleSubscription</code><br><code>OrganizerCoreModuleSubscription</code><br><code>PaymentAccountModuleSubscription</code><br><code>PaymentMerchantModuleSubscription</code><br><code>QuickBooksModuleSubscription</code></td><td>The organizer subscribes to <em>at least one</em> of Donation, Event, Exhibition, Membership or Trip. These guard shared back-office features that any paying organizer should reach.</td></tr>
            </tbody>
          </table>
        </div>

        <h3>Tenant isolation</h3>
        <div class="rule">
          Authorization answers "may this user do this kind of thing". It does <strong>not</strong>
          answer "does this particular row belong to them". Your service must scope its query by
          <code>ClaimStore.OrganizerId</code>. A route that loads by <code>UniqueId</code> without
          that check will happily serve another organizer's data to anyone who guesses a GUID.
        </div>

        <div class="dont">
          On an anonymous endpoint there is no organizer to scope by, so the identifier in the URL
          <em>is</em> the credential. Two consequences. Never accept an identifier that lets the
          caller widen their reach — take the cart id and derive the event from it, not the other way
          round. And never return more than the anonymous caller needs; an anonymous read that
          includes an organizer's internal fields is a data leak even though no rule was broken.
        </div>
      </section>

      <section id="data">
        <h2>8. The database layer</h2>

        <h3>One database, eight contexts</h3>
        <p>
          There is a single SQL Server database. Each module reaches it through its own
          <code>DbContext</code>: <code>AdminDbContext</code>, <code>DonationDbContext</code>,
          <code>DonorDbContext</code>, <code>IdentityDbContext</code>, <code>InvoiceDbContext</code>,
          <code>MembershipDbContext</code>, <code>OrganizerDbContext</code> and
          <code>PaymentDbContext</code>. All of them derive from <code>BaseDbContext</code>, which is
          where the whole model is configured — every table, index, relationship and default lives in
          <code>BaseDbContext.Configuration.cs</code>.
        </p>
        <div class="plain">
          Because the model is shared, adding a table means adding one
          <code>ConfigureXxx(modelBuilder)</code> method and one call to it. Every context then knows
          about your table — you do not add a <code>DbSet</code> per module.
        </div>

        <h3>Unit of work and repository</h3>
        <p>
          Services never use a <code>DbContext</code> directly. They take
          <code>IUnitOfWork&lt;TContext&gt;</code> and go through it:
        </p>
<pre><code>// read
var invoice = await Uow.Repository&lt;Invoice&gt;()
    .Query()
    .Include(item =&gt; item.EventInvoices)
    .SingleOrDefaultAsync(item =&gt; item.UniqueId == cartUniqueId, cancellationToken);

// write, all-or-nothing
await Uow.ExecuteInTransactionAsync(async token =&gt;
{
    await Uow.Repository&lt;EventTicket&gt;().AddAsync(ticket, token);
    await Uow.SaveChangesAsync(token);
}, cancellationToken);</code></pre>
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead class="table-light"><tr><th style="width:16rem">Call</th><th>Does</th></tr></thead>
            <tbody>
              <tr><td><code>Query()</code></td><td>An <code>IQueryable</code> with the global filters applied — soft-deleted rows are already excluded.</td></tr>
              <tr><td><code>Query(false)</code> / <code>IgnoreQueryFilters()</code></td><td>The same query with filters off. You need this when a unique index still holds a soft-deleted row, or when checking whether a deleted row references something.</td></tr>
              <tr><td><code>AddAsync</code>, <code>Update</code></td><td>Stage an insert or an update.</td></tr>
              <tr><td><code>Delete</code>, <code>Remove</code></td><td>Identical in effect — see the warning below.</td></tr>
              <tr><td><code>ExecuteInTransactionAsync</code></td><td>Wraps the work in a database transaction. Anything that writes more than one table belongs inside one.</td></tr>
            </tbody>
          </table>
        </div>

        <div class="dont">
          <code>Remove</code> does <strong>not</strong> hard-delete an entity that implements
          <code>ISoftDelete</code>. <code>SaveChanges</code> intercepts the deletion, sets
          <code>IsDeleted = true</code> and turns it into an update. This is platform-wide and
          deliberate. If you genuinely need a row gone, the entity must not implement
          <code>ISoftDelete</code> at all.
        </div>

        <h3>Migrations</h3>
        <p>
          Migrations live in <code>src/Modules/Identity/Ideas.Identity.Persistence/Migrations</code> —
          one folder for the whole model, despite the module name. Create one like this:
        </p>
<pre><code>dotnet ef migrations add AddSomethingUseful \\
  --project src/Modules/Identity/Ideas.Identity.Persistence \\
  --startup-project src/Presentation/Ideas.API</code></pre>
        <div class="rule">
          Read the generated migration before you commit it. It must contain only what you intended.
          A <code>DropColumn</code>, <code>AlterColumn</code>, <code>RenameTable</code> or index change
          on a table Donation or Membership uses is a production incident waiting to happen. Adding a
          table or a nullable column is safe; almost nothing else is.
        </div>
      </section>

      <section id="background">
        <h2>9. Work that runs on its own</h2>
        <p class="lead-sm">
          Two different mechanisms, chosen for different reasons. Know which one you are looking at.
        </p>

        <h3>Hosted services — in-process timers</h3>
        <p>
          A class deriving from <code>BackgroundService</code>, started with the application and
          ticking on its own timer. Simple, with no external dependency, but it runs inside the web
          process and has no dashboard and no retry.
        </p>
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead class="table-light"><tr><th style="width:22rem">Service</th><th>Does</th></tr></thead>
            <tbody>
              <tr><td><code>EventCartMaintenanceHostedService</code></td><td>Every minute: expires stale ticket reservations and returns the seats, then deletes answer files uploaded against carts that were abandoned. Each pass is isolated, so one failing does not stop the other.</td></tr>
              <tr><td><code>AlertScheduleHostedService</code></td><td>Sends membership alerts that were scheduled for a future time.</td></tr>
              <tr><td><code>ScreenPermissionSyncHostedService</code></td><td>Keeps the permission catalogue in the database in step with the code.</td></tr>
              <tr><td><code>ContactSyncBackgroundService</code></td><td>Pushes contacts to external providers.</td></tr>
              <tr><td><code>StartupWarmupService</code></td><td>Warms caches after startup.</td></tr>
              <tr><td><code>JobScheduler</code></td><td>Not a worker itself — it registers the Hangfire recurring jobs below.</td></tr>
            </tbody>
          </table>
        </div>

        <h3>Hangfire — durable jobs</h3>
        <p>
          Hangfire stores jobs in the database, retries them on failure and shows them on
          <code>/hangfire</code>. Use it when losing the work would matter.
        </p>
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead class="table-light"><tr><th style="width:18rem">Job</th><th style="width:8rem">Schedule</th><th>Does</th></tr></thead>
            <tbody>
              <tr><td><code>recurring-donation-job</code></td><td>every minute</td><td>Charges donations that are due on a recurring plan.</td></tr>
              <tr><td><code>event-order-recovery-sweep</code></td><td>every 10 minutes</td><td>Finds paid event orders the Stripe webhook never managed to report, and completes or refunds them. Without this a charged buyer with no tickets would be invisible.</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          Work is also queued on demand through dispatchers —
          <code>TicketDeliveryDispatcher</code>, <code>EventRegistrationConfirmationDispatcher</code>,
          <code>EventOrderRecoveryDispatcher</code>. A dispatcher is the only place that knows Hangfire
          exists; the module calls an interface and stays unaware of the queue.
        </p>
        <div class="plain">
          The pattern is worth copying. Put <code>IWhateverDispatcher</code> in the shared kernel,
          implement it in <code>Ideas.BackgroundJobs</code>, and your module never references
          Hangfire — which also means it stays unit-testable.
        </div>
      </section>

      <section id="payments">
        <h2>10. Money and Stripe</h2>

        <div class="rule">
          No card number, bank account number or similar ever reaches this API. The browser sends
          them straight to Stripe and the API only ever sees identifiers. Any change that would route
          a raw instrument through the server is wrong regardless of how convenient it looks.
        </div>

        <h3>Two charge topologies</h3>
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead class="table-light"><tr><th style="width:14rem">Kind</th><th>Where the charge lives</th><th>Used for</th></tr></thead>
            <tbody>
              <tr><td><strong>Direct charge</strong></td><td>On the organizer's connected Stripe account. Calls carry a <code>Stripe-Account</code> header.</td><td>Card payments.</td></tr>
              <tr><td><strong>Destination charge</strong></td><td>On the platform account, transferred onward.</td><td>Bank payments — ACH in the US, PAD in Canada.</td></tr>
            </tbody>
          </table>
        </div>
        <div class="dont">
          Getting this backwards is a real and easy bug: sending the <code>Stripe-Account</code>
          header on an ACH or PAD operation makes Stripe look for the payment on the wrong account
          and the call fails. <code>IsDirectChargeMethod</code> is the single place that decides;
          use it rather than writing the condition again.
        </div>

        <h3>The card payment flow</h3>
        <ol class="step-rail">
          <li>The frontend fetches the publishable key: <code>GET /api/public/stripe/{paymentAccountUniqueId}/credentials</code>.</li>
          <li>It mounts Stripe's card elements with the amount from the pricing call.</li>
          <li>The buyer presses pay; the frontend asks the API to create a payment intent.</li>
          <li>Stripe confirms the payment in the browser.</li>
          <li>Stripe calls <code>POST /api/public/stripe/web-hook</code> server-to-server.</li>
          <li>The settlement service issues tickets, marks the invoice paid and queues delivery.</li>
        </ol>
        <div class="dont">
          There are two webhook routes in this codebase and only one of them does anything.
          <code>POST /api/public/stripe/web-hook</code> is the real one — it verifies the signature,
          settles the invoice and notifies the owning module. <code>POST /webhooks/stripe</code>
          verifies the signature and then only writes a log line; it settles nothing. Point Stripe at
          the first one.
        </div>
        <div class="plain">
          Steps 5 and 6 are the important ones. The buyer's browser is <em>not</em> the source of
          truth that a payment succeeded — the webhook is. Never issue anything valuable on the
          strength of a browser redirect alone.
        </div>

        <h3>Fees</h3>
        <p>
          An invoice's total is the sum of the item prices plus, where applicable, the organizer's
          charge rules, the platform's revenue-plan rules and the payment processor's fee. Each of
          those is <strong>snapshotted</strong> onto the invoice when it is created.
        </p>
        <div class="rule">
          Always read a fee from the stored snapshot. Never recalculate one from the current rules —
          the rule may have been edited since, and recalculating silently rewrites history and
          produces a total that does not match what the customer actually paid.
        </div>
      </section>

      <section id="platform">
        <h2>11. Files, email, realtime, limits</h2>

        <h3>File storage</h3>
        <p>
          Uploads go through <code>IFileStorageService</code>, which writes the bytes via an
          <code>IStorageProvider</code> and records a <code>FileStorage</code> row. Only the local
          provider is implemented today; the Azure and AWS providers exist as stubs. Set the module
          and folder before saving so the file lands in the right place:
        </p>
<pre><code>fileStorageService.SetModule(EnumModule.Event);
fileStorageService.SetCustomFolder("event-answer-files");
var stored = await fileStorageService.SaveFileAsync(file);   // returns the FileStorage id</code></pre>
        <p>
          Uploads are validated for size and extension, and executable or scriptable extensions are
          refused whatever the caller asks for.
        </p>

        <h3>Email</h3>
        <p>
          <code>Ideas.Notification</code> owns sending. Mail is published to a queue and delivered by
          a consumer, with every outgoing message logged so a "did it send" question has an answer.
          Organizers author templates and snippets per module.
        </p>

        <h3>Real-time</h3>
        <p>
          SignalR powers live alerts through <code>AlertHub</code>. The hub is the one place a token
          may arrive as a query parameter, for the WebSocket reason given earlier.
        </p>

        <h3>Rate limiting</h3>
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead class="table-light"><tr><th style="width:10rem">Policy</th><th>Applies to</th><th>Limit</th></tr></thead>
            <tbody>
              <tr><td><code>auth</code></td><td>Login and other credential endpoints.</td><td>Per IP, configurable at runtime by an admin.</td></tr>
              <tr><td><code>public-poll</code></td><td>The order-status endpoint the buyer's confirmation page polls while a bank payment settles.</td><td>60 requests per minute per IP.</td></tr>
            </tbody>
          </table>
        </div>
        <p>Rejections return HTTP <code>429</code>.</p>

        <h3>Configuration and secrets</h3>
        <div class="rule">
          No secret belongs in the repository — not in <code>appsettings.json</code>, not in a test,
          not in a comment, not in a commit message. Real credentials live in git-ignored
          configuration files. A secret that reaches version control is burned: rotate it first, then
          clean the history.
        </div>
      </section>

      <section id="recipe">
        <h2>12. Adding a new endpoint</h2>
        <p class="lead-sm">Follow these steps in order and the result will match everything around it.</p>

        <ol class="step-rail">
          <li>
            <strong>Decide the module.</strong> Whose data is it? That decides which
            <code>Modules/&lt;Module&gt;</code> folder and which controller area you work in.
          </li>
          <li>
            <strong>Write the request and response models</strong> in
            <code>&lt;Module&gt;.Application/Models</code>. Plain classes. Identify things by
            <code>Guid</code>, never by <code>int</code>.
          </li>
          <li>
            <strong>Add the method to the service interface</strong> in
            <code>&lt;Module&gt;.Application/Contracts/Services</code>, returning
            <code>Task&lt;IServiceResponse&lt;T&gt;&gt;</code> and accepting a
            <code>CancellationToken</code>.
          </li>
          <li>
            <strong>Implement it</strong> in <code>&lt;Module&gt;.Infrastructure/Services</code>.
            Scope every query by <code>ClaimStore.OrganizerId</code> unless the endpoint is genuinely
            anonymous. Wrap multi-table writes in <code>ExecuteInTransactionAsync</code>. Return
            <code>ServiceResponse.Fail(...)</code> with a message a user can read — never let an
            exception reach the caller.
          </li>
          <li>
            <strong>Add the controller action.</strong> Bind, call, map to <code>Ok</code> or
            <code>BadRequest</code>. Nothing else. Put the right
            <code>[Authorize(Policy = ...)]</code> on it; if you write
            <code>[AllowAnonymous]</code>, be ready to justify it.
          </li>
          <li>
            <strong>Register the service</strong> in the module's
            <code>ServiceCollectionExtensions</code> if it is new.
          </li>
          <li>
            <strong>Add the migration</strong> if you touched the model, and read it line by line
            before committing.
          </li>
          <li>
            <strong>Write the tests</strong> in <code>tests/Ideas.API.Tests/&lt;Area&gt;</code>. Name
            them <code>Scenario_Condition_ExpectedResult</code>. Cover the failure paths as
            thoroughly as the happy path — bad input, missing permission, wrong organizer.
          </li>
          <li>
            <strong>Run the whole suite</strong>, not just your file. Then regenerate this page — see
            <a href="#upkeep">section 15</a>.
          </li>
        </ol>
      </section>

      <section id="traps">
        <h2>13. Traps that bite everyone</h2>

        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead class="table-light"><tr><th style="width:20rem">The trap</th><th>What actually happens</th></tr></thead>
            <tbody>
              <tr>
                <td><strong>Expecting <code>Remove</code> to delete a row</strong></td>
                <td>If the entity implements <code>ISoftDelete</code>, it is flipped to <code>IsDeleted = true</code> instead. The row and its unique-index slot remain.</td>
              </tr>
              <tr>
                <td><strong>Re-inserting after a soft delete</strong></td>
                <td>The old row still occupies the unique index, so the insert fails with a duplicate key. Load with <code>IgnoreQueryFilters()</code> and revive the existing row instead.</td>
              </tr>
              <tr>
                <td><strong>Forgetting the organizer scope</strong></td>
                <td>Authorization passed, so the request looks legitimate — and returns another tenant's row. Always filter by <code>ClaimStore.OrganizerId</code>.</td>
              </tr>
              <tr>
                <td><strong>Trusting the browser that a payment succeeded</strong></td>
                <td>A redirect can be faked, retried or simply lost. Only the Stripe webhook is authoritative.</td>
              </tr>
              <tr>
                <td><strong>Recomputing a fee at read time</strong></td>
                <td>The rule may have changed since the invoice was raised. The displayed total then disagrees with what was charged.</td>
              </tr>
              <tr>
                <td><strong>Sending <code>Stripe-Account</code> on a bank payment</strong></td>
                <td>ACH and PAD are destination charges on the platform account. The header sends Stripe looking in the wrong place.</td>
              </tr>
              <tr>
                <td><strong>Putting business logic in a controller</strong></td>
                <td>It becomes untestable, and the next person duplicates it in the service anyway.</td>
              </tr>
              <tr>
                <td><strong>Editing shared code for a module-specific need</strong></td>
                <td><code>BaseDbContext</code>, <code>FileStorage</code>, the invoice model and authentication are used by two modules that are live in production. Add alongside; do not change underneath.</td>
              </tr>
              <tr>
                <td><strong>Assuming a locked-DLL build error is your fault</strong></td>
                <td>It means the API is still running. Stop it and rebuild.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

${renderRegistrationSection()}
`,

  upkeep: `
      <section id="upkeep">
        <h2>16. Keeping this page true</h2>
        <p class="lead-sm">
          A document that drifts out of date is worse than none, because people still trust it. This
          one is built so that drift is visible and cheap to fix.
        </p>

        <h3>How the endpoint list is produced</h3>
        <p>
          Section 15 is not typed by hand. It is generated by reflecting over the compiled
          <code>Ideas.API</code> assembly — reading the real route attributes, the real authorization
          attributes and the real method parameters. That is why the route prefixes are correct even
          where they are inherited from a base controller, and why nothing can be accidentally
          omitted: if a controller compiles, it appears here.
        </p>

        <h3>How to regenerate it</h3>
        <p>Three commands. The whole thing takes under a minute.</p>
        <ol class="step-rail">
          <li>
            <strong>Dump the route table from the API.</strong> In the backend repository, open
            <code>tests/Ideas.API.Tests/EndpointInventoryDump.cs</code> and remove the
            <code>Skip = ...</code> from the <code>[Fact]</code>, then run:
<pre><code>$env:ENDPOINT_DUMP_PATH = "&lt;frontend-repo&gt;/docs/tools/endpoints.reflected.json"
dotnet test ./tests/Ideas.API.Tests/Ideas.API.Tests.csproj \\
  --filter FullyQualifiedName~EndpointInventoryDump</code></pre>
            Put the <code>Skip</code> back afterwards — the helper writes a file and asserts nothing,
            so it should not run as part of the normal suite.
          </li>
          <li>
            <strong>Refresh the documentation comments.</strong> From <code>docs/tools</code> in this
            repository:
<pre><code>node extract-summaries.mjs summaries.json</code></pre>
            This picks up any <code>/// &lt;summary&gt;</code> written above a controller or an action
            and shows it under the route.
          </li>
          <li>
            <strong>Rebuild the page.</strong>
<pre><code>node build-backend-doc.mjs ../backend-developer-handbook.bootstrap.html</code></pre>
          </li>
        </ol>
        <div class="rule">
          Regenerate whenever you add, remove, rename or re-secure an endpoint. Treat it as part of
          the change, in the same commit — not as a follow-up task.
        </div>
        <div class="plain">
          Want a better one-line description next to a route? Do not edit the generated HTML — it
          will be overwritten. Write a <code>/// &lt;summary&gt;</code> comment above the controller
          action instead. The comment then serves both the code and this page, and can never
          disagree with the code it sits on.
        </div>

        <h3>The files involved</h3>
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead class="table-light"><tr><th style="width:22rem">File</th><th>Role</th></tr></thead>
            <tbody>
              <tr><td><code>docs/tools/endpoints.reflected.json</code></td><td>The route table, produced by the backend helper. Generated — never edit.</td></tr>
              <tr><td><code>docs/tools/summaries.json</code></td><td>Documentation comments harvested from the controllers. Generated — never edit.</td></tr>
              <tr><td><code>docs/tools/doc-copy.mjs</code></td><td>All the hand-written prose, including the area blurbs and controller notes. <strong>Edit this</strong> when a concept changes.</td></tr>
              <tr><td><code>docs/tools/build-backend-doc.mjs</code></td><td>Assembles the page from the three files above.</td></tr>
              <tr><td><code>docs/backend-developer-handbook.bootstrap.html</code></td><td>The page you are reading. Generated — never edit by hand.</td></tr>
            </tbody>
          </table>
        </div>

        <h3>What to write by hand</h3>
        <p>
          Sections 1 to 14 are hand-written and describe how the system thinks. Update them when a
          <em>concept</em> changes: a new module, a new authorization policy, a new background job, a
          change to how money or permissions work. Adding one more CRUD endpoint to an existing
          controller does not need any prose change — only a regenerate.
        </p>

        <h3>Two documents, two audiences</h3>
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead class="table-light"><tr><th style="width:22rem">Document</th><th>Answers</th></tr></thead>
            <tbody>
              <tr>
                <td><strong>This page</strong></td>
                <td>"How does the backend work, and what endpoints exist?" For backend developers and anyone joining the team.</td>
              </tr>
              <tr>
                <td><code>event-registration-api.bootstrap.html</code></td>
                <td>"How do I build the ticket-buying screens?" For frontend developers, walking one journey call by call.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="mb-0">
          They overlap only where the event registration endpoints are concerned. If you change that
          flow, both need updating.
        </p>
      </section>
`,
}
