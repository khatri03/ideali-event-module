import { Stack } from "@chakra-ui/react"
import { CustomInvoiceListFilterBar } from "../components/CustomInvoiceListFilterBar"
import { CustomInvoiceListHeader } from "../components/CustomInvoiceListHeader"
import { CustomInvoiceListResults } from "../components/CustomInvoiceListResults"
import { NewCustomInvoiceButton } from "../components/NewCustomInvoiceButton"
import { useCustomInvoiceListSearchParams } from "../hooks/useCustomInvoiceListSearchParams"

const ALL_MODULES_DESCRIPTION =
  "Every invoice you raised by hand, across your modules. Filter by module, category, status or a buyer, then open one to edit, settle or email it."

export function CustomInvoicesListPage() {
  const filters = useCustomInvoiceListSearchParams()
  const description = filters.lockedModule
    ? `Custom invoices billed to your ${filters.lockedModule} records.`
    : ALL_MODULES_DESCRIPTION

  return (
    <Stack gap={6}>
      <CustomInvoiceListHeader
        description={description}
        action={<NewCustomInvoiceButton lockedModule={filters.lockedModule} />}
      />
      <CustomInvoiceListFilterBar filters={filters} />
      <CustomInvoiceListResults filters={filters} />
    </Stack>
  )
}
