import { describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useConfirmationRequest } from "./useConfirmationRequest"

describe("useConfirmationRequest", () => {
  it("HoldsNothingUntilAnActionIsRequested", () => {
    const { result } = renderHook(() => useConfirmationRequest<string>())

    expect(result.current.request).toBeNull()
    expect(result.current.isOpen).toBe(false)
  })

  it("OpensWithTheRequestItWasGiven", () => {
    const { result } = renderHook(() => useConfirmationRequest<string>())

    act(() => result.current.open("TKT-1"))

    expect(result.current.request).toBe("TKT-1")
    expect(result.current.isOpen).toBe(true)
  })

  it("RunsTheActionAgainstTheRequestOnConfirm", () => {
    const runAction = vi.fn()
    const { result } = renderHook(() => useConfirmationRequest<string>())

    act(() => result.current.open("TKT-1"))
    act(() => result.current.confirm(runAction))

    expect(runAction).toHaveBeenCalledWith("TKT-1")
    expect(result.current.isOpen).toBe(false)
  })

  /**
   * The dialog releases the body scroll lock and pointer-events guard on its way out, which it can only
   * do while it is still mounted - so closing must not take the request that renders it away.
   */
  it("KeepsTheRequestAfterClosingSoTheDialogCanUnwindItself", () => {
    const { result } = renderHook(() => useConfirmationRequest<string>())

    act(() => result.current.open("TKT-1"))
    act(() => result.current.close())

    expect(result.current.isOpen).toBe(false)
    expect(result.current.request).toBe("TKT-1")
  })

  it("RunsNothingWhenConfirmedWithoutARequest", () => {
    const runAction = vi.fn()
    const { result } = renderHook(() => useConfirmationRequest<string>())

    act(() => result.current.confirm(runAction))

    expect(runAction).not.toHaveBeenCalled()
  })

  it("ReplacesTheRequestWhenASecondActionIsAsked", () => {
    const runAction = vi.fn()
    const { result } = renderHook(() => useConfirmationRequest<string>())

    act(() => result.current.open("TKT-1"))
    act(() => result.current.close())
    act(() => result.current.open("TKT-2"))
    act(() => result.current.confirm(runAction))

    expect(runAction).toHaveBeenCalledWith("TKT-2")
  })
})
