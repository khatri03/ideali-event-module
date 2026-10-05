import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { system } from "@/theme"
import type { CustomInvoicePaySummary } from "@/features/events/schemas/customInvoicePay.schemas"
import { APP_ROUTES } from "@/utils/routes"
import { CustomInvoicePayPage } from "./CustomInvoicePayPage"

const { payApiMocks, fetchStripePublicCredentialsMock, stripeMock, elementsMock } = vi.hoisted(() => ({
  payApiMocks: { fetchCustomInvoicePaySummary: vi.fn(), startCustomInvoicePayment: vi.fn() },
  fetchStripePublicCredentialsMock: vi.fn(),
  stripeMock: { confirmPayment: vi.fn() },
  elementsMock: { submit: vi.fn() },
}))

vi.mock("@/api/customInvoicePayment", () => payApiMocks)
vi.mock("@/api/stripe", () => ({ fetchStripePublicCredentials: fetchStripePublicCredentialsMock }))
vi.mock("@stripe/stripe-js", () => ({ loadStripe: vi.fn(() => Promise.resolve(null)) }))
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: ReactNode }) => <>{children}</>,
  PaymentElement: () => null,
  useStripe: () => stripeMock,
  useElements: () => elementsMock,
}))

const INVOICE_UNIQUE_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7"
const LONG_DESCRIPTION =
  "Gold sponsorship package including stage branding, twelve reserved seats and a full-page programme advert"

function buildSummary(overrides: Partial<CustomInvoicePaySummary> = {}): CustomInvoicePaySummary {
  return {
    invoiceNo: "INV-2041",
    moduleType: "Event",
    entityName: "Golden Jubilee Gala",
    payState: "Payable",
    currencyCode: "USD",
    outstandingAmount: 1250,
    paymentAccountUniqueId: "account-1",
    lineItems: [
      { description: LONG_DESCRIPTION, amount: 1000 },
      { description: "Exhibitor table", amount: 250 },
    ],
    ...overrides,
  }
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[APP_ROUTES.customInvoicePay(INVOICE_UNIQUE_ID)]}>
          <Routes>
            <Route path={APP_ROUTES.customInvoicePayRoute} element={<CustomInvoicePayPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ChakraProvider>,
  )
}

const cardHolderField = () => screen.queryByRole("textbox", { name: "Name on card" })

