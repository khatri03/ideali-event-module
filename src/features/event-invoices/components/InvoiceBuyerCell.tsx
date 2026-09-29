import { Text } from "@chakra-ui/react"
import { EMPTY_VALUE } from "@/utils/format"

interface InvoiceBuyerCellProps {
  companyName: string | null
  buyerName: string
  buyerEmail: string | null
}

/** A custom invoice bills a company, so the company leads and the contact person reads underneath it. */
export function InvoiceBuyerCell({ companyName, buyerName, buyerEmail }: InvoiceBuyerCellProps) {
  return (
    <>
      <Text fontSize="sm" fontWeight="600" color="text.primary">
        {companyName || buyerName || EMPTY_VALUE}
      </Text>
      {companyName && buyerName ? (
        <Text fontSize="xs" color="text.secondary">
          {buyerName}
        </Text>
      ) : null}
      {buyerEmail ? (
        <Text fontSize="xs" color="text.secondary">
          {buyerEmail}
        </Text>
      ) : null}
    </>
  )
}
