import type { ReactElement, ReactNode } from "react"
import { render } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"

interface ServerModuleState {
  moduleType: string
  isEnabled: boolean
  updatedAtUtc?: string | null
  updatedByName?: string | null
}

/**
 * The GET body as the API sends it, wrapped in the service envelope, so tests exercise the real parse
 * path instead of handing the screen pre-shaped objects.
 */
export function moduleListResponse(states: ServerModuleState[]) {
  return { data: { success: true, data: states } }
}

/**
 * Renders a screen of this feature with the providers it needs in the app. Each call gets its own
 * QueryClient with retries off, so no cached data or retry delay leaks from one test into the next.
 */
export function renderWithProviders(ui: ReactElement, initialPath = "/") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ChakraProvider value={system}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
        </QueryClientProvider>
      </ChakraProvider>
    )
  }
  return render(ui, { wrapper: Wrapper })
}
