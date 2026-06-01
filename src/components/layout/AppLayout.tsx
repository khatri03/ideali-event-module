import { Box, Flex, Skeleton, SkeletonText } from "@chakra-ui/react"
import { Navigate, Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"
import { useAuthSession } from "@/hooks/useAuthSession"
import { auth, sessionDataToUser } from "@/lib/auth"
import { APP_ROUTES } from "@/utils/routes"

function AppLayoutSkeleton() {
  return (
    <Flex h="100vh" overflow="hidden" bg="app.bg">
      <Box w="260px" minW="260px" bg="gray.900" px={4} py={6}>
        <Skeleton height="40px" borderRadius="12px" mb={8} />
        <SkeletonText noOfLines={6} />
      </Box>
      <Flex flex={1} direction="column" overflow="hidden">
        <Flex h="72px" px={6} align="center" justify="space-between" borderBottom="1px solid" borderColor="border.subtle">
          <Box>
            <Skeleton height="24px" width="180px" mb={2} />
            <Skeleton height="14px" width="260px" />
          </Box>
          <Flex align="center" gap={3}>
            <Skeleton height="36px" width="220px" borderRadius="12px" />
            <Skeleton height="36px" width="36px" borderRadius="12px" />
            <Skeleton height="36px" width="36px" borderRadius="12px" />
            <Skeleton height="34px" width="34px" borderRadius="10px" />
          </Flex>
        </Flex>
        <Box flex={1} p={6}>
          <SkeletonText noOfLines={8} />
        </Box>
      </Flex>
    </Flex>
  )
}

export function AppLayout() {
  const sessionQuery = useAuthSession()
  const currentUser = auth.getUser() ?? (sessionQuery.data ? sessionDataToUser(sessionQuery.data) : null)

  if (sessionQuery.isLoading && !currentUser) {
    return <AppLayoutSkeleton />
  }

  if (!currentUser) {
    return <Navigate to={APP_ROUTES.auth.login} replace />
  }

  return (
    <Flex h="100vh" overflow="hidden" bg="app.bg">
      <Sidebar />
      <Flex flex={1} direction="column" overflow="hidden">
        <TopBar />
        <Box flex={1} overflowY="auto" p={6}>
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  )
}
