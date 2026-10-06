import { useState } from "react"
import { Button, Field, Flex, Stack, Switch, Text } from "@chakra-ui/react"
import { Link2 } from "lucide-react"
import { useWatch, type Control, type FieldErrors, type UseFormSetValue } from "react-hook-form"
import type { CustomInvoiceLinkCandidate, CustomInvoiceModule } from "@/api/customInvoices"
import { clearInvoiceLink, type CustomInvoiceFormValues } from "../schemas/customInvoice.schemas"
import { LinkInvoicePicker } from "./LinkInvoicePicker"

interface CustomInvoiceLinkSectionProps {
  control: Control<CustomInvoiceFormValues>
  setValue: UseFormSetValue<CustomInvoiceFormValues>
  errors: FieldErrors<CustomInvoiceFormValues>
  /** The invoice being edited, left out of its own candidates. Absent when creating. */
  invoiceUniqueId?: string
  disabled: boolean
}

const COPY_OPTIONS = { shouldDirty: true, shouldValidate: true } as const

function BuyerCopiedBanner({ invoiceNo, disabled, onChange }: { invoiceNo: string; disabled: boolean; onChange: () => void }) {
  return (
    <Flex
      role="status"
      align={{ base: "stretch", sm: "center" }}
      justify="space-between"
      direction={{ base: "column", sm: "row" }}
      gap={3}
      p={4}
      borderRadius="16px"
      bg="brand.50"
    >
      <Flex align="center" gap={2} color="brand.700">
        <Link2 size={18} aria-hidden="true" />
        <Text fontSize="sm" fontWeight="700">{`Buyer copied from ${invoiceNo}`}</Text>
      </Flex>
      {disabled ? null : (
        <Button variant="outline" borderRadius="14px" minH="11" px={4} w={{ base: "full", sm: "auto" }} cursor="pointer" onClick={onChange}>
          Change invoice
        </Button>
      )}
    </Flex>
  )
}

/**
 * The editor's opt-in "Link to an existing invoice" switch (D-09). Picking an invoice of the same module
 * copies its buyer's name and email into the form, where they stay locked while linked (D-12); switching off
 * releases them with the copied values kept.
 */
export function CustomInvoiceLinkSection({ control, setValue, errors, invoiceUniqueId, disabled }: CustomInvoiceLinkSectionProps) {
  const [isChoosing, setIsChoosing] = useState(false)
  const moduleType = useWatch({ control, name: "moduleType" }) as CustomInvoiceModule | undefined
  const linkToExisting = useWatch({ control, name: "linkToExisting" })
  const linkedInvoiceUniqueId = useWatch({ control, name: "linkedInvoiceUniqueId" })
  const linkedInvoiceNo = useWatch({ control, name: "linkedInvoiceNo" })

  const isSwitchDisabled = disabled || !moduleType
  const showPicker = linkToExisting && (!linkedInvoiceUniqueId || isChoosing)

  function handleToggle(checked: boolean) {
    setIsChoosing(false)
    if (checked) {
      setValue("linkToExisting", true, { shouldDirty: true })
      return
    }
    clearInvoiceLink(setValue)
  }

  function handlePick(invoice: CustomInvoiceLinkCandidate) {
    setValue("linkedInvoiceUniqueId", invoice.invoiceUniqueId, COPY_OPTIONS)
    setValue("linkedInvoiceNo", invoice.invoiceNo, { shouldDirty: true })
    setValue("memberUniqueId", "", { shouldDirty: true })
    setValue("firstName", invoice.buyerFirstName ?? "", COPY_OPTIONS)
    setValue("middleName", invoice.buyerMiddleName ?? "", COPY_OPTIONS)
    setValue("lastName", invoice.buyerLastName, COPY_OPTIONS)
    setValue("email", invoice.buyerEmail, COPY_OPTIONS)
    setIsChoosing(false)
  }

  return (
    <Stack gap={4}>
      <Field.Root disabled={isSwitchDisabled}>
        <Switch.Root
          checked={linkToExisting}
          disabled={isSwitchDisabled}
          colorPalette="brand"
          display="flex"
          alignItems="center"
          gap={3}
          minH="11"
          cursor={isSwitchDisabled ? "not-allowed" : "pointer"}
          onCheckedChange={(details) => handleToggle(details.checked)}
        >
          <Switch.HiddenInput />
          <Switch.Control />
          <Switch.Label fontSize="sm" fontWeight="700" color="text.primary" cursor="inherit">
            Link to an existing invoice
          </Switch.Label>
        </Switch.Root>
        <Field.HelperText>{moduleType ? "Copies the buyer from an invoice of the same module." : "Choose a module first"}</Field.HelperText>
      </Field.Root>

      {linkToExisting && linkedInvoiceUniqueId && !isChoosing ? (
        <BuyerCopiedBanner invoiceNo={linkedInvoiceNo || "the linked invoice"} disabled={disabled} onChange={() => setIsChoosing(true)} />
      ) : null}

      {showPicker && moduleType ? (
        <Stack gap={2}>
          <LinkInvoicePicker
            moduleType={moduleType}
            excludeInvoiceUniqueId={invoiceUniqueId}
            selectedInvoiceUniqueId={linkedInvoiceUniqueId ?? null}
            onSelect={handlePick}
          />
          {errors.linkedInvoiceUniqueId ? (
            <Text role="alert" fontSize="sm" fontWeight="700" color="status.error.fg">
              {errors.linkedInvoiceUniqueId.message}
            </Text>
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  )
}
