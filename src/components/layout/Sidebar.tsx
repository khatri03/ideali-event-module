import { useState } from "react"
import { Box, Flex, Text, VStack } from "@chakra-ui/react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  CalendarRange,
  Settings,
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
  FileSpreadsheet,
  type LucideIcon,
} from "lucide-react"
import { logoutUser } from "@/api/auth"
import { auth } from "@/lib/auth"
import { queryClient } from "@/lib/queryClient"
import { APP_ROUTES } from "@/utils/routes"
import type { AuthUser } from "@/types"
import type { CustomInvoiceModule } from "@/api/customInvoices"
import { useEnabledCustomInvoiceModules } from "@/features/event-invoices"
import { NavChildLink, NavGroup, NavItemContent } from "./SidebarNavGroup"
import {
  CUSTOM_INVOICE_MODULE_NAV,
  isGroupVisible,
  isModuleChildActive,
  isStandaloneInvoicesActive,
  type ModuleNavEntry,
} from "./customInvoiceModuleNav"

const SIDEBAR_W = "260px"
const GRADIENT = "linear-gradient(160deg, #7551FF 0%, #5A3FCC 45%, #422AFB 100%)"

interface NavItem {
  label: string
  icon: LucideIcon
  path: string
  roles: string[]
  /** Base path used for the active check when the section has child routes (create/edit). Defaults to `path`. */
  matchPath?: string
}

interface SidebarProps {
  currentUser: AuthUser
  variant?: "desktop" | "mobile"
  onNavigate?: () => void
}

const leadingNav: NavItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: APP_ROUTES.dashboard,
    roles: ["Organizer", "Admin"],
  },
]

const trailingNav: NavItem[] = [
  { label: "Sessions", icon: CalendarRange, path: APP_ROUTES.sessionWizard.list, roles: ["Organizer", "Admin"] },
  {
    label: "Event Invoices",
    icon: Receipt,
    path: APP_ROUTES.eventInvoices.list,
    roles: ["Organizer", "Admin"],
  },
]

const managementNav: NavItem[] = [
  { label: "Seating Layouts", icon: LayoutGrid, path: APP_ROUTES.seatingLayouts.list, roles: ["Organizer", "Admin"] },
  { label: "Venues", icon: MapPin, path: APP_ROUTES.venues.list, roles: ["Organizer", "Admin"] },
  {
    label: "Custom Lists",
    icon: ListChecks,
    path: APP_ROUTES.customLists.list,
    matchPath: APP_ROUTES.customLists.base,
    roles: ["Organizer", "Admin"],
  },
  {
    label: "Custom Reports",
    icon: FileSpreadsheet,
    path: APP_ROUTES.customFormReports.builder,
    matchPath: APP_ROUTES.customFormReports.base,
    roles: ["Organizer", "Admin"],
  },
  {
    label: "Member Alerts",
    icon: Megaphone,
    path: APP_ROUTES.memberAlerts.list,
    matchPath: APP_ROUTES.memberAlerts.base,
    roles: ["Organizer", "Admin"],
  },
  {
    label: "Documents",
    icon: FolderOpen,
    path: APP_ROUTES.documentCategories.list,
    matchPath: APP_ROUTES.documentCategories.base,
    roles: ["Organizer", "Admin"],
  },
]

function hasAnyRole(roles: string[], allowedRoles: string[]) {
  return allowedRoles.some((allowedRole) => roles.some((role) => role.toLowerCase() === allowedRole.toLowerCase()))
}

function isOnOrUnder(pathname: string, basePath: string) {
  return pathname === basePath || pathname.startsWith(`${basePath}/`)
}

function NavItemLinks({
  items,
  currentRoles,
  onNavigate,
}: {
  items: NavItem[]
  currentRoles: string[]
  onNavigate?: () => void
}) {
  const { pathname } = useLocation()

  return items
    .filter((item) => hasAnyRole(currentRoles, item.roles))
    .map((item) => (
      <NavLink key={item.path} to={item.path} style={{ textDecoration: "none" }} onClick={onNavigate}>
        <NavItemContent label={item.label} icon={item.icon} isActive={isOnOrUnder(pathname, item.matchPath ?? item.path)} />
      </NavLink>
    ))
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
  if (!items.some((item) => hasAnyRole(currentRoles, item.roles))) {
    return null
  }

  return (
    <VStack gap={0.5} align="stretch" mb={6}>
      <NavItemLinks items={items} currentRoles={currentRoles} onNavigate={onNavigate} />
    </VStack>
  )
}

function ModuleNavGroup({
  entry,
  isEnabled,
  onNavigate,
}: {
  entry: ModuleNavEntry
  isEnabled: boolean
  onNavigate?: () => void
}) {
  const { pathname, search } = useLocation()
  const [isManualOpen, setIsManualOpen] = useState(false)
  const isChildActive = isModuleChildActive(entry.moduleType, pathname, search)
  const isOpen = isManualOpen || isChildActive

  return (
    <NavGroup
      label={entry.label}
      icon={entry.icon}
      isOpen={isOpen}
      // A group with its own page opens when its header is followed; one without a page just toggles.
      onToggle={() => setIsManualOpen(entry.landingPath ? true : !isOpen)}
      to={entry.landingPath}
      isActive={entry.landingPath ? isOnOrUnder(pathname, entry.landingPath) : false}
      onNavigate={onNavigate}
    >
      {isEnabled ? (
        <NavChildLink
          to={APP_ROUTES.customInvoices.listForModule(entry.moduleType)}
          label="Custom Invoices"
          isActive={isChildActive}
          onNavigate={onNavigate}
        />
      ) : null}
    </NavGroup>
  )
}

