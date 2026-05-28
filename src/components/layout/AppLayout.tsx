import { Box, Flex } from "@chakra-ui/react"
import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"

export function AppLayout() {
  return (
    <Flex h="100vh" overflow="hidden" bg="app.bg">
      <Sidebar />
      <Flex flex={1} direction="column" overflow="hidden">
        <TopBar />
        <Box
          flex={1}
          overflowY="auto"
          p={6}
        >
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  )
}
