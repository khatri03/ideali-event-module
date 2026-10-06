import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ChakraProvider } from "@chakra-ui/react"
import { useForm, useWatch, type DefaultValues } from "react-hook-form"
import type { CustomInvoiceLinkCandidate } from "@/api/customInvoices"
import { system } from "@/theme"
import type { CustomInvoiceFormValues } from "../schemas/customInvoice.schemas"
import { CustomInvoiceBuyerSection } from "./CustomInvoiceBuyerSection"
import { CustomInvoiceLinkSection } from "./CustomInvoiceLinkSection"

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }))
vi.mock("@/api/client", () => ({ client: http }))

const useLinkCandidatesMock = vi.hoisted(() => vi.fn())
vi.mock("../hooks/useCustomInvoiceAuthoringOptions", () => ({
  useCustomInvoiceLinkCandidates: useLinkCandidatesMock,
}))

const CANDIDATE: CustomInvoiceLinkCandidate = {
  invoiceUniqueId: "inv-42",
  invoiceNo: "INV-0042",
  companyName: "Northwind Traders",
  buyerFirstName: "Sam",
  buyerMiddleName: null,
  buyerLastName: "Lee",
  buyerName: "Sam Lee",
  buyerEmail: "sam@northwind.test",
  invoiceDateUtc: "2026-09-01T00:00:00Z",
  invoiceStatus: "Paid",
  invoiceStatusLabel: "Paid",
}

const BASE_VALUES: DefaultValues<CustomInvoiceFormValues> = {
  moduleType: "Membership",
  companyName: "Acme Corp",
  firstName: "",
  middleName: "M",
  lastName: "",
  cellPhone: "555-0100",
  email: "",
  memberUniqueId: "",
  linkToExisting: false,
}

/** The Bill to card as the editor wires it: the link switch above the buyer fields it locks, sharing one form. */
function Harness({ defaultValues }: { defaultValues: DefaultValues<CustomInvoiceFormValues> }) {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useForm<CustomInvoiceFormValues>({ defaultValues })
  const linkToExisting = useWatch({ control, name: "linkToExisting" })
  const linkedInvoiceUniqueId = useWatch({ control, name: "linkedInvoiceUniqueId" })

  return (
    <>
      <CustomInvoiceLinkSection control={control} setValue={setValue} errors={errors} disabled={false} />
      <CustomInvoiceBuyerSection
        register={register}
        errors={errors}
        setValue={setValue}
        isNameAndEmailLocked={linkToExisting && Boolean(linkedInvoiceUniqueId)}
      />
      <output data-testid="linked-invoice">{linkedInvoiceUniqueId ?? ""}</output>
    </>
  )
}

function renderSection(overrides: DefaultValues<CustomInvoiceFormValues> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ChakraProvider value={system}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ChakraProvider>
    )
  }
  return render(<Harness defaultValues={{ ...BASE_VALUES, ...overrides }} />, { wrapper: Wrapper })
}

function linkSwitch() {
  return screen.getByRole("checkbox", { name: "Link to an existing invoice" })
}

async function switchOnAndPick(user: ReturnType<typeof userEvent.setup>) {
  await user.click(linkSwitch())
  await user.click(await screen.findByRole("radio", { name: "Select invoice INV-0042" }))
}

describe("CustomInvoiceLinkSection", () => {
  beforeEach(() => {
    useLinkCandidatesMock.mockReset().mockReturnValue({
      data: { items: [CANDIDATE], total: 1, totalPages: 1 },
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
  })

  /** Candidates belong to one module, so the switch cannot be turned on before a module is chosen (D-09). */
  it("LinkSection_SwitchDisabledUntilModuleChosen", () => {
    renderSection({ moduleType: undefined })

    expect(linkSwitch()).toBeDisabled()
    expect(screen.getByText("Choose a module first")).toBeInTheDocument()
  })

  /** The link is opt-in, so a new invoice opens with the switch off and no picker. */
  it("LinkSection_NewInvoice_SwitchOffAndNoPicker", () => {
    renderSection()

    expect(linkSwitch()).not.toBeChecked()
    expect(screen.queryByPlaceholderText("Search by invoice no, buyer name or email")).not.toBeInTheDocument()
  })

  /** Picking an invoice copies its buyer's name and email and names the source invoice in a banner (D-12). */
  it("LinkSection_Pick_CopiesBuyerNameAndEmailAndShowsBuyerCopiedBanner", async () => {
    const user = userEvent.setup()
    renderSection()

    await switchOnAndPick(user)

    expect(await screen.findByText("Buyer copied from INV-0042")).toBeInTheDocument()
    expect(screen.getByLabelText(/First name/i)).toHaveValue("Sam")
    expect(screen.getByLabelText(/Middle name/i)).toHaveValue("")
    expect(screen.getByLabelText(/Last name/i)).toHaveValue("Lee")
    expect(screen.getByLabelText(/Email address/i)).toHaveValue("sam@northwind.test")
    expect(screen.getByLabelText(/Company name/i)).toHaveValue("Acme Corp")
    expect(screen.getByLabelText(/Email address/i)).toHaveAttribute("readonly")
  })

  /** Change invoice reopens the picker without dropping the link, so a wrong pick is corrected in place. */
  it("LinkSection_ChangeInvoice_ReopensThePicker", async () => {
    const user = userEvent.setup()
    renderSection()
    await switchOnAndPick(user)

    await user.click(await screen.findByRole("button", { name: "Change invoice" }))

    expect(screen.getByRole("radio", { name: "Select invoice INV-0042" })).toBeChecked()
    expect(screen.getByTestId("linked-invoice")).toHaveTextContent("inv-42")
  })

  /** Switching off forgets the link and unlocks the fields, but keeps the copied values so nothing is retyped (D-12). */
  it("LinkSection_SwitchOff_ClearsLinkAndUnlocksKeepingValues", async () => {
    const user = userEvent.setup()
    renderSection()
    await switchOnAndPick(user)

    await user.click(linkSwitch())

    expect(screen.getByTestId("linked-invoice")).toBeEmptyDOMElement()
    expect(screen.queryByText("Buyer copied from INV-0042")).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Email address/i)).not.toHaveAttribute("readonly")
    expect(screen.getByLabelText(/Email address/i)).toHaveValue("sam@northwind.test")
    expect(screen.getByLabelText(/Last name/i)).toHaveValue("Lee")
  })

  /** An invoice that is already linked opens with the switch on and the banner naming it. */
  it("LinkSection_ExistingLink_OpensOnWithBanner", () => {
    renderSection({ linkToExisting: true, linkedInvoiceUniqueId: "inv-42", linkedInvoiceNo: "INV-0042" })

    expect(linkSwitch()).toBeChecked()
    expect(screen.getByText("Buyer copied from INV-0042")).toBeInTheDocument()
    expect(screen.getByLabelText(/First name/i)).toHaveAttribute("readonly")
  })
})
