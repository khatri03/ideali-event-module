import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button, Field, Input, Stack, Text } from "@chakra-ui/react"
import { z } from "zod"
import { useConfirmationRequest } from "@/hooks/useConfirmationRequest"
import { CheckInConfirmDialog } from "./CheckInConfirmDialog"

const manualCodeSchema = z.object({
  ticketCode: z.string().trim().min(1, "Enter the ticket code printed on the ticket.").max(100),
})

type ManualCodeValues = z.infer<typeof manualCodeSchema>

interface ManualTicketCodeEntryProps {
  isSubmitting: boolean
  isDisabled: boolean
  onSubmit: (ticketCode: string) => void
}

/**
 * The tier that always works. A camera can be refused, unsupported or defeated by a creased ticket;
 * the code is printed under every QR precisely so it can be read out and typed.
 */
export function ManualTicketCodeEntry({ isSubmitting, isDisabled, onSubmit }: ManualTicketCodeEntryProps) {
  const confirmation = useConfirmationRequest<string>()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ManualCodeValues>({
    resolver: zodResolver(manualCodeSchema),
    defaultValues: { ticketCode: "" },
  })

  function handleConfirm() {
    confirmation.confirm(onSubmit)
    reset({ ticketCode: "" })
  }

  return (
    <>
      <form onSubmit={handleSubmit((values) => confirmation.open(values.ticketCode.trim()))} noValidate>
        <Stack direction={{ base: "column", md: "row" }} gap={3} align={{ base: "stretch", md: "flex-end" }}>
          <Field.Root flex="1" minW={0} invalid={Boolean(errors.ticketCode)}>
            <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
              Ticket code
            </Field.Label>
            <Input
              {...register("ticketCode")}
              placeholder="e.g. TKT-4F92A1"
              aria-label="Ticket code"
              autoComplete="off"
              autoCapitalize="characters"
              fontFamily="mono"
              minH="11"
              px={4}
              borderRadius="14px"
              disabled={isDisabled}
              cursor={isDisabled ? "not-allowed" : "text"}
            />
            {errors.ticketCode ? (
              <Text mt={1} fontSize="xs" color="status.error.fg">
                {errors.ticketCode.message}
              </Text>
            ) : null}
          </Field.Root>

          <Button
            type="submit"
            minH="11"
            px={6}
            borderRadius="14px"
            fontWeight="700"
            color="white"
            bg="brand.gradient"
            w={{ base: "full", md: "auto" }}
            flexShrink={0}
            cursor={isDisabled || isSubmitting ? "not-allowed" : "pointer"}
            disabled={isDisabled || isSubmitting}
            loading={isSubmitting}
            loadingText="Checking..."
          >
            Check in
          </Button>
        </Stack>
      </form>

      {/*
        Outside the form on purpose: the dialog's own buttons would otherwise default to type="submit"
        and re-enter the handler that opened it. Cancelling leaves the typed code in the field, so a
        misread character is corrected rather than retyped.
      */}
      {confirmation.request !== null ? (
        <CheckInConfirmDialog
          kind="manualCheckIn"
          ticketCode={confirmation.request}
          isOpen={confirmation.isOpen}
          onConfirm={handleConfirm}
          onCancel={confirmation.close}
        />
      ) : null}
    </>
  )
}
