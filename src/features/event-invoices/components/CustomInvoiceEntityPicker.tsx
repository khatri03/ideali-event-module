import { useMemo, useState } from "react"
import { Box, Button, Combobox, Field, Skeleton, Stack, Text, createListCollection } from "@chakra-ui/react"
import { Controller, type Control, type FieldErrors } from "react-hook-form"
import { RequiredFieldLabel } from "@/features/custom-lists"
import { useDebounce } from "@/hooks/useDebounce"
import { billedEntityLabel, billedEntityPlural } from "@/utils/customInvoiceEntity"
import { extractApiError } from "@/utils/errors"
import type { CustomInvoiceEntityOption, CustomInvoiceModule } from "@/api/customInvoices"
import { useCustomInvoiceEntityOptions } from "../hooks/useCustomInvoiceAuthoringOptions"
import type { CustomInvoiceFormValues } from "../schemas/customInvoice.schemas"

const NO_MODULE_LABEL = "What this invoice bills"

interface CustomInvoiceEntityPickerProps {
  control: Control<CustomInvoiceFormValues>
  errors: FieldErrors<CustomInvoiceFormValues>
  moduleType: CustomInvoiceModule | undefined
  disabled?: boolean
}

type EntityOptionsQuery = ReturnType<typeof useCustomInvoiceEntityOptions>

function OptionsSkeleton() {
  return (
    <Stack gap={2} p={1} aria-busy="true">
      {[0, 1, 2].map((index) => (
        <Skeleton key={index} h="11" borderRadius="10px" />
      ))}
    </Stack>
  )
}

function OptionsError({ query }: { query: EntityOptionsQuery }) {
  return (
    <Stack gap={2} p={3} role="alert">
      <Text fontSize="sm" fontWeight="700" color="status.error.fg">
        {extractApiError(query.error)}
      </Text>
      <Button type="button" size="sm" variant="outline" minH="11" cursor="pointer" alignSelf="flex-start" onClick={() => query.refetch()}>
        Retry
      </Button>
    </Stack>
  )
}

function emptyMessage(moduleType: CustomInvoiceModule, searchTerm: string): string {
  const plural = billedEntityPlural(moduleType)
  const term = searchTerm.trim()
  return term ? `No ${plural} match "${term}".` : `You have no ${plural} yet.`
}

/**
 * The record this invoice bills, searched on the server as the organizer types. Results arrive one page at a
 * time and Load more fetches the next; the full set is never requested. The picked record stays named even
 * after a new search no longer returns it.
 */
export function CustomInvoiceEntityPicker({ control, errors, moduleType, disabled = false }: CustomInvoiceEntityPickerProps) {
  const [inputValue, setInputValue] = useState("")
  const [searchText, setSearchText] = useState("")
  const [selected, setSelected] = useState<CustomInvoiceEntityOption | null>(null)
  const searchTerm = useDebounce(searchText, 300)
  const optionsQuery = useCustomInvoiceEntityOptions(moduleType, searchTerm)

  const options = useMemo(() => optionsQuery.data?.pages.flatMap((page) => page.items) ?? [], [optionsQuery.data])
  const collection = useMemo(() => {
    const items = selected && !options.some((option) => option.uniqueId === selected.uniqueId) ? [selected, ...options] : options
    return createListCollection<CustomInvoiceEntityOption>({
      items,
      itemToString: (option) => option.name,
      itemToValue: (option) => option.uniqueId,
    })
  }, [options, selected])

  const label = moduleType ? billedEntityLabel(moduleType) : NO_MODULE_LABEL
  const isLoadingFirstPage = optionsQuery.isPending && optionsQuery.fetchStatus === "fetching"
  const isEmpty = optionsQuery.isSuccess && !optionsQuery.isPlaceholderData && options.length === 0

  return (
    <Field.Root invalid={Boolean(errors.entityUniqueId)}>
      <RequiredFieldLabel>{label}</RequiredFieldLabel>
      <Controller
        control={control}
        name="entityUniqueId"
        render={({ field }) => (
          <Combobox.Root
            collection={collection}
            value={field.value ? [field.value] : []}
            inputValue={inputValue}
            onInputValueChange={(details) => {
              setInputValue(details.inputValue)
              if (details.reason === "input-change") setSearchText(details.inputValue)
            }}
            onValueChange={(details) => {
              setSelected(details.items[0] ?? null)
              field.onChange(details.value[0] ?? "")
            }}
            disabled={disabled || !moduleType}
            openOnClick
            w="full"
          >
            <Combobox.Control>
              <Combobox.Input
                aria-label={label}
                placeholder={moduleType ? `Search ${billedEntityPlural(moduleType)}` : "Choose a module first"}
                minH="11"
                borderRadius="12px"
                _disabled={{ cursor: "not-allowed" }}
              />
            </Combobox.Control>
            <Combobox.Positioner>
              <Combobox.Content maxH="320px" overflowY="auto" borderRadius="14px" p={2}>
                {optionsQuery.isError ? <OptionsError query={optionsQuery} /> : null}
                {isLoadingFirstPage ? <OptionsSkeleton /> : null}
                {isEmpty && moduleType ? (
                  <Text fontSize="sm" color="text.secondary" px={3} py={2}>
                    {emptyMessage(moduleType, searchTerm)}
                  </Text>
                ) : null}
                {collection.items.map((option) => (
                  <Combobox.Item key={option.uniqueId} item={option} minH="11" borderRadius="10px" cursor="pointer">
                    <Combobox.ItemText>{option.name}</Combobox.ItemText>
                    <Combobox.ItemIndicator />
                  </Combobox.Item>
                ))}
                {optionsQuery.hasNextPage ? (
                  <Box pt={1}>
                    <Button
                      type="button"
                      variant="ghost"
                      w="full"
                      minH="11"
                      cursor="pointer"
                      loading={optionsQuery.isFetchingNextPage}
                      loadingText="Loading more..."
                      onClick={() => optionsQuery.fetchNextPage()}
                    >
                      Load more
                    </Button>
                  </Box>
                ) : null}
              </Combobox.Content>
            </Combobox.Positioner>
          </Combobox.Root>
        )}
      />
      <Field.ErrorText>{errors.entityUniqueId?.message}</Field.ErrorText>
    </Field.Root>
  )
}
