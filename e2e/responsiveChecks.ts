import type { Locator, Page } from "@playwright/test"

/** The smallest box a fingertip can hit reliably, per the project's touch-target rule. */
export const MIN_TOUCH_TARGET_PX = 44

/**
 * The elements that push the page wider than the viewport - empty when the page does not scroll sideways.
 * A table scrolling inside its own box is not a defect, so anything that box contains is ignored; what is
 * named is the outermost element that escapes every clip, so a failure points straight at its cause.
 */
export async function findHorizontalPageOverflow(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const { documentElement } = document
    // A single pixel of rounding slack, so sub-pixel layout maths does not read as a real break.
    if (documentElement.scrollWidth - documentElement.clientWidth <= 1) return []

    const viewportWidth = documentElement.clientWidth
    // An ancestor that clips or scrolls sideways contains its children - except an absolutely positioned one
    // whose containing block sits outside it, which escapes the clip and widens the page regardless.
    const escapesEveryClip = (element: Element) => {
      const isOutOfFlow = ["absolute", "fixed"].includes(getComputedStyle(element).position)
      const containingBlock = element instanceof HTMLElement ? element.offsetParent : null
      for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        if (getComputedStyle(parent).overflowX === "visible") continue
        const isClippedHere = !isOutOfFlow || (containingBlock !== null && (parent === containingBlock || parent.contains(containingBlock)))
        if (isClippedHere) return false
      }
      return true
    }
    const offenders = [...document.body.querySelectorAll("*")].filter(
      (element) => element.getBoundingClientRect().right > viewportWidth + 1 && escapesEveryClip(element),
    )
    const outermost = offenders.filter((element) => !offenders.some((other) => other !== element && other.contains(element)))
    return [
      `page scrollWidth ${documentElement.scrollWidth} > clientWidth ${viewportWidth}`,
      ...outermost.slice(0, 5).map((element) => {
        const rect = element.getBoundingClientRect()
        const label = (element.getAttribute("aria-label") ?? element.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 50)
        return `${element.tagName.toLowerCase()}.${element.className} "${label}" right=${Math.round(rect.right)} width=${Math.round(rect.width)}`
      }),
    ]
  })
}

export interface UndersizedTarget {
  control: string
  width: number
  height: number
}

/**
 * Every visible interactive control under the anchor's scope that is smaller than a fingertip in either
 * direction. A radio, checkbox or switch is measured by the label that carries its hit area, because that
 * is what the finger actually lands on. With `climbToScrollContainer` the scope is the routed page content
 * (the nearest scrolling ancestor), which keeps the shared sidebar and top bar out of a screen's verdict.
 */
export async function findUndersizedTargets(anchor: Locator, climbToScrollContainer: boolean): Promise<UndersizedTarget[]> {
  return await anchor.evaluate(
    (start, { climb, minimum }) => {
      let root: Element = start
      if (climb) {
        let current: Element | null = start.parentElement
        while (current && !["auto", "scroll"].includes(getComputedStyle(current).overflowY)) {
          current = current.parentElement
        }
        root = current ?? document.body
      }

      const interactive =
        'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="switch"], [role="menuitem"], [role="combobox"]'
      const seen = new Set<Element>()
      const offenders: { control: string; width: number; height: number }[] = []

      for (const element of root.querySelectorAll(interactive)) {
        const input = element instanceof HTMLInputElement ? element : null
        const isToggle = input && ["radio", "checkbox"].includes(input.type)
        // A react-select search input grows with what is typed; the box around it is what takes the tap.
        const isSelectSearch = element.getAttribute("role") === "combobox" && element.closest('[class*="-control"]')
        const target =
          element.closest('[data-scope="switch"][data-part="root"]') ??
          (isToggle ? element.closest("label") : null) ??
          (isSelectSearch ? element.closest('[class*="-control"]') : null) ??
          element
        if (seen.has(target)) continue
        seen.add(target)

        const rect = target.getBoundingClientRect()
        const isRendered = rect.width > 1 && rect.height > 1 && target.checkVisibility({ opacityProperty: true, visibilityProperty: true })
        if (!isRendered) continue
        if (rect.width >= minimum && rect.height >= minimum) continue

        const name =
          element.getAttribute("aria-label") ||
          (target.textContent ?? "").trim() ||
          element.getAttribute("placeholder") ||
          element.getAttribute("name") ||
          ""
        offenders.push({
          control: `${target.tagName.toLowerCase()} "${name.replace(/\s+/g, " ").slice(0, 60)}"`,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        })
      }
      return offenders
    },
    { climb: climbToScrollContainer, minimum: MIN_TOUCH_TARGET_PX },
  )
}
