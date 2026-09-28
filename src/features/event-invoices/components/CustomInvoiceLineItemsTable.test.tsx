import { describe, expect, it } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import type { EventInvoiceCustomLineItem } from "@/api/eventInvoices"
import { CustomInvoiceLineItemsTable } from "./CustomInvoiceLineItemsTable"

function line(description: string, amount: string): EventInvoiceCustomLineItem {
  return { invoiceItemUniqueId: `line-${description}`, description, amount }
}

function renderTable(lineItems: EventInvoiceCustomLineItem[]) {
  return render(
    <ChakraProvider value={system}>
      <CustomInvoiceLineItemsTable lineItems={lineItems} currencySymbol="$" />
    </ChakraProvider>,
  )
}

describe("CustomInvoiceLineItemsTable", () => {
  /** The grand total sums the lines to the cent, computed on the decimal strings so no float rounding creeps in. */
  it("MultipleLines_GrandTotalIsDecimalExact", () => {
    renderTable([line("Headline sponsorship", "1500.50"), line("Booth space", "300.25"), line("Programme ad", "99.99")])

    const total = screen.getByText("Grand total").closest("tr")
    expect(total).not.toBeNull()
    expect(within(total as HTMLElement).getByText("$1,900.74")).toBeInTheDocument()
  })

  /** An invoice with no lines names the gap rather than showing a bare empty table. */
  it("NoLines_RendersTheEmptySentence", () => {
    renderTable([])

    expect(screen.getByText("No line items on this invoice.")).toBeInTheDocument()
    expect(screen.queryByText("Grand total")).not.toBeInTheDocument()
  })
})
