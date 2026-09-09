/**
 * Which object on the plan this is, and what kind of object it is.
 *
 * Everything that names an object back to the buyer needs both: the label alone cannot tell a table sold whole
 * from a chair sitting at one, since "8" reads the same either way.
 */
export interface SeatIdentity {
  /** Label the seating plan draws the object under, e.g. "19-2" or "8". */
  objectLabel: string
  /**
   * What the plan draws the object as — "seat", "table", "booth" or "generalAdmission" — or empty when nothing
   * said. Read from the chart rather than guessed from the label, because "8" reads the same whether it names a
   * table sold whole or a chair sitting at one.
   */
  objectType: string
}

/**
 * What listing a seat in the basket needs of it: which object it is, what it is sold as, and what it costs.
 *
 * Narrower than the seat the map answers with on purpose. Seats reach the basket from two places - the chart the
 * buyer picked them on, and the cart that outlived their refresh - and these are the facts both can give.
 */
export interface BasketSeat extends SeatIdentity {
  /** Ticket type the seat is sold as, which groups objects the plan gives no parent. */
  ticketTypeUniqueId: string
  /** What that ticket type is called, as the buyer reads it. */
  ticketTypeName: string
  /** What the seat costs, in the event's currency. */
  price: number
}

/** One object under its group heading, named the short way now that the table it belongs to is stated above it. */
export interface SeatGroupEntry {
  seat: BasketSeat
  /** What the row calls the object, e.g. "Seat 2" for object label "19-2", or "Table 8" for "8". */
  name: string
}

/** Seats the plan draws together, listed under one heading the buyer can act on as a whole. */
export interface SeatGroup {
  /** Identifies the group inside one session, and is stable across renders so React can key on it. */
  key: string
  /** Heading the group is listed under, e.g. "Table 19". */
  name: string
  entries: SeatGroupEntry[]
  /** What every seat in the group costs together, in the event's currency. */
  totalPrice: number
}

const SEAT_LABEL_SEPARATOR = "-"

/** What Seats.io calls each kind of object it draws, which is what decides the noun the basket uses for it. */
const OBJECT_TYPE_NOUNS: Record<string, string> = {
  seat: "Seat",
  table: "Table",
  booth: "Booth",
  generalAdmission: "Area",
}

/**
 * Names one object the way the buyer reads it, e.g. "Table 8" or "Seat 2".
 *
 * A table sold whole and a chair at that table are both one object with one label, and the label alone cannot tell
 * them apart — "8" is a table here and a seat elsewhere. Calling every object a seat is what told a buyer holding
 * table 8 that they had "Seat 8". An object whose type nothing reported is named by its label alone rather than
 * guessed at, since guessing "seat" is the wrong answer in exactly the case this exists for.
 */
export function describeObject(objectType: string, label: string): string {
  const noun = OBJECT_TYPE_NOUNS[objectType]

  return noun ? `${noun} ${label}` : label
}

/** Compares two plan labels the way a person reads them, so table 9 comes before table 19 rather than after it. */
function compareLabels(left: string, right: string): number {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" })
}

/**
 * Splits a seat's object label into the table or row it sits at and its own number.
 *
 * Seats.io names a seat after its parent, so "19-2" is the second seat at table 19. A label with no separator names
 * an object that has no parent on the plan — a table booked as a whole, most often — and is answered with null so
 * the caller groups it by what it is sold as instead of inventing a table for it.
 */
export function splitSeatLabel(objectLabel: string): { parentLabel: string; seatLabel: string } | null {
  const separatorIndex = objectLabel.lastIndexOf(SEAT_LABEL_SEPARATOR)

  if (separatorIndex <= 0 || separatorIndex === objectLabel.length - 1) {
    return null
  }

  return {
    parentLabel: objectLabel.slice(0, separatorIndex),
    seatLabel: objectLabel.slice(separatorIndex + 1),
  }
}

/**
 * Names what a seat's parent is, in the words the plan itself uses.
 *
 * Numbered parents are tables and lettered ones are rows, which is how both Seats.io's own designer and the venues
 * behind these charts label them. The wording matters because the buyer is being asked to give up everything under
 * the heading, and "Remove row A" is a different promise from "Remove table A".
 */
