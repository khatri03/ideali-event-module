import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ChakraProvider } from "@chakra-ui/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { system } from "@/theme"
import { API_ROUTES } from "@/utils/routes"
import { customInvoiceSchema, type CustomInvoiceFormValues } from "../schemas/customInvoice.schemas"
import { CustomInvoiceBuyerSection } from "./CustomInvoiceBuyerSection"

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }))
vi.mock("@/api/client", () => ({ client: http }))

function memberOptionsResponse() {
  return {
    data: {
      success: true,
      Data: {
        PageNo: 1,
        PageSize: 20,
        PageCount: 1,
        TotalRecordsCount: 1,
        PageData: [
          {
            MemberUniqueId: "mem-1",
            FullName: "Jane Doe",
            Email: "jane@acme.test",
            MembershipTypeName: "Gold",
            AddedOnUtc: null,
            OtherLists: [],
          },
        ],
      },
    },
  }
}

function emptyMemberOptionsResponse() {
  return {
    data: {
      success: true,
      Data: { PageNo: 1, PageSize: 20, PageCount: 0, TotalRecordsCount: 0, PageData: [] },
    },
  }
}

interface HarnessProps {
  moduleType?: "Event" | "Membership" | "Donation"
  disabled?: boolean
  isNameAndEmailLocked?: boolean
}

function Harness({ moduleType = "Membership", disabled = false, isNameAndEmailLocked = false }: HarnessProps) {
  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomInvoiceFormValues>({
    resolver: zodResolver(customInvoiceSchema),
    defaultValues: {
      moduleType,
      entityUniqueId: "evt-1",
      categoryUniqueId: "cat-1",
      dueDate: "2026-12-31",
      companyName: "",
      firstName: "",
      middleName: "",
      lastName: "",
      cellPhone: "",
      email: "",
      specialNotes: "",
      lineItems: [{ description: "Booth", amount: "100.00" }],
    },
  })

  return (
    <form onSubmit={handleSubmit(() => undefined)}>
      <CustomInvoiceBuyerSection
        register={register}
        errors={errors}
        setValue={setValue}
        disabled={disabled}
        moduleType={moduleType}
        isNameAndEmailLocked={isNameAndEmailLocked}
      />
      <button type="submit">Save</button>
    </form>
  )
}

function renderHarness(props: HarnessProps = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ChakraProvider value={system}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ChakraProvider>
    )
  }
  return render(<Harness {...props} />, { wrapper: Wrapper })
}

