import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useForm } from "react-hook-form"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ChakraProvider } from "@chakra-ui/react"
import { AxiosError } from "axios"
import { system } from "@/theme"
import { API_ROUTES } from "@/utils/routes"
import type { CustomInvoiceModule } from "@/api/customInvoices"
import type { CustomInvoiceFormValues } from "../schemas/customInvoice.schemas"
import { CustomInvoiceEntityPicker } from "./CustomInvoiceEntityPicker"

const http = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/api/client", () => ({ client: http }))

interface Row {
  UniqueId: string
  Name: string
}

function pageResponse(rows: Row[], pageNo = 1, pageCount = 1) {
  return { data: { success: true, Data: { PageNo: pageNo, PageSize: 20, PageCount: pageCount, TotalRecordsCount: rows.length, PageData: rows } } }
}

function serverError(title: string): AxiosError {
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 500,
    statusText: "Server Error",
    headers: {},
    config: {} as never,
    data: { title, status: 500 },
  })
}

/** The params of every entity-options request made so far, in order. */
function entityRequests(): URLSearchParams[] {
  return http.get.mock.calls
    .filter(([url]) => url === API_ROUTES.customInvoiceEntityOptions)
    .map(([, config]) => config.params as URLSearchParams)
}

function PickerHarness({ moduleType }: { moduleType?: CustomInvoiceModule }) {
  const {
    control,
    formState: { errors },
  } = useForm<CustomInvoiceFormValues>({ defaultValues: { entityUniqueId: "" } })
  return <CustomInvoiceEntityPicker control={control} errors={errors} moduleType={moduleType} />
}

function renderPicker(moduleType?: CustomInvoiceModule) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ChakraProvider value={system}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ChakraProvider>
    )
  }
  return render(<PickerHarness moduleType={moduleType} />, { wrapper: Wrapper })
}

async function openPicker(user: ReturnType<typeof userEvent.setup>, label: string) {
  const input = screen.getByRole("combobox", { name: label })
  await user.click(input)
  return input
}

describe("CustomInvoiceEntityPicker", () => {
  beforeEach(() => {
    http.get.mockReset()
    http.get.mockResolvedValue(pageResponse([{ UniqueId: "evt-1", Name: "Annual Gala" }]))
  })

  /** The field names what the module bills, so a Donation invoice asks for a campaign rather than a "Donation". */
  it.each([
    ["Event", "Event"],
    ["Membership", "Membership"],
    ["Donation", "Campaign"],
  ] as const)("EntityPicker_LabelFollowsModule_%s", (moduleType, label) => {
    renderPicker(moduleType)

    expect(screen.getByRole("combobox", { name: label })).toBeEnabled()
  })

  /** Before a module is chosen there is nothing to search, so the field is inert and says what to do first. */
  it("EntityPicker_NoModule_DisabledWithChooseModuleFirst", () => {
    renderPicker()

    const input = screen.getByRole("combobox", { name: "What this invoice bills" })
    expect(input).toBeDisabled()
    expect(input).toHaveAttribute("placeholder", "Choose a module first")
    expect(entityRequests()).toHaveLength(0)
  })

  /** Typing searches the server once the organizer pauses, not on every keystroke, so the API is not flooded. */
  it("EntityPicker_TypingSearchesServerAfterDebounce", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPicker("Event")
    const input = await openPicker(user, "Event")

    await user.type(input, "gal")

    await waitFor(() => expect(entityRequests().map((params) => params.get("searchTerm"))).toEqual(["", "gal"]))
    expect(entityRequests().every((params) => params.get("pageSize") === "20")).toBe(true)
  })

  /** Load more asks the server for the next page only and appends it, and disappears once the last page is in. */
  it("EntityPicker_LoadMore_FetchesNextServerPageAndAppends", async () => {
    http.get.mockImplementation((_url: string, config: { params: URLSearchParams }) =>
      Promise.resolve(
        config.params.get("pageNo") === "2"
          ? pageResponse([{ UniqueId: "evt-2", Name: "Winter Ball" }], 2, 2)
          : pageResponse([{ UniqueId: "evt-1", Name: "Annual Gala" }], 1, 2),
      ),
    )
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPicker("Event")
    await openPicker(user, "Event")

    await user.click(await screen.findByRole("button", { name: "Load more" }))

    expect(await screen.findByRole("option", { name: "Winter Ball" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Annual Gala" })).toBeInTheDocument()
    expect(entityRequests().map((params) => params.get("pageNo"))).toEqual(["1", "2"])
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument()
  })

  /** A search with no hit says so in plain words, quoting the term, instead of an empty box. */
  it("EntityPicker_NoMatch_ShowsNoEventsMatchTerm", async () => {
    http.get.mockImplementation((_url: string, config: { params: URLSearchParams }) =>
      Promise.resolve(config.params.get("searchTerm") ? pageResponse([]) : pageResponse([{ UniqueId: "evt-1", Name: "Annual Gala" }])),
    )
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPicker("Event")
    const input = await openPicker(user, "Event")

    await user.type(input, "zzz")

    expect(await screen.findByText('No events match "zzz".')).toBeInTheDocument()
  })

  /**
   * An organizer with no records of the module is told so, with no create link that would abandon the
   * unsaved invoice.
   */
  it("EntityPicker_NoRecords_ShowsYouHaveNoEventsYet", async () => {
    http.get.mockResolvedValue(pageResponse([]))
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPicker("Event")
    await openPicker(user, "Event")

    expect(await screen.findByText("You have no events yet.")).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  /** A failed load explains itself in plain text and Retry asks the server again rather than leaving the field dead. */
  it("EntityPicker_LoadError_ShowsPlainMessageWithRetry", async () => {
    http.get.mockRejectedValueOnce(serverError("We could not load your events."))
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPicker("Event")
    await openPicker(user, "Event")

    expect(await screen.findByText("We could not load your events.")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Retry" }))

    expect(await screen.findByRole("option", { name: "Annual Gala" })).toBeInTheDocument()
    expect(entityRequests()).toHaveLength(2)
  })
})
