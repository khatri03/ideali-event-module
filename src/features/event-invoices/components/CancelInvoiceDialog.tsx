import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Field, Stack, Text, Textarea } from "@chakra-ui/react"
import { ConfirmDialog } from "@/components/common"
import {
  CANCELLATION_NOTES_MAX,
  cancelInvoiceSchema,
  type CancelInvoiceFormValues,
} from "../schemas/cancelInvoice.schemas"

interface CancelInvoiceDialogProps {
  /** Reactive visibility. The dialog stays mounted between opens so its close transition can run. */
  open: boolean
  invoiceNo: string
  isPending: boolean
  errorMessage: string | null
  onConfirm: (cancellationNotes: string) => void
  onClose: () => void
}

/** The cancel confirmation, with the reason the server requires captured before it can be sent. */
export function CancelInvoiceDialog({
  open,
  invoiceNo,
  isPending,
  errorMessage,
  onConfirm,
  onClose,
}: CancelInvoiceDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CancelInvoiceFormValues>({
    resolver: zodResolver(cancelInvoiceSchema),
    defaultValues: { cancellationNotes: "" },
  })
  const notesLength = useWatch({ control, name: "cancellationNotes" }).length

  // A reason typed for an earlier, abandoned attempt must not ride along into the next one.
  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const submit = handleSubmit((values) => onConfirm(values.cancellationNotes))

  return (
    <ConfirmDialog
      open={open}
      title="Cancel this order"
      description={
        <Stack gap={4}>
          <Text>
            Order <strong>{invoiceNo}</strong> will be closed unpaid, the seats it holds released, and the buyer
            emailed. Its tickets can no longer be sent out. This cannot be undone.
          </Text>
          <Field.Root invalid={Boolean(errors.cancellationNotes)}>
            <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
              Reason for cancelling
            </Field.Label>
            <Textarea
              {...register("cancellationNotes")}
              maxLength={CANCELLATION_NOTES_MAX}
              minH="120px"
              resize="vertical"
              placeholder="Why is this order being cancelled?"
            />
            <Field.HelperText>
              Required. Saved to the invoice notes. {notesLength}/{CANCELLATION_NOTES_MAX} characters
            </Field.HelperText>
            <Field.ErrorText>{errors.cancellationNotes?.message}</Field.ErrorText>
          </Field.Root>
        </Stack>
      }
      confirmLabel="Cancel order"
      loadingLabel="Cancelling..."
      tone="destructive"
      errorMessage={errorMessage}
      isPending={isPending}
      onConfirm={() => void submit()}
      onClose={onClose}
    />
  )
}
