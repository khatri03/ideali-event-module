import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useForm } from "react-hook-form"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { CustomInvoiceDetail } from "@/api/customInvoices"
import { buildCustomInvoiceDetail } from "@/test/customInvoiceDetail.fixture"
import { system } from "@/theme"
import type { CustomInvoiceFormValues } from "../schemas/customInvoice.schemas"
import { CustomInvoiceSummaryPanel } from "./CustomInvoiceSummaryPanel"

interface HarnessProps {
  isPending?: boolean
  detail?: CustomInvoiceDetail
  dueDate?: string
}

/** A form with two amount inputs and a due date feeding the panel, the way the editor's Charges pane does. */
function SummaryHarness({ isPending = false, detail, dueDate = "" }: HarnessProps) {
  const { control, register } = useForm<CustomInvoiceFormValues>({
    defaultValues: {
      dueDate,
      emailOnCreate: true,
      lineItems: [
        { description: "Booth", amount: "" },
        { description: "Banner", amount: "" },
      ],
    },
  })
  return (
    <>
      <input aria-label="Amount 1" {...register("lineItems.0.amount")} />
      <input aria-label="Amount 2" {...register("lineItems.1.amount")} />
      <input aria-label="Due" {...register("dueDate")} />
      <CustomInvoiceSummaryPanel
        control={control}
        detail={detail}
        submitLabel="Create invoice"
        isPending={isPending}
        canSubmit
        cancelLabel="Cancel"
        onCancel={vi.fn()}
      />
    </>
  )
}

function renderSummary(props: HarnessProps = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <SummaryHarness {...props} />
      </QueryClientProvider>
    </ChakraProvider>,
  )
}

function totalDue() {
  return screen.getByText("Total due").nextElementSibling
}

describe("CustomInvoiceSummaryPanel", () => {
  /** Total due follows every amount change and adds decimals exactly, so 0.10 + 0.20 never reads 0.30000000000000004. */
  it("SummaryPanel_TotalDue_UpdatesAsLineAmountsChange", async () => {
    const user = userEvent.setup()
    renderSummary()

    await user.type(screen.getByLabelText("Amount 1"), "0.10")
    await user.type(screen.getByLabelText("Amount 2"), "0.20")

    expect(totalDue()).toHaveTextContent("$0.30")
  })

  /** A half-typed or invalid amount is left out of the total rather than turning it into NaN. */
  it("SummaryPanel_InvalidAmount_IsLeftOutOfTotal", () => {
    renderSummary()

    fireEvent.change(screen.getByLabelText("Amount 1"), { target: { value: "abc" } })
    fireEvent.change(screen.getByLabelText("Amount 2"), { target: { value: "15.50" } })

    expect(totalDue()).toHaveTextContent("$15.50")
    expect(totalDue()).not.toHaveTextContent("NaN")
  })

  /** The organizer sees the chosen due date in words, or that none is set yet. */
  it("SummaryPanel_DueDate_ShowsChosenDateOrNotSet", () => {
    renderSummary()
    expect(screen.getByText("Not set")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Due"), { target: { value: "2026-12-31" } })

    expect(screen.getByText("Dec 31, 2026")).toBeInTheDocument()
  })

  /** Before the first save the status says the invoice does not exist yet, so nobody assumes it was sent. */
  it("SummaryPanel_NewInvoice_StatusReadsNotSavedYet", () => {
    renderSummary()

    expect(screen.getByText("Not saved yet")).toBeInTheDocument()
  })

  /** While a save is in flight the action is disabled and says so, so a second click cannot create a duplicate. */
  it("SummaryPanel_PendingSave_DisablesActionAndShowsSaving", () => {
    renderSummary({ isPending: true })

    const action = screen.getByRole("button", { name: /Saving/ })
    expect(action).toBeDisabled()
    expect(screen.queryByRole("button", { name: "Create invoice" })).not.toBeInTheDocument()
  })

  /** Before the first save there is no pay page yet, so the link row says when it will appear instead of a dead link (D-15). */
  it("SummaryPanel_NewInvoice_ShowsLinkAppearsAfterYouSave", () => {
    renderSummary()

    expect(screen.getByText("Link appears after you save")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Copy link/ })).not.toBeInTheDocument()
  })

  /** A saved invoice shows its server status as a badge and a payable link the organizer can copy (EDIT-02). */
  it("SummaryPanel_ExistingInvoice_ShowsStatusBadgeAndPayableLinkWithCopy", () => {
    renderSummary({ detail: buildCustomInvoiceDetail() })

    expect(screen.getByText("Pending Payment")).toBeInTheDocument()
    expect(screen.queryByText("Not saved yet")).not.toBeInTheDocument()
    expect(screen.getByText(/\/custom-invoices\/invoice-1\/pay$/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Copy link/ })).toBeEnabled()
  })

  /** An overdue invoice is flagged next to its status, from the server's verdict, so it is chased first. */
  it("SummaryPanel_OverdueInvoice_ShowsOverdueBesideStatus", () => {
    renderSummary({ detail: buildCustomInvoiceDetail({ isOverdue: true }) })

    expect(screen.getByText("Overdue")).toBeInTheDocument()
  })

  /** Total due is shown in the saved invoice's own currency, never a hard-coded dollar sign. */
  it("SummaryPanel_ExistingInvoice_UsesItsCurrencySymbol", () => {
    renderSummary({ detail: buildCustomInvoiceDetail({ currencySymbol: "€" }) })

    fireEvent.change(screen.getByLabelText("Amount 1"), { target: { value: "12.50" } })

    expect(totalDue()).toHaveTextContent("€12.50")
  })
})
