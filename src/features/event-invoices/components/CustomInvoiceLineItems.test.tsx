import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { system } from "@/theme"
import { customInvoiceSchema, type CustomInvoiceFormValues } from "../schemas/customInvoice.schemas"
import { CustomInvoiceLineItems } from "./CustomInvoiceLineItems"

function Harness({ disabled = false }: { disabled?: boolean }) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomInvoiceFormValues>({
    resolver: zodResolver(customInvoiceSchema),
    defaultValues: {
      eventUniqueId: "evt-1",
      categoryUniqueId: "cat-1",
      dueDate: "2026-12-31",
      companyName: "Acme",
      firstName: "",
      middleName: "",
      lastName: "Doe",
      cellPhone: "",
      email: "buyer@acme.test",
      specialNotes: "",
      lineItems: [{ description: "", amount: "" }],
    },
  })

  return (
    <form onSubmit={handleSubmit(() => undefined)}>
      <CustomInvoiceLineItems control={control} register={register} errors={errors} disabled={disabled} />
      <button type="submit">Save</button>
    </form>
  )
}

function renderHarness(props?: { disabled?: boolean }) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <ChakraProvider value={system}>{children}</ChakraProvider>
  }
  return render(<Harness disabled={props?.disabled} />, { wrapper: Wrapper })
}

describe("CustomInvoiceLineItems", () => {
  /** A fresh editor opens on a single line whose remove control is disabled - one line is the minimum. */
  it("SingleLine_RendersWithRemoveDisabled", () => {
    renderHarness()
    expect(screen.getByLabelText("Description for line 1")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Remove line item 1" })).toBeDisabled()
  })

  /** Adding a line appends an empty row the organizer can fill. */
  it("AddLineItem_AppendsARow", async () => {
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole("button", { name: "Add line item" }))

    expect(screen.getByLabelText("Description for line 2")).toBeInTheDocument()
  })

  /** Entering amounts recomputes the Subtotal and Grand total live, summed to the exact cent. */
  it("EnteringAmounts_RecomputesTotalsLive", () => {
    renderHarness()

    fireEvent.change(screen.getByLabelText("Amount for line 1"), { target: { value: "1500.50" } })

    // Subtotal and Grand total are identical in v1 (no charges), so the figure shows twice.
    expect(screen.getAllByText("$1,500.50")).toHaveLength(2)
  })

  /** Removing a line drops its amount from the running total. */
  it("RemovingALine_UpdatesTotals", async () => {
    const user = userEvent.setup()
    renderHarness()

    fireEvent.change(screen.getByLabelText("Amount for line 1"), { target: { value: "100.00" } })
    await user.click(screen.getByRole("button", { name: "Add line item" }))
    fireEvent.change(screen.getByLabelText("Amount for line 2"), { target: { value: "50.00" } })
    expect(screen.getAllByText("$150.00")).toHaveLength(2)

    await user.click(screen.getByRole("button", { name: "Remove line item 2" }))

    expect(screen.getAllByText("$100.00")).toHaveLength(2)
  })

  /** A non-positive amount is refused on submit with the shared wording. */
  it("NonPositiveAmount_ShowsGreaterThanZeroError", async () => {
    const user = userEvent.setup()
    renderHarness()

    fireEvent.change(screen.getByLabelText("Description for line 1"), { target: { value: "Booth" } })
    fireEvent.change(screen.getByLabelText("Amount for line 1"), { target: { value: "0" } })
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(await screen.findByText("Enter an amount greater than zero.")).toBeInTheDocument()
  })

  /** A disabled editor is read-only: fields are inert and neither add nor remove is offered. */
  it("Disabled_MakesEveryControlInert", () => {
    renderHarness({ disabled: true })

    expect(screen.getByLabelText("Description for line 1")).toBeDisabled()
    expect(screen.getByLabelText("Amount for line 1")).toBeDisabled()
    expect(screen.queryByRole("button", { name: "Add line item" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Remove line item/ })).not.toBeInTheDocument()
  })
})
