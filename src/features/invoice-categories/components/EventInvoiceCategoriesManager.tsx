import { useState } from "react"
import { Box, Button, Flex, Heading, Input, Stack, Text } from "@chakra-ui/react"
import { Plus, Search, Tags } from "lucide-react"
import { ConfirmDialog, ErrorState, TablePagination } from "@/components/common"
import { useDebounce } from "@/hooks/useDebounce"
import { extractApiError } from "@/utils/errors"
import type {
  EventInvoiceCategoryFilters,
  EventInvoiceCategoryListItem,
} from "@/api/eventInvoiceCategories"
import { useEventInvoiceCategories } from "../hooks/useEventInvoiceCategories"
import { useDeleteEventInvoiceCategory } from "../hooks/useEventInvoiceCategoryMutations"
import { EventInvoiceCategoriesTable } from "./EventInvoiceCategoriesTable"
import { EventInvoiceCategoryFormDialog } from "./EventInvoiceCategoryFormDialog"
import { DEFAULT_PAGE_SIZE } from "../constants"

const SORT: Pick<EventInvoiceCategoryFilters, "sortBy" | "sortOrder"> = {
  sortBy: "displayOrder",
  sortOrder: "asc",
}

interface FormSession {
  open: boolean
  key: number
  category: EventInvoiceCategoryListItem | null
}

const CLOSED_FORM: FormSession = { open: false, key: 0, category: null }

export function EventInvoiceCategoriesManager() {
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [form, setForm] = useState<FormSession>(CLOSED_FORM)
  const [pendingDelete, setPendingDelete] = useState<EventInvoiceCategoryListItem | null>(null)
  const debouncedSearch = useDebounce(searchTerm, 300)

  const deleteMutation = useDeleteEventInvoiceCategory()
  const categoriesQuery = useEventInvoiceCategories(
    { ...SORT, searchTerm: debouncedSearch },
    page,
    pageSize,
  )

  const categoryPage = categoriesQuery.data
  const categories = categoryPage?.items ?? []

  function handleSearchChange(value: string) {
    setSearchTerm(value)
    setPage(1)
  }

  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize)
    setPage(1)
  }

  function openCreate() {
    setForm((current) => ({ open: true, key: current.key + 1, category: null }))
  }

  function openEdit(category: EventInvoiceCategoryListItem) {
    setForm((current) => ({ open: true, key: current.key + 1, category }))
  }

  function closeForm() {
    setForm((current) => ({ ...current, open: false }))
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) {
      return
    }
    try {
      await deleteMutation.mutateAsync(pendingDelete.uniqueId)
      setPendingDelete(null)
    } catch {
      // Kept open so the ConfirmDialog surfaces the server block via errorMessage below.
    }
  }

  function closeDelete() {
    setPendingDelete(null)
    deleteMutation.reset()
  }

  return (
    <Stack gap={6}>
      <Box border="1px solid" borderColor="border.subtle" borderRadius="20px" bg="card.bg" boxShadow="card" p={{ base: 4, md: 6 }}>
        <Stack direction={{ base: "column", md: "row" }} align={{ base: "flex-start", md: "center" }} gap={4}>
          <Box w="64px" h="64px" borderRadius="18px" display="flex" alignItems="center" justifyContent="center" bg="brand.gradient" flexShrink={0}>
            <Tags size={28} color="white" />
          </Box>
          <Box flex={1}>
            <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" letterSpacing="-0.03em" color="text.primary">
              Invoice Categories
            </Heading>
            <Text mt={2} fontSize={{ base: "sm", md: "md" }} color="text.secondary" maxW="3xl">
              Manage the sponsorship types you bill custom invoices under. Add, rename, or remove a
              category, then pick one when creating a custom invoice.
            </Text>
          </Box>
        </Stack>
      </Box>

      <Stack gap={5}>
        <Flex gap={3} direction={{ base: "column", md: "row" }} align={{ base: "stretch", md: "center" }}>
          <Flex position="relative" align="center" flex={1}>
            <Box position="absolute" left={4} color="gray.400" pointerEvents="none" display="flex">
              <Search size={16} />
            </Box>
            <Input
              value={searchTerm}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search by name"
              aria-label="Search by name"
              minH="11"
              borderRadius="14px"
              pl={10}
              pr={4}
            />
          </Flex>
          <Button
            w={{ base: "full", md: "auto" }}
            minH="11"
            px={6}
            borderRadius="14px"
            fontWeight="700"
            color="white"
            cursor="pointer"
            onClick={openCreate}
            bg="brand.gradient"
          >
            <Plus size={16} />
            New category
          </Button>
        </Flex>

        {categoriesQuery.isError ? (
          <ErrorState
            title="Could not load categories"
            message={extractApiError(categoriesQuery.error)}
            isRetrying={categoriesQuery.isFetching}
            onRetry={() => void categoriesQuery.refetch()}
          />
        ) : (
          <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" boxShadow="card" overflow="hidden">
            <EventInvoiceCategoriesTable
              categories={categories}
              isLoading={categoriesQuery.isLoading}
              onEdit={openEdit}
              onDelete={setPendingDelete}
            />
            <TablePagination
              page={categoryPage?.page ?? page}
              pageSize={pageSize}
              totalPages={categoryPage?.totalPages ?? 0}
              total={categoryPage?.total ?? 0}
              itemLabel="category"
              itemLabelPlural="categories"
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
            />
          </Box>
        )}
      </Stack>

      <EventInvoiceCategoryFormDialog
        open={form.open}
        editSessionKey={form.key}
        category={form.category}
        onClose={closeForm}
      />

      {pendingDelete ? (
        <ConfirmDialog
          title="Delete category?"
          description={`Delete "${pendingDelete.name}"? It will no longer be available when creating new custom invoices. Invoices already billed under it keep their category.`}
          confirmLabel="Delete"
          tone="destructive"
          isPending={deleteMutation.isPending}
          errorMessage={deleteMutation.error ? extractApiError(deleteMutation.error) : null}
          onConfirm={() => void handleConfirmDelete()}
          onClose={closeDelete}
        />
      ) : null}
    </Stack>
  )
}
