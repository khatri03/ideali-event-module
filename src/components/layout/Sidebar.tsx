import { useState } from "react"
import type { ReactNode } from "react"
import { Box, Flex, Text, VStack } from "@chakra-ui/react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  CalendarRange,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  Zap,
  LayoutGrid,
  MapPin,
  ListChecks,
  ShieldCheck,
  Megaphone,
  Users,
  FolderOpen,
  Receipt,
} from "lucide-react"
import { logoutUser } from "@/api/auth"
import { auth } from "@/lib/auth"
import { queryClient } from "@/lib/queryClient"
import { APP_ROUTES } from "@/utils/routes"
import type { AuthUser } from "@/types"

const SIDEBAR_W = "260px"
const GRADIENT = "linear-gradient(160deg, #7551FF 0%, #5A3FCC 45%, #422AFB 100%)"

interface NavItem {
  label: string
  icon: ReactNode
  path: string
  roles: string[]
  /** Base path used for the active check when the section has child routes (create/edit). Defaults to `path`. */
  matchPath?: string
  badge?: string
}

interface SidebarProps {
  currentUser: AuthUser
  variant?: "desktop" | "mobile"
  onNavigate?: () => void
}

const mainNav: NavItem[] = [
  {
    label: "Dashboard",
    icon: <LayoutDashboard size={17} />,
    path: APP_ROUTES.dashboard,
    roles: ["Organizer", "Admin"],
  },
  { label: "Events", icon: <Zap size={17} />, path: APP_ROUTES.events, badge: "12", roles: ["Organizer", "Admin"] },
  { label: "Sessions", icon: <CalendarRange size={17} />, path: APP_ROUTES.sessionWizard.list, roles: ["Organizer", "Admin"] },
  {
    label: "Event Invoices",
    icon: <Receipt size={17} />,
    path: APP_ROUTES.eventInvoices.list,
    roles: ["Organizer", "Admin"],
  },
]

const managementNav: NavItem[] = [
  { label: "Seating Layouts", icon: <LayoutGrid size={17} />, path: APP_ROUTES.seatingLayouts.list, roles: ["Organizer", "Admin"] },
  { label: "Venues", icon: <MapPin size={17} />, path: APP_ROUTES.venues.list, roles: ["Organizer", "Admin"] },
  {
    label: "Custom Lists",
    icon: <ListChecks size={17} />,
    path: APP_ROUTES.customLists.list,
    matchPath: APP_ROUTES.customLists.base,
    roles: ["Organizer", "Admin"],
  },
  {
    label: "Member Alerts",
    icon: <Megaphone size={17} />,
    path: APP_ROUTES.memberAlerts.list,
    matchPath: APP_ROUTES.memberAlerts.base,
    roles: ["Organizer", "Admin"],
  },
  {
    label: "Documents",
    icon: <FolderOpen size={17} />,
    path: APP_ROUTES.documentCategories.list,
    matchPath: APP_ROUTES.documentCategories.base,
    roles: ["Organizer", "Admin"],
  },
]

function hasAnyRole(roles: string[], allowedRoles: string[]) {
  return allowedRoles.some((allowedRole) => roles.some((role) => role.toLowerCase() === allowedRole.toLowerCase()))
}

function NavSection({
  items,
  currentRoles,
  onNavigate,
}: {
  items: NavItem[]
  currentRoles: string[]
  onNavigate?: () => void
}) {
  const { pathname } = useLocation()
  const visibleItems = items.filter((item) => hasAnyRole(currentRoles, item.roles))

  if (visibleItems.length === 0) {
    return null
  }

  return (
    <VStack gap={0.5} align="stretch" mb={6}>
      {visibleItems.map((item) => {
        const matchPath = item.matchPath ?? item.path
        const isActive = pathname === matchPath || pathname.startsWith(`${matchPath}/`)
        return (
          <NavLink key={item.path} to={item.path} style={{ textDecoration: "none" }} onClick={onNavigate}>
            <Flex
              align="center"
              gap={3}
              px={3}
              py={2.5}
              borderRadius="12px"
              mx={2}
              transition="all 0.18s ease"
              bg={isActive ? "rgba(255,255,255,0.92)" : "transparent"}
              cursor="pointer"
              _hover={
                !isActive
                  ? { bg: "rgba(255,255,255,0.12)", transform: "translateX(2px)" }
                  : {}
              }
              boxShadow={isActive ? "0 4px 16px rgba(0,0,0,0.15)" : "none"}
            >
              <Box
                color={isActive ? "#7551FF" : "rgba(255,255,255,0.7)"}
                transition="color 0.18s"
                display="flex"
                alignItems="center"
              >
                {item.icon}
              </Box>
              <Text
                fontSize="sm"
                fontWeight={isActive ? "700" : "500"}
                color={isActive ? "#422AFB" : "rgba(255,255,255,0.85)"}
                transition="color 0.18s"
                flex={1}
                letterSpacing={isActive ? "-0.01em" : "0"}
              >
                {item.label}
              </Text>
              {item.badge && (
                <Flex
                  align="center"
                  justify="center"
                  borderRadius="full"
                  px={1.5}
                  h="18px"
                  minW="18px"
                  fontSize="10px"
                  fontWeight="800"
                  bg={isActive ? "#7551FF" : "rgba(255,255,255,0.2)"}
                  color={isActive ? "white" : "rgba(255,255,255,0.9)"}
                  transition="all 0.18s"
                >
                  {item.badge}
                </Flex>
              )}
            </Flex>
          </NavLink>
        )
      })}
    </VStack>
  )
}

