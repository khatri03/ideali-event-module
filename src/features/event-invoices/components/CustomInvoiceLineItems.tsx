import { Box, Field, Flex, IconButton, Input, Separator, Stack, Text } from "@chakra-ui/react"
import { Plus, Trash2 } from "lucide-react"
import { useFieldArray, useWatch, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form"
import { formatCurrency, sumMoney } from "@/utils/format"
import type { CustomInvoiceFormValues } from "../schemas/customInvoice.schemas"

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

interface CustomInvoiceLineItemsProps {
  control: Control<CustomInvoiceFormValues>
  register: UseFormRegister<CustomInvoiceFormValues>
  errors: FieldErrors<CustomInvoiceFormValues>
  disabled?: boolean
  currencySymbol?: string
}

const MOBILE_LABEL = { display: { base: "flex", md: "none" }, fontSize: "sm", fontWeight: "700", color: "text.primary" } as const

function TotalRow({ label, value, isStrong = false }: { label: string; value: string; isStrong?: boolean }) {
  return (
    <Flex justify="space-between" gap={4} py={2}>
      <Text fontSize={isStrong ? "md" : "sm"} fontWeight={isStrong ? "800" : "600"} color={isStrong ? "text.primary" : "text.secondary"}>
        {label}
      </Text>
      <Text fontSize={isStrong ? "lg" : "sm"} fontWeight={isStrong ? "900" : "700"} color="text.primary" textAlign="right">
        {value}
      </Text>
    </Flex>
  )
}

/**
 * The editable set of billed lines with a live, cent-exact running total. Each line is Description + Amount
 * only (no quantity, tax or discount in v1); the Subtotal and Grand total are summed from the amount strings
 * with {@link sumMoney} so what the organizer sees matches what the server will store to the cent. When
 * disabled - a paid invoice being read - every control is inert and the remove buttons disappear.
 */
export function CustomInvoiceLineItems({
  control,
  register,
  errors,
  disabled = false,
  currencySymbol = "$",
}: CustomInvoiceLineItemsProps) {
  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" })
  const watchedLines = useWatch({ control, name: "lineItems" }) ?? []

  const amounts = watchedLines.map((line) => {
    const amount = (line?.amount ?? "").trim()
    return AMOUNT_PATTERN.test(amount) ? amount : "0"
  })
  const subtotal = sumMoney(amounts)
  const canRemove = fields.length > 1 && !disabled

  return (
    <Stack gap={4}>
      <Flex display={{ base: "none", md: "flex" }} gap={4} px={1}>
        <Text flex="1" fontSize="xs" fontWeight="800" letterSpacing="0.04em" textTransform="uppercase" color="text.secondary">
          Description
        </Text>
        <Text w="200px" fontSize="xs" fontWeight="800" letterSpacing="0.04em" textTransform="uppercase" color="text.secondary">
          Amount
        </Text>
        {disabled ? null : <Box w="44px" flexShrink={0} aria-hidden="true" />}
      </Flex>

      <Stack gap={{ base: 5, md: 4 }}>
        {fields.map((field, index) => (
          <Flex key={field.id} gap={4} direction={{ base: "column", md: "row" }} align={{ base: "stretch", md: "flex-start" }}>
            <Field.Root flex="1" invalid={Boolean(errors.lineItems?.[index]?.description)}>
              <Field.Label {...MOBILE_LABEL}>Description</Field.Label>
              <Input
                minH="11"
                borderRadius="12px"
                autoComplete="off"
                placeholder="e.g. Gold sponsorship"
                aria-label={`Description for line ${index + 1}`}
                disabled={disabled}
                {...register(`lineItems.${index}.description` as const)}
              />
              <Field.ErrorText>{errors.lineItems?.[index]?.description?.message}</Field.ErrorText>
            </Field.Root>

            <Field.Root w={{ base: "full", md: "200px" }} invalid={Boolean(errors.lineItems?.[index]?.amount)}>
              <Field.Label {...MOBILE_LABEL}>Amount</Field.Label>
              <Flex position="relative" align="center" w="full">
                <Box position="absolute" left={3} color="text.secondary" pointerEvents="none" fontWeight="700" fontSize="sm">
                  {currencySymbol}
                </Box>
                <Input
                  minH="11"
                  borderRadius="12px"
                  pl={currencySymbol.length > 1 ? 12 : 8}
                  textAlign="right"
                  inputMode="decimal"
                  placeholder="0.00"
                  aria-label={`Amount for line ${index + 1}`}
                  disabled={disabled}
                  {...register(`lineItems.${index}.amount` as const)}
                />
              </Flex>
              <Field.ErrorText>{errors.lineItems?.[index]?.amount?.message}</Field.ErrorText>
            </Field.Root>

            {disabled ? null : (
              <IconButton
                variant="ghost"
                color="red.600"
                borderRadius="12px"
                minH="11"
                minW="11"
                mt={{ base: 0, md: "1px" }}
                aria-label={`Remove line item ${index + 1}`}
                disabled={!canRemove}
                cursor={canRemove ? "pointer" : "not-allowed"}
                _hover={canRemove ? { bg: "red.50" } : undefined}
                onClick={() => remove(index)}
              >
                <Trash2 size={18} />
              </IconButton>
            )}
          </Flex>
        ))}
      </Stack>

      {errors.lineItems?.root ? (
        <Text fontSize="sm" fontWeight="600" color="status.error.fg">
          {errors.lineItems.root.message}
        </Text>
      ) : null}

      {disabled ? null : (
        <Flex
          as="button"
          type="button"
          align="center"
          justify="center"
          gap={2}
          minH="11"
          w={{ base: "full", md: "auto" }}
          alignSelf="flex-start"
          px={5}
          borderRadius="12px"
          border="1px dashed"
          borderColor="border.subtle"
          bg="transparent"
          color="brand.600"
          fontWeight="700"
          fontSize="sm"
          cursor="pointer"
          _hover={{ bg: "brand.50", borderColor: "brand.300" }}
          onClick={() => append({ description: "", amount: "" })}
        >
          <Plus size={16} />
          Add line item
        </Flex>
      )}

      <Flex justify="flex-end">
        <Box w={{ base: "full", md: "360px" }}>
          <TotalRow label="Subtotal" value={formatCurrency(subtotal, currencySymbol)} />
          <Separator my={1} />
          <TotalRow label="Grand total" value={formatCurrency(subtotal, currencySymbol)} isStrong />
        </Box>
      </Flex>
    </Stack>
  )
}
