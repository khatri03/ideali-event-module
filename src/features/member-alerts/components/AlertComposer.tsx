import { useMemo, useState } from "react"
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
  Tag,
  Tabs,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react"
import ReactSelect, { type MultiValue } from "react-select"
import { ArrowLeft, Send } from "lucide-react"
import type { AlertRecipientOption } from "@/api/alerts"
import { APP_ROUTES } from "@/utils/routes"
import { alertFormSchema, toChannelMask, type AlertFormValues } from "../schemas/alert.schemas"
import { useCreateAlert } from "../hooks/useAlertMutations"
import { useAlertCustomListOptions, useAlertMembershipTypeOptions } from "../hooks/useAlerts"
import { PRIORITY_OPTIONS } from "../constants"
import { RecipientPicker } from "./RecipientPicker"

type RecipientSourceTab = "individuals" | "membership-types" | "custom-lists"

const RECIPIENT_SOURCE_TABS: { value: RecipientSourceTab; label: string }[] = [
  { value: "individuals", label: "Individuals" },
  { value: "membership-types", label: "Membership Types" },
  { value: "custom-lists", label: "Custom Lists" },
]

function formatCountLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

export function AlertComposer() {
  const navigate = useNavigate()
  const createMutation = useCreateAlert()
  const [recipients, setRecipients] = useState<AlertRecipientOption[]>([])
  const [activeRecipientTab, setActiveRecipientTab] = useState<RecipientSourceTab>("individuals")
  const membershipTypesQuery = useAlertMembershipTypeOptions()
  const customListsQuery = useAlertCustomListOptions()

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
      membershipTypeUniqueIds: [],
      customListUniqueIds: [],
    },
  })

  const scheduleForLater = useWatch({ control, name: "scheduleForLater" })
  const membershipTypeIds = useWatch({ control, name: "membershipTypeUniqueIds" })
  const customListIds = useWatch({ control, name: "customListUniqueIds" })

  const selectedMembershipTypeMap = useMemo(
    () => new Map((membershipTypesQuery.data ?? []).map((option) => [option.uniqueId, option] as const)),
    [membershipTypesQuery.data],
  )
  const selectedCustomListMap = useMemo(
    () => new Map((customListsQuery.data ?? []).map((option) => [option.uniqueId, option] as const)),
    [customListsQuery.data],
  )

  const membershipTypeOptions = useMemo(
    () =>
      (membershipTypesQuery.data ?? []).map((option) => ({
        value: option.uniqueId,
        label: `${option.name} (${option.memberCount})`,
      })),
    [membershipTypesQuery.data],
  )
  const customListOptions = useMemo(
    () =>
      (customListsQuery.data ?? []).map((option) => ({
        value: option.uniqueId,
        label: `${option.name} (${option.memberCount})`,
      })),
    [customListsQuery.data],
  )

  const selectedMembershipTypes = membershipTypeOptions.filter((option) =>
    (membershipTypeIds ?? []).includes(option.value),
  )
  const selectedCustomLists = customListOptions.filter((option) =>
    (customListIds ?? []).includes(option.value),
  )

  const selectedMembershipTypeTotal = selectedMembershipTypes.reduce((total, option) => {
    const selected = selectedMembershipTypeMap.get(option.value)
    return total + (selected?.memberCount ?? 0)
  }, 0)
  const selectedCustomListTotal = selectedCustomLists.reduce((total, option) => {
    const selected = selectedCustomListMap.get(option.value)
    return total + (selected?.memberCount ?? 0)
  }, 0)
  const estimatedRecipientTotal = recipients.length + selectedMembershipTypeTotal + selectedCustomListTotal
  const recipientSummary = `Sending to: ${formatCountLabel(recipients.length, "member")} - ${formatCountLabel(selectedMembershipTypes.length, "membership type")} (~${selectedMembershipTypeTotal}) - ${formatCountLabel(selectedCustomLists.length, "list")} (~${selectedCustomListTotal}) - ~${estimatedRecipientTotal} recipients`

  function handleRecipientsChange(next: AlertRecipientOption[]) {
    setRecipients(next)
    setValue("recipientUniqueIds", next.map((recipient) => recipient.uniqueId), {
      shouldValidate: true,
    })
  }

  function handleRecipientRemove(uniqueId: string) {
    const nextRecipients = recipients.filter((recipient) => recipient.uniqueId !== uniqueId)
    handleRecipientsChange(nextRecipients)
  }

  function handleMembershipTypeChange(next: MultiValue<{ value: string; label: string }>) {
    setValue(
      "membershipTypeUniqueIds",
      next.map((option) => option.value),
      { shouldValidate: true },
    )
  }

  function handleCustomListChange(next: MultiValue<{ value: string; label: string }>) {
    setValue(
      "customListUniqueIds",
      next.map((option) => option.value),
      { shouldValidate: true },
    )
  }

  function handleMembershipTypeRemove(uniqueId: string) {
    setValue(
      "membershipTypeUniqueIds",
      (membershipTypeIds ?? []).filter((value) => value !== uniqueId),
      { shouldValidate: true },
    )
  }

  function handleCustomListRemove(uniqueId: string) {
    setValue(
      "customListUniqueIds",
      (customListIds ?? []).filter((value) => value !== uniqueId),
      { shouldValidate: true },
    )
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
      membershipTypeUniqueIds: values.membershipTypeUniqueIds,
      customListUniqueIds: values.customListUniqueIds,
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
          <Box borderRadius="18px" border="1px solid" borderColor="border.subtle" bg="card.bg" p={{ base: 4, md: 5 }}>
            <Stack gap={5}>
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
            </Stack>
          </Box>

          <Box borderRadius="18px" border="1px solid" borderColor="border.subtle" bg="card.bg" p={{ base: 4, md: 5 }}>
            <Stack gap={4}>
              <Box borderRadius="16px" border="1px solid" borderColor="border.subtle" bg="gray.50" p={{ base: 4, md: 5 }}>
                <Stack gap={3}>
                  <Flex
                    align={{ base: "flex-start", md: "center" }}
                    justify="space-between"
                    gap={3}
                    direction={{ base: "column", md: "row" }}
                  >
                    <Text fontSize="sm" fontWeight="800" color="gray.900">
                      {recipientSummary}
                    </Text>
                  </Flex>

                  <Flex gap={2} flexWrap="wrap">
                    {recipients.map((recipient) => (
                      <Tag.Root
                        key={recipient.uniqueId}
                        size="md"
                        variant="surface"
                        colorPalette="blue"
                        borderRadius="full"
                        minH="28px"
                        ps={3}
                        pe={1.5}
                        py={1}
                        gap={1.5}
                      >
                        <Tag.Label
                          lineClamp={1}
                          title={recipient.email ? `${recipient.name} (${recipient.email})` : recipient.name}
                          fontWeight="600"
                        >
                          {recipient.name}
                        </Tag.Label>
                        <Tag.EndElement ms={0}>
                          <Tag.CloseTrigger
                            aria-label={`Remove ${recipient.name}`}
                            title={`Remove ${recipient.name}`}
                            cursor="pointer"
                            boxSize="18px"
                            borderRadius="full"
                            _hover={{ bg: "red.100", color: "red.600" }}
                            onClick={() => handleRecipientRemove(recipient.uniqueId)}
                          />
                        </Tag.EndElement>
                      </Tag.Root>
                    ))}

                    {selectedMembershipTypes.map((option) => {
                      const item = selectedMembershipTypeMap.get(option.value)
                      return (
                        <Tag.Root
                          key={option.value}
                          size="md"
                          variant="surface"
                          colorPalette="purple"
                          borderRadius="full"
                          minH="28px"
                          ps={3}
                          pe={1.5}
                          py={1}
                          gap={1.5}
                        >
                          <Tag.Label lineClamp={1} title={option.label} fontWeight="600">
                            {item ? `${item.name} (${item.memberCount})` : option.label}
                          </Tag.Label>
                          <Tag.EndElement ms={0}>
                            <Tag.CloseTrigger
                              aria-label={`Remove ${option.label}`}
                              title={`Remove ${option.label}`}
                              cursor="pointer"
                              boxSize="18px"
                              borderRadius="full"
                              _hover={{ bg: "red.100", color: "red.600" }}
                              onClick={() => handleMembershipTypeRemove(option.value)}
                            />
                          </Tag.EndElement>
                        </Tag.Root>
                      )
                    })}

                    {selectedCustomLists.map((option) => {
                      const item = selectedCustomListMap.get(option.value)
                      return (
                        <Tag.Root
                          key={option.value}
                          size="md"
                          variant="surface"
                          colorPalette="green"
                          borderRadius="full"
                          minH="28px"
                          ps={3}
                          pe={1.5}
                          py={1}
                          gap={1.5}
                        >
                          <Tag.Label lineClamp={1} title={option.label} fontWeight="600">
                            {item ? `${item.name} (${item.memberCount})` : option.label}
                          </Tag.Label>
                          <Tag.EndElement ms={0}>
                            <Tag.CloseTrigger
                              aria-label={`Remove ${option.label}`}
                              title={`Remove ${option.label}`}
                              cursor="pointer"
                              boxSize="18px"
                              borderRadius="full"
                              _hover={{ bg: "red.100", color: "red.600" }}
                              onClick={() => handleCustomListRemove(option.value)}
                            />
                          </Tag.EndElement>
                        </Tag.Root>
                      )
                    })}
                  </Flex>

                  {errors.recipientUniqueIds ? (
                    <Text fontSize="sm" color="red.500" fontWeight="600">
                      {errors.recipientUniqueIds.message}
                    </Text>
                  ) : null}
                </Stack>
              </Box>

              <Box borderRadius="16px" border="1px solid" borderColor="border.subtle" bg="gray.50" p={{ base: 4, md: 5 }}>
                <Tabs.Root
                  value={activeRecipientTab}
                  onValueChange={(details) => setActiveRecipientTab(details.value as RecipientSourceTab)}
                  activationMode="manual"
                >
                  <Tabs.List
                    display="flex"
                    flexDirection={{ base: "column", md: "row" }}
                    gap={0}
                    borderBottom="1px solid"
                    borderColor="border.subtle"
                    mb={4}
                  >
                    {RECIPIENT_SOURCE_TABS.map((tab) => (
                      <Tabs.Trigger
                        key={tab.value}
                        value={tab.value}
                        flex={1}
                        minH="11"
                        justifyContent="center"
                        textAlign="center"
                        borderTopRadius="14px"
                        borderBottomRadius={0}
                        borderWidth="1px"
                        borderColor="border.subtle"
                        borderBottomColor="border.subtle"
                        bg="gray.50"
                        mb="-1px"
                        px={4}
                        py={3}
                        cursor="pointer"
                        fontWeight="700"
                        whiteSpace="nowrap"
                        _selected={{
                          bg: "card.bg",
                          color: "gray.900",
                          borderColor: "border.subtle",
                          borderBottomWidth: "0",
                          borderBottomColor: "card.bg",
                        }}
                        _hover={{ bg: "gray.100" }}
                      >
                        {tab.label}
                      </Tabs.Trigger>
                    ))}
                  </Tabs.List>

                  <Tabs.Content value="individuals">
                    <Field.Root>
                      <Field.Label fontWeight="700">
                        Recipients <Text as="span" color="red.500">*</Text>
                      </Field.Label>
                      <Text fontSize="xs" color="text.secondary" mb={2}>
                        Add individual members by name or email. Search starts after three characters.
                      </Text>
                      <Box w="full">
                        <RecipientPicker value={recipients} onChange={handleRecipientsChange} />
                      </Box>
                    </Field.Root>
                  </Tabs.Content>

                  <Tabs.Content value="membership-types">
                    <Field.Root>
                      <Field.Label fontWeight="700">Membership types</Field.Label>
                      <Text fontSize="xs" color="text.secondary" mb={2}>
                        All active members of the selected types are included when you send.
                      </Text>
                      <Box w="full">
                        <ReactSelect
                          isMulti
                          options={membershipTypeOptions}
                          value={selectedMembershipTypes}
                          onChange={handleMembershipTypeChange}
                          placeholder={membershipTypesQuery.isLoading ? "Loading..." : "All active members of a type"}
                          isLoading={membershipTypesQuery.isLoading}
                          closeMenuOnSelect={false}
                          isClearable
                        />
                      </Box>
                    </Field.Root>
                  </Tabs.Content>

                  <Tabs.Content value="custom-lists">
                    <Field.Root>
                      <Field.Label fontWeight="700">Custom lists</Field.Label>
                      <Text fontSize="xs" color="text.secondary" mb={2}>
                        Every member on a selected list will receive the alert.
                      </Text>
                      <Box w="full">
                        <ReactSelect
                          isMulti
                          options={customListOptions}
                          value={selectedCustomLists}
                          onChange={handleCustomListChange}
                          placeholder={customListsQuery.isLoading ? "Loading..." : "Every member of a list"}
                          isLoading={customListsQuery.isLoading}
                          closeMenuOnSelect={false}
                          isClearable
                        />
                      </Box>
                    </Field.Root>
                  </Tabs.Content>
                </Tabs.Root>
              </Box>
            </Stack>
          </Box>

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
