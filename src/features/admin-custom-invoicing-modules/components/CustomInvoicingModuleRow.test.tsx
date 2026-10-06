import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { CustomInvoicingModuleRow } from "./CustomInvoicingModuleRow"

type RowProps = Parameters<typeof CustomInvoicingModuleRow>[0]

function renderRow(overrides: Partial<RowProps> = {}) {
  const props: RowProps = {
    name: "Membership",
    description: "Bill members for charges outside their membership plan.",
    isEnabled: true,
    isComingSoon: false,
    isPending: false,
    changedByName: null,
    changedAtUtc: null,
    onToggle: vi.fn(),
    ...overrides,
  }
  render(
    <ChakraProvider value={system}>
      <CustomInvoicingModuleRow {...props} />
    </ChakraProvider>,
  )
  return screen.getByLabelText(`Custom invoicing for ${props.name}`)
}

describe("CustomInvoicingModuleRow", () => {
  /** A module that is not offered yet says so and cannot be switched, so nobody mistakes it for a live setting. */
  it("Row_ComingSoon_ShowsBadgeAndDisabledSwitch", () => {
    const control = renderRow({ name: "Auction", isEnabled: false, isComingSoon: true })

    expect(screen.getByText("Coming soon")).toBeInTheDocument()
    expect(control).toBeDisabled()
    expect(screen.queryByText("Default setting")).not.toBeInTheDocument()
  })

  /** The admin can see who last changed a module and when, without opening an audit screen. */
  it("Row_ChangedBy_ShowsNameAndDate", () => {
    renderRow({ changedByName: "Ayesha Khan", changedAtUtc: "2026-10-01T12:00:00Z" })

    expect(screen.getByText("Changed by Ayesha Khan on 1 Oct 2026")).toBeInTheDocument()
  })

  /** A module still on its seeded value reads as the default rather than inventing a change that never happened. */
  it("Row_NeverChanged_ShowsDefaultSetting", () => {
    renderRow({ changedAtUtc: null })

    expect(screen.getByText("Default setting")).toBeInTheDocument()
  })

  /** The badge states the current setting in words, not only through the switch position. */
  it("Row_Enabled_ShowsEnabledBadge", () => {
    const control = renderRow({ isEnabled: true })

    expect(screen.getByText("Enabled")).toBeInTheDocument()
    expect(control).toBeChecked()
  })

  /** A declined switch-off leaves the setting on, so a second attempt must still start from "on" and reach the confirmation. */
  it("Row_ToggleDeclinedByParent_KeepsInputInSyncWithEnabledSetting", async () => {
    const onToggle = vi.fn()
    const control = renderRow({ isEnabled: true, onToggle })

    await userEvent.click(control)

    expect(onToggle).toHaveBeenCalledWith(false)
    expect(control).toBeChecked()
  })
})
