import { Button, Field, Flex, Grid, Input, Stack } from "@chakra-ui/react"
import { Trash2 } from "lucide-react"
import { useFormContext } from "react-hook-form"
import type { EventWizardValues } from "../schemas/eventWizard.schemas"

interface EventSessionRowProps {
  index: number
  onRemove?: () => void
  canRemove?: boolean
}

export function EventSessionRow({ index, onRemove, canRemove }: EventSessionRowProps) {
  const { register, formState: { errors } } = useFormContext<EventWizardValues>()
  const sessionErrors = errors.sessions?.[index]

  return (
    <Stack
      gap={4}
      p={{ base: 4, md: 5 }}
      borderRadius="20px"
      border="1px solid"
      borderColor="border.subtle"
      bg="app.bg"
    >
      <Grid gap={4} templateColumns={{ base: "1fr", md: "1fr 1fr" }}>
        <Field.Root invalid={!!sessionErrors?.title}>
          <Field.Label>Session Name</Field.Label>
          <Input
            placeholder="Keynote, workshop, networking..."
            {...register(`sessions.${index}.title`)}
          />
          <Field.ErrorText>{sessionErrors?.title?.message}</Field.ErrorText>
        </Field.Root>

        <Field.Root invalid={!!sessionErrors?.startsAt}>
          <Field.Label>Starts At</Field.Label>
          <Input type="datetime-local" {...register(`sessions.${index}.startsAt`)} />
          <Field.ErrorText>{sessionErrors?.startsAt?.message}</Field.ErrorText>
        </Field.Root>

        <Field.Root invalid={!!sessionErrors?.endsAt} gridColumn={{ md: "1 / -1" }}>
          <Field.Label>Ends At</Field.Label>
          <Input type="datetime-local" {...register(`sessions.${index}.endsAt`)} />
          <Field.ErrorText>{sessionErrors?.endsAt?.message}</Field.ErrorText>
        </Field.Root>
      </Grid>

      {canRemove && onRemove && (
        <Button
          variant="ghost"
          alignSelf="flex-start"
          colorPalette="red"
          borderRadius="12px"
          onClick={onRemove}
        >
          <Flex align="center" gap={2}>
            <Trash2 size={16} />
            Remove session
          </Flex>
        </Button>
      )}
    </Stack>
  )
}
