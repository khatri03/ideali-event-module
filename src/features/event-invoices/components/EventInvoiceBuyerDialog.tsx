import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Box, Button, chakra, CloseButton, Dialog, Field, Flex, Input, Stack, Text } from "@chakra-ui/react"
import { AlertTriangle } from "lucide-react"
import { extractApiError } from "@/utils/errors"
import { buyerSchema, type BuyerFormValues } from "../schemas/buyer.schemas"
import { useResendEventInvoice, useUpdateEventInvoiceBuyer } from "../hooks/useEventInvoices"

interface EventInvoiceBuyerDialogProps {
  /** Reactive visibility. The dialog stays mounted between opens so its close transition can run. */
  open: boolean
  /** Bumped by the caller on every open, so the form below remounts with a clean slate each time. */
  editSessionKey: number
  invoiceUniqueId: string
  buyerName: string
  buyerEmail: string | null
  buyerPhone: string | null
  /** Whether the order still has tickets that could be sent to a corrected address. */
  hasIssuedTickets: boolean
  canResendTickets: boolean
  onClose: () => void
}

/**
 * Owns only the dialog chrome. Kept mounted across opens so Ark's dialog machine runs its own close
 * transition (releasing the scroll lock and focus trap it set up) before anything is torn down, rather
 * than that cleanup being skipped because the component vanished mid-transition.
 */
export function EventInvoiceBuyerDialog({
  open,
  editSessionKey,
  invoiceUniqueId,
  buyerName,
  buyerEmail,
  buyerPhone,
  hasIssuedTickets,
  canResendTickets,
  onClose,
}: EventInvoiceBuyerDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(details) => (details.open ? null : onClose())} size={{ base: "full", md: "md" }}>
      <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
      <Dialog.Positioner p={{ base: 0, md: 4 }}>
        <Dialog.Content
          bg="card.bg"
          borderRadius={{ base: 0, md: "24px" }}
          w="full"
          maxW={{ base: "full", md: "560px" }}
          minH={{ base: "100dvh", md: "auto" }}
          maxH={{ base: "100dvh", md: "calc(100dvh - 2rem)" }}
          alignSelf="center"
          mx="auto"
          overflow="hidden"
        >
          <Box px={{ base: 5, md: 6 }} pt={6} pb={4} borderBottom="1px solid" borderColor="border.subtle">
            <Flex align="flex-start" justify="space-between" gap={4}>
              <Dialog.Title fontSize="lg" fontWeight="800" color="text.primary">
                Edit buyer details
              </Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton aria-label="Close edit buyer" cursor="pointer" />
              </Dialog.CloseTrigger>
            </Flex>
          </Box>

          <EventInvoiceBuyerForm
            key={editSessionKey}
            invoiceUniqueId={invoiceUniqueId}
            buyerName={buyerName}
            buyerEmail={buyerEmail}
            buyerPhone={buyerPhone}
            hasIssuedTickets={hasIssuedTickets}
            canResendTickets={canResendTickets}
            onClose={onClose}
          />
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

interface EventInvoiceBuyerFormProps {
  invoiceUniqueId: string
  buyerName: string
  buyerEmail: string | null
  buyerPhone: string | null
  hasIssuedTickets: boolean
  canResendTickets: boolean
  onClose: () => void
}

/**
 * The form, its mutations and its resend opt-in - remounted fresh (via the parent's `key`) every time
 * editing starts, so a stale value or a previous attempt's error never survives into a later edit.
 */