describe("CustomInvoicePayPage", () => {
  beforeEach(() => {
    payApiMocks.fetchCustomInvoicePaySummary.mockReset().mockResolvedValue(buildSummary())
    payApiMocks.startCustomInvoicePayment.mockReset().mockResolvedValue({ clientSecret: "pi_1_secret_2", paymentIntentId: "pi_1" })
    fetchStripePublicCredentialsMock.mockReset().mockResolvedValue({ publishableKey: "pk_test_1", stripeAccount: "acct_1" })
    stripeMock.confirmPayment.mockReset().mockResolvedValue({})
    elementsMock.submit.mockReset().mockResolvedValue({})
  })

  /** A blank area while the invoice loads reads as a broken link; the buyer sees the summary's outline instead. */
  it("PayPage_WhileLoading_ShowsTheSummarySkeleton", () => {
    payApiMocks.fetchCustomInvoicePaySummary.mockReturnValue(new Promise(() => {}))

    renderPage()

    expect(screen.getByRole("status", { name: "Loading invoice" })).toBeInTheDocument()
    expect(cardHolderField()).not.toBeInTheDocument()
  })

  /** A wrong or non-custom invoice id must never lead to a card form, only to advice on getting the right link. */
  it("PayPage_UnknownInvoice_ShowsNotFoundAndNoCardForm", async () => {
    payApiMocks.fetchCustomInvoicePaySummary.mockResolvedValue(null)

    renderPage()

    expect(await screen.findByRole("heading", { name: "We couldn't find this invoice" })).toBeInTheDocument()
    expect(cardHolderField()).not.toBeInTheDocument()
  })

  /** A settled invoice cannot be charged twice from the page the buyer already paid through. */
  it("PayPage_PaidInvoice_ShowsPaidAndNoCardForm", async () => {
    payApiMocks.fetchCustomInvoicePaySummary.mockResolvedValue(buildSummary({ payState: "Paid", paymentAccountUniqueId: null }))

    renderPage()

    expect(await screen.findByRole("heading", { name: "This invoice is paid" })).toBeInTheDocument()
    expect(screen.getByText(/Invoice INV-2041 for Event: Golden Jubilee Gala has been paid/)).toBeInTheDocument()
    expect(cardHolderField()).not.toBeInTheDocument()
  })

  /** An invoice the organizer cancelled is void; offering to take money for it would be a false charge. */
  it("PayPage_CancelledInvoice_ShowsCancelledAndNoCardForm", async () => {
    payApiMocks.fetchCustomInvoicePaySummary.mockResolvedValue(buildSummary({ payState: "Cancelled", paymentAccountUniqueId: null }))

    renderPage()

    expect(await screen.findByRole("heading", { name: "This invoice was cancelled" })).toBeInTheDocument()
    expect(cardHolderField()).not.toBeInTheDocument()
  })

  /** With no working payment account the charge cannot land, so the buyer is sent to the organizer instead. */
  it("PayPage_UnavailableInvoice_ShowsContactTheOrganizerAndNoCardForm", async () => {
    payApiMocks.fetchCustomInvoicePaySummary.mockResolvedValue(buildSummary({ payState: "Unavailable", paymentAccountUniqueId: null }))

    renderPage()

    expect(await screen.findByRole("heading", { name: "Online payment isn't available" })).toBeInTheDocument()
    expect(screen.getByText(/Contact the organizer to arrange payment/)).toBeInTheDocument()
    expect(cardHolderField()).not.toBeInTheDocument()
  })

  /** A failed load may be a blip; the buyer must be able to ask again without hunting for the link. */
  it("PayPage_LoadFailure_OffersTryAgainWhichRefetches", async () => {
    payApiMocks.fetchCustomInvoicePaySummary.mockRejectedValueOnce(new Error("Network Error"))

    renderPage()

    expect(await screen.findByRole("heading", { name: "We couldn't load this invoice" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))

    expect(await screen.findByText("INV-2041")).toBeInTheDocument()
    expect(payApiMocks.fetchCustomInvoicePaySummary).toHaveBeenCalledTimes(2)
  })

  /** The buyer must see exactly what they are paying for before the card form asks for money. */
  it("PayPage_PayableInvoice_ListsEveryLineAndTheAmountDue", async () => {
    renderPage()

    expect(await screen.findByText(LONG_DESCRIPTION)).toBeInTheDocument()
    expect(screen.getByText("Exhibitor table")).toBeInTheDocument()
    expect(screen.getByText("USD$1,000.00")).toBeInTheDocument()
    expect(screen.getByText("USD$250.00")).toBeInTheDocument()
    expect(screen.getByText("USD$1,250.00")).toBeInTheDocument()
    expect(await screen.findByRole("button", { name: "Pay USD$1,250.00" })).toBeInTheDocument()
  })

  /** Without Stripe's keys the Payment Element cannot mount; an empty form would look payable and fail. */
  it("PayPage_StripeCredentialsFail_ShowsAPlainErrorInsteadOfTheForm", async () => {
    fetchStripePublicCredentialsMock.mockRejectedValue(new Error("Network Error"))

    renderPage()

    expect(await screen.findByText("The card form couldn't load. Try again in a moment.")).toBeInTheDocument()
    expect(cardHolderField()).not.toBeInTheDocument()
  })

  /** Once Stripe confirms the card, the buyer needs proof of what went through before they close the page. */
  it("PayPage_AfterPaying_ShowsPaymentReceivedWithTheAmountAndInvoiceNo", async () => {
    renderPage()

    await userEvent.type(await screen.findByRole("textbox", { name: "Name on card" }), "Aisha Khan")
    await userEvent.click(screen.getByRole("button", { name: "Pay USD$1,250.00" }))

    expect(await screen.findByRole("heading", { name: "Payment received" })).toBeInTheDocument()
    expect(screen.getByText("Thank you. Your payment of USD$1,250.00 for invoice INV-2041 went through.")).toBeInTheDocument()
    await waitFor(() => expect(cardHolderField()).not.toBeInTheDocument())
  })

  /** The buyer must see which kind of record they are paying for, named the way the organizer picked it. */
  it.each([
    ["Event", "Golden Jubilee Gala", "Event: Golden Jubilee Gala"],
    ["Membership", "Gold Membership", "Membership: Gold Membership"],
    ["Donation", "Winter Appeal", "Campaign: Winter Appeal"],
  ] as const)("PayPage_%sInvoice_HeadsTheSummaryWithTheModuleLabel", async (moduleType, entityName, heading) => {
    payApiMocks.fetchCustomInvoicePaySummary.mockResolvedValue(buildSummary({ moduleType, entityName }))

    renderPage()

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument()
  })

  /** A paid campaign invoice names the campaign in the confirmation, not a bare "Donation". */
  it("PayPage_PaidDonationInvoice_NamesTheCampaignInThePaidNotice", async () => {
    payApiMocks.fetchCustomInvoicePaySummary.mockResolvedValue(
      buildSummary({ invoiceNo: "INV-1", moduleType: "Donation", entityName: "Winter Appeal", payState: "Paid", paymentAccountUniqueId: null }),
    )

    renderPage()

    expect(
      await screen.findByText("Invoice INV-1 for Campaign: Winter Appeal has been paid. There is nothing left to pay."),
    ).toBeInTheDocument()
  })

  /** A deleted record leaves a blank name; the page drops the line rather than show a dangling "Membership:". */
  it("PayPage_BlankEntityName_ShowsNoEntityHeadingAndAPlainPaidNotice", async () => {
    payApiMocks.fetchCustomInvoicePaySummary.mockResolvedValue(
      buildSummary({ moduleType: "Membership", entityName: "", payState: "Paid", paymentAccountUniqueId: null }),
    )

    renderPage()

    expect(await screen.findByText("Invoice INV-2041 has been paid. There is nothing left to pay.")).toBeInTheDocument()
    expect(screen.getAllByRole("heading").map((heading) => heading.textContent)).toEqual(["This invoice is paid"])
    expect(screen.queryByText(/Membership:/)).not.toBeInTheDocument()
  })
})
