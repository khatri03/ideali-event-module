import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "react-router-dom"
import {
  Box,
  Button,
  Checkbox,
  Field,
  Flex,
  Heading,
  Input,
  NativeSelect,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react"
import { ArrowLeft, Send } from "lucide-react"
import type { AlertRecipientOption } from "@/api/alerts"
import { APP_ROUTES } from "@/utils/routes"
import { alertFormSchema, toChannelMask, type AlertFormValues } from "../schemas/alert.schemas"
import { useCreateAlert } from "../hooks/useAlertMutations"
import { PRIORITY_OPTIONS } from "../constants"
import { RecipientPicker } from "./RecipientPicker"

export function AlertComposer() {
  const navigate = useNavigate()
  const createMutation = useCreateAlert()
  const [recipients, setRecipients] = useState<AlertRecipientOption[]>([])

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<AlertFormValues>({
    resolver: zodResolver(alertFormSchema),
    defaultValues: {
      title: "",
      body: "",
      priority: "Normal",
      instant: true,
      email: false,
      scheduleForLater: false,
      scheduledAtUtc: null,
      recipientUniqueIds: [],
    },
  })

  const scheduleForLater = useWatch({ control, name: "scheduleForLater" })

  function handleRecipientsChange(next: AlertRecipientOption[]) {
    setRecipients(next)
    setValue("recipientUniqueIds", next.map((recipient) => recipient.uniqueId), {
      shouldValidate: true,
    })
  }

  async function handleSend(values: AlertFormValues) {
    await createMutation.mutateAsync({
      title: values.title.trim(),
      body: values.body.trim(),
      priority: values.priority,
      channels: toChannelMask(values.instant, values.email),
      scheduledAtUtc:
        values.scheduleForLater && values.scheduledAtUtc
          ? new Date(values.scheduledAtUtc).toISOString()
          : null,
      recipientUniqueIds: values.recipientUniqueIds,
    })
    navigate(APP_ROUTES.memberAlerts.list)
  }

  return (
    <Stack gap={5} w="full">
      <Flex align="center" gap={3}>
        <Button
          variant="outline"
          borderRadius="14px"
          minH="11"
          px={4}
          cursor="pointer"
          onClick={() => navigate(APP_ROUTES.memberAlerts.list)}
        >
          <ArrowLeft size={16} />
          Back to alerts
        </Button>
      </Flex>

      <Box
        as="form"
        onSubmit={handleSubmit(handleSend)}
        borderRadius="20px"
        border="1px solid"
        borderColor="border.subtle"
        bg="card.bg"
        boxShadow="card"
        p={{ base: 4, md: 6 }}
      >
        <Heading fontSize={{ base: "xl", md: "2xl" }} fontWeight="800" color="gray.900" mb={5}>
          New alert
        </Heading>

        <Stack gap={5}>
          <Field.Root invalid={Boolean(errors.recipientUniqueIds)}>
            <Field.Label fontWeight="700">
              Recipients <Text as="span" color="red.500">*</Text>
            </Field.Label>
            <Box w="full">
              <RecipientPicker value={recipients} onChange={handleRecipientsChange} />
            </Box>
            {errors.recipientUniqueIds ? (
              <Field.ErrorText>{errors.recipientUniqueIds.message}</Field.ErrorText>
            ) : null}
          </Field.Root>

          <Field.Root invalid={Boolean(errors.title)}>
            <Field.Label fontWeight="700">
              Title <Text as="span" color="red.500">*</Text>
            </Field.Label>
            <Input {...register("title")} minH="11" borderRadius="14px" px={4} placeholder="Alert title" />
            {errors.title ? <Field.ErrorText>{errors.title.message}</Field.ErrorText> : null}
          </Field.Root>

          <Field.Root invalid={Boolean(errors.body)}>
            <Field.Label fontWeight="700">
              Message <Text as="span" color="red.500">*</Text>
            </Field.Label>
            <Textarea
              {...register("body")}
              borderRadius="14px"
              px={4}
              py={3}
              rows={6}
              placeholder="What do you want to tell them?"
            />
            {errors.body ? <Field.ErrorText>{errors.body.message}</Field.ErrorText> : null}
          </Field.Root>

          <Flex gap={5} direction={{ base: "column", md: "row" }}>
            <Field.Root flex={1}>
              <Field.Label fontWeight="700">Priority</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field {...register("priority")} borderRadius="14px" minH="11" ps={4} pe={8}>
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>

            <Field.Root flex={1} invalid={Boolean(errors.instant)}>
              <Field.Label fontWeight="700">
                Channels <Text as="span" color="red.500">*</Text>
              </Field.Label>
              <Flex gap={5} align="center" minH="11">
                <Controller
                  control={control}
                  name="instant"
                  render={({ field }) => (
                    <Checkbox.Root
                      checked={field.value}
                      onCheckedChange={(details) => field.onChange(details.checked === true)}
                      cursor="pointer"
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label>Instant</Checkbox.Label>
                    </Checkbox.Root>
                  )}
                />
                <Controller
                  control={control}
                  name="email"
                  render={({ field }) => (
                    <Checkbox.Root
                      checked={field.value}
                      onCheckedChange={(details) => field.onChange(details.checked === true)}
                      cursor="pointer"
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label>Email</Checkbox.Label>
                    </Checkbox.Root>
                  )}
                />
              </Flex>
              {errors.instant ? <Field.ErrorText>{errors.instant.message}</Field.ErrorText> : null}
            </Field.Root>
          </Flex>

          <Field.Root invalid={Boolean(errors.scheduledAtUtc)}>
            <Controller
              control={control}
              name="scheduleForLater"
              render={({ field }) => (
                <Checkbox.Root
                  checked={field.value}
                  onCheckedChange={(details) => field.onChange(details.checked === true)}
                  cursor="pointer"
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label fontWeight="700">Schedule for later</Checkbox.Label>
                </Checkbox.Root>
              )}
            />
            {scheduleForLater ? (
              <Box mt={3}>
                <Input
                  {...register("scheduledAtUtc")}
                  type="datetime-local"
                  minH="11"
                  borderRadius="14px"
                  px={4}
                  maxW={{ base: "full", md: "320px" }}
                />
                {errors.scheduledAtUtc ? (
                  <Field.ErrorText>{errors.scheduledAtUtc.message}</Field.ErrorText>
                ) : null}
              </Box>
            ) : null}
          </Field.Root>

          <Flex justify="flex-end" pt={2}>
            <Button
              type="submit"
              borderRadius="14px"
              h="44px"
              px={7}
              w={{ base: "full", md: "auto" }}
              color="white"
              cursor="pointer"
              loading={createMutation.isPending}
              loadingText={scheduleForLater ? "Scheduling..." : "Sending..."}
              disabled={createMutation.isPending}
              style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
            >
              <Send size={16} />
              {scheduleForLater ? "Schedule alert" : "Send alert"}
            </Button>
          </Flex>
        </Stack>
      </Box>
    </Stack>
  )
}