function EventInvoiceBuyerForm({
  invoiceUniqueId,
  buyerName,
  buyerEmail,
  buyerPhone,
  hasIssuedTickets,
  canResendTickets,
  onClose,
}: EventInvoiceBuyerFormProps) {
  const [shouldResend, setShouldResend] = useState(false)
  const updateMutation = useUpdateEventInvoiceBuyer(invoiceUniqueId)
  const resendMutation = useResendEventInvoice(invoiceUniqueId)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<BuyerFormValues>({
    resolver: zodResolver(buyerSchema),
    defaultValues: {
      buyerName,
      buyerEmail: buyerEmail ?? "",
      buyerPhone: buyerPhone ?? "",
    },
  })

  const nextEmail = useWatch({ control, name: "buyerEmail" })
  const isEmailChanged = nextEmail.trim().toLowerCase() !== (buyerEmail ?? "").trim().toLowerCase()
  const canOfferResend = isEmailChanged && hasIssuedTickets && canResendTickets
  const isSaving = updateMutation.isPending || resendMutation.isPending

  async function onSubmit(values: BuyerFormValues) {
    try {
      await updateMutation.mutateAsync({
        buyerName: values.buyerName,
        buyerEmail: values.buyerEmail,
        buyerPhone: values.buyerPhone.trim() || null,
      })

      if (canOfferResend && shouldResend) {
        await resendMutation.mutateAsync()
      }

      onClose()
    } catch {
      // Kept open so the error banner below stays on screen with the values that failed still in view.
    }
  }

  const saveError = updateMutation.error ?? resendMutation.error

  return (
    <Dialog.Body as="form" onSubmit={handleSubmit(onSubmit)} px={{ base: 5, md: 6 }} py={5} overflowY="auto">
      <Stack gap={4}>
        <Field.Root invalid={Boolean(errors.buyerName)}>
          <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
            Name
          </Field.Label>
          <Input {...register("buyerName")} minH="11" borderRadius="12px" autoComplete="off" />
          <Field.ErrorText>{errors.buyerName?.message}</Field.ErrorText>
        </Field.Root>

        <Field.Root invalid={Boolean(errors.buyerEmail)}>
          <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
            Email
          </Field.Label>
          <Input {...register("buyerEmail")} inputMode="email" minH="11" borderRadius="12px" autoComplete="off" />
          <Field.ErrorText>{errors.buyerEmail?.message}</Field.ErrorText>
        </Field.Root>

        <Field.Root invalid={Boolean(errors.buyerPhone)}>
          <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
            Phone
          </Field.Label>
          <Input {...register("buyerPhone")} minH="11" borderRadius="12px" autoComplete="off" />
          <Field.HelperText>Optional.</Field.HelperText>
          <Field.ErrorText>{errors.buyerPhone?.message}</Field.ErrorText>
        </Field.Root>

        {isEmailChanged && hasIssuedTickets ? (
          <Box borderRadius="16px" bg="status.warning.bg" p={4}>
            <Flex gap={3} align="flex-start">
              <Box color="status.warning.fg" pt={0.5}>
                <AlertTriangle size={18} aria-hidden="true" />
              </Box>
              <Stack gap={2}>
                <Text fontSize="sm" fontWeight="700" color="status.warning.fg">
                  {`This order's tickets already went to ${buyerEmail || "the previous address"}.`}
                </Text>
                <Text fontSize="sm" color="status.warning.fg">
                  Changing the address here does not move them. The buyer only receives them at the new
                  address if they are sent again.
                </Text>
                {canResendTickets ? (
                  <Flex
                    as="label"
                    align="center"
                    gap={2}
                    mt={1}
                    minH="11"
                    cursor="pointer"
                    fontSize="sm"
                    fontWeight="700"
                    color="status.warning.fg"
                  >
                    <chakra.input
                      type="checkbox"
                      checked={shouldResend}
                      onChange={(event) => setShouldResend(event.target.checked)}
                      w="4"
                      h="4"
                      cursor="pointer"
                      accentColor="currentColor"
                    />
                    Resend every ticket to the new address after saving
                  </Flex>
                ) : (
                  <Text fontSize="sm" color="status.warning.fg">
                    This order is cancelled, so its tickets cannot be sent again.
                  </Text>
                )}
              </Stack>
            </Flex>
          </Box>
        ) : null}

        {saveError ? (
          <Box role="alert" p={4} borderRadius="16px" bg="status.error.bg">
            <Text fontSize="sm" fontWeight="700" color="status.error.fg">
              {extractApiError(saveError)}
            </Text>
          </Box>
        ) : null}
      </Stack>

      <Flex pt={6} justify="flex-end" gap={3} direction={{ base: "column-reverse", md: "row" }}>
        <Button
          variant="outline"
          borderRadius="14px"
          minH="11"
          px={6}
          w={{ base: "full", md: "auto" }}
          cursor="pointer"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          colorPalette="brand"
          color="white"
          borderRadius="14px"
          minH="11"
          px={6}
          w={{ base: "full", md: "auto" }}
          disabled={isSaving}
          loading={isSaving}
          loadingText="Saving..."
          cursor={isSaving ? "not-allowed" : "pointer"}
          bg="brand.gradient"
        >
          Save buyer details
        </Button>
      </Flex>
    </Dialog.Body>
  )
}
