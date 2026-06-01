import { Box, Flex, Text, Input, InputGroup, IconButton, Badge, Menu, Portal } from "@chakra-ui/react"
import { Search, Bell, Settings, LogOut, User } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { ColorModeToggle } from "../common/ColorModeToggle"
import { auth } from "@/lib/auth"
import { logoutUser } from "@/api/auth"
import { queryClient } from "@/lib/queryClient"
import { mockUser } from "../../data/mock"
import { APP_ROUTES } from "@/utils/routes"

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  [APP_ROUTES.dashboard]: { title: "Dashboard", subtitle: "Welcome back!" },
  [APP_ROUTES.events]: { title: "Events", subtitle: "Manage and track all your events" },
  [APP_ROUTES.calendar]: { title: "Calendar", subtitle: "Your event schedule at a glance" },
  [APP_ROUTES.settings]: { title: "Settings", subtitle: "Configure your workspace" },
  [APP_ROUTES.team]: { title: "Team", subtitle: "Manage your team members" },
  [APP_ROUTES.analytics]: { title: "Analytics", subtitle: "Insights and performance metrics" },
  [APP_ROUTES.help]: { title: "Help Center", subtitle: "Documentation and support" },
}

export function TopBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const user = auth.getUser() ?? mockUser
  const pageInfo =
    pathname === APP_ROUTES.dashboard
      ? { title: "Dashboard", subtitle: `Welcome back, ${user.name.split(" ")[0]}!` }
      : PAGE_TITLES[pathname] ?? { title: "Ideali Events", subtitle: "" }

  async function handleSignOut() {
    try {
      await logoutUser()
    } finally {
      auth.clear()
      queryClient.removeQueries({ queryKey: ["auth"] })
      navigate(APP_ROUTES.auth.login, { replace: true })
    }
  }

  return (
    <Flex
      as="header"
      h="72px"
      px={6}
      align="center"
      justify="space-between"
      bg="topbar.bg"
      backdropFilter="blur(20px)"
      borderBottom="1px solid"
      borderColor="border.subtle"
      position="sticky"
      top={0}
      zIndex={9}
    >
      {/* Page title */}
      <Box>
        <Text fontSize="xl" fontWeight="800" color="text.primary" letterSpacing="-0.02em" lineHeight={1.1}>
          {pageInfo.title}
        </Text>
        {pageInfo.subtitle && (
          <Text fontSize="xs" color="text.secondary" fontWeight="500" mt={0.5}>
            {pageInfo.subtitle}
          </Text>
        )}
      </Box>

      {/* Search + Actions */}
      <Flex align="center" gap={2}>
        {/* Search */}
        <InputGroup
          startElement={<Search size={15} color="#718096" />}
          maxW="260px"
        >
          <Input
            placeholder="Search events..."
            size="sm"
            borderRadius="12px"
            borderColor="border.subtle"
            bg="card.bg"
            fontSize="sm"
            pl="2.5rem"
            _focus={{ borderColor: "brand.500", boxShadow: "0 0 0 1px #7551FF" }}
            _placeholder={{ color: "text.secondary" }}
          />
        </InputGroup>

        {/* Notifications */}
        <Box position="relative">
          <IconButton
            aria-label="Notifications"
            variant="ghost"
            size="sm"
            borderRadius="12px"
            color="gray.500"
            _hover={{ bg: "gray.100", _dark: { bg: "navy.700" }, color: "brand.500" }}
          >
            <Bell size={18} />
          </IconButton>
          <Badge
            position="absolute"
            top="4px"
            right="4px"
            w="8px"
            h="8px"
            p={0}
            borderRadius="full"
            bg="red.500"
            border="2px solid"
            borderColor="topbar.bg"
          />
        </Box>

        {/* Settings */}
        <IconButton
          aria-label="Settings"
          variant="ghost"
          size="sm"
          borderRadius="12px"
          color="gray.500"
          _hover={{ bg: "gray.100", _dark: { bg: "navy.700" }, color: "brand.500" }}
        >
          <Settings size={18} />
        </IconButton>

        {/* Color mode */}
        <ColorModeToggle />

        {/* User context menu */}
        <Menu.Root positioning={{ placement: "bottom-end" }}>
          <Menu.Trigger asChild>
            <Flex
              as="button"
              w="34px"
              h="34px"
              borderRadius="10px"
              align="center"
              justify="center"
              style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
              cursor="pointer"
              flexShrink={0}
              _hover={{ opacity: 0.88, transform: "scale(1.04)" }}
              transition="all 0.15s ease"
              aria-label="User menu"
            >
              <Text fontSize="xs" fontWeight="800" color="white">
                {user.name.split(" ").map((n) => n[0]).join("")}
              </Text>
            </Flex>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content
                minW="220px"
                borderRadius="16px"
                border="1px solid"
                borderColor="gray.200"
                boxShadow="0 16px 40px rgba(15, 23, 42, 0.12)"
                p={1.5}
                bg="white"
                _dark={{ bg: "navy.800", borderColor: "whiteAlpha.200" }}
              >
                {/* User info header */}
                <Box px={3} py={2.5} mb={1}>
                  <Text fontSize="sm" fontWeight="700" color="gray.900" _dark={{ color: "white" }} lineClamp={1}>
                    {user.name}
                  </Text>
                  <Text fontSize="xs" color="gray.500" lineClamp={1} mt={0.5}>
                    {user.email}
                  </Text>
                </Box>

                <Menu.Separator borderColor="gray.100" _dark={{ borderColor: "whiteAlpha.100" }} mx={1} />

                <Menu.Item
                  value="profile"
                  borderRadius="10px"
                  fontSize="sm"
                  fontWeight="500"
                  color="gray.700"
                  _dark={{ color: "gray.200" }}
                  _hover={{ bg: "gray.50", _dark: { bg: "whiteAlpha.100" } }}
                  px={3}
                  py={2}
                  mt={1}
                  gap={2.5}
                  onClick={() => navigate(APP_ROUTES.settings)}
                >
                  <User size={14} />
                  Profile &amp; Settings
                </Menu.Item>

                <Menu.Separator borderColor="gray.100" _dark={{ borderColor: "whiteAlpha.100" }} mx={1} my={1} />

                <Menu.Item
                  value="signout"
                  borderRadius="10px"
                  fontSize="sm"
                  fontWeight="600"
                  color="red.600"
                  _dark={{ color: "red.400" }}
                  _hover={{ bg: "red.50", _dark: { bg: "red.900" } }}
                  px={3}
                  py={2}
                  mb={0.5}
                  gap={2.5}
                  onClick={handleSignOut}
                >
                  <LogOut size={14} />
                  Sign out
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </Flex>
    </Flex>
  )
}
