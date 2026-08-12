import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { ErrorState } from "./ErrorState"

function renderState(props: Partial<Parameters<typeof ErrorState>[0]> = {}) {
  return render(
    <ChakraProvider value={system}>
      <ErrorState title="Could not load this invoice" message="The server did not respond." {...props} />
    </ChakraProvider>,
  )
}

describe("ErrorState", () => {
  it("AnyFailure_IsAnnouncedToAssistiveTechnology", () => {
    renderState()

    expect(screen.getByRole("alert")).toHaveTextContent("Could not load this invoice")
    expect(screen.getByRole("alert")).toHaveTextContent("The server did not respond.")
  })

  it("RetryOffered_CallsBackOnceWhenPressed", async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()
    renderState({ onRetry })

    await user.click(screen.getByRole("button", { name: /try again/i }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("RetryAlreadyRunning_DisablesTheButtonSoItCannotBeQueuedTwice", () => {
    renderState({ onRetry: vi.fn(), isRetrying: true })

    expect(screen.getByRole("button", { name: /retrying/i })).toBeDisabled()
  })

  it("NothingToRetry_OffersNoButtonAtAll", () => {
    renderState({ tone: "missing", title: "Invoice not found", message: "It is not there." })

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent("Invoice not found")
  })
})
