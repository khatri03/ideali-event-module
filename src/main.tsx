import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Box, ChakraProvider, Flex, Text, Toaster } from "@chakra-ui/react"
import { QueryClientProvider } from "@tanstack/react-query"
import { system } from "./theme"
import { queryClient } from "./lib/queryClient"
import { toaster } from "./lib/toaster"
import "./index.css"
import "timepicker-ui/main.css"
import App from "./App"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={system}>
        <Toaster toaster={toaster}>
          {(toast) => (
            <Box
              key={toast.id}
              role="status"
              aria-live="polite"
              bg={toast.type === "error" ? "red.50" : toast.type === "success" ? "green.50" : "gray.50"}
              color={toast.type === "error" ? "red.900" : toast.type === "success" ? "green.900" : "gray.900"}
              border="1px solid"
              borderColor={toast.type === "error" ? "red.200" : toast.type === "success" ? "green.200" : "gray.200"}
              borderRadius="16px"
              boxShadow="0 18px 40px rgba(15, 23, 42, 0.15)"
              px={4}
              py={3}
              w="sm"
            >
              <Flex align="flex-start" gap={3}>
                <Box mt={1} fontSize="lg" lineHeight={1} aria-hidden="true">
                  {toast.type === "error" ? "!" : toast.type === "success" ? "✓" : "i"}
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
                  type="button"
                  aria-label="Dismiss notification"
                  onClick={() => toaster.dismiss(toast.id)}
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
          )}
        </Toaster>
        <App />
      </ChakraProvider>
    </QueryClientProvider>
  </StrictMode>
)
