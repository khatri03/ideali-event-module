import { expect, type Page } from "@playwright/test"
import {
  CART_UNIQUE_ID,
  EVENT_UNIQUE_ID,
  HOUR_FROM_NOW,
  REGISTER_PATH,
  SESSION_UNIQUE_ID,
  cartResponse,
  envelope,
  registrationResponse,
} from "./eventSeatLegend"

/**
 * Drives the seat picker for a buyer who already has a cart, which is the state the legend suite deliberately
 * never reaches.
 *
 * The map is opened from a button rather than drawn on the card, so these tests are about the button, the dialog
 * it opens, and the seats that stay listed once it is closed. The chart itself is vendor JavaScript and is blocked
 * here for the same reason the legend suite blocks it: a layout test must not depend on Seats.io being up.
 */

export { CART_UNIQUE_ID, EVENT_UNIQUE_ID, REGISTER_PATH, SESSION_UNIQUE_ID }

/** The lone seat this cart holds, which is the one the card has to keep showing while the map is shut. */
export const HELD_SEAT_LABEL = "A-14"

/** The table the rest of the held seats sit at, so the basket has a group to head and a group to drop. */
export const HELD_TABLE_LABEL = "19"

/** Every seat this cart holds: one on its own row, two sharing a table. */
export const HELD_SEAT_LABELS = [HELD_SEAT_LABEL, "19-1", "19-2"]

const TICKET_TYPE_UNIQUE_ID = "3f5a1b22-0c34-4f8e-9a77-51d1c2f4a900"

const seatingWithHeldSeatResponse = envelope({
  SessionUniqueId: SESSION_UNIQUE_ID,
  SeatsIoPublicKey: "workspace-public-key",
  Region: "eu",
  SeatsIoEventKey: "session-event-key",
  HoldToken: "hold-token",
  HoldTokenExpiresAtUtc: HOUR_FROM_NOW,
  Categories: [
    {
      CategoryKey: "cat-stalls",
      CategoryName: "Stalls",
      TicketTypeUniqueId: TICKET_TYPE_UNIQUE_ID,
      TicketTypeName: "Stalls",
      Price: 40,
      Color: "#7551FF",
      ShowRemainingTickets: true,
      RemainingSeats: 12,
    },
  ],
  SelectedSeats: HELD_SEAT_LABELS.map((objectLabel) => ({
    ObjectLabel: objectLabel,
    CategoryKey: "cat-stalls",
    TicketTypeUniqueId: TICKET_TYPE_UNIQUE_ID,
    TicketTypeName: "Stalls",
    Price: 40,
  })),
})

/**
 * The sessions step, which is where the seat picker lives.
 *
 * A seat picked here is also named on the buyer/attendee step, whose panel stays mounted behind the current one, so
 * a seat label matched across the whole page matches twice and says nothing about where it was found.
 */
export function sessionsStep(page: Page) {
  return page.getByLabel(/Sessions/)
}

/** True when the document itself scrolls sideways, which is what hides half a form on a phone. */
export async function hasHorizontalOverflow(page: Page) {
  return await page.evaluate(() => {
    const { documentElement } = document
    // A single pixel of rounding slack, so sub-pixel layout maths does not read as a real break.
    return documentElement.scrollWidth - documentElement.clientWidth > 1
  })
}

/**
 * Opens the registration form on a seated session with a cart already restored, and waits for the picker button.
 *
 * The cart is restored the way a returning buyer restores it — through the `ideali_event_cart` cookie the form
 * writes itself — rather than by driving the buyer-details step, so the run stays independent of that form.
 */
export async function openSeatPicker(
  page: Page,
  width: number,
  height: number,
  options: { seatingUnavailable?: boolean } = {},
) {
  await page.setViewportSize({ width, height })

  await page.route("**/*.seatsio.net/**", (route) => route.abort())
  await page.route("**/cdn-*.seatsio.net/**", (route) => route.abort())

  await page.route("**/api/events/*/register**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(registrationResponse) }),
  )
  // Refusing the map is how a buyer who never opened the session is imitated: nothing has read the chart, so the
  // seats on the basket can only have come from the cart.
  await page.route(`**/api/events/cart/${CART_UNIQUE_ID}/seating/**`, (route) =>
    options.seatingUnavailable
      ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify(envelope(null)) })
      : route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(seatingWithHeldSeatResponse),
        }),
  )
  await page.route(`**/api/events/cart/${CART_UNIQUE_ID}`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(cartResponse) }),
  )
  // Priced for real rather than answered with nothing: a cart whose price cannot be read is dropped on restore, and
  // a dropped cart takes the seats it was holding with it.
  await page.route(`**/api/events/cart/${CART_UNIQUE_ID}/price`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        envelope({
          CartUniqueId: CART_UNIQUE_ID,
          SubTotal: 40,
          DiscountAmount: 0,
          NetSubtotal: 40,
          PaymentBreakdowns: [],
        }),
      ),
    }),
  )
  // Releases are answered with the same basket: these tests are about what the buyer is asked and what the panel
  // does with the answer, not about the server's accounting.
  await page.route(`**/api/events/cart/${CART_UNIQUE_ID}/seats/release`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(cartResponse) }),
  )

  await page.context().addCookies([
    { name: "ideali_event_cart", value: CART_UNIQUE_ID, url: "https://localhost:3000/events" },
  ])

  await page.goto(REGISTER_PATH)
  await expect(page.getByRole("button", { name: /Pick seats|Change seats/ })).toBeVisible({ timeout: 30_000 })
}
