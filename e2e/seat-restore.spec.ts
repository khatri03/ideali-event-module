import { expect, test } from "@playwright/test"
import { openSeatPicker, sessionsStep } from "./seatPickerDialog"

/**
 * What a buyer who refreshed the tab still has.
 *
 * The cart lives on the server and outlives the page, so the seats it holds have to come back with it. The seat map
 * is refused throughout: a buyer arriving on a form of several sessions has opened none of them, and a basket that
 * can only be rebuilt from a chart nobody drew comes back empty over seats the buyer is still being charged for.
 */

/** How the basket names the seat the restored cart is holding, rather than the plan label "A-14" it travels as. */
const RESTORED_SEAT_NAME = "Seat 14 at Row A"

test.describe("seats after a refresh", () => {
  /** A seat the restored cart holds is listed on the session card even though no seat map was ever read. */
  test("lists the seats the restored cart is holding", async ({ page }) => {
    await openSeatPicker(page, 1440, 900, { seatingUnavailable: true })

    await expect(sessionsStep(page).getByText("Row A")).toBeVisible()
    await expect(sessionsStep(page).getByText("Seat 14", { exact: true })).toBeVisible()
  })

  /** A restored seat can be given up from the card, so a buyer is never stuck holding one they cannot reach. */
  test("gives up a restored seat without the seat map", async ({ page }) => {
    await openSeatPicker(page, 1440, 900, { seatingUnavailable: true })

    await sessionsStep(page)
      .getByRole("button", { name: `Remove ${RESTORED_SEAT_NAME}` })
      .click()

    await expect(page.getByText(`Remove ${RESTORED_SEAT_NAME}?`)).toBeVisible()
  })
})
