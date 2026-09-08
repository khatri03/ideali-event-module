import { expect, test } from "@playwright/test"
import { envelope, openSeatLegend } from "./eventSeatLegend"

/**
 * The buyer picks seats a step before they give the name a cart needs, so the chart cannot get its hold token from
 * a cart. It asks for one of its own as the map opens; without it the map would draw and let the buyer pick seats
 * that nothing anywhere is holding for them.
 */
test("takes a hold token when the map opens before a cart exists", async ({ page }) => {
  const holdTokenRequests: string[] = []

  await openSeatLegend(page, 1440, 900)

  // Registered after the form is up, because the helper's own catch-all for the registration routes would
  // otherwise answer this one: Playwright gives the last matching route the request.
  await page.route("**/register/sessions/*/hold-token", (route) => {
    holdTokenRequests.push(route.request().method())

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        envelope({ HoldToken: "browser-token", ExpiresAtUtc: new Date(Date.now() + 1_200_000).toISOString() }),
      ),
    })
  })

  await page.getByRole("button", { name: /Pick seats|Change seats/ }).click()

  await expect.poll(() => holdTokenRequests).toEqual(["POST"])
})
