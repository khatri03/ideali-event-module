import { describe, expect, it } from "vitest"
import { STATUS_CHANGE_SORT } from "@/api/seatsio"
import {
  formatStatusChangeDate,
  formatStatusChangeTimeParts,
  nextStatusChangeSort,
  sortDirectionFor,
  statusChangePalette,
} from "./statusChangeDisplay"

describe("nextStatusChangeSort", () => {
  /** Date opens newest first, the order the Seats.io portal opens in, and a second click flips to oldest first. */
  it("toggles date between newest and oldest first", () => {
    expect(nextStatusChangeSort(STATUS_CHANGE_SORT.objectLabelAsc, "date")).toBe(STATUS_CHANGE_SORT.dateDesc)
    expect(nextStatusChangeSort(STATUS_CHANGE_SORT.dateDesc, "date")).toBe(STATUS_CHANGE_SORT.dateAsc)
    expect(nextStatusChangeSort(STATUS_CHANGE_SORT.dateAsc, "date")).toBe(STATUS_CHANGE_SORT.dateDesc)
  })

  /** Object and status open A to Z from any other column, and reverse on the second click. */
  it("opens a text column ascending and reverses it on the second click", () => {
    expect(nextStatusChangeSort(STATUS_CHANGE_SORT.dateDesc, "objectLabel")).toBe(STATUS_CHANGE_SORT.objectLabelAsc)
    expect(nextStatusChangeSort(STATUS_CHANGE_SORT.objectLabelAsc, "objectLabel")).toBe(STATUS_CHANGE_SORT.objectLabelDesc)
    expect(nextStatusChangeSort(STATUS_CHANGE_SORT.dateDesc, "status")).toBe(STATUS_CHANGE_SORT.statusAsc)
    expect(nextStatusChangeSort(STATUS_CHANGE_SORT.statusAsc, "status")).toBe(STATUS_CHANGE_SORT.statusDesc)
  })
})

describe("sortDirectionFor", () => {
  /** Only the sorted column reports a direction, so screen readers hear which column drives the order. */
  it("reports the direction on the sorted column and none elsewhere", () => {
    expect(sortDirectionFor(STATUS_CHANGE_SORT.dateDesc, "date")).toBe("descending")
    expect(sortDirectionFor(STATUS_CHANGE_SORT.statusAsc, "status")).toBe("ascending")
    expect(sortDirectionFor(STATUS_CHANGE_SORT.statusAsc, "date")).toBe("none")
  })
})

describe("formatStatusChangeDate", () => {
  /** Date reads in its own column, apart from the time, the way the Seats.io portal lays the log out. */
  it("shows the day without the time", () => {
    const local = new Date(2026, 8, 16, 16, 23, 7, 592)

    expect(formatStatusChangeDate(local.toISOString())).toBe("16 Sep 2026")
  })

  /** A missing or unreadable timestamp shows a dash instead of "Invalid Date". */
  it("shows a dash for a missing or invalid timestamp", () => {
    expect(formatStatusChangeDate(null)).toBe("—")
    expect(formatStatusChangeDate("not-a-date")).toBe("—")
  })
})

describe("formatStatusChangeTimeParts", () => {
  /**
   * Milliseconds are split from the second so the UI can mute them, because several changes to one seat land inside the
   * same second; without them the order of a hold and its release cannot be read, which is the gap this closes.
   */
  it("splits the second from the millisecond fraction", () => {
    const local = new Date(2026, 8, 16, 16, 23, 7, 592)

    expect(formatStatusChangeTimeParts(local.toISOString())).toEqual({ clock: "16:23:07", fraction: ".592" })
  })

  /** A missing or unreadable timestamp yields null so the cell can fall back to a dash. */
  it("returns null for a missing or invalid timestamp", () => {
    expect(formatStatusChangeTimeParts(null)).toBeNull()
    expect(formatStatusChangeTimeParts("not-a-date")).toBeNull()
  })
})

describe("statusChangePalette", () => {
  /** Raw Seats.io statuses keep the colours the tab has always used: booked green, free grey, held orange. */
  it("colours the raw Seats.io statuses", () => {
    expect(statusChangePalette("booked")).toBe("green")
    expect(statusChangePalette("free")).toBe("gray")
    expect(statusChangePalette("reservedByToken")).toBe("orange")
    expect(statusChangePalette("resale")).toBe("purple")
  })
})
