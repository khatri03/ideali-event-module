import { Children } from "react"
import type { ReactNode } from "react"
import { Box, Flex, Text, VStack, chakra } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import { ChevronDown, ChevronRight, type LucideIcon } from "lucide-react"

const ACTIVE_BG = "rgba(255,255,255,0.92)"
const HOVER_STYLE = { bg: "rgba(255,255,255,0.12)", transform: "translateX(2px)" }

interface NavGroupProps {
  label: string
  icon: LucideIcon
  isOpen: boolean
  onToggle: () => void
  /** When set the header is a link to the group's own page; otherwise it only toggles. */
  to?: string
  isActive?: boolean
  onNavigate?: () => void
  children?: ReactNode
}

function GroupHeaderContent({
  label,
  icon: Icon,
  isActive,
  chevron,
}: {
  label: string
  icon: LucideIcon
  isActive: boolean
  chevron: ReactNode
}) {
  return (
    <Flex
      align="center"
      gap={3}
      px={3}
      py={2.5}
      minH="11"
      borderRadius="12px"
      mx={2}
      transition="all 0.18s ease"
      bg={isActive ? ACTIVE_BG : "transparent"}
      boxShadow={isActive ? "0 4px 16px rgba(0,0,0,0.15)" : "none"}
      cursor="pointer"
      _hover={isActive ? {} : HOVER_STYLE}
    >
      <Box color={isActive ? "#7551FF" : "rgba(255,255,255,0.7)"} transition="color 0.18s" display="flex" alignItems="center">
        <Icon size={17} />
      </Box>
      <Text
        fontSize="sm"
        fontWeight={isActive ? "700" : "500"}
        color={isActive ? "#422AFB" : "rgba(255,255,255,0.85)"}
        transition="color 0.18s"
        flex={1}
        letterSpacing={isActive ? "-0.01em" : "0"}
        textAlign="left"
      >
        {label}
      </Text>
      {chevron}
    </Flex>
  )
}

export function NavGroup({ label, icon, isOpen, onToggle, to, isActive = false, onNavigate, children }: NavGroupProps) {
  const hasChildren = Children.toArray(children).length > 0
  const chevron = hasChildren ? (
    <Box color={isActive ? "#7551FF" : "rgba(255,255,255,0.7)"} display="flex" alignItems="center" ml="auto">
      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
    </Box>
  ) : null
  const content = <GroupHeaderContent label={label} icon={icon} isActive={isActive} chevron={chevron} />

  return (
    <Box>
      {to ? (
        <Link
          to={to}
          style={{ textDecoration: "none", display: "block" }}
          aria-current={isActive ? "page" : undefined}
          aria-expanded={hasChildren ? isOpen : undefined}
          onClick={() => {
            onToggle()
            onNavigate?.()
          }}
        >
          {content}
        </Link>
      ) : (
        <chakra.button type="button" w="full" aria-expanded={isOpen} onClick={onToggle}>
          {content}
        </chakra.button>
      )}

      {isOpen && hasChildren ? (
        <VStack gap={0.5} align="stretch" mt={1.5}>
          {children}
        </VStack>
      ) : null}
    </Box>
  )
}

interface NavChildLinkProps {
  to: string
  label: string
  isActive: boolean
  onNavigate?: () => void
}

export function NavChildLink({ to, label, isActive, onNavigate }: NavChildLinkProps) {
  return (
    <Link to={to} style={{ textDecoration: "none" }} aria-current={isActive ? "page" : undefined} onClick={onNavigate}>
      <Flex
        align="center"
        gap={3}
        pl={10}
        pr={3}
        py={2.5}
        minH="11"
        borderRadius="12px"
        mx={2}
        transition="all 0.18s ease"
        bg={isActive ? ACTIVE_BG : "transparent"}
        cursor="pointer"
        _hover={isActive ? {} : HOVER_STYLE}
        boxShadow={isActive ? "0 4px 16px rgba(0,0,0,0.15)" : "none"}
      >
        <Box w="6px" h="6px" borderRadius="full" bg={isActive ? "#7551FF" : "rgba(255,255,255,0.6)"} flexShrink={0} />
        <Text
          fontSize="sm"
          fontWeight={isActive ? "700" : "500"}
          color={isActive ? "#422AFB" : "rgba(255,255,255,0.85)"}
          transition="color 0.18s"
          flex={1}
          letterSpacing={isActive ? "-0.01em" : "0"}
        >
          {label}
        </Text>
      </Flex>
    </Link>
  )
}
