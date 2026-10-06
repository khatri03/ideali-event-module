import { Navigate } from "react-router-dom"
import { Stack } from "@chakra-ui/react"
import { ShieldCheck } from "lucide-react"
import { AdminPageHeader } from "@/components/common"
import { useAdminAccess } from "@/hooks/useAdminAccess"
import { APP_ROUTES } from "@/utils/routes"
import { AdminFeePlansManager } from "../components/AdminFeePlansManager"

export function AdminFeePlansPage() {
  const { isResolved, isAdmin } = useAdminAccess()

  if (!isResolved) {
    return null
  }

  if (!isAdmin) {
    return <Navigate to={APP_ROUTES.settings} replace />
  }

  return (
    <Stack gap={6}>
      <AdminPageHeader
        icon={<ShieldCheck size={28} color="white" />}
        badgeLabel="Revenue plans"
        title="Revenue Plans"
        description="Create reusable revenue slabs, map them to organizers per module, and keep a module-level default fallback when no organizer-specific plan exists."
      />

      <AdminFeePlansManager />
    </Stack>
  )
}
