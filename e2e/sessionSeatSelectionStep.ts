import { expect, type Page, type Route } from "@playwright/test"

export const SESSION_ID = "1ac62399-e763-4b7e-ad58-0c6aad72ebce"
export const VENUE_UNIQUE_ID = "2f4c1b90-38a7-4c56-9d0e-6b1a4c8e7f31"
export const CHART_UNIQUE_ID = "7a6c857d-ca04-4abe-a812-895496c8bea9"
export const CHART_NAME = "Ground Floor"
export const UNPUBLISHED_CHART_NAME = "Gallery"
export const SEAT_SELECTION_PATH = `/organizer/sessions/${SESSION_ID}/seat-selection`

const TIMESTAMP = "2026-09-04T00:00:00Z"

/**
 * A one pixel wide PNG stands in for the Seats.io thumbnail. The picture itself is served by a vendor CDN, and
 * reaching for it would make a layout test depend on a third party being up.
 */
const THUMBNAIL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
)

export const THUMBNAIL_URL = "https://cdn-eu.seatsio.net/charts/ground-floor/thumbnail.png"

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

const venueChartsResponse = envelope([
  {
    id: 1,
    uniqueId: CHART_UNIQUE_ID,
    venueUniqueId: VENUE_UNIQUE_ID,
    venueName: "Royal Hall",
    name: CHART_NAME,
    seatsIoChartKey: "ground-floor",
    thumbnailUrl: THUMBNAIL_URL,
    previewUrl: "https://app.seats.io/preview/eu/pk_test/ground-floor",
  },
  {
    id: 2,
    uniqueId: "3d0f5a72-1c48-4c6b-9a55-8e2f7d3b6c14",
    venueUniqueId: VENUE_UNIQUE_ID,
    venueName: "Royal Hall",
    name: UNPUBLISHED_CHART_NAME,
    seatsIoChartKey: "gallery",
    thumbnailUrl: null,
    previewUrl: null,
  },
])

/**
 * Answers the wizard reads the seat selection step depends on. Anything the step does not read is answered with an
 * empty payload rather than left to fail, so a missing stub never reads as a broken screen.
 */
function fulfilSessionRead(route: Route) {
  const path = new URL(route.request().url()).pathname

  if (path.endsWith("/seat-selection")) {
    return route.fulfill({
      json: envelope({
        offerPickingSeats: true,
        seatsIoEventUniqueId: null,
        seatsIoChartUniqueId: null,
        seatsIoChartName: null,
        seatsIoEventLabel: null,
      }),
    })
  }

  if (path.endsWith("/venue")) {
    return route.fulfill({ json: envelope({ venueUniqueId: VENUE_UNIQUE_ID, venueName: "Royal Hall" }) })
  }

  if (path.endsWith("/name")) {
    return route.fulfill({ json: envelope({ name: "Opening Night" }) })
  }

  return route.fulfill({ json: envelope(null) })
}

/**
 * Opens the seat selection step of a session whose venue carries two charts, one published with a picture and one
 * without. Seats.io itself is never reached: the thumbnail is served locally, because a vendor CDN answering slowly
 * would read here as a screen that does not show the layout.
 */
export async function openSeatSelectionStep(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height })

  await page.route("**/api/identity/account/session", (route) => route.fulfill({ json: sessionResponse }))
  await page.route("**/api/alert-inbox/**", (route) => route.fulfill({ json: envelope(null) }))
  await page.route("**/api/organizer/venues/list*", (route) =>
    route.fulfill({ json: envelope([{ uniqueId: VENUE_UNIQUE_ID, name: "Royal Hall" }]) }),
  )
  await page.route("**/api/organizer/seatsio/venues/*/charts", (route) =>
    route.fulfill({ json: venueChartsResponse }),
  )
  await page.route("**/api/organizer/seatsio/seating-layouts/*/events", (route) =>
    route.fulfill({ json: envelope([]) }),
  )
  await page.route("**/api/organizer/sessions/**", fulfilSessionRead)
  await page.route(THUMBNAIL_URL, (route) =>
    route.fulfill({ contentType: "image/png", body: THUMBNAIL_PNG }),
  )
  await page.route("**/*.seatsio.net/**", (route) => route.abort())

  await page.goto(SEAT_SELECTION_PATH)
  await expect(chartPicker(page)).toBeVisible({ timeout: 30_000 })
}

/** The control the session seating layout is chosen from, the first of the two pickers on the step. */
export function chartPicker(page: Page) {
  return page.getByRole("combobox").first()
}

/** Picks a chart from the layout list, the way an organizer points a session at a seating layout. */
export async function selectChart(page: Page, name: string) {
  await chartPicker(page).click()
  await page.getByRole("option", { name: new RegExp(name, "i") }).click()
}

export async function hasHorizontalOverflow(page: Page) {
  return await page.evaluate(() => {
    const { documentElement } = document
    // A single pixel of rounding slack, so sub-pixel layout maths does not read as a real break.
    return documentElement.scrollWidth - documentElement.clientWidth > 1
  })
}
