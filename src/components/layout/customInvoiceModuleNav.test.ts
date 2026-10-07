import { describe, expect, it } from "vitest"
import { CUSTOM_INVOICE_MODULE_NAV, isGroupVisible, isModuleChildActive } from "./customInvoiceModuleNav"

const LIST = "/organizer/custom-invoices/list"
const NEW = "/organizer/custom-invoices/new"

function entryFor(moduleType: string) {
  const entry = CUSTOM_INVOICE_MODULE_NAV.find((candidate) => candidate.moduleType === moduleType)
  if (!entry) throw new Error(`No nav entry for ${moduleType}`)
  return entry
}

describe("isModuleChildActive", () => {
  /** The module child is the current page on the list or editor locked to that module. */
  it.each([LIST, NEW])("isModuleChildActive_LockedToSameModule_IsActive_%s", (pathname) => {
    expect(isModuleChildActive("Membership", pathname, "?moduleType=Membership")).toBe(true)
  })

  /** Only the child of the module the screen is locked to lights up; a sibling module must stay unmarked. */
  it("isModuleChildActive_LockedToAnotherModule_IsNotActive", () => {
    expect(isModuleChildActive("Event", LIST, "?moduleType=Membership")).toBe(false)
  })

  /** The unlocked list belongs to the standalone Invoices child, not to any module child. */
  it.each(["", "?moduleType=membership", "?moduleType=Unknown"])("isModuleChildActive_NoValidLock_IsNotActive_%j", (search) => {
    expect(isModuleChildActive("Membership", LIST, search)).toBe(false)
  })

  /** Categories and invoice detail screens are never module-locked, so no module child may claim them. */
  it.each(["/organizer/custom-invoices/categories", "/organizer/custom-invoices/abc-123"])(
    "isModuleChildActive_OtherCustomInvoiceRoute_IsNotActive_%s",
    (pathname) => {
      expect(isModuleChildActive("Event", pathname, "?moduleType=Event")).toBe(false)
    },
  )
})

describe("isGroupVisible", () => {
  /** Events has its own page, so its group stays in the nav even when custom invoicing is off for it. */
  it("isGroupVisible_ModuleWithLandingPage_ShowsEvenWhenDisabled", () => {
    expect(isGroupVisible(entryFor("Event"), false)).toBe(true)
  })

  /** Membership and Donation groups exist only to hold the custom invoices child, so they appear only when enabled. */
  it.each(["Membership", "Donation"])("isGroupVisible_ModuleWithoutLandingPage_FollowsEnablement_%s", (moduleType) => {
    expect(isGroupVisible(entryFor(moduleType), true)).toBe(true)
    expect(isGroupVisible(entryFor(moduleType), false)).toBe(false)
  })
})
