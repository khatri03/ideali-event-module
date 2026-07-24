import { Box, Drawer, Flex, Skeleton, SkeletonText, Portal } from "@chakra-ui/react"
import { useState } from "react"
import { Navigate, Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"
import { useAuthSession } from "@/hooks/useAuthSession"
import { auth, sessionDataToUser } from "@/lib/auth"
import { APP_ROUTES } from "@/utils/routes"
import { useAlertRealtime, usePendingInstantToasts } from "@/features/member-alerts"

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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const sessionQuery = useAuthSession()
  const currentUser = auth.getUser() ?? (sessionQuery.data ? sessionDataToUser(sessionQuery.data) : null)

  // Reactive so the hub connects and the catch-up claim runs the moment the async session resolves —
  // not just when auth already happens to be set at mount (e.g. a hard refresh).
  const isAuthenticated = Boolean(currentUser)
  // Opens the alert hub once the user is signed in; no-op until then.
  useAlertRealtime(isAuthenticated)
  // Catches up on instant alerts missed while offline with one summary toast.
  usePendingInstantToasts(isAuthenticated)

  if (sessionQuery.isLoading && !currentUser) {
    return <AppLayoutSkeleton />
  }

  if (!currentUser) {
    return <Navigate to={APP_ROUTES.auth.login} replace />
  }

  return (
    <Flex minH="100dvh" overflow="hidden" bg="app.bg">
      <Box display={{ base: "none", lg: "block" }}>
        <Sidebar currentUser={currentUser} />
      </Box>
      <Flex flex={1} direction="column" overflow="hidden" minW={0}>
        <TopBar onOpenMobileNav={() => setIsMobileNavOpen(true)} />
        <Box flex={1} overflowY="auto" p={{ base: 4, md: 6 }} minW={0}>
          <Outlet />
        </Box>
      </Flex>

      <Drawer.Root
        open={isMobileNavOpen}
        onOpenChange={(details) => setIsMobileNavOpen(details.open)}
        placement="start"
        size="full"
      >
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content p={0} border="none" bg="transparent" maxW="full">
              <Sidebar currentUser={currentUser} variant="mobile" onNavigate={() => setIsMobileNavOpen(false)} />
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </Flex>
  )
}
