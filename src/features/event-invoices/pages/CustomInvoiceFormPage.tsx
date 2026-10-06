import { Stack } from "@chakra-ui/react"
import { useNavigate, useParams } from "react-router-dom"
import { ErrorState } from "@/components/common"
import { APP_ROUTES } from "@/utils/routes"
import { useCustomInvoiceForEdit } from "../hooks/useCustomInvoiceForEdit"
import { BackToInvoicesButton } from "../components/BackToInvoicesButton"
import { CustomInvoiceEditor } from "../components/CustomInvoiceEditor"
import { CustomInvoiceFormPageSkeleton } from "./CustomInvoiceFormPage.skeleton"

/**
 * The routed entry point. In edit mode it loads the invoice first - showing the page skeleton while it
 * arrives and a retryable error state if it fails - then hands the resolved values to the editor; in create
 * mode it renders the empty editor straight away.
 */
export function CustomInvoiceFormPage() {
  const navigate = useNavigate()
  const { invoiceUniqueId } = useParams<{ invoiceUniqueId: string }>()
  const editQuery = useCustomInvoiceForEdit(invoiceUniqueId)

  if (!invoiceUniqueId) {
    return <CustomInvoiceEditor />
  }
  if (editQuery.isLoading) {
    return <CustomInvoiceFormPageSkeleton />
  }
  if (editQuery.isError || !editQuery.data) {
    return (
      <Stack gap={5} maxW="7xl" mx="auto">
        <BackToInvoicesButton onBack={() => navigate(APP_ROUTES.eventInvoices.list)} />
        <ErrorState
          title="This invoice could not be loaded"
          message="Something went wrong loading the invoice for editing. Try again in a moment."
          onRetry={() => editQuery.refetch()}
          isRetrying={editQuery.isFetching}
        />
      </Stack>
    )
  }
  return <CustomInvoiceEditor invoiceUniqueId={invoiceUniqueId} initial={editQuery.data} />
}
