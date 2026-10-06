import { useMemo, useState } from "react"
import { Combobox, Field, createListCollection } from "@chakra-ui/react"
import { Controller, type Control, type FieldErrors } from "react-hook-form"
import { RequiredFieldLabel } from "@/features/custom-lists"
import { useDebounce } from "@/hooks/useDebounce"
import type { CustomInvoiceEntityOption, CustomInvoiceModule } from "@/api/customInvoices"
import { useCustomInvoiceEntityOptions } from "../hooks/useCustomInvoiceAuthoringOptions"
import type { CustomInvoiceFormValues } from "../schemas/customInvoice.schemas"

interface CustomInvoiceEntityPickerProps {
  control: Control<CustomInvoiceFormValues>
  errors: FieldErrors<CustomInvoiceFormValues>
  moduleType: CustomInvoiceModule | undefined
  disabled?: boolean
}

/** The record this invoice bills, searched on the server as the organizer types. */
export function CustomInvoiceEntityPicker({ control, errors, moduleType, disabled = false }: CustomInvoiceEntityPickerProps) {
  const [inputValue, setInputValue] = useState("")
  const searchTerm = useDebounce(inputValue, 300)
  const optionsQuery = useCustomInvoiceEntityOptions(moduleType, searchTerm)

  const options = useMemo(() => optionsQuery.data?.pages.flatMap((page) => page.items) ?? [], [optionsQuery.data])
  const collection = useMemo(
    () =>
      createListCollection<CustomInvoiceEntityOption>({
        items: options,
        itemToString: (option) => option.name,
        itemToValue: (option) => option.uniqueId,
      }),
    [options],
  )

  return (
    <Field.Root invalid={Boolean(errors.entityUniqueId)}>
      <RequiredFieldLabel>{moduleType ?? "What this invoice bills"}</RequiredFieldLabel>
      <Controller
        control={control}
        name="entityUniqueId"
        render={({ field }) => (
          <Combobox.Root
            collection={collection}
            value={field.value ? [field.value] : []}
            inputValue={inputValue}
            onInputValueChange={(details) => setInputValue(details.inputValue)}
            onValueChange={(details) => field.onChange(details.value[0] ?? "")}
            disabled={disabled || !moduleType}
            openOnClick
            w="full"
          >
            <Combobox.Control>
              <Combobox.Input aria-label={moduleType ?? "What this invoice bills"} minH="11" borderRadius="12px" />
            </Combobox.Control>
            <Combobox.Positioner>
              <Combobox.Content>
                {collection.items.map((option) => (
                  <Combobox.Item key={option.uniqueId} item={option} minH="11">
                    <Combobox.ItemText>{option.name}</Combobox.ItemText>
                  </Combobox.Item>
                ))}
              </Combobox.Content>
            </Combobox.Positioner>
          </Combobox.Root>
        )}
      />
      <Field.ErrorText>{errors.entityUniqueId?.message}</Field.ErrorText>
    </Field.Root>
  )
}
