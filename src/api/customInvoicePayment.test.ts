import { AxiosError, AxiosHeaders } from "axios"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  fetchCustomInvoicePaySummary,
  PAYMENT_START_FAILED_MESSAGE,
  startCustomInvoicePayment,
} from "./customInvoicePayment"
import { extractApiError } from "@/utils/errors"

const { getMock, postMock } = vi.hoisted(() => ({ getMock: vi.fn(), postMock: vi.fn() }))

vi.mock("./client", () => ({ client: { get: getMock, post: postMock } }))

const INVOICE_ID = "invoice-1"

const PAYABLE_CAMEL = {
  invoiceNo: "INV-1",
  entityName: "Annual Summit",
  payState: "Payable",
  currencyCode: "USD",
  outstandingAmount: 250,
  paymentAccountUniqueId: "acct-1",
  lineItems: [{ description: "Gold sponsorship", amount: 250 }],
}

const PAYABLE_PASCAL = {
  InvoiceNo: "INV-1",
  EntityName: "Annual Summit",
  PayState: "Payable",
  CurrencyCode: "USD",
  OutstandingAmount: 250,
  PaymentAccountUniqueId: "acct-1",
  LineItems: [{ Description: "Gold sponsorship", Amount: 250 }],
}

function httpError(status: number) {
  return new AxiosError("Request failed", "ERR_BAD_RESPONSE", undefined, null, {
    status,
    statusText: "Error",
    data: {},
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  })
}

beforeEach(() => {
  getMock.mockReset()
  postMock.mockReset()
})

describe("fetchCustomInvoicePaySummary", () => {
  /** Both serialisation casings the API has shipped normalise to the same buyer-facing summary. */
  it.each([
    ["camelCase", PAYABLE_CAMEL],
    ["PascalCase", PAYABLE_PASCAL],
  ])("PayableInvoiceSentIn%s_ReturnsNormalisedSummary", async (_casing, data) => {
    getMock.mockResolvedValue({ data: { success: true, data } })

    const summary = await fetchCustomInvoicePaySummary(INVOICE_ID)

    expect(getMock).toHaveBeenCalledWith("/api/custom-invoices/invoice-1/pay")
    expect(summary).toEqual({
      invoiceNo: "INV-1",
      entityName: "Annual Summit",
      payState: "Payable",
      currencyCode: "USD",
      outstandingAmount: 250,
      paymentAccountUniqueId: "acct-1",
      lineItems: [{ description: "Gold sponsorship", amount: 250 }],
    })
  })

  /** An unknown or non-custom invoice is a 404, which the page shows as "not found", not as a network error. */
  it("UnknownInvoice_ResolvesNull", async () => {
    getMock.mockRejectedValue(httpError(404))

    const summary = await fetchCustomInvoicePaySummary(INVOICE_ID)

    expect(summary).toBeNull()
  })

  /** A 500 rejects so the page can offer a retry rather than claim the invoice does not exist. */
  it("ServerError_Rejects", async () => {
    getMock.mockRejectedValue(httpError(500))

    const failure = await fetchCustomInvoicePaySummary(INVOICE_ID).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(AxiosError)
  })

  /** A payState outside the four known states is malformed input and is rejected at the boundary. */
  it("MalformedPayload_Rejects", async () => {
    getMock.mockResolvedValue({ data: { success: true, data: { ...PAYABLE_CAMEL, payState: "Bogus" } } })

    const failure = await fetchCustomInvoicePaySummary(INVOICE_ID).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(Error)
  })
})

describe("startCustomInvoicePayment", () => {
  /** The start is a POST on the invoice's pay resource with no body; it returns the intent's secret and id. */
  it("PostsWithoutABodyAndReturnsTheSecret", async () => {
    postMock.mockResolvedValue({ data: { success: true, data: { clientSecret: "pi_1_secret", paymentIntentId: "pi_1" } } })

    const started = await startCustomInvoicePayment(INVOICE_ID)

    expect(postMock).toHaveBeenCalledWith("/api/custom-invoices/invoice-1/pay")
    expect(started).toEqual({ clientSecret: "pi_1_secret", paymentIntentId: "pi_1" })
  })

  /**
   * A 200 body that is not an envelope object - an HTML fallback page - reads as the plain failure message,
   * never Zod wording (IN-01). The fix lives in the shared assertSuccess, so every caller inherits it.
   */
  it("NonObjectBody_ReportsThePlainFailureMessage", async () => {
    postMock.mockResolvedValue({ data: "<html>Service unavailable</html>" })

    const failure = await startCustomInvoicePayment(INVOICE_ID).catch((error: unknown) => error)

    expect(extractApiError(failure)).toBe(PAYMENT_START_FAILED_MESSAGE)
  })

  /** A response reporting its own failure carries the server's reason, not a schema complaint. */
  it("SelfReportedFailure_ReportsTheServerReason", async () => {
    postMock.mockResolvedValue({ data: { success: false, message: "This invoice has nothing left to pay.", data: null } })

    const failure = await startCustomInvoicePayment(INVOICE_ID).catch((error: unknown) => error)

    expect(extractApiError(failure)).toBe("This invoice has nothing left to pay.")
  })

  /** A missing or empty secret cannot be paid against, so it is refused with the plain message. */
  it.each([
    ["AnEmptyClientSecret", { clientSecret: "", paymentIntentId: "pi_1" }],
    ["NoClientSecret", { paymentIntentId: "pi_1" }],
    ["AnEmptyIntentId", { clientSecret: "pi_1_secret", paymentIntentId: "" }],
  ])("ResponseWith%s_IsRejectedWithThePlainMessage", async (_case, data) => {
    postMock.mockResolvedValue({ data: { success: true, data } })

    const failure = await startCustomInvoicePayment(INVOICE_ID).catch((error: unknown) => error)

    expect(extractApiError(failure)).toBe(PAYMENT_START_FAILED_MESSAGE)
  })
})
