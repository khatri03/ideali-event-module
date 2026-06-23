import { Navigate } from "react-router-dom"
import { Box, Badge, Heading, Stack, Text } from "@chakra-ui/react"
import { ShieldCheck } from "lucide-react"
import { useAuthSession } from "@/hooks/useAuthSession"
import { auth, sessionDataToUser } from "@/lib/auth"
import { APP_ROUTES } from "@/utils/routes"
import { AdminFeePlansManager } from "../components/AdminFeePlansManager"

export function AdminFeePlansPage() {
  const sessionQuery = useAuthSession()
  const user = auth.getUser() ?? (sessionQuery.data ? sessionDataToUser(sessionQuery.data) : null)

  if (!user) {
    return null
  }

  if (user.role !== "Admin") {
    return <Navigate to={APP_ROUTES.settings} replace />
  }

  return (
    <Stack gap={6}>
      <Box
        border="1px solid"
        borderColor="border.subtle"
        borderRadius="20px"
        bg="card.bg"
        boxShadow="card"
        p={{ base: 4, md: 6 }}
      >
        <Stack direction={{ base: "column", md: "row" }} align={{ base: "flex-start", md: "center" }} gap={4}>
          <Box
            w="64px"
            h="64px"
            borderRadius="18px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
            flexShrink={0}
          >
            <ShieldCheck size={28} color="white" />
          </Box>

          <Box flex={1}>
            <Badge variant="subtle" colorPalette="purple" borderRadius="999px" px={3} py={1} mb={2}>
              Revenue plans
            </Badge>
            <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" letterSpacing="-0.03em" color="gray.900">
              Revenue Plans
            </Heading>
            <Text mt={2} fontSize={{ base: "sm", md: "md" }} color="gray.600" maxW="3xl">
              Create reusable revenue slabs, map them to organizers per module, and keep a module-level default fallback when no organizer-specific plan exists.
            </Text>
          </Box>
        </Stack>
      </Box>

      <AdminFeePlansManager />
    </Stack>
  )
}
