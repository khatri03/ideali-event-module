import { describe, expect, it } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { OrganizerByline } from "@/features/events/components/registration/OrganizerByline"

function renderByline(logoUrl: string | null) {
  render(
    <ChakraProvider value={system}>
      <OrganizerByline organizer="Northside Arts" logoUrl={logoUrl} />
    </ChakraProvider>,
  )
}

describe("OrganizerByline", () => {
  /**
   * The registration page presents the event under the organizer's own brand, so an uploaded logo
   * has to render beside the name - the name alone leaves a buyer unsure whose event this is.
   */
  it("ShowsTheOrganizerLogoBesideTheName", () => {
    renderByline("https://api.example.com/api/images/logo.png")

    expect(screen.getByRole("img", { name: "Northside Arts logo" })).toHaveAttribute(
      "src",
      "https://api.example.com/api/images/logo.png",
    )
    expect(screen.getByText("Northside Arts")).toBeInTheDocument()
  })

  /**
   * An organizer without a logo is a normal case; the header must read as a clean "By: name" line,
   * not carry an empty image slot.
   */
  it("ShowsTheNameAloneWhenTheOrganizerHasNoLogo", () => {
    renderByline(null)

    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(screen.getByText("Northside Arts")).toBeInTheDocument()
  })

  /**
   * A logo address that no longer resolves must not leave a broken-image icon in the header; the
   * name stays and the image drops out.
   */
  it("DropsTheLogoWhenTheImageFailsToLoad", () => {
    renderByline("https://api.example.com/api/images/missing.png")

    fireEvent.error(screen.getByRole("img", { name: "Northside Arts logo" }))

    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(screen.getByText("Northside Arts")).toBeInTheDocument()
  })
})