function SettingsSection({
  isOpen,
  pathname,
  onToggle,
  onNavigate,
  isVisible,
}: {
  isOpen: boolean
  pathname: string
  onToggle: () => void
  onNavigate?: () => void
  isVisible: boolean
}) {
  if (!isVisible) {
    return null
  }

  const isSettingsActive = pathname === APP_ROUTES.settings
  const isChargeRulesActive = pathname === APP_ROUTES.chargeRules.list

  return (
    <Box mb={6}>
      <Flex
        as="button"
        align="center"
        gap={3}
        px={3}
        py={2.5}
        borderRadius="12px"
        mx={2}
        transition="all 0.18s ease"
        bg="transparent"
        boxShadow="none"
        _hover={{ bg: "rgba(255,255,255,0.12)", transform: "translateX(2px)" }}
        onClick={onToggle}
        cursor="pointer"
      >
        <Box color="rgba(255,255,255,0.7)" transition="color 0.18s" display="flex" alignItems="center">
          <Settings size={17} />
        </Box>
        <Text
          fontSize="sm"
          fontWeight="500"
          color="rgba(255,255,255,0.85)"
          transition="color 0.18s"
          flex={1}
          letterSpacing="0"
          textAlign="left"
        >
          Settings
        </Text>
        <Box color="rgba(255,255,255,0.7)" display="flex" alignItems="center" ml="auto">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </Box>
      </Flex>

      {isOpen ? (
        <VStack gap={0.5} align="stretch" mt={1.5}>
          <NavLink to={APP_ROUTES.settings} style={{ textDecoration: "none" }} onClick={onNavigate}>
            <Flex
              align="center"
              gap={3}
              pl={10}
              pr={3}
              py={2.5}
              borderRadius="12px"
              mx={2}
              transition="all 0.18s ease"
              bg={isSettingsActive ? "rgba(255,255,255,0.92)" : "transparent"}
              cursor="pointer"
              _hover={isSettingsActive ? {} : { bg: "rgba(255,255,255,0.12)", transform: "translateX(2px)" }}
              boxShadow={isSettingsActive ? "0 4px 16px rgba(0,0,0,0.15)" : "none"}
            >
              <Box
                w="6px"
                h="6px"
                borderRadius="full"
                bg={isSettingsActive ? "#7551FF" : "rgba(255,255,255,0.6)"}
                flexShrink={0}
              />
              <Text
                fontSize="sm"
                fontWeight={isSettingsActive ? "700" : "500"}
                color={isSettingsActive ? "#422AFB" : "rgba(255,255,255,0.85)"}
                transition="color 0.18s"
                flex={1}
                letterSpacing={isSettingsActive ? "-0.01em" : "0"}
              >
                Processor Fees
              </Text>
            </Flex>
          </NavLink>

          <NavLink to={APP_ROUTES.chargeRules.list} style={{ textDecoration: "none" }} onClick={onNavigate}>
            <Flex
              align="center"
              gap={3}
              pl={10}
              pr={3}
              py={2.5}
              borderRadius="12px"
              mx={2}
              transition="all 0.18s ease"
              bg={isChargeRulesActive ? "rgba(255,255,255,0.92)" : "transparent"}
              cursor="pointer"
              _hover={isChargeRulesActive ? {} : { bg: "rgba(255,255,255,0.12)", transform: "translateX(2px)" }}
              boxShadow={isChargeRulesActive ? "0 4px 16px rgba(0,0,0,0.15)" : "none"}
            >
              <Box
                w="6px"
                h="6px"
                borderRadius="full"
                bg={isChargeRulesActive ? "#7551FF" : "rgba(255,255,255,0.6)"}
                flexShrink={0}
              />
              <Text
                fontSize="sm"
                fontWeight={isChargeRulesActive ? "700" : "500"}
                color={isChargeRulesActive ? "#422AFB" : "rgba(255,255,255,0.85)"}
                transition="color 0.18s"
                flex={1}
                letterSpacing={isChargeRulesActive ? "-0.01em" : "0"}
              >
                Charge Rules
              </Text>
            </Flex>
          </NavLink>
        </VStack>
      ) : null}
    </Box>
  )
}

