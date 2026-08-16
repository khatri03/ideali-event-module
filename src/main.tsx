import { StrictMode, type MouseEvent } from "react"
import { createRoot } from "react-dom/client"
import { Box, ChakraProvider, Flex, Text, Toaster } from "@chakra-ui/react"
import { QueryClientProvider } from "@tanstack/react-query"
import { system } from "./theme"
import { queryClient } from "./lib/queryClient"
import { toaster } from "./lib/toaster"
import { openNotificationBell } from "./features/member-alerts"
import "./index.css"
import "timepicker-ui/main.css"
import App from "./App"

// Chakra hands the renderer an open string, so an unrecognised type falls back to the neutral tone
// rather than rendering an untinted box. "info" keeps the amber the alert bell has always used.
const TOAST_TONES = {
  success: { bg: "green.50", color: "green.900", border: "green.200", glyph: "✓" },
  error: { bg: "red.50", color: "red.900", border: "red.200", glyph: "!" },
  warning: { bg: "orange.50", color: "orange.950", border: "orange.200", glyph: "!" },
  info: { bg: "orange.50", color: "orange.950", border: "orange.200", glyph: "!" },
  neutral: { bg: "gray.50", color: "gray.900", border: "gray.200", glyph: "i" },
} as const

function toneFor(type: string | undefined) {
  return TOAST_TONES[type as keyof typeof TOAST_TONES] ?? TOAST_TONES.neutral
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={system}>
        <Toaster toaster={toaster}>
          {(toast) => {
            const opensBell = toast.meta?.onClick === "open-bell"
            const tone = toneFor(toast.type)
            return (
            <Box
              key={toast.id}
              role="status"
              aria-live="polite"
              bg={tone.bg}
              color={tone.color}
              border="1px solid"
              borderColor={tone.border}
              borderRadius="16px"
              boxShadow="0 18px 40px rgba(15, 23, 42, 0.15)"
              px={4}
              py={3}
              w="sm"
              cursor={opensBell ? "pointer" : undefined}
              transition="opacity 0.15s"
              _hover={opensBell ? { opacity: 0.9 } : undefined}
              onClick={opensBell ? () => { openNotificationBell(); toaster.dismiss(toast.id) } : undefined}
            >
              <Flex align="flex-start" gap={3}>
                <Box mt={1} fontSize="lg" lineHeight={1} aria-hidden="true">
                  {tone.glyph}
                </Box>
                <Box minW={0} flex="1">
                  <Text fontSize="sm" fontWeight="800" lineHeight={1.25}>
                    {toast.title}
                  </Text>
                  {toast.description ? (
                    <Text fontSize="sm" mt={1} opacity={0.9} lineHeight={1.4}>
                      {toast.description}
                    </Text>
                  ) : null}
                </Box>
                <Box
                  as="button"
                  aria-label="Dismiss notification"
                  onClick={(event: MouseEvent) => { event.stopPropagation(); toaster.dismiss(toast.id) }}
                  cursor="pointer"
                  color="currentColor"
                  fontSize="lg"
                  lineHeight={1}
                  px={1}
                >
                  ×
                </Box>
              </Flex>
            </Box>
            )
          }}
        </Toaster>
        <App />
      </ChakraProvider>
    </QueryClientProvider>
  </StrictMode>
)
