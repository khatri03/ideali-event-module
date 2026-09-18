import { expect, type Page } from "@playwright/test"

export const CHART_UNIQUE_ID = "7a6c857d-ca04-4abe-a812-895496c8bea9"
export const EVENT_UNIQUE_ID = "0f1d9c7e-2a44-4bd9-8b1e-7c2a5e3f9d11"
export const EVENT_LABEL = "Opening Night"

export const CHART_EVENTS_PATH = `/organizer/seatsio/seating-layouts/${CHART_UNIQUE_ID}/events`
export const EVENT_REPORT_PATH = `/organizer/seatsio/events/${EVENT_UNIQUE_ID}`

const TIMESTAMP = "2026-09-04T00:00:00Z"

function envelope(data: unknown) {
  return { success: true, message: null, timestamp: TIMESTAMP, data }
}

const sessionResponse = envelope({
  userDetail: { userId: 1, roles: ["Organizer"], email: "organizer@example.com", name: "Organizer User", logoUrl: null },
  organizerDetail: {
    organizerId: 1,
    organizerUniqueId: "organizer-1",
    name: "Ideali Events",
    email: "organizer@example.com",
    emailBrandingEnabled: false,
    profiles: [],
    paymentAccounts: [],
  },
})

const chartEventsResponse = envelope([
  {
    id: 1,
    uniqueId: EVENT_UNIQUE_ID,
    chartUniqueId: CHART_UNIQUE_ID,
    label: EVENT_LABEL,
    seatsIoEventKey: "session-opening-night",
    seatsIoChartKey: "chart-key",
  },
])

const summaryResponse = envelope({
  totalObjects: 3,
  unavailableObjects: 2,
  byStatus: [
    { key: "booked", label: "Booked", count: 2 },
    { key: "free", label: "Free", count: 1 },
  ],
  byCategory: [{ key: "Stalls", label: "Stalls", count: 3 }],
})

const statusesResponse = envelope([
  { label: "A-1", status: "Booked", categoryLabel: "Stalls", objectType: "seat", section: "Left" },
])

const forSaleResponse = envelope({ everythingForSale: true, forSale: false, objects: [], categories: [], areaPlaces: [] })
const tablesResponse = envelope({
  mode: "INHERIT",
  modeLabel: "Inherited from chart",
  inheritsChartSettings: true,
  tables: [],
})
const renderContextResponse = envelope({ eventKey: "", publicKey: "", region: "eu" })
const channelsResponse = envelope([{ key: "vip", name: "Vip", color: "#7551FF", objectCount: 2 }])
const categoriesResponse = envelope([{ key: "1", label: "Stalls", color: "#7551FF", count: 3 }])
const statusChangesResponse = envelope({
  items: [
    {
      objectLabel: "A-1",
      status: "Booked",
      quantity: 1,
      holdToken: "tok-1",
      orderId: "ord-9",
      origin: "API call - 100.51.215.8",
      dateUtc: "2026-09-10T10:00:00Z",
    },
  ],
  nextPageStartsAfter: null,
})

async function routeCommon(page: Page) {
  await page.route("**/api/identity/account/session", (route) => route.fulfill({ json: sessionResponse }))
  await page.route("**/api/alert-inbox/**", (route) => route.fulfill({ json: envelope(null) }))
  await page.route("**/*.seatsio.net/**", (route) => route.abort())
}

async function routeReports(page: Page) {
  await page.route("**/reports/summary", (route) => route.fulfill({ json: summaryResponse }))
  await page.route("**/reports/statuses", (route) => route.fulfill({ json: statusesResponse }))
  await page.route("**/reports/for-sale", (route) => route.fulfill({ json: forSaleResponse }))
  await page.route("**/reports/tables", (route) => route.fulfill({ json: tablesResponse }))
  await page.route("**/reports/channels", (route) => route.fulfill({ json: channelsResponse }))
  await page.route("**/reports/categories", (route) => route.fulfill({ json: categoriesResponse }))
  await page.route("**/reports/status-changes**", (route) => route.fulfill({ json: statusChangesResponse }))
  await page.route("**/render-context", (route) => route.fulfill({ json: renderContextResponse }))
}

/** Opens the events list of a chart, mocked to hold one event. */
export async function openChartEvents(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height })
  await routeCommon(page)
  await page.route("**/api/organizer/seatsio/seating-layouts/*/events", (route) =>
    route.fulfill({ json: chartEventsResponse }),
  )

  await page.goto(CHART_EVENTS_PATH)
  await expect(page.getByText(EVENT_LABEL)).toBeVisible({ timeout: 30_000 })
}

/** Opens the tabbed event report screen, mocked with a report per tab. */
export async function openEventReport(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height })
  await routeCommon(page)
  await routeReports(page)

  await page.goto(EVENT_REPORT_PATH)
  await expect(page.getByRole("tab", { name: "Summary" })).toBeVisible({ timeout: 30_000 })
}

export async function hasHorizontalOverflow(page: Page) {
  return await page.evaluate(() => {
    const { documentElement } = document
    return documentElement.scrollWidth - documentElement.clientWidth > 1
  })
}
