import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { EventBookedProgress } from "./EventBookedProgress"

function renderBar(booked: number, total: number, available: number, isUpdating = false) {
  return render(
    <ChakraProvider value={system}>
      <EventBookedProgress booked={booked} total={total} available={available} isUpdating={isUpdating} />
    </ChakraProvider>,
  )
}

describe("EventBookedProgress", () => {
  /** The bar reports the booked value out of the total as an accessible progressbar and prints the split in words. */
  it("reports the booked share against the total", () => {
    renderBar(12, 40, 28)

    const bar = screen.getByRole("progressbar")
    expect(bar).toHaveAttribute("aria-valuenow", "12")
    expect(bar).toHaveAttribute("aria-valuemax", "40")
    expect(screen.getByText("12 booked · 28 available")).toBeInTheDocument()
  })

  /**
   * Available is Seats.io's own count, not total minus booked, so seats held off sale are neither booked nor available.
   * The bar must print the passed available figure verbatim rather than inferring it, or held-back seats would keep
   * showing as on sale.
   */
  it("prints the available count independently of booked and total", () => {
    renderBar(12, 40, 20)

    expect(screen.getByText("12 booked · 20 available")).toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "12 booked, 20 available")
  })

  /** A booked count above the total clamps to the total, so a stale report can never overfill the bar or go negative. */
  it("clamps a booked count that exceeds the total", () => {
    renderBar(50, 40, 0)

    const bar = screen.getByRole("progressbar")
    expect(bar).toHaveAttribute("aria-valuenow", "40")
    expect(screen.getByText("40 booked · 0 available")).toBeInTheDocument()
  })

  /** An available count above the total clamps to the total rather than overstating what can be sold. */
  it("clamps an available count that exceeds the total", () => {
    renderBar(0, 40, 99)

    expect(screen.getByText("0 booked · 40 available")).toBeInTheDocument()
  })

  /**
   * A background refresh after a for-sale change marks the meter busy rather than flashing a skeleton over data it
   * already holds, so assistive tech announces the refresh while the last-known figures stay on screen.
   */
  it("marks itself busy while a refresh is in flight", () => {
    renderBar(12, 40, 28, true)

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-busy", "true")
    expect(screen.getByText("12 booked · 28 available")).toBeInTheDocument()
  })

  /** With no refresh in flight the meter is not busy, so a settled report never reads as perpetually loading. */
  it("is not busy when no refresh is in flight", () => {
    renderBar(12, 40, 28)

    expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-busy")
  })

  /** With no objects the percentage is zero rather than a divide-by-zero NaN, so an empty event renders a flat bar. */
  it("reads zero when the total is zero", () => {
    renderBar(0, 0, 0)

    const bar = screen.getByRole("progressbar")
    expect(bar).toHaveAttribute("aria-valuenow", "0")
    expect(bar).toHaveAttribute("aria-valuemax", "0")
    expect(screen.getByText("0 booked · 0 available")).toBeInTheDocument()
  })
})
