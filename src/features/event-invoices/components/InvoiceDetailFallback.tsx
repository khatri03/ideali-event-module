import { Stack } from "@chakra-ui/react"
import { ErrorState } from "@/components/common"
import { extractApiError } from "@/utils/errors"
import { EventInvoiceDetailPageSkeleton } from "../pages/EventInvoiceDetailPage.skeleton"
import { BackToInvoicesButton } from "./BackToInvoicesButton"

interface InvoiceDetailFallbackProps {
  /** No id in the route, or the server says the invoice is not the organizer's: retrying cannot help. */
  isMissing: boolean
  error: unknown
  isRetrying: boolean
  onRetry: () => void
  onBack: () => void
}

/** What an invoice detail page shows before it has an invoice: not found, a retryable failure, or its skeleton. */
export function InvoiceDetailFallback({ isMissing, error, isRetrying, onRetry, onBack }: InvoiceDetailFallbackProps) {
  return (
    <Stack gap={5}>
      <BackToInvoicesButton onBack={onBack} />
      {isMissing ? (
        <ErrorState
          tone="missing"
          title="Invoice not found"
          message="This invoice no longer exists, or it belongs to another organizer. Check the link and try again from the list."
        />
      ) : error ? (
        <ErrorState
          title="Could not load this invoice"
          message={extractApiError(error)}
          isRetrying={isRetrying}
          onRetry={onRetry}
        />
      ) : (
        <EventInvoiceDetailPageSkeleton />
      )}
    </Stack>
  )
}
