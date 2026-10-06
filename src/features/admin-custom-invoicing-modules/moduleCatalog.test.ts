import { describe, expect, it } from "vitest"
import { buildModuleRows } from "./moduleCatalog"

describe("buildModuleRows", () => {
  /** The admin always reads the live modules in a fixed order, followed by the three not yet offered. */
  it("buildModuleRows_ServerStates_OrdersDonationMembershipEventThenComingSoon", () => {
    const rows = buildModuleRows([
      { moduleType: "Event", isEnabled: true, updatedAtUtc: null, updatedByName: null },
      { moduleType: "Membership", isEnabled: false, updatedAtUtc: "2026-10-01T09:00:00Z", updatedByName: "Ayesha Khan" },
      { moduleType: "Donation", isEnabled: true, updatedAtUtc: null, updatedByName: null },
    ])

    expect(rows.map((row) => [row.name, row.isComingSoon])).toEqual([
      ["Donation", false],
      ["Membership", false],
      ["Event", false],
      ["Trips & Tours", true],
      ["Exhibitions", true],
      ["Auction", true],
    ])
    expect(rows[1]).toMatchObject({
      moduleType: "Membership",
      isEnabled: false,
      changedByName: "Ayesha Khan",
      changedAtUtc: "2026-10-01T09:00:00Z",
    })
  })

  /** A live module the server omitted reads as off, so the screen never claims a module is on that the server would refuse. */
  it("buildModuleRows_ModuleMissingFromServer_ReadsDisabled", () => {
    const rows = buildModuleRows([{ moduleType: "Event", isEnabled: true, updatedAtUtc: null, updatedByName: null }])

    expect(rows.find((row) => row.name === "Donation")).toMatchObject({ moduleType: "Donation", isEnabled: false })
  })

  /** Coming-soon rows carry no module type, so nothing on them can address the server. */
  it("buildModuleRows_ComingSoonRows_HaveNoModuleType", () => {
    const rows = buildModuleRows([])

    expect(rows.filter((row) => row.isComingSoon).map((row) => row.moduleType)).toEqual([null, null, null])
  })
})
