import { useCallback, useEffect, useRef, useState } from "react"
import { Box, Button, Stack, Text } from "@chakra-ui/react"
import { Camera, CameraOff } from "lucide-react"
import QrScanner from "qr-scanner"

const REPEAT_SCAN_WINDOW_MS = 3000

interface TicketScannerProps {
  /** Codes read while this is set are dropped, so the next guest's ticket is not read over the answer. */
  isPaused: boolean
  onScan: (ticketCode: string) => void
}

type ScannerState = "starting" | "scanning" | "unavailable"

/**
 * Live camera scanning, with an honest failure path. Cameras are refused, blocked by in-app browsers
 * and absent outside a secure context, so this component says which of those happened and leaves the
 * photo and typed-code routes standing rather than presenting an empty black box.
 */
export function TicketScanner({ isPaused, onScan }: TicketScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const lastScanRef = useRef<{ code: string; at: number } | null>(null)
  const isPausedRef = useRef(isPaused)
  // Held in a ref rather than a dependency: a parent that hands down a fresh callback each render must
  // not tear the camera down and restart it, which blanks the preview mid-queue.
  const onScanRef = useRef(onScan)
  // Outside a secure context navigator.mediaDevices does not exist at all, so this is known before
  // the first render rather than discovered by trying.
  const [state, setState] = useState<ScannerState>(() => (window.isSecureContext ? "starting" : "unavailable"))
  const [unavailableReason, setUnavailableReason] = useState(() =>
    window.isSecureContext ? "" : "The camera is only available over HTTPS. Use the ticket code or a photo instead.",
  )
  const [isDecodingPhoto, setIsDecodingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState("")

  const submitScan = useCallback((code: string) => {
    const ticketCode = code.trim()
    if (!ticketCode) {
      return
    }

    const previous = lastScanRef.current
    const now = Date.now()
    if (previous && previous.code === ticketCode && now - previous.at < REPEAT_SCAN_WINDOW_MS) {
      return
    }

    lastScanRef.current = { code: ticketCode, at: now }
    onScanRef.current(ticketCode)
  }, [])

  // The camera is left running while paused so the operator keeps seeing the live picture; it is the
  // decoded code that is dropped. Stopping the stream instead blanks the preview and costs a restart.
  const emitScan = useCallback(
    (code: string) => {
      if (isPausedRef.current) {
        return
      }

      submitScan(code)
    },
    [submitScan],
  )

  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !window.isSecureContext) {
      return
    }

    let scanner: QrScanner | null = null
    let isCancelled = false

    async function startCamera(videoElement: HTMLVideoElement) {
      try {
        if (!(await QrScanner.hasCamera())) {
          throw new Error("No camera was found on this device.")
        }

        const camera = new QrScanner(videoElement, (result) => emitScan(result.data), {
          preferredCamera: "environment",
          highlightScanRegion: true,
          maxScansPerSecond: 4,
        })
        scanner = camera
        await camera.start()
        // Unmounting during the start handshake runs the cleanup before this line, so the stream it
        // could not see yet is released here instead of being left on.
        if (isCancelled) {
          camera.destroy()
          return
        }

        setState("scanning")
      } catch (error) {
        if (isCancelled) {
          return
        }

        setState("unavailable")
        setUnavailableReason(
          error instanceof Error && error.message
            ? error.message
            : "The camera could not be opened. Use the ticket code or a photo instead.",
        )
      }
    }

    void startCamera(video)

    return () => {
      isCancelled = true
      scanner?.destroy()
    }
  }, [emitScan])

  async function handlePhoto(file: File | undefined) {
    if (!file) {
      return
    }

    setIsDecodingPhoto(true)
    setPhotoError("")

    try {
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true })
      submitScan(result.data)
    } catch {
      setPhotoError("No ticket code could be read from that photo. Try again or type the code.")
    } finally {
      setIsDecodingPhoto(false)
    }
  }

  return (
    <Stack gap={3}>
      <Box
        position="relative"
        w="100%"
        maxW="480px"
        mx="auto"
        aspectRatio="1"
        borderRadius="16px"
        overflow="hidden"
        bg="gray.900"
      >
        {/* iOS takes a playing video fullscreen without playsInline and muted, hiding the rest of the screen. */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          aria-label="Ticket scanner camera"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />

        {state !== "scanning" ? (
          <Stack
            position="absolute"
            inset={0}
            align="center"
            justify="center"
            gap={2}
            px={4}
            textAlign="center"
            bg="blackAlpha.700"
          >
            {state === "unavailable" ? <CameraOff size={28} color="white" /> : <Camera size={28} color="white" />}
            <Text fontSize="sm" color="white">
              {state === "unavailable" ? unavailableReason : "Opening the camera..."}
            </Text>
          </Stack>
        ) : null}

        {isPaused && state === "scanning" ? (
          <Stack position="absolute" inset={0} align="center" justify="center" bg="blackAlpha.400">
            <Box bg="blackAlpha.800" borderRadius="999px" px={3} py={1}>
              <Text fontSize="sm" fontWeight="600" color="white">
                Scanning paused
              </Text>
            </Box>
          </Stack>
        ) : null}
      </Box>

      <Stack gap={1}>
        <Button
          as="label"
          variant="outline"
          minH="11"
          px={6}
          borderRadius="14px"
          fontWeight="700"
          w={{ base: "full", md: "auto" }}
          alignSelf={{ md: "flex-start" }}
          cursor={isDecodingPhoto ? "not-allowed" : "pointer"}
          disabled={isDecodingPhoto}
          loading={isDecodingPhoto}
          loadingText="Reading photo..."
        >
          Scan from a photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            aria-label="Scan a ticket from a photo"
            onChange={(event) => {
              void handlePhoto(event.target.files?.[0])
              event.target.value = ""
            }}
          />
        </Button>

        {photoError ? (
          <Text fontSize="xs" color="red.600">
            {photoError}
          </Text>
        ) : null}
      </Stack>
    </Stack>
  )
}
