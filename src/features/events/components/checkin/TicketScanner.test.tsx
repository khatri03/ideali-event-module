import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, render, screen, waitFor } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { TicketScanner } from "./TicketScanner"

const cameraMock = vi.hoisted(() => {
  const readers: Array<(result: { data: string }) => void> = []
  const start = vi.fn(async () => {})
  const pause = vi.fn(async () => true)
  const stop = vi.fn()
  const destroy = vi.fn()

  class FakeQrScanner {
    static hasCamera = vi.fn(async () => true)
    static scanImage = vi.fn()

    start = start
    pause = pause
    stop = stop
    destroy = destroy

    constructor(_video: HTMLVideoElement, onDecode: (result: { data: string }) => void) {
      readers.push(onDecode)
    }
  }

  return { FakeQrScanner, readers, start, pause, stop, destroy }
})

vi.mock("qr-scanner", () => ({ default: cameraMock.FakeQrScanner }))

function renderScanner(isPaused: boolean) {
  const onScan = vi.fn()

  const view = render(
    <ChakraProvider value={system}>
      <TicketScanner isPaused={isPaused} onScan={onScan} />
    </ChakraProvider>,
  )

  const rerender = (nextIsPaused: boolean, nextOnScan: (ticketCode: string) => void = onScan) =>
    view.rerender(
      <ChakraProvider value={system}>
        <TicketScanner isPaused={nextIsPaused} onScan={nextOnScan} />
      </ChakraProvider>,
    )

  return { onScan, rerender, unmount: view.unmount }
}

async function readCode(code: string) {
  await waitFor(() => expect(cameraMock.readers).toHaveLength(1))

  act(() => {
    cameraMock.readers[0]({ data: code })
  })
}

describe("TicketScanner", () => {
  beforeEach(() => {
    Object.defineProperty(window, "isSecureContext", { value: true, configurable: true })
    cameraMock.readers.length = 0
    vi.clearAllMocks()
  })

  it("ReadsATicketCodeOffTheCamera", async () => {
    const { onScan } = renderScanner(false)

    await readCode("TKT-1")

    expect(onScan).toHaveBeenCalledWith("TKT-1")
  })

  /** Tearing down the stream to pause leaves the operator staring at a black box and costs a restart. */
  it("LeavesTheCameraStreamRunningWhilePaused", async () => {
    renderScanner(true)

    await waitFor(() => expect(cameraMock.start).toHaveBeenCalledTimes(1))
    expect(cameraMock.pause).not.toHaveBeenCalled()
    expect(cameraMock.stop).not.toHaveBeenCalled()
    expect(await screen.findByText("Scanning paused")).toBeInTheDocument()
  })

  it("DropsCodesReadWhilePausedSoAnAnswerIsNotScannedOver", async () => {
    const { onScan } = renderScanner(true)

    await readCode("TKT-1")

    expect(onScan).not.toHaveBeenCalled()
  })

  /**
   * The desk rebuilds its scan handler while a check-in is in flight. Restarting the stream for that
   * left the operator looking at a blank box after every scan.
   */
  it("KeepsTheCameraRunningWhenTheDeskHandsDownAFreshScanHandler", async () => {
    const { rerender } = renderScanner(false)
    await waitFor(() => expect(cameraMock.start).toHaveBeenCalledTimes(1))

    const laterScan = vi.fn()
    rerender(false, laterScan)

    expect(cameraMock.start).toHaveBeenCalledTimes(1)
    expect(cameraMock.destroy).not.toHaveBeenCalled()

    await readCode("TKT-9")
    expect(laterScan).toHaveBeenCalledWith("TKT-9")
  })

  it("ReleasesTheCameraOnceTheDoorScreenIsLeft", async () => {
    const { unmount } = renderScanner(false)
    await waitFor(() => expect(cameraMock.start).toHaveBeenCalledTimes(1))

    unmount()

    expect(cameraMock.destroy).toHaveBeenCalledTimes(1)
  })

  it("ReadsTheNextTicketAsSoonAsScanningResumes", async () => {
    const { onScan, rerender } = renderScanner(true)

    await readCode("TKT-1")
    rerender(false)
    await readCode("TKT-2")

    expect(onScan).toHaveBeenCalledTimes(1)
    expect(onScan).toHaveBeenCalledWith("TKT-2")
  })
})
