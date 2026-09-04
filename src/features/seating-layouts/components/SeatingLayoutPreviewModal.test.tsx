import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { SeatingLayoutPreviewModal } from "./SeatingLayoutPreviewModal"

const THUMBNAIL_URL = "https://thumbnails.seats.io/workspace/chart/published/thumbnail.png"

/** Renders the modal open on one layout, inside the theme the list draws it in. */
function renderModal(layout: { name: string; thumbnailUrl: string | null } | null) {
  render(
    <ChakraProvider value={system}>
      <SeatingLayoutPreviewModal layout={layout} onClose={vi.fn()} />
    </ChakraProvider>,
  )
}

describe("SeatingLayoutPreviewModal", () => {
  /**
   * The preview shows the published picture of the layout the organizer clicked, and nothing that could change it.
   * An embedded designer here would put an editor — and the workspace secret key it needs — on a screen the
   * organizer opened only to look.
   */
  it("shows the published picture of the layout without an editor", async () => {
    renderModal({ name: "Grand Ballroom", thumbnailUrl: THUMBNAIL_URL })

    const image = await screen.findByAltText("Seating layout preview for Grand Ballroom")
    expect(image).toHaveAttribute("src", THUMBNAIL_URL)
  })

  /**
   * Seats.io pictures a chart only once it is published, so a layout without a picture is told what step is
   * missing. An empty frame would read as a page that failed rather than as work still to do.
   */
  it("explains what to do when the layout has never been published", async () => {
    renderModal({ name: "Draft Hall", thumbnailUrl: null })

    expect(await screen.findByText("Nothing to preview yet")).toBeInTheDocument()
    expect(screen.queryByAltText("Seating layout preview for Draft Hall")).not.toBeInTheDocument()
  })

  /**
   * A picture Seats.io fails to serve leaves the organizer with a broken image and no explanation, so the failure
   * is stated with a way forward instead.
   */
  it("says the picture could not be loaded when Seats.io fails to serve it", async () => {
    renderModal({ name: "Grand Ballroom", thumbnailUrl: THUMBNAIL_URL })

    fireEvent.error(await screen.findByAltText("Seating layout preview for Grand Ballroom"))

    expect(await screen.findByText("The preview could not be loaded")).toBeInTheDocument()
  })
})
