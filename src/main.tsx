import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClientProvider } from "@tanstack/react-query"
import { system } from "./theme"
import { queryClient } from "./lib/queryClient"
import "./index.css"
import "timepicker-ui/main.css"
import App from "./App"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={system}>
        <App />
      </ChakraProvider>
    </QueryClientProvider>
  </StrictMode>
)
