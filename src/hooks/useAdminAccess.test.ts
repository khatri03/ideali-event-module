import { createElement, type ReactNode } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { auth } from "@/lib/auth"
import { useAdminAccess } from "./useAdminAccess"

function sessionUser(roles: string[]) {
  return { id: "7", name: "Ayesha Khan", email: "ayesha@ideali.test", role: roles[0] ?? "Organizer", roles }
}

function renderAccess() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
  return renderHook(() => useAdminAccess(), { wrapper: Wrapper })
}

describe("useAdminAccess", () => {
  afterEach(() => {
    auth.clear()
  })

  /** A signed-in admin is let through to admin screens. */
  it("useAdminAccess_AdminSession_IsAdmin", () => {
    auth.setUser(sessionUser(["Admin"]))

    const { result } = renderAccess()

    expect(result.current).toEqual({ isResolved: true, isAdmin: true })
  })

  /** An organizer is known but not an admin, so admin pages send them away instead of rendering. */
  it("useAdminAccess_OrganizerSession_IsNotAdmin", () => {
    auth.setUser(sessionUser(["Organizer"]))

    const { result } = renderAccess()

    expect(result.current).toEqual({ isResolved: true, isAdmin: false })
  })
})
