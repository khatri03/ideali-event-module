import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { SeatingLayoutPreviewLink } from "./SeatingLayoutPreviewLink"

const THUMBNAIL_URL = "https://thumbnails.seats.io/workspace/chart/published/thumbnail.png"
const PREVIEW_URL = "https://app.seats.io/preview/eu/workspace-key/chart-key"

/** Renders the preview cell inside the theme the list draws it in. */
function renderPreview(thumbnailUrl: string | null, previewUrl: string | null) {
  render(
    <ChakraProvider value={system}>
      <SeatingLayoutPreviewLink name="Grand Ballroom" thumbnailUrl={thumbnailUrl} previewUrl={previewUrl} />
    </ChakraProvider>,
  )
}

describe("SeatingLayoutPreviewLink", () => {
  /**
   * The preview is what lets an organizer tell one layout from another in a list of names that often differ by a
   * word, and it opens the layout on Seats.io. The link is marked as leaving the page, because a new tab that
   * appears unannounced reads as the page having navigated away.
   */
  it("opens the layout on Seats.io in a new tab", () => {
    renderPreview(THUMBNAIL_URL, PREVIEW_URL)

    const link = screen.getByRole("link", { name: "Open the Grand Ballroom seating layout on Seats.io in a new tab" })
    expect(link).toHaveAttribute("href", PREVIEW_URL)
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"))
    expect(screen.getByAltText("Seating layout preview for Grand Ballroom")).toHaveAttribute("src", THUMBNAIL_URL)
  })

  /**
   * Seats.io only pictures a published chart, so a layout drawn but never published has none. Saying that is the
   * point: an empty cell or a broken image would read as a fault in the page rather than as a step the organizer
   * still has to take.
   */
  it("says the layout is not published rather than showing an empty cell", () => {
    renderPreview(null, PREVIEW_URL)

    expect(screen.getByText("Not published yet")).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  /**
   * A layout that has never reached Seats.io has no page to open. Linking anyway would land the organizer on a
   * Seats.io error rather than on their layout.
   */
  it("offers no link when the layout has never reached Seats.io", () => {
    renderPreview(THUMBNAIL_URL, null)

    expect(screen.getByText("Not published yet")).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })
})
