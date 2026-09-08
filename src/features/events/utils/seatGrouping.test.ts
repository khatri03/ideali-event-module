import { describe, expect, it } from "vitest"
import type { EventSeat } from "@/features/events/schemas/eventSeating.schemas"
import { describeSeat, describeSeatParent, groupSeatsByParent, splitSeatLabel } from "./seatGrouping"

function seat(objectLabel: string, overrides: Partial<EventSeat> = {}): EventSeat {
  return {
    objectLabel,
    categoryKey: "cat-standard",
    ticketTypeUniqueId: "ticket-standard",
    ticketTypeName: "Standard Seat",
    price: 150,
    ...overrides,
  }
}

describe("splitSeatLabel", () => {
  /** A seat is named after the table it sits at, and the two halves are what the basket groups and labels by. */
  it("reads the table and the seat number out of a plan label", () => {
    expect(splitSeatLabel("19-2")).toEqual({ parentLabel: "19", seatLabel: "2" })
  })

  /** A table booked as a whole has no parent to sit under, and inventing one would promise a table that is not there. */
  it("reports no parent for an object that stands on its own", () => {
    expect(splitSeatLabel("9")).toBeNull()
  })

  /** A label ending or starting in the separator names nothing on either side, so it is not a parent-and-seat pair. */
  it("reports no parent when one side of the separator is empty", () => {
    expect(splitSeatLabel("19-")).toBeNull()
    expect(splitSeatLabel("-2")).toBeNull()
  })
})

describe("describeSeatParent", () => {
  /**
   * The heading is what the buyer is asked to confirm giving up, so it has to say the right thing: numbered parents
   * are tables and lettered ones are rows, and calling a row a table misstates what is being removed.
   */
  it("calls a numbered parent a table and a lettered one a row", () => {
    expect(describeSeatParent("19")).toBe("Table 19")
    expect(describeSeatParent("A")).toBe("Row A")
  })
})

describe("groupSeatsByParent", () => {
  /**
   * Eight seats at one table read as eight unrelated lines without this, and there is no single thing to press to
   * give the table up.
   */
  it("gathers seats sitting at the same table under one heading", () => {
    const groups = groupSeatsByParent([seat("19-2"), seat("18-1"), seat("19-3")])

    expect(groups.map((group) => group.name)).toEqual(["Table 18", "Table 19"])
    expect(groups[1].entries.map((entry) => entry.name)).toEqual(["Seat 2", "Seat 3"])
  })

  /** Tables are numbered, and ordering them as text puts table 19 above table 9 — which is not how anyone reads a plan. */
  it("orders tables by their number rather than as text", () => {
    const groups = groupSeatsByParent([seat("19-2"), seat("9-1"), seat("100-1")])

    expect(groups.map((group) => group.name)).toEqual(["Table 9", "Table 19", "Table 100"])
  })

  /** The heading offers to remove everything under it, so the price beside it has to be what that removal gives up. */
  it("adds up what every seat under a heading costs", () => {
    const groups = groupSeatsByParent([seat("19-2"), seat("19-3", { price: 50 })])

    expect(groups[0].totalPrice).toBe(200)
  })

  /**
   * A table booked as a whole is one object with one price and no parent. Grouping it by what it is sold as names it
   * in words the buyer saw on the map, instead of leaving it under a table number that does not exist.
   */
  it("groups an object with no parent by what it is sold as", () => {
    const groups = groupSeatsByParent([
      seat("9", { ticketTypeUniqueId: "ticket-table", ticketTypeName: "Standard Table", price: 1000 }),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].name).toBe("Standard Table")
    expect(groups[0].entries[0].name).toBe("Seat 9")
  })

  /**
   * A buyer confirming a removal is being asked about a chair, not about a code. "18-1" hides which half is the
   * table, and a seat handed back on that misreading goes on sale again immediately.
   */
  it("names a seat by both its table and its own number", () => {
    expect(describeSeat("18-1")).toBe("Seat 1 at Table 18")
    expect(describeSeat("A-14")).toBe("Seat 14 at Row A")
  })

  /** An object with no parent has only its own label, so nothing is invented to sit it at. */
  it("names a parentless object by its label alone", () => {
    expect(describeSeat("9")).toBe("Seat 9")
  })
})
