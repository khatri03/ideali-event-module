import { expect, test, type Page } from "@playwright/test"
import { openCheckInDesk } from "./checkInDesk"

/**
 * A dialog holds the page hostage while it is open: it locks scrolling and puts a pointer-events guard
 * on <body>, both of which it releases on its way out. Walking away from a confirmation is the most
 * common thing the operator does with one - a code read wrong, the wrong row tapped - so every path out
 * is asserted to hand the screen back. A door screen that stops taking taps stops the queue.
 */

async function isPageInert(page: Page) {
  return await page.evaluate(() => getComputedStyle(document.body).pointerEvents === "none")
}

/** The screen is only really back when it answers a click, not just when the dialog stops being visible. */
async function expectDeskUsableAgain(page: Page) {
  await expect(page.getByRole("alertdialog")).toBeHidden()
  expect(await isPageInert(page), "<body> still refuses pointer events after the dialog closed").toBe(false)

  // A real click, not a forced one: the actionability check is what notices the page has gone inert.
  await page.getByRole("button", { name: "Arrived" }).click({ timeout: 5_000 })

  const search = page.getByRole("textbox", { name: "Search attendees" })
  await search.fill("TKT")
  await expect(search).toHaveValue("TKT")
}

test("cancelling a typed-code check-in hands the desk back", async ({ page }) => {
  await openCheckInDesk(page, 1280, 800)

  await page.getByRole("textbox", { name: "Ticket code" }).fill("TKT-4F92A1")
  await page.getByRole("button", { name: "Check in", exact: true }).click()

  const dialog = page.getByRole("alertdialog")
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: "Cancel" }).click()

  await expectDeskUsableAgain(page)
})

test("cancelling a roster check-in hands the desk back", async ({ page }) => {
  await openCheckInDesk(page, 1280, 800)

  await page.getByRole("button", { name: "Check in TKT-4F92A1" }).click()

  const dialog = page.getByRole("alertdialog")
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: "Cancel" }).click()

  await expectDeskUsableAgain(page)
})

/** Closing on the X and closing on Escape run different code paths out of the dialog machine. */
test("dismissing a confirmation with Escape hands the desk back", async ({ page }) => {
  await openCheckInDesk(page, 1280, 800)

  await page.getByRole("button", { name: "Check in TKT-4F92A1" }).click()
  await expect(page.getByRole("alertdialog")).toBeVisible()
  await page.keyboard.press("Escape")

  await expectDeskUsableAgain(page)
})

test("a cancelled check-in can be opened and confirmed straight after", async ({ page }) => {
  await openCheckInDesk(page, 1280, 800)

  await page.getByRole("textbox", { name: "Ticket code" }).fill("TKT-4F92A1")
  await page.getByRole("button", { name: "Check in", exact: true }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click()
  await expect(page.getByRole("alertdialog")).toBeHidden()

  await page.getByRole("button", { name: "Check in", exact: true }).click()
  await expect(page.getByRole("alertdialog")).toBeVisible()
})
