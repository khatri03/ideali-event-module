import { Stack } from "@chakra-ui/react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { ErrorState } from "@/components/common"
import { APP_ROUTES } from "@/utils/routes"
import { CUSTOM_INVOICE_MODULE_PARAM, parseCustomInvoiceModule } from "@/utils/customInvoiceEntity"
import { useCustomInvoiceForEdit } from "../hooks/useCustomInvoiceForEdit"
import { useCustomInvoiceDetail } from "../hooks/useCustomInvoices"
import { BackToInvoicesButton } from "../components/BackToInvoicesButton"
import { CustomInvoiceEditor } from "../components/CustomInvoiceEditor"
import { CustomInvoiceFormPageSkeleton } from "./CustomInvoiceFormPage.skeleton"

/**
 * The routed entry point. In edit mode it loads the invoice's editable values and its detail first - showing
 * the page skeleton until both arrive and a retryable error state if either fails - then hands both to the
 * editor; in create mode it renders the empty editor straight away, locked to the module named by
 * `?moduleType=` when it was opened from a module's invoice list.
 */
export function CustomInvoiceFormPage() {
  const navigate = useNavigate()
  const { invoiceUniqueId } = useParams<{ invoiceUniqueId: string }>()
  const [searchParams] = useSearchParams()
  const editQuery = useCustomInvoiceForEdit(invoiceUniqueId)
  const detailQuery = useCustomInvoiceDetail(invoiceUniqueId)

  if (!invoiceUniqueId) {
    return <CustomInvoiceEditor lockedModuleType={parseCustomInvoiceModule(searchParams.get(CUSTOM_INVOICE_MODULE_PARAM))} />
  }
  if (editQuery.isLoading || detailQuery.isLoading) {
    return <CustomInvoiceFormPageSkeleton />
  }
  if (editQuery.isError || detailQuery.isError || !editQuery.data || !detailQuery.data) {
    return (
      <Stack gap={5} maxW="7xl" mx="auto">
        <BackToInvoicesButton onBack={() => navigate(APP_ROUTES.customInvoices.list)} />
        <ErrorState
          title="This invoice could not be loaded"
          message="Something went wrong loading the invoice for editing. Try again in a moment."
          onRetry={() => {
            void editQuery.refetch()
            void detailQuery.refetch()
          }}
          isRetrying={editQuery.isFetching || detailQuery.isFetching}
        />
      </Stack>
    )
  }
  return <CustomInvoiceEditor invoiceUniqueId={invoiceUniqueId} initial={editQuery.data} detail={detailQuery.data} />
}
