import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider, Button } from "@chakra-ui/react"
import { system } from "@/theme"
import { SessionWizardPreviewProvider, useSessionWizardPreview } from "../hooks/useSessionWizardPreview"
import { SessionWizardPreviewPanel } from "./SessionWizardPreviewPanel"

const LAYOUT_NAME = "PC Hotel, Court Room"
const THUMBNAIL_URL = "https://cdn.seatsio.net/charts/court-room.png"
const PREVIEW_URL = "https://app.seats.io/preview/eu/pk_test/court-room"

/** Stands in for a wizard step, publishing a preview on demand the way the seat selection step does. */
function PublishingStep({ thumbnailUrl }: { thumbnailUrl: string | null }) {
  const { setPreview } = useSessionWizardPreview()

  return (
    <Button
      onClick={() =>
        setPreview({ name: LAYOUT_NAME, thumbnailUrl, previewUrl: thumbnailUrl ? PREVIEW_URL : null })
      }
    >
      Publish preview
    </Button>
  )
}

function renderPanel(thumbnailUrl: string | null = THUMBNAIL_URL) {
  render(
    <ChakraProvider value={system}>
      <SessionWizardPreviewProvider>
        <PublishingStep thumbnailUrl={thumbnailUrl} />
        <SessionWizardPreviewPanel />
      </SessionWizardPreviewProvider>
    </ChakraProvider>,
  )
}

describe("SessionWizardPreviewPanel", () => {
  /**
   * The column carries a heading that promises a preview. Left drawing nothing it reads as a screen that failed to
   * load, so a step with nothing to picture has to say so instead.
   */
  it("says there is nothing to preview before a step publishes one", () => {
    renderPanel()

    expect(screen.getByText("Nothing to preview yet")).toBeInTheDocument()
  })

  /**
   * The panel exists so an organizer can check the session points at the room they meant. A layout a step published
   * has to appear there, at the panel's own size rather than the row-sized thumbnail that is too small to read.
   */
  it("draws the layout a step publishes", async () => {
    renderPanel()

    await userEvent.click(screen.getByRole("button", { name: "Publish preview" }))

    const preview = await screen.findByAltText(`Seating layout preview for ${LAYOUT_NAME}`)
    expect(preview).toHaveAttribute("src", THUMBNAIL_URL)
    expect(screen.getByText(`${LAYOUT_NAME}, as it is published on Seats.io.`)).toBeInTheDocument()
  })

  /**
   * Seats.io renders a picture only once a chart is published. An empty frame reads as a broken image, so the panel
   * names the gap rather than leaving the organizer to guess why the room never appeared.
   */
  it("names an unpublished layout instead of showing an empty frame", async () => {
    renderPanel(null)

    await userEvent.click(screen.getByRole("button", { name: "Publish preview" }))

    expect(await screen.findByText("Not published yet")).toBeInTheDocument()
    expect(screen.queryByAltText(`Seating layout preview for ${LAYOUT_NAME}`)).not.toBeInTheDocument()
  })
})
