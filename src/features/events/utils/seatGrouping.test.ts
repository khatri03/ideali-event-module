import { describe, expect, it } from "vitest"
import type { EventSeat } from "@/features/events/schemas/eventSeating.schemas"
import type { SeatIdentity } from "./seatGrouping"
import {
  describeObject,
  describeSeat,
  describeSeatParent,
  groupSeatLabels,
  groupSeatsByParent,
  splitSeatLabel,
} from "./seatGrouping"

function seat(objectLabel: string, overrides: Partial<EventSeat> = {}): EventSeat {
  return {
    objectLabel,
    objectType: "seat",
    categoryKey: "cat-standard",
    ticketTypeUniqueId: "ticket-standard",
    ticketTypeName: "Standard Seat",
    price: 150,
    ...overrides,
  }
}

function label(objectLabel: string): SeatIdentity {
  return { objectLabel, objectType: "seat" }
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
      seat("9", {
        objectType: "table",
        ticketTypeUniqueId: "ticket-table",
        ticketTypeName: "Standard Table",
        price: 1000,
      }),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].name).toBe("Standard Table")
    expect(groups[0].entries[0].name).toBe("Table 9")
  })

  /**
   * A buyer confirming a removal is being asked about a chair, not about a code. "18-1" hides which half is the
   * table, and a seat handed back on that misreading goes on sale again immediately.
   */
  it("names a seat by both its table and its own number", () => {
    expect(describeSeat({ objectLabel: "18-1", objectType: "seat" })).toBe("Seat 1 at Table 18")
    expect(describeSeat({ objectLabel: "A-14", objectType: "seat" })).toBe("Seat 14 at Row A")
  })

  /** An object with no parent has only its own label, so nothing is invented to sit it at. */
  it("names a parentless object by its own kind and label", () => {
    expect(describeSeat({ objectLabel: "9", objectType: "table" })).toBe("Table 9")
  })
})

describe("groupSeatLabels", () => {
  /**
   * A buyer checking a summary against the seat map reads by table, not by plan label. A flat list of "18-2" and
   * "18-9" makes them work out which table each belongs to before they can tell whether the order is right.
   */
  it("lists seats under the table they sit at", () => {
    expect(groupSeatLabels([label("18-2"), label("15-11"), label("18-9")])).toEqual([
      { key: "parent:15", parentName: "Table 15", seats: [{ name: "Seat 11", identity: label("15-11") }] },
      {
        key: "parent:18",
        parentName: "Table 18",
        seats: [
          { name: "Seat 2", identity: label("18-2") },
          { name: "Seat 9", identity: label("18-9") },
        ],
      },
    ])
  })

  /**
   * Tables are numbered, so table 9 has to come before table 19 and seat 2 before seat 11. Ordering them as text
   * puts the buyer's seats in an order that matches neither the map nor how they were picked.
   */
  it("orders tables and seats the way a person counts", () => {
    const groups = groupSeatLabels([label("19-11"), label("9-2"), label("19-2")])

    expect(groups.map((group) => group.parentName)).toEqual(["Table 9", "Table 19"])
    expect(groups[1].seats.map((entry) => entry.name)).toEqual(["Seat 2", "Seat 11"])
  })

  /**
   * An object the plan gives no parent - a table sold whole, most often - has no table number to sit under, and
   * inventing a heading for it would tell the buyer they hold a seat at a table that does not exist.
   */
  it("lists an object with no parent under no heading", () => {
    expect(groupSeatLabels([{ objectLabel: "VIP1", objectType: "table" }])).toEqual([
      {
        key: "no-parent",
        parentName: null,
        seats: [{ name: "Table VIP1", identity: { objectLabel: "VIP1", objectType: "table" } }],
      },
    ])
  })
})

describe("describeObject", () => {
  /**
   * The bug this exists for: a table sold as one object was listed as "Seat 8" because the label "8" reads the same
   * as a seat's. A buyer holding a whole table has to be told they hold a table.
   */
  it("names each kind of object by what the plan draws it as", () => {
    expect(describeObject("table", "8")).toBe("Table 8")
    expect(describeObject("seat", "11")).toBe("Seat 11")
    expect(describeObject("booth", "3")).toBe("Booth 3")
    expect(describeObject("generalAdmission", "Lawn")).toBe("Area Lawn")
  })

  /**
   * An object whose type nothing reported is named by its label alone. Falling back to "Seat" would reintroduce the
   * exact wrong answer for the table this was written for, and a wrong noun is worse than no noun.
   */
  it("names an object of unknown kind by its label alone", () => {
    expect(describeObject("", "8")).toBe("8")
    expect(describeObject("mezzanine", "8")).toBe("8")
  })
})
