import { expect, type Page } from "@playwright/test"

export const CHART_UNIQUE_ID = "7a6c857d-ca04-4abe-a812-895496c8bea9"
export const CHART_KEY = "90be2528-9292-4337-86d9-5ef4a64b7980"
export const DESIGNER_PATH = `/organizer/seatsio/seating-layouts/${CHART_UNIQUE_ID}`

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

/** A category label long enough to push the three-column table past a phone, which is what forces the
 * table to prove it scrolls inside its own box rather than dragging the page. */
const LONG_CATEGORY_NAME = "Upper Balcony — Restricted View, Wheelchair Accessible Companion Seating"

const layoutDetailResponse = envelope({
  id: 2,
  uniqueId: CHART_UNIQUE_ID,
  venueUniqueId: null,
  name: "E2E Phase7 Verification Hall",
  seatsIoChartKey: CHART_KEY,
  categories: [],
})

const categoriesResponse = envelope([
  { key: "cat-stalls", label: "Stalls", color: "#7551FF" },
  { key: "cat-balcony", label: LONG_CATEGORY_NAME, color: "#7551FF" },
])

const workspaceResponse = envelope({
  secretKey: "workspace-secret",
  designerKey: "workspace-designer",
  region: "eu",
})

/**
 * Opens a saved seating layout straight at its own URL, which is the path the page only learns it is
 * editing from. The Seats.io designer itself is blocked: it is the vendor's iframe, and letting it
 * load would make every layout assertion depend on a third party's rendering and network.
 */
export async function openSeatingLayoutDesigner(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height })

  await page.route("**/api/identity/account/session", (route) => route.fulfill({ json: sessionResponse }))
  await page.route("**/api/alert-inbox/**", (route) => route.fulfill({ json: envelope(null) }))
  await page.route("**/api/organizer/venues/list", (route) => route.fulfill({ json: envelope([]) }))
  await page.route(`**/api/organizer/seatsio/seating-layouts/${CHART_UNIQUE_ID}/categories`, (route) =>
    route.fulfill({ json: categoriesResponse }),
  )
  await page.route(`**/api/organizer/seatsio/seating-layouts/${CHART_UNIQUE_ID}`, (route) =>
    route.fulfill({ json: layoutDetailResponse }),
  )
  await page.route("**/api/organizer/seatsio/workspace", (route) => route.fulfill({ json: workspaceResponse }))
  await page.route("**/*.seatsio.net/**", (route) => route.abort())

  await page.goto(DESIGNER_PATH)
  await expect(page.getByRole("button", { name: "Save details" })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText("Chart categories")).toBeVisible({ timeout: 30_000 })
}

export async function hasHorizontalOverflow(page: Page) {
  return await page.evaluate(() => {
    const { documentElement } = document
    // A single pixel of rounding slack, so sub-pixel layout maths does not read as a real break.
    return documentElement.scrollWidth - documentElement.clientWidth > 1
  })
}
