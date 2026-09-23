import { describe, expect, it } from "vitest"
import { STATUS_CHANGE_SORT } from "@/api/seatsio"
import {
  formatStatusChangeTime,
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

describe("formatStatusChangeTime", () => {
  /**
   * Milliseconds are shown because several changes to one seat land inside the same second; without them the order of
   * a hold and its release cannot be read, which is the gap against the Seats.io portal this fixes.
   */
  it("shows seconds and milliseconds", () => {
    const local = new Date(2026, 8, 16, 16, 23, 7, 592)

    expect(formatStatusChangeTime(local.toISOString())).toBe("16 Sep 2026 16:23:07.592")
  })

  /** A missing or unreadable timestamp shows a dash instead of "Invalid Date". */
  it("shows a dash for a missing or invalid timestamp", () => {
    expect(formatStatusChangeTime(null)).toBe("—")
    expect(formatStatusChangeTime("not-a-date")).toBe("—")
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
