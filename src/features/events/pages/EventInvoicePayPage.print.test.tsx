import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { system } from "@/theme"
import type { EventInvoicePaySummary } from "@/features/events/schemas/eventInvoicePay.schemas"
import { APP_ROUTES } from "@/utils/routes"
import { EventInvoicePayPage } from "./EventInvoicePayPage"

/**
 * The buyer print contract. A buyer who only holds the shared link must be able to keep a clean paper copy of
 * the custom invoice: invoice no, event name, every line item and the amount due print inside the print region,
 * while the card form and the terminal status banner are dropped so only the invoice reaches the sheet. The
 * printed region carries nothing beyond the public summary - no buyer PII, category or due date.
 */

const { payApiMocks, fetchStripePublicCredentialsMock, stripeMock, elementsMock } = vi.hoisted(() => ({
  payApiMocks: { fetchEventInvoicePaySummary: vi.fn(), startEventInvoicePayment: vi.fn() },
  fetchStripePublicCredentialsMock: vi.fn(),
  stripeMock: { confirmPayment: vi.fn() },
  elementsMock: { submit: vi.fn() },
}))

vi.mock("@/api/eventInvoicePayment", () => payApiMocks)
vi.mock("@/api/stripe", () => ({ fetchStripePublicCredentials: fetchStripePublicCredentialsMock }))
vi.mock("@stripe/stripe-js", () => ({ loadStripe: vi.fn(() => Promise.resolve(null)) }))
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: ReactNode }) => <>{children}</>,
  PaymentElement: () => null,
  useStripe: () => stripeMock,
  useElements: () => elementsMock,
}))

const INVOICE_UNIQUE_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7"

function buildSummary(overrides: Partial<EventInvoicePaySummary> = {}): EventInvoicePaySummary {
  return {
    invoiceNo: "INV-2041",
    eventName: "Golden Jubilee Gala",
    payState: "Payable",
    currencyCode: "USD",
    outstandingAmount: 1250,
    paymentAccountUniqueId: "account-1",
    lineItems: [
      { description: "Gold sponsorship package", amount: 1000 },
      { description: "Exhibitor table", amount: 250 },
    ],
    ...overrides,
  }
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[APP_ROUTES.eventInvoicePay(INVOICE_UNIQUE_ID)]}>
          <Routes>
            <Route path={APP_ROUTES.eventInvoicePayRoute} element={<EventInvoicePayPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ChakraProvider>,
  )
}

function printRegion(container: HTMLElement): HTMLElement {
  const region = container.querySelector<HTMLElement>("[data-print-region]")
  if (!region) throw new Error("The pay page is missing its print region.")
  return region
}

const cardHolderField = () => screen.queryByRole("textbox", { name: "Name on card" })

describe("EventInvoicePayPage print contract", () => {
  beforeEach(() => {
    payApiMocks.fetchEventInvoicePaySummary.mockReset().mockResolvedValue(buildSummary())
    payApiMocks.startEventInvoicePayment.mockReset().mockResolvedValue({ clientSecret: "pi_1_secret_2", paymentIntentId: "pi_1" })
    fetchStripePublicCredentialsMock.mockReset().mockResolvedValue({ publishableKey: "pk_test_1", stripeAccount: "acct_1" })
    stripeMock.confirmPayment.mockReset().mockResolvedValue({})
    elementsMock.submit.mockReset().mockResolvedValue({})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  /** On a Payable invoice the paper copy carries the invoice no, event name, every billed line and the amount due. */
  it("keeps invoice no, event name, line items and amount due inside the print region when payable", async () => {
    const { container } = renderPage()

    await screen.findByText("INV-2041")
    const region = within(printRegion(container))

    expect(region.getByText("INV-2041")).toBeInTheDocument()
    expect(region.getByText("Golden Jubilee Gala")).toBeInTheDocument()
    expect(region.getByText("Gold sponsorship package")).toBeInTheDocument()
    expect(region.getByText("Exhibitor table")).toBeInTheDocument()
    expect(region.getByText("USD$1,250.00")).toBeInTheDocument()
  })

  /** The card form is interactive chrome, so it sits outside the print region behind data-print-hide. */
  it("marks the card form print-hidden and allows the line-items card to break across pages", async () => {
    const { container } = renderPage()

    const cardForm = await screen.findByRole("textbox", { name: "Name on card" })
    expect(cardForm.closest("[data-print-hide]")).not.toBeNull()
    expect(container.querySelector("[data-print-region] [data-print-allow-break]")).not.toBeNull()
  })

  /** A paid invoice still prints the invoice, but its on-screen status banner is dropped from the sheet. */
  it("prints the invoice and hides the status banner on a terminal (Paid) invoice", async () => {
    payApiMocks.fetchEventInvoicePaySummary.mockResolvedValue(buildSummary({ payState: "Paid", paymentAccountUniqueId: null }))
    const { container } = renderPage()

    const banner = await screen.findByRole("heading", { name: "This invoice is paid" })
    expect(banner.closest("[data-print-hide]")).not.toBeNull()

    const region = within(printRegion(container))
    expect(region.getByText("INV-2041")).toBeInTheDocument()
    expect(region.getByText("Golden Jubilee Gala")).toBeInTheDocument()
    expect(region.getByText("Gold sponsorship package")).toBeInTheDocument()
  })

  /** The Print control hands the page to the browser's own print dialog. */
  it("calls window.print when the Print control is pressed", async () => {
    const printMock = vi.fn()
    vi.stubGlobal("print", printMock)
    renderPage()

    await userEvent.click(await screen.findByRole("button", { name: /print/i }))

    expect(printMock).toHaveBeenCalledTimes(1)
  })

  /** With no summary (a wrong link) there is nothing to print, so neither the region nor the Print control renders. */
  it("renders no print region and no Print control when the invoice is not found", async () => {
    payApiMocks.fetchEventInvoicePaySummary.mockResolvedValue(null)
    const { container } = renderPage()

    await screen.findByRole("heading", { name: "We couldn't find this invoice" })

    expect(container.querySelector("[data-print-region]")).toBeNull()
    expect(screen.queryByRole("button", { name: /print/i })).not.toBeInTheDocument()
    expect(cardHolderField()).not.toBeInTheDocument()
  })
})
