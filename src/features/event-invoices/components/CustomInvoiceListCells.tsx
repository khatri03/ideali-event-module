import { Link, Text } from "@chakra-ui/react"
import { Link as RouterLink } from "react-router-dom"
import type { CustomInvoiceListItem } from "@/api/customInvoices"
import { APP_ROUTES } from "@/utils/routes"
import { useInvoiceListReturnState } from "../hooks/useInvoiceListReturnState"
import { EventInvoiceStatusBadge } from "./EventInvoiceStatusBadge"

/** Opens the editor, which shows Paid and Cancelled invoices read-only, and remembers this exact list URL for "back". */
export function CustomInvoiceNumberLink({ invoiceUniqueId, invoiceNo }: Pick<CustomInvoiceListItem, "invoiceUniqueId" | "invoiceNo">) {
  const returnState = useInvoiceListReturnState()

  return (
    <Link
      asChild
      fontSize="sm"
      fontWeight="700"
      color="brand.600"
      cursor="pointer"
      display="inline-flex"
      minH="11"
      alignItems="center"
      wordBreak="break-word"
      _hover={{ textDecoration: "underline" }}
    >
      <RouterLink to={APP_ROUTES.customInvoices.edit(invoiceUniqueId)} state={returnState}>
        {invoiceNo}
      </RouterLink>
    </Link>
  )
}

/** A deleted record leaves its invoices behind; they still list, saying the record is gone rather than showing a blank. */
export function CustomInvoiceRecordName({ entityName }: { entityName: string }) {
  if (!entityName) {
    return (
      <Text fontSize="sm" color="text.secondary">
        No longer available
      </Text>
    )
  }
  return (
    <Text fontSize="sm" color="text.primary" wordBreak="break-word">
      {entityName}
    </Text>
  )
}

/** Overdue is a derived status the server flags separately; the badge shows it in place of Pending Payment. */
export function CustomInvoiceListStatusBadge({ invoiceStatus, isOverdue, statusLabel }: Pick<CustomInvoiceListItem, "invoiceStatus" | "isOverdue" | "statusLabel">) {
  return <EventInvoiceStatusBadge status={isOverdue ? "Overdue" : invoiceStatus} label={statusLabel} size="sm" />
}