function ModuleNavGroups({
  entries,
  enabledModules,
  onNavigate,
}: {
  entries: readonly ModuleNavEntry[]
  enabledModules: readonly CustomInvoiceModule[]
  onNavigate?: () => void
}) {
  return entries
    .filter((entry) => isGroupVisible(entry, enabledModules.includes(entry.moduleType)))
    .map((entry) => (
      <ModuleNavGroup
        key={entry.moduleType}
        entry={entry}
        isEnabled={enabledModules.includes(entry.moduleType)}
        onNavigate={onNavigate}
      />
    ))
}

interface GroupLink {
  label: string
  path: string
  isActive: (pathname: string, search: string) => boolean
}

function LinkGroup({
  label,
  icon,
  links,
  onNavigate,
}: {
  label: string
  icon: LucideIcon
  links: readonly GroupLink[]
  onNavigate?: () => void
}) {
  const { pathname, search } = useLocation()
  const [isManualOpen, setIsManualOpen] = useState(false)
  const isOpen = isManualOpen || links.some((link) => link.isActive(pathname, search))

  return (
    <NavGroup label={label} icon={icon} isOpen={isOpen} onToggle={() => setIsManualOpen(!isOpen)}>
      {links.map((link) => (
        <NavChildLink
          key={link.path}
          to={link.path}
          label={link.label}
          isActive={link.isActive(pathname, search)}
          onNavigate={onNavigate}
        />
      ))}
    </NavGroup>
  )
}

const isExactly = (path: string) => (pathname: string) => pathname === path
const isUnder = (path: string) => (pathname: string) => isOnOrUnder(pathname, path)

const CUSTOM_INVOICE_LINKS: readonly GroupLink[] = [
  { label: "Invoices", path: APP_ROUTES.customInvoices.list, isActive: isStandaloneInvoicesActive },
  { label: "Categories", path: APP_ROUTES.invoiceCategories.list, isActive: isUnder(APP_ROUTES.invoiceCategories.list) },
]

const SETTINGS_LINKS: readonly GroupLink[] = [
  { label: "Processor Fees", path: APP_ROUTES.settings, isActive: isExactly(APP_ROUTES.settings) },
  { label: "Charge Rules", path: APP_ROUTES.chargeRules.list, isActive: isExactly(APP_ROUTES.chargeRules.list) },
]

const ADMIN_LINKS: readonly GroupLink[] = [
  { label: "Revenue Plans", path: APP_ROUTES.adminRevenuePlans, isActive: isExactly(APP_ROUTES.adminRevenuePlans) },
  { label: "Rate Limit Settings", path: APP_ROUTES.adminRateLimit, isActive: isExactly(APP_ROUTES.adminRateLimit) },
  {
    label: "Custom Invoicing Modules",
    path: APP_ROUTES.adminCustomInvoicingModules,
    isActive: isExactly(APP_ROUTES.adminCustomInvoicingModules),
  },
]

const MEMBER_LINKS: readonly GroupLink[] = [
  { label: "Dashboard", path: APP_ROUTES.member.dashboard, isActive: isUnder(APP_ROUTES.member.dashboard) },
  { label: "Documents", path: APP_ROUTES.memberDocuments.list, isActive: isUnder(APP_ROUTES.memberDocuments.list) },
]

const NO_MODULES: readonly CustomInvoiceModule[] = []
const PAGED_MODULE_NAV = CUSTOM_INVOICE_MODULE_NAV.filter((entry) => entry.landingPath)
const MODULE_ONLY_NAV = CUSTOM_INVOICE_MODULE_NAV.filter((entry) => !entry.landingPath)

export function Sidebar({ currentUser, variant = "desktop", onNavigate }: SidebarProps) {
  const navigate = useNavigate()
  const isMobile = variant === "mobile"
  const hasOrganizerAccess = hasAnyRole(currentUser.roles, ["Organizer", "Admin"])
  // Loading or failed both mean no module children; the rest of the nav must keep working (D-04).
  const enabledModules = useEnabledCustomInvoiceModules({ enabled: hasOrganizerAccess }).data ?? NO_MODULES
  const isAdmin = hasAnyRole(currentUser.roles, ["Admin"])
  const isMember = hasAnyRole(currentUser.roles, ["Member"])

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
        {hasOrganizerAccess ? (
          <VStack gap={0.5} align="stretch" mb={6}>
            <NavItemLinks items={leadingNav} currentRoles={currentUser.roles} onNavigate={onNavigate} />
            <ModuleNavGroups entries={PAGED_MODULE_NAV} enabledModules={enabledModules} onNavigate={onNavigate} />
            <NavItemLinks items={trailingNav} currentRoles={currentUser.roles} onNavigate={onNavigate} />
            <ModuleNavGroups entries={MODULE_ONLY_NAV} enabledModules={enabledModules} onNavigate={onNavigate} />
            <LinkGroup label="Custom Invoices" icon={Receipt} links={CUSTOM_INVOICE_LINKS} onNavigate={onNavigate} />
          </VStack>
        ) : null}
        <NavSection items={managementNav} currentRoles={currentUser.roles} onNavigate={onNavigate} />
        {hasOrganizerAccess ? (
          <Box mb={6}>
            <LinkGroup label="Settings" icon={Settings} links={SETTINGS_LINKS} onNavigate={onNavigate} />
          </Box>
        ) : null}
        {isAdmin ? (
          <Box mb={6}>
            <LinkGroup label="Admin" icon={ShieldCheck} links={ADMIN_LINKS} onNavigate={onNavigate} />
          </Box>
        ) : null}
        {isMember ? (
          <Box mb={6}>
            <LinkGroup label="Member" icon={Users} links={MEMBER_LINKS} onNavigate={onNavigate} />
          </Box>
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
