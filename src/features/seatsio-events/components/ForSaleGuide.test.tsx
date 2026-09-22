import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { ForSaleGuide } from "./ForSaleGuide"

function renderGuide() {
  return render(
    <ChakraProvider value={system}>
      <ForSaleGuide />
    </ChakraProvider>,
  )
}

describe("ForSaleGuide", () => {
  /** The guide lands collapsed so it never clutters the panel; the content is inert (hidden from AT) until expanded. */
  it("keeps the steps collapsed and inert until the header is expanded", () => {
    renderGuide()

    const trigger = screen.getByRole("button", { name: /how to take objects off sale/i })
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(document.getElementById(trigger.getAttribute("aria-controls")!)).toHaveAttribute("inert")
  })

  /** Expanding must reveal all three actions in order, so an organizer who opens the guide sees the full flow. */
  it("reveals the pick, review and apply steps once expanded", async () => {
    renderGuide()

    await userEvent.click(screen.getByRole("button", { name: /how to take objects off sale/i }))

    expect(screen.getByText("Pick objects on the map")).toBeInTheDocument()
    expect(screen.getByText("Review the staged list")).toBeInTheDocument()
    expect(screen.getByText("Apply to take off sale")).toBeInTheDocument()
  })

  /** The hover tip named after the steps ties the guide to the map's popovers, so it must appear when expanded. */
  it("names the Sold and Not for sale statuses once expanded", async () => {
    renderGuide()

    await userEvent.click(screen.getByRole("button", { name: /how to take objects off sale/i }))

    expect(screen.getByText("Sold")).toBeInTheDocument()
    expect(screen.getByText("Not for sale")).toBeInTheDocument()
  })
})