function AdminSection({
  isOpen,
  pathname,
  onToggle,
  onNavigate,
  isVisible,
}: {
  isOpen: boolean
  pathname: string
  onToggle: () => void
  onNavigate?: () => void
  isVisible: boolean
}) {
  if (!isVisible) {
    return null
  }

  return (
    <Box mb={6}>
      <Flex
        as="button"
        align="center"
        gap={3}
        px={3}
        py={2.5}
        borderRadius="12px"
        mx={2}
        transition="all 0.18s ease"
        bg="transparent"
        boxShadow="none"
        _hover={{ bg: "rgba(255,255,255,0.12)", transform: "translateX(2px)" }}
        onClick={onToggle}
        cursor="pointer"
      >
        <Box color="rgba(255,255,255,0.7)" transition="color 0.18s" display="flex" alignItems="center">
          <ShieldCheck size={17} />
        </Box>
        <Text
          fontSize="sm"
          fontWeight="500"
          color="rgba(255,255,255,0.85)"
          transition="color 0.18s"
          flex={1}
          letterSpacing="0"
          textAlign="left"
        >
          Admin
        </Text>
        <Box color="rgba(255,255,255,0.7)" display="flex" alignItems="center" ml="auto">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </Box>
      </Flex>

      {isOpen ? (
        <VStack gap={0.5} align="stretch" mt={1.5}>
          <NavLink to={APP_ROUTES.adminRevenuePlans} style={{ textDecoration: "none" }} onClick={onNavigate}>
            <Flex
              align="center"
              gap={3}
              pl={10}
              pr={3}
              py={2.5}
              borderRadius="12px"
              mx={2}
              transition="all 0.18s ease"
              bg={pathname === APP_ROUTES.adminRevenuePlans ? "rgba(255,255,255,0.92)" : "transparent"}
              cursor="pointer"
              _hover={pathname !== APP_ROUTES.adminRevenuePlans ? { bg: "rgba(255,255,255,0.12)", transform: "translateX(2px)" } : {}}
              boxShadow={pathname === APP_ROUTES.adminRevenuePlans ? "0 4px 16px rgba(0,0,0,0.15)" : "none"}
            >
              <Box
                w="6px"
                h="6px"
                borderRadius="full"
                bg={pathname === APP_ROUTES.adminRevenuePlans ? "#7551FF" : "rgba(255,255,255,0.6)"}
                flexShrink={0}
              />
              <Text
                fontSize="sm"
                fontWeight={pathname === APP_ROUTES.adminRevenuePlans ? "700" : "500"}
                color={pathname === APP_ROUTES.adminRevenuePlans ? "#422AFB" : "rgba(255,255,255,0.85)"}
                transition="color 0.18s"
                flex={1}
                letterSpacing={pathname === APP_ROUTES.adminRevenuePlans ? "-0.01em" : "0"}
              >
                Revenue Plans
              </Text>
            </Flex>
          </NavLink>

          <NavLink to={APP_ROUTES.adminRateLimit} style={{ textDecoration: "none" }} onClick={onNavigate}>
            <Flex
              align="center"
              gap={3}
              pl={10}
              pr={3}
              py={2.5}
              borderRadius="12px"
              mx={2}
              transition="all 0.18s ease"
              bg={pathname === APP_ROUTES.adminRateLimit ? "rgba(255,255,255,0.92)" : "transparent"}
              cursor="pointer"
              _hover={pathname !== APP_ROUTES.adminRateLimit ? { bg: "rgba(255,255,255,0.12)", transform: "translateX(2px)" } : {}}
              boxShadow={pathname === APP_ROUTES.adminRateLimit ? "0 4px 16px rgba(0,0,0,0.15)" : "none"}
            >
              <Box
                w="6px"
                h="6px"
                borderRadius="full"
                bg={pathname === APP_ROUTES.adminRateLimit ? "#7551FF" : "rgba(255,255,255,0.6)"}
                flexShrink={0}
              />
              <Text
                fontSize="sm"
                fontWeight={pathname === APP_ROUTES.adminRateLimit ? "700" : "500"}
                color={pathname === APP_ROUTES.adminRateLimit ? "#422AFB" : "rgba(255,255,255,0.85)"}
                transition="color 0.18s"
                flex={1}
                letterSpacing={pathname === APP_ROUTES.adminRateLimit ? "-0.01em" : "0"}
              >
                Rate Limit Settings
              </Text>
            </Flex>
          </NavLink>
        </VStack>
      ) : null}
    </Box>
  )
}

