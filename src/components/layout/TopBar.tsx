import { Box, Flex, Text, Input, InputGroup, IconButton, Badge } from "@chakra-ui/react"
import { Search, Bell, Settings } from "lucide-react"
import { useLocation } from "react-router-dom"
import { ColorModeToggle } from "../common/ColorModeToggle"
import { mockUser } from "../../data/mock"

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Welcome back, " + mockUser.name.split(" ")[0] + "!" },
  "/events": { title: "Events", subtitle: "Manage and track all your events" },
  "/calendar": { title: "Calendar", subtitle: "Your event schedule at a glance" },
  "/settings": { title: "Settings", subtitle: "Configure your workspace" },
  "/team": { title: "Team", subtitle: "Manage your team members" },
  "/analytics": { title: "Analytics", subtitle: "Insights and performance metrics" },
  "/help": { title: "Help Center", subtitle: "Documentation and support" },
}

export function TopBar() {
  const { pathname } = useLocation()
  const pageInfo = PAGE_TITLES[pathname] ?? { title: "Ideali Events", subtitle: "" }

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

        {/* Avatar */}
        <Flex
          w="34px"
          h="34px"
          borderRadius="10px"
          align="center"
          justify="center"
          style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
          cursor="pointer"
          flexShrink={0}
        >
          <Text fontSize="xs" fontWeight="800" color="white">
            {mockUser.name.split(" ").map((n) => n[0]).join("")}
          </Text>
        </Flex>
      </Flex>
    </Flex>
  )
}