export function describeSeatParent(parentLabel: string): string {
  return /^\d+$/.test(parentLabel) ? `Table ${parentLabel}` : `Row ${parentLabel}`
}

/**
 * Gathers the seats one session is holding into the tables and rows they sit at.
 *
 * A flat list of "Seat 19-2" through "Seat 19-9" tells the buyer nothing they cannot already see on the map, and
 * gives them no way to drop a table they changed their mind about without pressing nine separate buttons. Seats with
 * no parent on the plan are grouped by what they are sold as, because a table booked whole is one object with one
 * price and belongs under its own ticket type rather than under a table number it does not have.
 */
export function groupSeatsByParent(seats: BasketSeat[]): SeatGroup[] {
  const groups = new Map<string, SeatGroup>()

  for (const seat of seats) {
    const parts = splitSeatLabel(seat.objectLabel)
    const key = parts ? `parent:${parts.parentLabel}` : `type:${seat.ticketTypeUniqueId}`
    const name = parts ? describeSeatParent(parts.parentLabel) : seat.ticketTypeName || "Other seats"
    const group = groups.get(key) ?? { key, name, entries: [], totalPrice: 0 }

    group.entries.push({
      seat,
      name: describeObject(seat.objectType, parts ? parts.seatLabel : seat.objectLabel),
    })
    group.totalPrice += seat.price
    groups.set(key, group)
  }

  for (const group of groups.values()) {
    group.entries.sort((left, right) => compareLabels(left.seat.objectLabel, right.seat.objectLabel))
  }

  return [...groups.values()].sort((left, right) => compareLabels(left.name, right.name))
}

/** Seat labels the plan draws together, named the way the buyer reads them. */
export interface SeatLabelGroup {
  /** Identifies the group inside one ticket type, and is stable across renders so React can key on it. */
  key: string
  /** Heading the seats are listed under, e.g. "Table 18", or null for objects the plan gives no parent. */
  parentName: string | null
  /** What each object is called under that heading, e.g. "Seat 2" or "Table 8". */
  seatNames: string[]
}

/**
 * Gathers seats into the tables and rows they sit at.
 *
 * Takes identities rather than priced seats because the places that never knew the price — a cart summary, an
 * attendee list — should not have to invent one to read them. Seats with no parent on the plan are listed
 * together under no heading, since a table booked whole has no table number of its own to sit under.
 */
export function groupSeatLabels(seats: SeatIdentity[]): SeatLabelGroup[] {
  const groups = new Map<string, SeatLabelGroup>()

  for (const seat of [...seats].sort((left, right) => compareLabels(left.objectLabel, right.objectLabel))) {
    const parts = splitSeatLabel(seat.objectLabel)
    const key = parts ? `parent:${parts.parentLabel}` : "no-parent"
    const group = groups.get(key) ?? {
      key,
      parentName: parts ? describeSeatParent(parts.parentLabel) : null,
      seatNames: [],
    }

    group.seatNames.push(describeObject(seat.objectType, parts ? parts.seatLabel : seat.objectLabel))
    groups.set(key, group)
  }

  return [...groups.values()].sort((left, right) => compareLabels(left.parentName ?? "", right.parentName ?? ""))
}

/**
 * Names one object in full, as "Seat 1 at Table 18" or "Table 8".
 *
 * A plan label reads "18-1" and says nothing about which half is the table and which the seat, so a buyer asked to
 * confirm giving up "18-1" is being asked about a code rather than about a chair. Spelling both parts out is what
 * lets them check the answer against the map before a seat goes back on sale. An object with no parent has only its
 * own label to give.
 */
export function describeSeat(seat: SeatIdentity): string {
  const parts = splitSeatLabel(seat.objectLabel)

  return parts
    ? `${describeObject(seat.objectType, parts.seatLabel)} at ${describeSeatParent(parts.parentLabel)}`
    : describeObject(seat.objectType, seat.objectLabel)
}
