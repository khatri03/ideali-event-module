import { Field, Stack, Switch, Text } from "@chakra-ui/react"
import { useWatch, type Control, type FieldErrors, type UseFormSetValue } from "react-hook-form"
import type { CustomInvoiceLinkCandidate, CustomInvoiceModule } from "@/api/customInvoices"
import type { CustomInvoiceFormValues } from "../schemas/customInvoice.schemas"
import { LinkInvoicePicker } from "./LinkInvoicePicker"

interface CustomInvoiceLinkSectionProps {
  control: Control<CustomInvoiceFormValues>
  setValue: UseFormSetValue<CustomInvoiceFormValues>
  errors: FieldErrors<CustomInvoiceFormValues>
  /** The invoice being edited, left out of its own candidates. Absent when creating. */
  invoiceUniqueId?: string
  disabled: boolean
}

/** The editor's opt-in "Link to an existing invoice" switch and its same-module picker (D-09). */
export function CustomInvoiceLinkSection({ control, setValue, errors, invoiceUniqueId, disabled }: CustomInvoiceLinkSectionProps) {
  const moduleType = useWatch({ control, name: "moduleType" }) as CustomInvoiceModule | undefined
  const linkToExisting = useWatch({ control, name: "linkToExisting" })
  const linkedInvoiceUniqueId = useWatch({ control, name: "linkedInvoiceUniqueId" })

  function handleToggle(checked: boolean) {
    setValue("linkToExisting", checked, { shouldDirty: true })
    if (!checked) {
      setValue("linkedInvoiceUniqueId", undefined, { shouldDirty: true })
      setValue("linkedInvoiceNo", undefined, { shouldDirty: true })
    }
  }

  function handlePick(invoice: CustomInvoiceLinkCandidate) {
    setValue("linkedInvoiceUniqueId", invoice.invoiceUniqueId, { shouldDirty: true, shouldValidate: true })
    setValue("linkedInvoiceNo", invoice.invoiceNo, { shouldDirty: true })
  }

  return (
    <Stack gap={4}>
      <Field.Root>
        <Switch.Root
          checked={linkToExisting}
          disabled={disabled}
          colorPalette="brand"
          display="flex"
          alignItems="center"
          gap={3}
          minH="11"
          cursor={disabled ? "not-allowed" : "pointer"}
          onCheckedChange={(details) => handleToggle(details.checked)}
        >
          <Switch.HiddenInput />
          <Switch.Control />
          <Switch.Label fontSize="sm" fontWeight="700" color="text.primary" cursor="inherit">
            Link to an existing invoice
          </Switch.Label>
        </Switch.Root>
        <Field.HelperText>Copies the buyer from an invoice of the same module.</Field.HelperText>
      </Field.Root>

      {linkToExisting && moduleType ? (
        <Stack gap={2}>
          <LinkInvoicePicker
            moduleType={moduleType}
            excludeInvoiceUniqueId={invoiceUniqueId}
            selectedInvoiceUniqueId={linkedInvoiceUniqueId ?? null}
            onSelect={handlePick}
          />
          {errors.linkedInvoiceUniqueId ? (
            <Text fontSize="sm" fontWeight="700" color="status.error.fg">
              {errors.linkedInvoiceUniqueId.message}
            </Text>
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  )
}
