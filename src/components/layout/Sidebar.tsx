import { useState } from "react"
import { Box, Flex, Text, VStack } from "@chakra-ui/react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  CalendarDays,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  Zap,
  Users,
  BarChart3,
  HelpCircle,
  LayoutGrid,
} from "lucide-react"
import { mockUser } from "../../data/mock"
import { logoutUser } from "@/api/auth"
import { auth } from "@/lib/auth"
import { queryClient } from "@/lib/queryClient"
import { APP_ROUTES } from "@/utils/routes"

const SIDEBAR_W = "260px"
const GRADIENT = "linear-gradient(160deg, #7551FF 0%, #5A3FCC 45%, #422AFB 100%)"

interface NavItem {
  label: string
  icon: React.ReactNode
  path: string
  badge?: string
}

interface SidebarProps {
  variant?: "desktop" | "mobile"
  onNavigate?: () => void
}

const mainNav: NavItem[] = [
  { label: "Dashboard", icon: <LayoutDashboard size={17} />, path: APP_ROUTES.dashboard },
  { label: "Events", icon: <Zap size={17} />, path: APP_ROUTES.events, badge: "12" },
  { label: "Calendar", icon: <CalendarDays size={17} />, path: APP_ROUTES.calendar },
]

const managementNav: NavItem[] = [
  { label: "Seating Layouts", icon: <LayoutGrid size={17} />, path: APP_ROUTES.seatingLayouts.list },
  { label: "Team", icon: <Users size={17} />, path: APP_ROUTES.team },
  { label: "Analytics", icon: <BarChart3 size={17} />, path: APP_ROUTES.analytics },
  { label: "Processor Fees", icon: <Settings size={17} />, path: APP_ROUTES.settings },
]

const systemNav: NavItem[] = [
  { label: "Help Center", icon: <HelpCircle size={17} />, path: APP_ROUTES.help },
]

function NavSection({ label, items, onNavigate }: { label: string; items: NavItem[]; onNavigate?: () => void }) {
  const { pathname } = useLocation()

  return (
    <Box mb={6}>
      <Text
        fontSize="9px"
        fontWeight="800"
        color="rgba(255,255,255,0.38)"
        textTransform="uppercase"
        letterSpacing="0.12em"
        mb={2}
        px={4}
      >
        {label}
      </Text>
      <VStack gap={0.5} align="stretch">
        {items.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`)
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
    </Box>
  )
}

function SettingsSection({
  isActive,
  isOpen,
  onToggle,
  onNavigate,
}: {
  isActive: boolean
  isOpen: boolean
  onToggle: () => void
  onNavigate?: () => void
}) {
  return (
    <Box mb={6}>
      <Text
        fontSize="9px"
        fontWeight="800"
        color="rgba(255,255,255,0.38)"
        textTransform="uppercase"
        letterSpacing="0.12em"
        mb={2}
        px={4}
      >
        Settings
      </Text>
      <Flex
        as="button"
        type="button"
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
        <Box color="rgba(255,255,255,0.7)" display="flex" alignItems="center">
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
              bg={isActive ? "rgba(255,255,255,0.92)" : "transparent"}
              _hover={!isActive ? { bg: "rgba(255,255,255,0.12)", transform: "translateX(2px)" } : {}}
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
                Processor Fees
              </Text>
            </Flex>
          </NavLink>
        </VStack>
      ) : null}
    </Box>
  )
}

export function Sidebar({ variant = "desktop", onNavigate }: SidebarProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const currentUser = auth.getUser() ?? mockUser
  const isMobile = variant === "mobile"
  const [isSettingsManualOpen, setIsSettingsManualOpen] = useState(pathname.startsWith(APP_ROUTES.settings))
  const isSettingsChildActive = pathname === APP_ROUTES.settings

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
        <NavSection label="Main" items={mainNav} onNavigate={onNavigate} />
        <NavSection label="Management" items={managementNav} onNavigate={onNavigate} />
        <SettingsSection
          key={pathname.startsWith(APP_ROUTES.settings) ? "settings" : "other"}
          isActive={isSettingsChildActive}
          isOpen={isSettingsManualOpen}
          onToggle={() => setIsSettingsManualOpen((current) => !current)}
          onNavigate={onNavigate}
        />
        <NavSection label="System" items={systemNav} onNavigate={onNavigate} />
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