function MemberSection({
  isOpen,
  pathname,
  onToggle,
  onNavigate,
  isVisible,
}: {
  isOpen: boolean
  pathname: string
  onToggle: () => void
  onNavigate?: () => void
  isVisible: boolean
}) {
  if (!isVisible) {
    return null
  }

  const memberLinks = [
    { label: "Dashboard", path: APP_ROUTES.member.dashboard },
    { label: "Documents", path: APP_ROUTES.memberDocuments.list },
  ]

  return (
    <Box mb={6}>
      <Flex
        as="button"
        align="center"
        gap={3}
        px={3}
        py={2.5}
        borderRadius="12px"
        mx={2}
        transition="all 0.18s ease"
        bg="transparent"
        boxShadow="none"
        _hover={{ bg: "rgba(255,255,255,0.12)", transform: "translateX(2px)" }}
        onClick={onToggle}
        cursor="pointer"
      >
        <Box color="rgba(255,255,255,0.7)" transition="color 0.18s" display="flex" alignItems="center">
          <Users size={17} />
        </Box>
        <Text
          fontSize="sm"
          fontWeight="500"
          color="rgba(255,255,255,0.85)"
          transition="color 0.18s"
          flex={1}
          letterSpacing="0"
          textAlign="left"
        >
          Member
        </Text>
        <Box color="rgba(255,255,255,0.7)" display="flex" alignItems="center" ml="auto">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </Box>
      </Flex>

      {isOpen ? (
        <VStack gap={0.5} align="stretch" mt={1.5}>
          {memberLinks.map((link) => {
            const isActive = pathname === link.path || pathname.startsWith(`${link.path}/`)

            return (
              <NavLink key={link.path} to={link.path} style={{ textDecoration: "none" }} onClick={onNavigate}>
                <Flex
                  align="center"
                  gap={3}
                  pl={10}
                  pr={3}
                  py={2.5}
                  borderRadius="12px"
                  mx={2}
                  transition="all 0.18s ease"
                  bg={isActive ? "rgba(255,255,255,0.92)" : "transparent"}
                  cursor="pointer"
                  _hover={isActive ? {} : { bg: "rgba(255,255,255,0.12)", transform: "translateX(2px)" }}
                  boxShadow={isActive ? "0 4px 16px rgba(0,0,0,0.15)" : "none"}
                >
                  <Box
                    w="6px"
                    h="6px"
                    borderRadius="full"
                    bg={isActive ? "#7551FF" : "rgba(255,255,255,0.6)"}
                    flexShrink={0}
                  />
                  <Text
                    fontSize="sm"
                    fontWeight={isActive ? "700" : "500"}
                    color={isActive ? "#422AFB" : "rgba(255,255,255,0.85)"}
                    transition="color 0.18s"
                    flex={1}
                    letterSpacing={isActive ? "-0.01em" : "0"}
                  >
                    {link.label}
                  </Text>
                </Flex>
              </NavLink>
            )
          })}
        </VStack>
      ) : null}
    </Box>
  )
}