describe("CustomInvoiceBuyerSection", () => {
  beforeEach(() => {
    http.get.mockReset()
    http.get.mockImplementation((url: string) => {
      if (url === API_ROUTES.customListMemberOptions) return Promise.resolve(memberOptionsResponse())
      return Promise.resolve({ data: { success: true, Data: null } })
    })
  })

  /** The block opens on manual entry - the fields are there and no member search is shown. */
  it("DefaultsToManualEntry", () => {
    renderHarness()
    expect(screen.getByRole("tab", { name: "Enter manually" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByLabelText(/Company name/i)).toBeInTheDocument()
    expect(screen.queryByLabelText("Search members")).not.toBeInTheDocument()
  })

  /** Switching to Existing member reveals the debounced member search. */
  it("ExistingMember_ShowsMemberSearch", async () => {
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole("tab", { name: "Existing member" }))

    expect(screen.getByLabelText("Search members")).toBeInTheDocument()
  })

  /** Picking a member prefills the fields it can supply and leaves every field editable. */
  it("PickingMember_PrefillsAndStaysEditable", async () => {
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole("tab", { name: "Existing member" }))
    fireEvent.change(screen.getByLabelText("Search members"), { target: { value: "Jane" } })

    fireEvent.click(await screen.findByText("Jane Doe"))

    await waitFor(() => expect(screen.getByLabelText(/Last name/i)).toHaveValue("Doe"))
    expect(screen.getByLabelText(/First name/i)).toHaveValue("Jane")
    expect(screen.getByLabelText(/Email address/i)).toHaveValue("jane@acme.test")

    // Still editable after a pick - the organizer types the company the member option cannot supply.
    fireEvent.change(screen.getByLabelText(/Company name/i), { target: { value: "Acme Corp" } })
    expect(screen.getByLabelText(/Company name/i)).toHaveValue("Acme Corp")
  })

  /** A pick closes the result list and says whose details were copied, so the organizer is not left looking at an open list. */
  it("PickingMember_ClosesTheListAndNamesWhoWasPicked", async () => {
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole("tab", { name: "Existing member" }))
    fireEvent.change(screen.getByLabelText("Search members"), { target: { value: "Jane" } })
    fireEvent.click(await screen.findByText("Jane Doe"))

    expect(await screen.findByRole("status")).toHaveTextContent("Buyer details copied from Jane Doe")
    expect(screen.queryByRole("button", { name: /Jane Doe/ })).not.toBeInTheDocument()
  })

  /** Typing a new search after a pick brings the results back so someone else can be chosen. */
  it("SearchingAgainAfterAPick_ShowsTheResultsAgain", async () => {
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole("tab", { name: "Existing member" }))
    fireEvent.change(screen.getByLabelText("Search members"), { target: { value: "Jane" } })
    fireEvent.click(await screen.findByText("Jane Doe"))
    await screen.findByRole("status")

    fireEvent.change(screen.getByLabelText("Search members"), { target: { value: "Jan" } })

    expect(await screen.findByRole("button", { name: /Jane Doe/ })).toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  /** After a member pick the name and email belong to that member; the invoice cannot name one member and bill another person. */
  it("PickingMember_LocksNameAndEmailButLeavesCompanyAndPhoneOpen", async () => {
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole("tab", { name: "Existing member" }))
    fireEvent.change(screen.getByLabelText("Search members"), { target: { value: "Jane" } })
    fireEvent.click(await screen.findByText("Jane Doe"))

    await waitFor(() => expect(screen.getByLabelText(/Email address/i)).toHaveAttribute("readonly"))
    expect(screen.getByLabelText(/First name/i)).toHaveAttribute("readonly")
    expect(screen.getByLabelText(/Last name/i)).toHaveAttribute("readonly")
    expect(screen.getByLabelText(/Company name/i)).not.toHaveAttribute("readonly")
    expect(screen.getByLabelText(/Cell phone/i)).not.toHaveAttribute("readonly")
  })

  /** An Event invoice bills a sponsor or partner who need not be a member, so only manual entry is offered. */
  it("EventModule_OffersManualEntryOnly", () => {
    renderHarness({ moduleType: "Event" })

    expect(screen.queryByRole("tab", { name: "Existing member" })).not.toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Enter manually" })).toHaveAttribute("aria-selected", "true")
  })

  /** No match returns the plain empty line rather than a stale list. */
  it("NoMatch_ShowsEmptyMessage", async () => {
    http.get.mockImplementation((url: string) => {
      if (url === API_ROUTES.customListMemberOptions) return Promise.resolve(emptyMemberOptionsResponse())
      return Promise.resolve({ data: { success: true, Data: null } })
    })
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole("tab", { name: "Existing member" }))
    fireEvent.change(screen.getByLabelText("Search members"), { target: { value: "Zzz" } })

    expect(await screen.findByText("No members match this search.")).toBeInTheDocument()
  })

  /** Required buyer fields are enforced with the exact backend wording (BUYER-03). */
  it("BlankRequiredFields_ShowErrors", async () => {
    const user = userEvent.setup()
    renderHarness()

    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: "not-an-email" } })
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(await screen.findByText("Company name is required.")).toBeInTheDocument()
    expect(screen.getByText("Last name is required.")).toBeInTheDocument()
    expect(screen.getByText("Enter an email address the buyer can actually receive mail at.")).toBeInTheDocument()
  })

  /** A disabled section is read-only: the toggle and every field are inert and no search is offered. */
  it("Disabled_MakesToggleAndFieldsInert", () => {
    renderHarness({ disabled: true })

    expect(screen.getByRole("tab", { name: "Enter manually" })).toBeDisabled()
    expect(screen.getByRole("tab", { name: "Existing member" })).toBeDisabled()
    expect(screen.getByLabelText(/Company name/i)).toBeDisabled()
    expect(screen.queryByLabelText("Search members")).not.toBeInTheDocument()
  })

  /**
   * While linked, the buyer's name and email must match the linked invoice, so those four fields are
   * read-only and the member picker is off; company and phone stay editable (D-12).
   */
  it("BuyerSection_Locked_NameAndEmailReadOnlyCompanyAndPhoneEditable", () => {
    renderHarness({ isNameAndEmailLocked: true })

    for (const label of [/First name/i, /Middle name/i, /Last name/i, /Email address/i]) {
      expect(screen.getByLabelText(label)).toHaveAttribute("readonly")
    }
    expect(screen.getByLabelText(/Company name/i)).not.toHaveAttribute("readonly")
    expect(screen.getByLabelText(/Company name/i)).toBeEnabled()
    expect(screen.getByLabelText(/Cell phone/i)).not.toHaveAttribute("readonly")
    expect(screen.getByRole("tab", { name: "Existing member" })).toBeDisabled()
    expect(screen.getByText("Locked while this invoice is linked.")).toBeInTheDocument()
  })
})
