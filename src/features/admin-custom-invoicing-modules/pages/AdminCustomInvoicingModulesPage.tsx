import { Navigate } from "react-router-dom"
import { Stack } from "@chakra-ui/react"
import { FileText } from "lucide-react"
import { AdminPageHeader } from "@/components/common"
import { useAdminAccess } from "@/hooks/useAdminAccess"
import { APP_ROUTES } from "@/utils/routes"
import { CustomInvoicingModulesManager } from "../components/CustomInvoicingModulesManager"

export function AdminCustomInvoicingModulesPage() {
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
        icon={<FileText size={28} color="white" />}
        badgeLabel="Billing"
        title="Custom Invoicing Modules"
        description="Choose which modules organizers can create custom invoices for. Turning a module off stops new invoices only."
      />
      <CustomInvoicingModulesManager />
    </Stack>
  )
}
