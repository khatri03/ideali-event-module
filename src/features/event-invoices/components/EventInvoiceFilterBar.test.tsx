import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
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
   * Custom invoices have their own list, so Event Invoices offers no invoice-type choice and no Overdue switch -
   * a registration order has no due date, so that switch could only ever return an empty list.
   */
  it("EventInvoiceFilterBar_HasNoInvoiceTypeOrOverdueFilter", () => {
    renderFilterBar()

    expect(screen.getByText("Payment method")).toBeInTheDocument()
    expect(screen.queryByText("Invoice type")).toBeNull()
    expect(screen.queryByText("Overdue only")).toBeNull()
    expect(screen.queryByRole("checkbox", { name: "Overdue" })).toBeNull()
  })
})
