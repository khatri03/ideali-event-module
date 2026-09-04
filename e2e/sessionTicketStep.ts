import { expect, type Page, type Route } from "@playwright/test"

export const SESSION_ID = "15ccba19-b9c3-4a61-bb39-0e1c83e9eb12"
export const CHART_UNIQUE_ID = "7a6c857d-ca04-4abe-a812-895496c8bea9"
export const CATEGORY_ID = 7
export const CATEGORY_NAME = "Balcony"
export const CATEGORY_OBJECT_COUNT = 148
export const TICKET_STEP_PATH = `/organizer/sessions/${SESSION_ID}/ticket`

const TIMESTAMP = "2026-09-04T00:00:00Z"

function envelope(data: unknown) {
  return { success: true, message: null, timestamp: TIMESTAMP, data }
}

const sessionResponse = envelope({
  userDetail: {
    userId: 1,
    roles: ["Organizer"],
    email: "organizer@example.com",
    name: "Organizer User",
    logoUrl: null,
  },
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

const seatSelectionResponse = envelope({
  offerPickingSeats: true,
  seatsIoEventUniqueId: "0f1d9c7e-2a44-4bd9-8b1e-7c2a5e3f9d11",
  seatsIoChartUniqueId: CHART_UNIQUE_ID,
  seatsIoChartName: "Ground Floor",
  seatsIoEventLabel: "Opening Night",
})

const categoriesResponse = envelope([
  {
    id: CATEGORY_ID,
    uniqueId: "3b2c0a41-6f2c-4c05-9f3a-2a9c0f6a1d22",
    chartUniqueId: CHART_UNIQUE_ID,
    key: "cat-balcony",
    name: CATEGORY_NAME,
    color: "#7551FF",
    displayOrder: 1,
  },
])

const capacityResponse = envelope([
  {
    categoryId: CATEGORY_ID,
    categoryUniqueId: "3b2c0a41-6f2c-4c05-9f3a-2a9c0f6a1d22",
    key: "cat-balcony",
    name: CATEGORY_NAME,
    objectCount: CATEGORY_OBJECT_COUNT,
  },
])

/**
 * Answers the wizard reads the ticket step depends on. Anything the step does not read is answered with an empty
 * payload rather than left to fail, so a missing stub never reads as a broken screen.
 */
function fulfilSessionRead(route: Route) {
  const path = new URL(route.request().url()).pathname

  if (path.endsWith("/seat-selection")) {
    return route.fulfill({ json: seatSelectionResponse })
  }

  if (path.endsWith("/ticket")) {
    return route.fulfill({ json: envelope([]) })
  }

  if (path.endsWith("/booking")) {
    return route.fulfill({ json: envelope({ bookingStartDate: null, bookingEndDate: null }) })
  }

  if (path.endsWith("/name")) {
    return route.fulfill({ json: envelope({ name: "Opening Night" }) })
  }

  return route.fulfill({ json: envelope(null) })
}

/**
 * Opens the ticket step of a session that offers seat selection, with one chart category the seat count can be
 * pulled for. Seats.io itself is never reached: the counts are composed by the API, and letting the vendor answer
 * would make every assertion here depend on a third party.
 */
export async function openTicketStep(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height })

  await page.route("**/api/identity/account/session", (route) => route.fulfill({ json: sessionResponse }))
  await page.route("**/api/alert-inbox/**", (route) => route.fulfill({ json: envelope(null) }))
  await page.route("**/api/organizer/seatsio/seating-layouts/*/categories/capacity", (route) =>
    route.fulfill({ json: capacityResponse }),
  )
  await page.route("**/api/organizer/seatsio/seating-layouts/*/categories", (route) =>
    route.fulfill({ json: categoriesResponse }),
  )
  await page.route("**/api/organizer/sessions/**", fulfilSessionRead)
  await page.route("**/*.seatsio.net/**", (route) => route.abort())

  await page.goto(TICKET_STEP_PATH)
  await expect(page.getByRole("button", { name: /add ticket/i }).first()).toBeVisible({ timeout: 30_000 })
}

/** Opens the ticket modal and selects the chart category the seat count belongs to. */
export async function openTicketModalWithCategory(page: Page) {
  await page.getByRole("button", { name: /add ticket/i }).first().click()
  await page.getByText("Select category").click()
  await page.getByRole("option", { name: new RegExp(CATEGORY_NAME, "i") }).click()
}

export async function hasHorizontalOverflow(page: Page) {
  return await page.evaluate(() => {
    const { documentElement } = document
    // A single pixel of rounding slack, so sub-pixel layout maths does not read as a real break.
    return documentElement.scrollWidth - documentElement.clientWidth > 1
  })
}
