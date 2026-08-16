import { expect, type Page } from "@playwright/test"

export const EVENT_UNIQUE_ID = "1b0d0a2c-6d2f-4b3a-9a51-2f2f4a6c8d10"
export const SESSION_UNIQUE_ID = "7c3a1f88-45c9-4f2e-8f0b-9d1c5e2a7b64"
export const CHECK_IN_PATH = `/organizer/events/${EVENT_UNIQUE_ID}/sessions/${SESSION_UNIQUE_ID}/check-in`

const TIMESTAMP = "2026-08-17T18:00:00Z"

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

/** Long names and a second action column are what push the table past a narrow screen, so both are here. */
const rosterResponse = envelope({
  sessionName: "Friday Dinner — Grand Ballroom",
  counts: { issued: 3, arrived: 1, expected: 2 },
  attendees: {
    pageNo: 1,
    pageSize: 20,
    totalRecordsCount: 3,
    pageData: [
      {
        ticketUniqueId: "ticket-1",
        ticketCode: "TKT-4F92A1",
        attendeeName: "Wilhelmina Featherstonehaugh-Cholmondeley",
        attendeeEmail: "wilhelmina.featherstonehaugh@example-organisation.com",
        ticketTypeName: "Early Bird — Table of Ten",
        invoiceUniqueId: "invoice-1",
        invoiceNo: "INV-2001",
        ticketStatus: "Active",
        checkedInAtUtc: null,
        checkedInBy: null,
      },
      {
        ticketUniqueId: "ticket-2",
        ticketCode: "TKT-8C31B7",
        attendeeName: "Arrived Guest",
        attendeeEmail: "arrived.guest@example.com",
        ticketTypeName: "General Admission",
        invoiceUniqueId: "invoice-1",
        invoiceNo: "INV-2001",
        ticketStatus: "CheckedIn",
        checkedInAtUtc: TIMESTAMP,
        checkedInBy: "Organizer User",
      },
      {
        ticketUniqueId: "ticket-3",
        ticketCode: "TKT-0D57E2",
        attendeeName: "Unbilled Guest",
        attendeeEmail: null,
        ticketTypeName: "Comp",
        invoiceUniqueId: "",
        invoiceNo: "",
        ticketStatus: "Active",
        checkedInAtUtc: null,
        checkedInBy: null,
      },
    ],
  },
})

export async function openCheckInDesk(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height })

  await page.route("**/api/identity/account/session", (route) => route.fulfill({ json: sessionResponse }))
  await page.route("**/api/alert-inbox/**", (route) => route.fulfill({ json: envelope(null) }))
  await page.route(
    `**/api/organizer/events/${EVENT_UNIQUE_ID}/sessions/${SESSION_UNIQUE_ID}/attendees**`,
    (route) => route.fulfill({ json: rosterResponse }),
  )

  await page.goto(CHECK_IN_PATH)
  await expect(page.getByRole("heading", { name: "Check-in" })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole("button", { name: "Check in TKT-4F92A1" })).toBeVisible({ timeout: 30_000 })
}

export async function hasHorizontalOverflow(page: Page) {
  return await page.evaluate(() => {
    const { documentElement } = document
    // A single pixel of rounding slack, so sub-pixel layout maths does not read as a real break.
    return documentElement.scrollWidth - documentElement.clientWidth > 1
  })
}
