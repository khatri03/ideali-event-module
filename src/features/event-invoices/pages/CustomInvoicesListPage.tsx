import { Box, Stack } from "@chakra-ui/react"
import { DEFAULT_PAGE_SIZE } from "../constants"
import { CustomInvoiceListHeader } from "../components/CustomInvoiceListHeader"
import { CustomInvoiceListTable } from "../components/CustomInvoiceListTable"
import { useCustomInvoiceList } from "../hooks/useCustomInvoiceList"

const FIRST_PAGE = { statuses: [], searchTerm: "", page: 1, pageSize: DEFAULT_PAGE_SIZE }

export function CustomInvoicesListPage() {
  const listQuery = useCustomInvoiceList(FIRST_PAGE)

  return (
    <Stack gap={6}>
      <CustomInvoiceListHeader description="Every invoice you raised by hand, across your modules. Filter by module, category, status or a buyer, then open one to edit, settle or email it." />
      <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" boxShadow="card" overflow="hidden">
        <CustomInvoiceListTable invoices={listQuery.data?.items ?? []} isLoading={listQuery.isLoading} />
      </Box>
    </Stack>
  )
}
