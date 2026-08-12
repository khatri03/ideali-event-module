import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { EVENT_INVOICE_STATUS_OPTIONS } from "@/api/eventInvoices"
import { EventInvoiceStatusBadge } from "./EventInvoiceStatusBadge"

function renderBadge(status: string, label: string) {
  const view = render(
    <ChakraProvider value={system}>
      <EventInvoiceStatusBadge status={status} label={label} />
    </ChakraProvider>,
  )
  const badge = view.container.querySelector("[data-status-tone]")
  if (!badge) throw new Error("status badge did not render")
  return { ...view, tone: badge.getAttribute("data-status-tone") }
}

describe("EventInvoiceStatusBadge", () => {
  it("SettledAndCancelledOrders_RenderDifferentTones", () => {
    const paid = renderBadge("Paid", "Paid")
    expect(paid.tone).toBe("success")
    paid.unmount()

    const cancelled = renderBadge("Cancelled", "Cancelled")
    expect(cancelled.tone).toBe("error")
  })

  it("OrderStillOwingMoney_RendersTheWarningTone", () => {
    const pending = renderBadge("PendingPayment", "Pending Payment")
    expect(pending.tone).toBe("warning")
    pending.unmount()

    const partial = renderBadge("PartiallyPaid", "Partially Paid")
    expect(partial.tone).toBe("warning")
  })

  it("EveryKnownStatus_RendersItsWrittenLabelSoColourIsNeverTheOnlySignal", () => {
    for (const option of EVENT_INVOICE_STATUS_OPTIONS) {
      const view = renderBadge(option.value, option.label)

      expect(screen.getByText(option.label)).toBeInTheDocument()
      expect(view.tone).not.toBe("neutral")

      view.unmount()
    }
  })

  it("StatusUnknownToTheClient_FallsBackToNeutralAndKeepsTheServerLabel", () => {
    const view = renderBadge("SomeFutureStatus", "Some Future Status")

    expect(view.tone).toBe("neutral")
    expect(screen.getByText("Some Future Status")).toBeInTheDocument()
  })
})
