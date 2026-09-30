import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { EventInvoicePayableLinkSection } from "./EventInvoicePayableLinkSection"

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }))

vi.mock("@/lib/toaster", () => ({ toaster: { create: toastMock } }))

const PAY_PAGE_URL = "https://pay.example.test/events/invoices/c0000000-0000-4000-8000-000000000100/pay"

interface SectionState {
  canPayOnline?: boolean
  invoiceStatus?: string
  invoiceStatusLabel?: string
}

/** Renders the section for one invoice state; defaults describe an unpaid invoice the server says can be paid online. */
function renderSection({ canPayOnline = true, invoiceStatus = "PendingPayment", invoiceStatusLabel = "Pending Payment" }: SectionState = {}) {
  return render(
    <ChakraProvider value={system}>
      <EventInvoicePayableLinkSection
        payPageUrl={PAY_PAGE_URL}
        canPayOnline={canPayOnline}
        invoiceStatus={invoiceStatus}
        invoiceStatusLabel={invoiceStatusLabel}
      />
    </ChakraProvider>,
  )
}

describe("EventInvoicePayableLinkSection", () => {
  beforeEach(() => {
    toastMock.mockReset()
  })

  /**
   * The organizer's only way to get paid online is to hand the buyer this exact URL, so it must be shown in full,
   * open in a new tab that cannot reach back into the organizer's session, and be copyable in one tap.
   */
  it("PayableLink_PayableInvoice_ShowsTheBuyerUrlWithOpenAndCopy", () => {
    renderSection()

    expect(screen.getByText(PAY_PAGE_URL)).toBeInTheDocument()
    const open = screen.getByRole("link", { name: /open payment page/i })
    expect(open).toHaveAttribute("href", PAY_PAGE_URL)
    expect(open).toHaveAttribute("target", "_blank")
    expect(open.getAttribute("rel")?.split(" ")).toEqual(expect.arrayContaining(["noopener", "noreferrer"]))
    expect(screen.getByRole("button", { name: /copy link/i })).toBeEnabled()
  })

  /** Copying must put the exact pay URL on the clipboard and say so, or the organizer pastes a stale link to the sponsor. */
  it("PayableLink_Copy_WritesTheUrlAndConfirms", async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, "writeText")
    renderSection()

    await user.click(screen.getByRole("button", { name: /copy link/i }))

    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ type: "success", title: "Payment link copied." })))
    expect(writeText).toHaveBeenCalledWith(PAY_PAGE_URL)
  })
})
