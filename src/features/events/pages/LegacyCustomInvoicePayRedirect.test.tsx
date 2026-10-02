import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useLocation, useNavigationType, useParams } from "react-router-dom"
import { APP_ROUTES } from "@/utils/routes"
import { LegacyCustomInvoicePayRedirect } from "./LegacyCustomInvoicePayRedirect"

/** Stands in for the pay page: shows where the router landed and which id the page would load. */
function PayPageProbe() {
  const { invoiceUniqueId } = useParams<{ invoiceUniqueId: string }>()
  const location = useLocation()
  const navigationType = useNavigationType()
  return (
    <>
      <p data-testid="landed-path">{location.pathname}</p>
      <p data-testid="invoice-id">{invoiceUniqueId}</p>
      <p data-testid="navigation-type">{navigationType}</p>
    </>
  )
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={APP_ROUTES.customInvoicePayRoute} element={<PayPageProbe />} />
        <Route path={APP_ROUTES.legacyCustomInvoicePayRoute} element={<LegacyCustomInvoicePayRedirect />} />
        <Route path="*" element={<p data-testid="landed-path">elsewhere</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe("LegacyCustomInvoicePayRedirect", () => {
  /**
   * D-06: a buyer opening a pay link emailed before the rename must reach the same invoice's pay page, and
   * Back must not bounce them through the old URL again, so the history entry is replaced.
   */
  it("LegacyPayLink_OpensTheSameInvoiceOnTheRenamedPayPage", () => {
    renderAt("/events/invoices/abc-123/pay")

    expect(screen.getByTestId("landed-path")).toHaveTextContent("/custom-invoices/abc-123/pay")
    expect(screen.getByTestId("invoice-id")).toHaveTextContent("abc-123")
    expect(screen.getByTestId("navigation-type")).toHaveTextContent("REPLACE")
  })

  /**
   * T-06-25: the id segment of an emailed link is editable, so reserved characters must be encoded into the
   * one path segment; otherwise the redirect could be steered off the /custom-invoices/ pay path.
   */
  it("LegacyPayLink_EncodesTheIdIntoThePathSegment", () => {
    renderAt("/events/invoices/a%2F..%2F..%2Fadmin%3Fx%3D1/pay")

    expect(screen.getByTestId("landed-path")).toHaveTextContent("/custom-invoices/a%2F..%2F..%2Fadmin%3Fx%3D1/pay")
    expect(screen.getByTestId("invoice-id")).toHaveTextContent("a/../../admin?x=1")
  })
})
