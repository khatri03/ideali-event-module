import { expect, type Page } from "@playwright/test"

export const PUBLISHED_CHART_KEY = "90be2528-9292-4337-86d9-5ef4a64b7980"
export const PUBLISHED_LAYOUT_NAME = "Grand Ballroom"
export const UNPUBLISHED_LAYOUT_NAME = "Draft Hall"
export const LIST_PATH = "/organizer/seatsio/seating-layouts"

const TIMESTAMP = "2026-09-04T00:00:00Z"

/**
 * A one-pixel PNG served inline, so the preview cell can be asserted without the test depending on Seats.io
 * serving an image over the network.
 */
export const THUMBNAIL_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

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

const layoutsResponse = envelope({
  pageNo: 1,
  pageSize: 10,
  pageCount: 1,
  totalRecordsCount: 2,
  pageData: [
    {
      id: 1,
      uniqueId: "7a6c857d-ca04-4abe-a812-895496c8bea9",
      venueUniqueId: null,
      venueName: null,
      name: PUBLISHED_LAYOUT_NAME,
      seatsIoChartKey: PUBLISHED_CHART_KEY,
      thumbnailUrl: THUMBNAIL_DATA_URL,
    },
    {
      id: 2,
      uniqueId: "0f1d9c7e-2a44-4bd9-8b1e-7c2a5e3f9d11",
      venueUniqueId: null,
      venueName: null,
      name: UNPUBLISHED_LAYOUT_NAME,
      seatsIoChartKey: null,
      thumbnailUrl: null,
    },
  ],
})

const validationResponse = envelope({
  chartKey: PUBLISHED_CHART_KEY,
  isValid: true,
  summary: "Ready for event creation.",
  issues: [],
})

const workspaceResponse = envelope({
  key: "workspace-public",
  secretKey: "workspace-secret",
  region: "eu",
})

/**
 * Opens the seating layouts list with one published layout and one that has never been published, which is the
 * pair the preview column has to tell apart. The Seats.io embed is blocked: it is the vendor's own iframe, and
 * loading it would make every assertion here depend on a third party's rendering and network.
 */
export async function openSeatingLayoutsList(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height })

  await page.route("**/api/identity/account/session", (route) => route.fulfill({ json: sessionResponse }))
  await page.route("**/api/alert-inbox/**", (route) => route.fulfill({ json: envelope(null) }))
  await page.route("**/api/organizer/seatsio/workspace", (route) => route.fulfill({ json: workspaceResponse }))
  await page.route("**/api/organizer/seatsio/seating-layouts?**", (route) => route.fulfill({ json: layoutsResponse }))
  await page.route("**/api/organizer/seatsio/seating-layouts/*/validation", (route) =>
    route.fulfill({ json: validationResponse }),
  )
  await page.route("**/*.seatsio.net/**", (route) => route.abort())

  await page.goto(LIST_PATH)
  await expect(page.getByText(PUBLISHED_LAYOUT_NAME)).toBeVisible({ timeout: 30_000 })
}

export async function hasHorizontalOverflow(page: Page) {
  return await page.evaluate(() => {
    const { documentElement } = document
    // A single pixel of rounding slack, so sub-pixel layout maths does not read as a real break.
    return documentElement.scrollWidth - documentElement.clientWidth > 1
  })
}
