import { describe, expect, it } from "vitest"
import { getInitiallyExpandedSessionIds } from "./sessionExpansion"

describe("getInitiallyExpandedSessionIds", () => {
  /**
   * An event that sells one session has nothing to choose between, so hiding its tickets behind a disclosure adds
   * a click to every purchase and shows the buyer an empty step until they take it.
   */
  it("opens the only session there is", () => {
    expect(getInitiallyExpandedSessionIds(["session-1"])).toEqual(["session-1"])
  })

  /**
   * Several sessions expanded at once bury the later ones under the ticket lists of the earlier ones. Collapsed,
   * the buyer reads what is on offer before opening the one they came for.
   */
  it("keeps every session shut when there is more than one to choose between", () => {
    expect(getInitiallyExpandedSessionIds(["session-1", "session-2", "session-3"])).toEqual([])
  })

  /**
   * The step renders before the sessions arrive, and an absent list is not a choice between sessions.
   */
  it("opens nothing when there are no sessions yet", () => {
    expect(getInitiallyExpandedSessionIds([])).toEqual([])
  })
})
