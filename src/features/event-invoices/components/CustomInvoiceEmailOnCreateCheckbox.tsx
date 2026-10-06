import { Checkbox, Stack, Text } from "@chakra-ui/react"
import { Controller, type Control } from "react-hook-form"
import type { CustomInvoiceFormValues } from "../schemas/customInvoice.schemas"

interface CustomInvoiceEmailOnCreateCheckboxProps {
  control: Control<CustomInvoiceFormValues>
  disabled?: boolean
}

/** The create-only choice to email the buyer the payable link as soon as the invoice is saved. */
export function CustomInvoiceEmailOnCreateCheckbox({ control, disabled = false }: CustomInvoiceEmailOnCreateCheckboxProps) {
  const cursor = disabled ? "not-allowed" : "pointer"
  return (
    <Controller
      control={control}
      name="emailOnCreate"
      render={({ field }) => (
        <Checkbox.Root
          checked={field.value}
          onCheckedChange={(details) => field.onChange(details.checked === true)}
          disabled={disabled}
          alignItems="flex-start"
          minH="11"
          py={2}
          cursor={cursor}
        >
          <Checkbox.HiddenInput name={field.name} onBlur={field.onBlur} />
          <Checkbox.Control borderRadius="6px" mt={0.5} cursor={cursor} />
          <Stack gap={0.5}>
            <Checkbox.Label fontSize="sm" fontWeight="700" color="text.primary" cursor={cursor}>
              Email payable link to buyer now
            </Checkbox.Label>
            <Text fontSize="sm" color="text.secondary">
              The buyer gets an email with a link to pay online.
            </Text>
          </Stack>
        </Checkbox.Root>
      )}
    />
  )
}
