import { expect, type Page } from "@playwright/test"

/**
 * Drives the registration form's seat picker against stubbed API answers.
 *
 * The seat map itself is drawn by a vendor script from a CDN, and the legend beside it is the part this suite is
 * about. Stubbing the API keeps the run independent of both a seeded seated session and Seats.io being reachable.
 */

export const EVENT_UNIQUE_ID = "a974bd36-29a8-47e8-9c00-6754fb83031b"
export const SESSION_UNIQUE_ID = "6b9f13b4-1f0f-4a3f-9a04-6f0f5f3b12c7"
export const CART_UNIQUE_ID = "c0f1a3d2-88b1-4d47-9f2e-1c1c8f4d55aa"
export const REGISTER_PATH = `/events/${EVENT_UNIQUE_ID}/register`

const HOUR_FROM_NOW = new Date(Date.now() + 60 * 60 * 1000).toISOString()

function envelope(data: unknown) {
  return { success: true, message: null, timestamp: new Date().toISOString(), data }
}

const registrationResponse = envelope({
  UniqueId: EVENT_UNIQUE_ID,
  Name: "Seated Gala",
  Description: null,
  Summary: null,
  BannerUrl: null,
  ThemeColor: "#7551FF",
  TermsConditions: null,
  RefundPolicy: null,
  OrganizerName: "Ideali Events",
  TimeZone: "UTC",
  VenueName: "Grand Hall",
  StartDate: HOUR_FROM_NOW,
  EndDate: HOUR_FROM_NOW,
  PurchaseTimeLimitMinutes: 20,
  RegistrationStatus: "Open",
  CanRegister: true,
  IsOrganizer: false,
  PaymentAccountCurrency: "USD",
  AcceptsDiscountCoupons: false,
  CustomForms: [],
  CustomQuestions: [],
  VisibleTabs: [],
  PaymentMethods: [],
  Sessions: [
    {
      UniqueId: SESSION_UNIQUE_ID,
      Name: "Opening Night",
      Description: null,
      RequiresAttendeeInfo: false,
      OffersSeatSelection: true,
      SetupState: "Ready for sale",
      BookingStatus: "Open",
      StartDate: HOUR_FROM_NOW,
      EndDate: HOUR_FROM_NOW,
      TicketTypes: [],
    },
  ],
})

const cartResponse = envelope({
  CartUniqueId: CART_UNIQUE_ID,
  InvoiceNo: "INV-1001",
  EventUniqueId: EVENT_UNIQUE_ID,
  ExpiresAtUtc: HOUR_FROM_NOW,
  SubTotal: 40,
  NetSubtotal: 40,
  TotalAmount: 40,
  Lines: [
    {
      LineUniqueId: "9c1b2f77-6f4c-4a19-9e0f-2b0c9d6a8e11",
      SessionUniqueId: SESSION_UNIQUE_ID,
      TicketTypeUniqueId: "3f5a1b22-0c34-4f8e-9a77-51d1c2f4a900",
      TicketTypeName: "Stalls",
      Quantity: 1,
      UnitPrice: 40,
      LineTotal: 40,
      ReservationStatus: "Active",
      Seats: ["A-14"],
    },
  ],
})

const seatingResponse = envelope({
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
      TicketTypeUniqueId: "3f5a1b22-0c34-4f8e-9a77-51d1c2f4a900",
      TicketTypeName: "Stalls",
      Price: 40,
      Color: "#7551FF",
      ShowRemainingTickets: true,
      RemainingSeats: 12,
    },
    {
      CategoryKey: "cat-balcony",
      CategoryName: "Balcony",
      TicketTypeUniqueId: "5d7c9e11-2a45-4b6c-8d1f-77aa3c2e4b55",
      TicketTypeName: "Balcony",
      Price: 15,
      Color: "#01B574",
      ShowRemainingTickets: false,
      RemainingSeats: null,
    },
    {
      CategoryKey: "cat-boxes",
      CategoryName: "Private boxes",
      TicketTypeUniqueId: "8e2f4a67-9b1c-4d3e-8f5a-6c7b8d9e0f12",
      TicketTypeName: "Private boxes",
      Price: 120,
      Color: "#EE5D50",
      ShowRemainingTickets: true,
      RemainingSeats: 0,
    },
  ],
  SelectedSeats: [],
})

/** True when the document itself scrolls sideways, which is what hides half a form on a phone. */
export async function hasHorizontalOverflow(page: Page) {
  return await page.evaluate(() => {
    const { documentElement } = document
    // A single pixel of rounding slack, so sub-pixel layout maths does not read as a real break.
    return documentElement.scrollWidth - documentElement.clientWidth > 1
  })
}

/**
 * Opens the registration form on a session that sells numbered seats, with a cart already restored so the picker
 * is past its "tell us who you are" state and the legend is on screen.
 */
export async function openSeatLegend(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height })

  // The chart is vendor JavaScript from a CDN. Letting it load would make a layout test depend on Seats.io being up.
  await page.route("**/*.seatsio.net/**", (route) => route.abort())
  await page.route("**/cdn-*.seatsio.net/**", (route) => route.abort())

  await page.route("**/api/events/*/register**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(registrationResponse) }),
  )
  await page.route(`**/api/events/cart/${CART_UNIQUE_ID}/seating/**`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(seatingResponse) }),
  )
  await page.route(`**/api/events/cart/${CART_UNIQUE_ID}`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(cartResponse) }),
  )
  await page.route(`**/api/events/cart/${CART_UNIQUE_ID}/price`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(envelope(null)) }),
  )

  await page.context().addCookies([
    { name: "ideali_event_cart", value: CART_UNIQUE_ID, url: "https://localhost:3000/events" },
  ])

  await page.goto(REGISTER_PATH)
  await expect(page.getByRole("region", { name: "Seat categories" })).toBeVisible({ timeout: 30_000 })
}
