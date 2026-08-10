import { describe, expect, it } from "vitest"
import { hasEventInvoiceHistory, type EventLifecycleWindow } from "./eventLifecycle"

const NOW = new Date("2026-06-15T12:00:00Z")

function windowOf(overrides: Partial<EventLifecycleWindow>): EventLifecycleWindow {
  return {
    startDate: null,
    endDate: null,
    bookingStartDate: null,
    bookingEndDate: null,
    ...overrides,
  }
}

describe("hasEventInvoiceHistory", () => {
  it("BookingWindowOpen_ShowsInvoices", () => {
    const event = windowOf({
      bookingStartDate: "2026-06-01T00:00:00Z",
      bookingEndDate: "2026-06-30T00:00:00Z",
      startDate: "2026-07-01T00:00:00Z",
      endDate: "2026-07-02T00:00:00Z",
    })

    expect(hasEventInvoiceHistory(event, NOW)).toBe(true)
  })

  it("BookingWindowNotStarted_HidesInvoices", () => {
    const event = windowOf({
      bookingStartDate: "2026-06-20T00:00:00Z",
      bookingEndDate: "2026-06-30T00:00:00Z",
      startDate: "2026-07-01T00:00:00Z",
      endDate: "2026-07-02T00:00:00Z",
    })

    expect(hasEventInvoiceHistory(event, NOW)).toBe(false)
  })

  it("BookingClosedAndEventNotStarted_HidesInvoices", () => {
    const event = windowOf({
      bookingStartDate: "2026-05-01T00:00:00Z",
      bookingEndDate: "2026-06-10T00:00:00Z",
      startDate: "2026-07-01T00:00:00Z",
      endDate: "2026-07-02T00:00:00Z",
    })

    expect(hasEventInvoiceHistory(event, NOW)).toBe(false)
  })

  it("EventRunning_ShowsInvoices", () => {
    const event = windowOf({ startDate: "2026-06-14T00:00:00Z", endDate: "2026-06-16T00:00:00Z" })

    expect(hasEventInvoiceHistory(event, NOW)).toBe(true)
  })

  it("EventEnded_ShowsInvoices", () => {
    const event = windowOf({ startDate: "2026-05-01T00:00:00Z", endDate: "2026-05-02T00:00:00Z" })

    expect(hasEventInvoiceHistory(event, NOW)).toBe(true)
  })

  it("NoDatesSet_HidesInvoices", () => {
    expect(hasEventInvoiceHistory(windowOf({}), NOW)).toBe(false)
  })

  it("UnparseableDates_HidesInvoicesRatherThanThrowing", () => {
    const event = windowOf({ startDate: "not-a-date", endDate: "not-a-date", bookingStartDate: "not-a-date" })

    expect(hasEventInvoiceHistory(event, NOW)).toBe(false)
  })

  it("BookingOpenWithNoCloseDate_ShowsInvoices", () => {
    const event = windowOf({ bookingStartDate: "2026-06-01T00:00:00Z" })

    expect(hasEventInvoiceHistory(event, NOW)).toBe(true)
  })
})
