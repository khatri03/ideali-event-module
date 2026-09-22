import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { EventBookedProgress } from "./EventBookedProgress"

function renderBar(booked: number, total: number) {
  return render(
    <ChakraProvider value={system}>
      <EventBookedProgress booked={booked} total={total} />
    </ChakraProvider>,
  )
}

describe("EventBookedProgress", () => {
  /** The bar reports the booked value out of the total as an accessible progressbar and prints the split in words. */
  it("reports the booked share against the total", () => {
    renderBar(12, 40)

    const bar = screen.getByRole("progressbar")
    expect(bar).toHaveAttribute("aria-valuenow", "12")
    expect(bar).toHaveAttribute("aria-valuemax", "40")
    expect(screen.getByText("12 booked · 28 available")).toBeInTheDocument()
  })

  /** A booked count above the total clamps to the total, so a stale report can never overfill the bar or go negative on available. */
  it("clamps a booked count that exceeds the total", () => {
    renderBar(50, 40)

    const bar = screen.getByRole("progressbar")
    expect(bar).toHaveAttribute("aria-valuenow", "40")
    expect(screen.getByText("40 booked · 0 available")).toBeInTheDocument()
  })

  /** With no objects the percentage is zero rather than a divide-by-zero NaN, so an empty event renders a flat bar. */
  it("reads zero when the total is zero", () => {
    renderBar(0, 0)

    const bar = screen.getByRole("progressbar")
    expect(bar).toHaveAttribute("aria-valuenow", "0")
    expect(bar).toHaveAttribute("aria-valuemax", "0")
    expect(screen.getByText("0 booked · 0 available")).toBeInTheDocument()
  })
})
