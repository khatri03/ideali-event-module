import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { EventInvoiceFilterBar, type EventInvoiceDraftFilters } from "./EventInvoiceFilterBar"

vi.mock("../hooks/useEventInvoices", () => ({
  useEventInvoiceFilterOptions: () => ({ data: { events: [], sessions: [] }, isLoading: false }),
}))

const EMPTY_DRAFT: EventInvoiceDraftFilters = {
  searchTerm: "",
  eventUniqueIds: [],
  sessionUniqueIds: [],
  statuses: [],
  paymentMethods: [],
  invoiceTypes: [],
  overdueOnly: false,
  invoiceDateFrom: "",
  invoiceDateTo: "",
}

/** Holds the draft the way the list manager does, so a toggle is observable on the rendered control. */
function StatefulFilterBar() {
  const [draft, setDraft] = useState(EMPTY_DRAFT)

  return (
    <EventInvoiceFilterBar
      draft={draft}
      hasAppliedFilter={false}
      isApplying={false}
      onDraftChange={setDraft}
      onApply={vi.fn()}
      onClear={vi.fn()}
    />
  )
}

function renderFilterBar() {
  return render(
    <ChakraProvider value={system}>
      <StatefulFilterBar />
    </ChakraProvider>,
  )
}

describe("EventInvoiceFilterBar", () => {
  /**
   * The visible "Overdue only" text is part of the switch's hit area, so a tap on the words toggles the
   * filter instead of only the small track responding.
   */
  it("OverdueOnlyText_Clicked_TogglesTheSwitch", async () => {
    renderFilterBar()
    const overdueSwitch = screen.getByRole("checkbox", { name: "Overdue" })

    await userEvent.click(screen.getByText("Overdue only"))

    expect(overdueSwitch).toBeChecked()
  })

  /** A second tap on the words clears the filter again, so the text works as a full toggle, not a one-way switch. */
  it("OverdueOnlyText_ClickedTwice_ClearsTheSwitch", async () => {
    renderFilterBar()
    const overdueSwitch = screen.getByRole("checkbox", { name: "Overdue" })

    await userEvent.click(screen.getByText("Overdue only"))
    await userEvent.click(screen.getByText("Overdue only"))

    expect(overdueSwitch).not.toBeChecked()
  })
})
