import { describe, expect, it } from "vitest"
import { groupInOrder } from "./collections"

interface Seat {
  session: string
  holder: string
}

const SEATS: Seat[] = [
  { session: "Friday", holder: "Sohail" },
  { session: "Saturday", holder: "Amina" },
  { session: "Friday", holder: "Zahra" },
]

describe("groupInOrder", () => {
  it("Group_ItemsSharingAKey_CollectsThemUnderOneEntry", () => {
    const groups = groupInOrder(SEATS, (seat) => seat.session)

    expect(groups).toHaveLength(2)
    expect(groups[0].items.map((seat) => seat.holder)).toEqual(["Sohail", "Zahra"])
    expect(groups[1].items.map((seat) => seat.holder)).toEqual(["Amina"])
  })

  it("Group_KeysMetOutOfOrder_KeepsFirstAppearanceOrder", () => {
    const groups = groupInOrder(SEATS, (seat) => seat.session)

    expect(groups.map((group) => group.key)).toEqual(["Friday", "Saturday"])
  })

  it("Group_NoItems_ReturnsNoGroups", () => {
    expect(groupInOrder([] as Seat[], (seat) => seat.session)).toEqual([])
  })
})
