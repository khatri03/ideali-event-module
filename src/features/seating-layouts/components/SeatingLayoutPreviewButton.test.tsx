import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { SeatingLayoutPreviewButton } from "./SeatingLayoutPreviewButton"

const THUMBNAIL_URL = "https://thumbnails.seats.io/workspace/chart/published/thumbnail.png"

/** Renders the preview cell inside the theme the list draws it in. */
function renderPreview(thumbnailUrl: string | null, onOpen = vi.fn()) {
  render(
    <ChakraProvider value={system}>
      <SeatingLayoutPreviewButton name="Grand Ballroom" thumbnailUrl={thumbnailUrl} onOpen={onOpen} />
    </ChakraProvider>,
  )

  return onOpen
}

describe("SeatingLayoutPreviewButton", () => {
  /**
   * The preview is what lets an organizer tell one layout from another in a list of names that often differ by a
   * word. It carries the layout name in its label so the picture is reachable without sight of it.
   */
  it("shows the layout preview and names the layout it belongs to", () => {
    renderPreview(THUMBNAIL_URL)

    const image = screen.getByAltText("Seating layout preview for Grand Ballroom")
    expect(image).toHaveAttribute("src", THUMBNAIL_URL)
    expect(screen.getByRole("button", { name: "Preview the Grand Ballroom seating layout" })).toBeInTheDocument()
  })

  /** Clicking the preview is what opens the full layout, which is the only reason the cell is interactive. */
  it("opens the full preview when the image is clicked", async () => {
    const user = userEvent.setup()
    const onOpen = renderPreview(THUMBNAIL_URL)

    await user.click(screen.getByRole("button", { name: "Preview the Grand Ballroom seating layout" }))

    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  /**
   * Seats.io only renders a preview of a published chart, so a layout drawn but never published has none. Saying
   * that is the point: an empty cell or a broken image would read as a fault in the page rather than as a step the
   * organizer still has to take.
   */
  it("says the layout is not published rather than showing an empty cell", () => {
    const onOpen = renderPreview(null)

    expect(screen.getByText("Not published yet")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(onOpen).not.toHaveBeenCalled()
  })
})
