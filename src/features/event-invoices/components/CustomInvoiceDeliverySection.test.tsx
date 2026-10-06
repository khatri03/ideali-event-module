import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useForm } from "react-hook-form"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { CustomInvoiceDetail } from "@/api/customInvoices"
import { buildCustomInvoiceDetail } from "@/test/customInvoiceDetail.fixture"
import { system } from "@/theme"
import { API_ROUTES, APP_ROUTES } from "@/utils/routes"
import type { CustomInvoiceFormValues } from "../schemas/customInvoice.schemas"
import { CustomInvoiceDeliverySection } from "./CustomInvoiceDeliverySection"

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }))
vi.mock("@/api/client", () => ({ client: http }))
vi.mock("@/lib/toaster", () => ({ toaster: { create: vi.fn() } }))

/** The section as the summary pane mounts it: inside a form whose email choice starts ticked. */
function DeliveryHarness({ detail }: { detail?: CustomInvoiceDetail }) {
  const { control } = useForm<CustomInvoiceFormValues>({ defaultValues: { emailOnCreate: true } })
  return <CustomInvoiceDeliverySection control={control} detail={detail} />
}

function renderDelivery(detail?: CustomInvoiceDetail) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <DeliveryHarness detail={detail} />
      </QueryClientProvider>
    </ChakraProvider>,
  )
}

describe("CustomInvoiceDeliverySection", () => {
  beforeEach(() => {
    http.post.mockReset().mockResolvedValue({ data: { success: true, data: null } })
  })

  /** A new invoice offers the email-on-create choice ticked, so the buyer is emailed unless the organizer opts out. */
  it("DeliverySection_NewInvoice_EmailCheckboxCheckedByDefault", () => {
    renderDelivery()

    expect(screen.getByRole("checkbox", { name: /Email payable link to buyer now/ })).toBeChecked()
    expect(screen.queryByRole("button", { name: "Email link" })).not.toBeInTheDocument()
  })

  /** A sent invoice says when, from the server's last send time, so the organizer does not email the buyer twice. */
  it("DeliverySection_Sent_ShowsSentOnDate", () => {
    renderDelivery(buildCustomInvoiceDetail({ lastSentAtUtc: "2026-10-03T14:30:00Z" }))

    expect(screen.getByText("Sent on Oct 3, 2026")).toBeInTheDocument()
    expect(screen.queryByText("Not sent")).not.toBeInTheDocument()
  })

  /** An invoice never emailed says so plainly, so the organizer knows the buyer has not heard about it. */
  it("DeliverySection_NeverSent_ShowsNotSent", () => {
    renderDelivery(buildCustomInvoiceDetail({ lastSentAtUtc: null }))

    expect(screen.getByText("Not sent")).toBeInTheDocument()
    expect(screen.getByText("The buyer has not been emailed this invoice yet.")).toBeInTheDocument()
  })

  /** Email link names the recipient before anything is sent, and only the confirm sends the invoice's link. */
  it("DeliverySection_PendingInvoice_OffersEmailLinkWhichConfirmsThenSends", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderDelivery(buildCustomInvoiceDetail())

    await user.click(screen.getByRole("button", { name: "Email link" }))

    expect(await screen.findByText("Email the payable link?")).toBeInTheDocument()
    expect(screen.getByText("ada@example.com")).toBeInTheDocument()
    expect(http.post).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Send email" }))

    await waitFor(() => expect(http.post).toHaveBeenCalledWith(API_ROUTES.customInvoiceSend("invoice-1")))
  })

  /** A Paid or Cancelled invoice has nothing to pay, so its payable link is never offered for emailing (SC3). */
  it.each(["Paid", "Cancelled"])("DeliverySection_%sInvoice_HidesEmailLink", (invoiceStatus) => {
    renderDelivery(buildCustomInvoiceDetail({ invoiceStatus, invoiceStatusLabel: invoiceStatus }))

    expect(screen.queryByRole("button", { name: "Email link" })).not.toBeInTheDocument()
  })

  /** When the server says the invoice cannot be sent, Email link is not offered whatever its status. */
  it("DeliverySection_ServerRefusesSend_HidesEmailLink", () => {
    renderDelivery(buildCustomInvoiceDetail({ canSend: false }))

    expect(screen.queryByRole("button", { name: "Email link" })).not.toBeInTheDocument()
  })

  /**
   * Print opens the invoice's own print layout in a new tab with the print flag, leaving unsaved edits in the
   * editor untouched, and the new tab gets no handle back to this one.
   */
  it("DeliverySection_Print_LinksToDetailWithPrintFlagInNewTab", () => {
    renderDelivery(buildCustomInvoiceDetail())

    const print = screen.getByRole("link", { name: "Print" })
    expect(print).toHaveAttribute("href", `${APP_ROUTES.customInvoices.detail("invoice-1")}?print=1`)
    expect(print).toHaveAttribute("target", "_blank")
    expect(print).toHaveAttribute("rel", "noopener noreferrer")
  })

  /** A Paid invoice can still be printed for the buyer's records even though it can no longer be emailed. */
  it("DeliverySection_PaidInvoice_StillOffersPrint", () => {
    renderDelivery(buildCustomInvoiceDetail({ invoiceStatus: "Paid", invoiceStatusLabel: "Paid", canSend: false }))

    expect(screen.getByRole("link", { name: "Print" })).toBeInTheDocument()
  })
})
