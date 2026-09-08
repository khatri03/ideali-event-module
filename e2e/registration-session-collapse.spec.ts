import { expect, test } from "@playwright/test"
import { EVENT_UNIQUE_ID, REGISTER_PATH, envelope, registrationResponse } from "./eventSeatLegend"

/**
 * How the sessions step opens decides what the buyer sees first. One session is opened, because there is nothing to
 * choose between; several are shut, because an open ticket list under every session buries the later ones.
 */

const SECOND_SESSION_UNIQUE_ID = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d"

/** The fixture event with a second session bolted on, which is the only difference the rule turns on. */
function twoSessionResponse() {
  const payload = JSON.parse(JSON.stringify(registrationResponse)) as {
    data: { Sessions: Record<string, unknown>[] }
  }

  const [firstSession] = payload.data.Sessions
  payload.data.Sessions = [
    firstSession,
    { ...firstSession, UniqueId: SECOND_SESSION_UNIQUE_ID, Name: "Closing Night", OffersSeatSelection: false },
  ]

  return payload
}

/** Opens the registration form on a stubbed event, so the run turns only on how many sessions it carries. */
async function openRegistration(page: import("@playwright/test").Page, body: unknown) {
  await page.setViewportSize({ width: 1440, height: 900 })

  await page.route("**/*.seatsio.net/**", (route) => route.abort())
  await page.route("**/cdn-*.seatsio.net/**", (route) => route.abort())

  await page.route("**/api/events/*/register**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) }),
  )
  await page.route(`**/api/events/${EVENT_UNIQUE_ID}/register/sessions/*/seating`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(envelope(null)) }),
  )

  await page.goto(REGISTER_PATH)
}

/**
 * Several sessions all expanded means the buyer scrolls through every ticket list to reach the session they came
 * for, and cannot see at a glance what the event is even selling.
 */
test("keeps every session shut when the event sells more than one", async ({ page }) => {
  await openRegistration(page, twoSessionResponse())

  await expect(page.getByText("Opening Night").first()).toBeVisible()
  await expect(page.getByText("Closing Night").first()).toBeVisible()
  await expect(page.getByRole("region", { name: "Seat categories" })).toHaveCount(0)
})

/**
 * An event with one session has nothing to choose between, so starting it collapsed would hide the whole purchase
 * behind a disclosure and show the buyer an empty step until they find it.
 */
test("opens the session when the event sells only one", async ({ page }) => {
  await openRegistration(page, registrationResponse)

  await expect(page.getByRole("region", { name: "Seat categories" })).toBeVisible({ timeout: 30_000 })
})

/**
 * Collapsed is a starting point, not a wall: the session has to open on the buyer's first press, or the tickets
 * inside it are unreachable.
 */
test("opens a session the buyer asks for", async ({ page }) => {
  await openRegistration(page, twoSessionResponse())

  await page.getByRole("button", { name: "Expand Opening Night" }).click()

  await expect(page.getByRole("region", { name: "Seat categories" })).toBeVisible({ timeout: 30_000 })
})