export function Sidebar({ currentUser, variant = "desktop", onNavigate }: SidebarProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isMobile = variant === "mobile"
  const [isSettingsManualOpen, setIsSettingsManualOpen] = useState(false)
  const [isAdminManualOpen, setIsAdminManualOpen] = useState(false)
  const [isMemberManualOpen, setIsMemberManualOpen] = useState(false)
  const hasOrganizerAccess = hasAnyRole(currentUser.roles, ["Organizer", "Admin"])
  const isAdmin = hasAnyRole(currentUser.roles, ["Admin"])
  const isMember = hasAnyRole(currentUser.roles, ["Member"])
  const isSettingsRouteActive = pathname === APP_ROUTES.settings
  const isChargeRulesRouteActive = pathname === APP_ROUTES.chargeRules.list
  const isSettingsOpen = isSettingsManualOpen || isSettingsRouteActive || isChargeRulesRouteActive
  const isAdminRouteActive =
    pathname === APP_ROUTES.adminRevenuePlans || pathname === APP_ROUTES.adminRateLimit
  const isAdminOpen = isAdminManualOpen || isAdminRouteActive
  const isMemberRouteActive = [APP_ROUTES.member.dashboard, APP_ROUTES.memberDocuments.base].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
  const isMemberOpen = isMemberManualOpen || isMemberRouteActive

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
    <Box
      w={isMobile ? "full" : SIDEBAR_W}
      minW={isMobile ? "full" : SIDEBAR_W}
      h={isMobile ? "full" : "100vh"}
      display="flex"
      flexDir="column"
      style={{ background: GRADIENT }}
      position={isMobile ? "relative" : "sticky"}
      top={isMobile ? undefined : 0}
      overflowY="auto"
      zIndex={10}
    >
      {/* Subtle bottom fade */}
      <Box
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        h="120px"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.15), transparent)" }}
        pointerEvents="none"
      />

      {/* Logo */}
      <Flex align="center" gap={2.5} px={5} py={6} mb={2} position="relative" zIndex={1}>
        <Flex
          w="38px"
          h="38px"
          borderRadius="11px"
          align="center"
          justify="center"
          bg="rgba(255,255,255,0.2)"
          boxShadow="0 2px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3)"
          flexShrink={0}
        >
          <Zap size={19} color="white" fill="white" />
        </Flex>
        <Box>
          <Text
            fontSize="lg"
            fontWeight="800"
            color="white"
            letterSpacing="-0.03em"
            lineHeight={1}
          >
            ideali<Text as="span" color="rgba(255,255,255,0.65)">events</Text>
          </Text>
          <Text
            fontSize="9px"
            color="rgba(255,255,255,0.45)"
            fontWeight="600"
            letterSpacing="0.1em"
            textTransform="uppercase"
            mt={0.5}
          >
            Enterprise Platform
          </Text>
        </Box>
      </Flex>

      {/* Divider */}
      <Box h="1px" bg="rgba(255,255,255,0.12)" mx={4} mb={5} />

      {/* Nav */}
      <Box flex={1} px={2} position="relative" zIndex={1}>
        <NavSection items={mainNav} currentRoles={currentUser.roles} onNavigate={onNavigate} />
        <NavSection items={managementNav} currentRoles={currentUser.roles} onNavigate={onNavigate} />
        <SettingsSection
          pathname={pathname}
          isOpen={isSettingsOpen}
          onToggle={() => setIsSettingsManualOpen((current) => !current)}
          onNavigate={onNavigate}
          isVisible={hasOrganizerAccess}
        />
        {isAdmin ? (
          <AdminSection
            pathname={pathname}
            isOpen={isAdminOpen}
            onToggle={() => setIsAdminManualOpen((current) => !current)}
            onNavigate={onNavigate}
            isVisible={isAdmin}
          />
        ) : null}
        {isMember ? (
          <MemberSection
            pathname={pathname}
            isOpen={isMemberOpen}
            onToggle={() => setIsMemberManualOpen((current) => !current)}
            onNavigate={onNavigate}
            isVisible={isMember}
          />
        ) : null}
      </Box>

      {/* User Profile */}
      <Box p={4} position="relative" zIndex={1}>
        <Box h="1px" bg="rgba(255,255,255,0.12)" mb={4} />
        <Flex
          align="center"
          gap={3}
          p={3}
          borderRadius="14px"
          bg="rgba(0,0,0,0.15)"
          border="1px solid rgba(255,255,255,0.1)"
          backdropFilter="blur(8px)"
        >
          <Flex
            w="36px"
            h="36px"
            borderRadius="10px"
            align="center"
            justify="center"
            bg="rgba(255,255,255,0.2)"
            boxShadow="inset 0 1px 0 rgba(255,255,255,0.3)"
            flexShrink={0}
          >
            <Text fontSize="sm" fontWeight="800" color="white">
              {currentUser.name.split(" ").map((n) => n[0]).join("")}
            </Text>
          </Flex>
          <Box flex={1} overflow="hidden">
            <Text fontSize="sm" fontWeight="700" color="white" lineClamp={1}>
              {currentUser.name}
            </Text>
            <Text fontSize="xs" color="rgba(255,255,255,0.5)" lineClamp={1}>
              {currentUser.role}
            </Text>
          </Box>
          <Box
            as="button"
            cursor="pointer"
            color="rgba(255,255,255,0.4)"
            _hover={{ color: "rgba(255,100,100,0.9)" }}
            transition="color 0.15s"
            p={1}
            borderRadius="6px"
            aria-label="Sign out"
            onClick={async () => {
              await handleSignOut()
              onNavigate?.()
            }}
          >
            <LogOut size={15} />
          </Box>
        </Flex>
      </Box>
    </Box>
  )
}
