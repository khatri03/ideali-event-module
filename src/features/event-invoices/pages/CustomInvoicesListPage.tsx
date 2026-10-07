import { Box, Stack } from "@chakra-ui/react"
import { CustomInvoiceListFilterBar } from "../components/CustomInvoiceListFilterBar"
import { CustomInvoiceListHeader } from "../components/CustomInvoiceListHeader"
import { CustomInvoiceListTable } from "../components/CustomInvoiceListTable"
import { useCustomInvoiceList } from "../hooks/useCustomInvoiceList"
import { useCustomInvoiceListSearchParams } from "../hooks/useCustomInvoiceListSearchParams"

export function CustomInvoicesListPage() {
  const filters = useCustomInvoiceListSearchParams()
  const listQuery = useCustomInvoiceList(filters.query)

  return (
    <Stack gap={6}>
      <CustomInvoiceListHeader description="Every invoice you raised by hand, across your modules. Filter by module, category, status or a buyer, then open one to edit, settle or email it." />
      <CustomInvoiceListFilterBar filters={filters} />
      <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" boxShadow="card" overflow="hidden">
        <CustomInvoiceListTable invoices={listQuery.data?.items ?? []} isLoading={listQuery.isLoading} />
      </Box>
    </Stack>
  )
}
