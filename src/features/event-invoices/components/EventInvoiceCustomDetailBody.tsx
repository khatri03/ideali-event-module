import { Box, Stack } from "@chakra-ui/react"
import type { EventInvoiceDetail } from "@/api/eventInvoices"
import { buildBuyerAppUrl } from "@/lib/appConfig"
import { APP_ROUTES } from "@/utils/routes"
import { CustomInvoiceDetailPanels } from "./CustomInvoiceDetailPanels"
import { CustomInvoiceLineItemsTable } from "./CustomInvoiceLineItemsTable"
import { EventInvoiceBuyerPanel } from "./EventInvoiceBuyerPanel"
import { LinkedInvoicePanel } from "./LinkedInvoicePanel"

interface EventInvoiceCustomDetailBodyProps {
  invoice: EventInvoiceDetail
}

/** The read surface of a custom invoice: structured buyer, category/due/notes/payable panels, then the billed lines. */
export function EventInvoiceCustomDetailBody({ invoice }: EventInvoiceCustomDetailBodyProps) {
  return (
    <Box data-print-allow-break border="1px solid" borderColor="border.subtle" borderRadius="20px" bg="card.bg" boxShadow="card" p={{ base: 4, md: 7 }}>
      <Stack gap={{ base: 5, md: 6 }}>
        <EventInvoiceBuyerPanel
          invoiceUniqueId={invoice.invoiceUniqueId}
          invoiceNo={invoice.invoiceNo}
          buyerName={invoice.buyerName}
          buyerEmail={invoice.buyerEmail}
          buyerPhone={invoice.buyerPhone}
          canEditBuyer={false}
          hasIssuedTickets={false}
          canResendTickets={false}
          custom={{
            companyName: invoice.companyName,
            firstName: invoice.buyerFirstName,
            middleName: invoice.buyerMiddleName,
            lastName: invoice.buyerLastName,
          }}
        />

        <CustomInvoiceDetailPanels
          categoryName={invoice.categoryName}
          dueDateUtc={invoice.dueDateUtc}
          isOverdue={invoice.isOverdue}
          specialNotes={invoice.specialNotes}
          invoiceStatus={invoice.invoiceStatus}
          invoiceStatusLabel={invoice.invoiceStatusLabel}
          payPageUrl={buildBuyerAppUrl(APP_ROUTES.eventInvoicePay(invoice.invoiceUniqueId))}
          canPayOnline={invoice.canPayOnline}
        />

        <LinkedInvoicePanel
          invoiceUniqueId={invoice.invoiceUniqueId}
          invoiceNo={invoice.invoiceNo}
          linkedInvoice={invoice.linkedInvoice}
          canLink={invoice.invoiceStatus !== "Cancelled"}
        />

        <CustomInvoiceLineItemsTable lineItems={invoice.customLineItems} currencySymbol={invoice.currencySymbol} />
      </Stack>
    </Box>
  )
}
