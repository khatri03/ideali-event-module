import { createElement, type ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { CustomInvoicingModuleState } from "@/api/adminCustomInvoicingModules"
import { CUSTOM_INVOICING_MODULES_QUERY_KEY } from "./useCustomInvoicingModules"
import { useSetCustomInvoicingModule } from "./useSetCustomInvoicingModule"

const http = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }))
vi.mock("@/api/client", () => ({ client: http }))
vi.mock("@/lib/toaster", () => ({ toaster: { create: vi.fn() } }))

const CACHED: CustomInvoicingModuleState[] = [
  { moduleType: "Event", isEnabled: true, updatedAtUtc: null, updatedByName: null },
  { moduleType: "Membership", isEnabled: false, updatedAtUtc: null, updatedByName: null },
]

function renderToggle() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  queryClient.setQueryData(CUSTOM_INVOICING_MODULES_QUERY_KEY, CACHED)
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
  const hook = renderHook(() => useSetCustomInvoicingModule(), { wrapper: Wrapper })
  const cached = () => queryClient.getQueryData<CustomInvoicingModuleState[]>(CUSTOM_INVOICING_MODULES_QUERY_KEY)
  return { ...hook, cached }
}

describe("useSetCustomInvoicingModule", () => {
  beforeEach(() => {
    http.get.mockReset()
    http.put.mockReset()
    http.get.mockReturnValue(new Promise(() => {}))
  })

  /** The switch moves the moment the admin taps it, before the server answers. */
  it("useSetCustomInvoicingModule_WhileSaving_ShowsNewStateOptimistically", async () => {
    http.put.mockReturnValue(new Promise(() => {}))
    const { result, cached } = renderToggle()

    act(() => result.current.mutate({ moduleType: "Membership", isEnabled: true }))

    await waitFor(() => expect(cached()?.find((state) => state.moduleType === "Membership")?.isEnabled).toBe(true))
    expect(cached()?.find((state) => state.moduleType === "Event")?.isEnabled).toBe(true)
  })

  /** A refused save puts the cached list back exactly as it was before the tap. */
  it("useSetCustomInvoicingModule_SaveFails_RestoresSnapshot", async () => {
    http.put.mockRejectedValue(new Error("refused"))
    const { result, cached } = renderToggle()

    act(() => result.current.mutate({ moduleType: "Membership", isEnabled: true }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(cached()).toEqual(CACHED)
  })
})
