import { useEffect, useMemo, useState } from "react"
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
  SimpleGrid,
  SkeletonText,
  Stack,
  Tabs,
  Text,
} from "@chakra-ui/react"
import ReactSelect, { type MultiValue, type SingleValue } from "react-select"
import { ArrowLeft, Send } from "lucide-react"
import { APP_ROUTES } from "@/utils/routes"
import type { AlertCustomListPreviewFilters } from "@/api/alerts"
import { alertFormSchema, toChannelMask, type AlertFormValues } from "../schemas/alert.schemas"
import { useCreateAlert, useUpdateAlert } from "../hooks/useAlertMutations"
import {
  useAlert,
  useAlertCustomListOptions,
  useAlertMembershipStatusOptions,
  useAlertMembershipTypeOptions,
} from "../hooks/useAlerts"
import { PRIORITY_OPTIONS, toLocalDateTimeInputValue } from "../constants"
import { toaster } from "@/lib/toaster"
import { CurrentUtcClock } from "./CurrentUtcClock"
import { ScheduleCountdown } from "./ScheduleCountdown"
import { AlertMessageEditor } from "./AlertMessageEditor"
import { AlertAudiencePreview } from "./AlertAudiencePreview"
import { AlertCustomListsPreview } from "./AlertCustomListsPreview"
import { ConfirmAlertDialog } from "./ConfirmAlertDialog"

type AudienceTab = "members" | "custom-lists"

const AUDIENCE_TABS: { value: AudienceTab; label: string }[] = [
  { value: "members", label: "Members" },
  { value: "custom-lists", label: "Custom Lists" },
]

interface AlertComposerProps {
  /** Present only when editing an existing Scheduled alert; absent for a brand new one. */
  uniqueId?: string
}

export function AlertComposer({ uniqueId }: AlertComposerProps) {
  const navigate = useNavigate()
  const isEditMode = Boolean(uniqueId)
  const alertQuery = useAlert(uniqueId ?? "")
  const createMutation = useCreateAlert()
  const updateMutation = useUpdateAlert()
  const activeMutation = isEditMode ? updateMutation : createMutation
  const membershipTypesQuery = useAlertMembershipTypeOptions()
  const membershipStatusesQuery = useAlertMembershipStatusOptions()
  const customListsQuery = useAlertCustomListOptions()
  // null means "no explicit Apply click yet" - falls back to the loaded alert's audience in edit mode
  // (or empty, in create mode) rather than needing an effect to seed these from the async fetch.
  const [memberPreviewOverride, setMemberPreviewOverride] = useState<{
    membershipTypeUniqueId: string
    membershipStatus: string
  } | null>(null)
  const [customListPreviewOverride, setCustomListPreviewOverride] =
    useState<AlertCustomListPreviewFilters | null>(null)
  // Holds the validated form values while the send/schedule confirmation dialog is open.
  const [pendingValues, setPendingValues] = useState<AlertFormValues | null>(null)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AlertFormValues>({
    resolver: zodResolver(alertFormSchema),
    defaultValues: {
      targetMode: "members",
      title: "",
      body: "",
      priority: "Normal",
      channel: "",
      scheduleForLater: false,
      scheduledAtUtc: null,
      membershipTypeUniqueId: "",
      membershipStatus: "",
      customListUniqueIds: [],
    },
  })

  // Populates the form once the existing alert loads — defaultValues only apply at mount, and the fetch
  // is necessarily async, so this is what actually prefills edit mode.
  useEffect(() => {
    const detail = alertQuery.data
    if (!detail) {
      return
    }

    const channel: "" | "Instant" | "Email" =
      detail.channels === 1 ? "Instant" : detail.channels === 2 ? "Email" : ""
    const membershipTypeUniqueId = detail.audienceMembershipTypeUniqueIds[0] ?? ""
    const membershipStatus = detail.audienceMembershipStatuses[0] ?? ""
    const customListUniqueIds = detail.audienceCustomListUniqueIds

    reset({
      targetMode: customListUniqueIds.length > 0 ? "custom-lists" : "members",
      title: detail.title,
      body: detail.body,
      priority: detail.priority,
      channel,
      scheduleForLater: Boolean(detail.scheduledAtUtc),
      scheduledAtUtc: detail.scheduledAtUtc ? toLocalDateTimeInputValue(detail.scheduledAtUtc) : null,
      membershipTypeUniqueId,
      membershipStatus,
      customListUniqueIds,
    })
    // alertQuery.data changes identity on every refetch even when the content is the same; keying off the
    // alert's uniqueId instead keeps this from clobbering in-progress edits after a background refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertQuery.data?.uniqueId, reset])

  // Derived rather than synced via an effect: falls back to the loaded alert's audience (edit mode) or
  // empty (create mode) until the organizer explicitly presses Apply, which sets the override above.
  const appliedMemberPreviewFilters = memberPreviewOverride ?? {
    membershipTypeUniqueId: alertQuery.data?.audienceMembershipTypeUniqueIds[0] ?? "",
    membershipStatus: alertQuery.data?.audienceMembershipStatuses[0] ?? "",
  }
  const appliedCustomListPreviewFilters: AlertCustomListPreviewFilters = customListPreviewOverride ?? {
    membershipTypeUniqueIds: alertQuery.data?.audienceMembershipTypeUniqueIds ?? [],
    membershipStatuses: alertQuery.data?.audienceMembershipStatuses ?? [],
    customListUniqueIds: alertQuery.data?.audienceCustomListUniqueIds ?? [],
  }

  const scheduleForLater = useWatch({ control, name: "scheduleForLater" })
  const scheduledAtUtcValue = useWatch({ control, name: "scheduledAtUtc" })
  const activeTargetMode = useWatch({ control, name: "targetMode" })
  const selectedMembershipTypeUniqueId = useWatch({ control, name: "membershipTypeUniqueId" })
  const selectedMembershipStatusValue = useWatch({ control, name: "membershipStatus" })
  const customListUniqueIds = useWatch({ control, name: "customListUniqueIds" })

  const membershipTypeOptions = useMemo(
    () =>
      (membershipTypesQuery.data ?? []).map((option) => ({
        value: option.uniqueId,
        label: `${option.name} (${option.memberCount})`,
      })),
    [membershipTypesQuery.data],
  )
  const membershipStatusOptions = useMemo(
    () =>
      (membershipStatusesQuery.data ?? []).map((option) => ({
        value: option.value,
        label: option.text,
      })),
    [membershipStatusesQuery.data],
  )
  const customListOptions = useMemo(
    () =>
      (customListsQuery.data ?? []).map((option) => ({
        value: option.uniqueId,
        label: `${option.name} (${option.memberCount})`,
      })),
    [customListsQuery.data],
  )

  const selectedMembershipType =
    membershipTypeOptions.find((option) => option.value === selectedMembershipTypeUniqueId) ?? null
  const selectedMembershipStatus =
    membershipStatusOptions.find((option) => option.value === selectedMembershipStatusValue) ?? null

  // Submit only validates and opens the confirmation dialog; the actual send happens on confirm.
  function handleRequestSend(values: AlertFormValues) {
    setPendingValues(values)
  }

  // Zod validation failures otherwise fail silently: the only feedback is an inline Field.ErrorText,
  // which can sit inside the scrollable form section and go unnoticed (no toast, no spinner, no nav).
  function handleInvalidSubmit(fieldErrors: typeof errors) {
    const firstErrorName = Object.keys(fieldErrors)[0]
    const firstErrorMessage = Object.values(fieldErrors)[0]?.message
    document
      .querySelector(`[name="${firstErrorName}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" })
    toaster.create({
      type: "error",
      title: firstErrorMessage ?? "Fix the highlighted fields before saving.",
    })
  }

  async function handleConfirmSend() {
    if (!pendingValues) {
      return
    }
    try {
      await handleSend(pendingValues)
    } catch {
      // The failure is surfaced by the mutation's toast; keep the dialog open to retry or cancel.
    }
  }

  async function handleSend(values: AlertFormValues) {
    const payload = {
      title: values.title.trim(),
      body: values.body.trim(),
      priority: values.priority,
      channels: toChannelMask(values.channel),
      scheduledAtUtc:
        values.scheduleForLater && values.scheduledAtUtc
          ? new Date(values.scheduledAtUtc).toISOString()
          : null,
      recipientUniqueIds: [],
      membershipTypeUniqueIds: values.membershipTypeUniqueId ? [values.membershipTypeUniqueId] : [],
      membershipStatuses: values.membershipStatus ? [values.membershipStatus] : [],
      customListUniqueIds: values.targetMode === "custom-lists" ? values.customListUniqueIds : [],
    }

    if (isEditMode && uniqueId) {
      await updateMutation.mutateAsync({ uniqueId, payload })
      navigate(APP_ROUTES.memberAlerts.detail(uniqueId))
    } else {
      await createMutation.mutateAsync(payload)
      navigate(APP_ROUTES.memberAlerts.list)
    }
  }

  function handleApplyMembers() {
    setMemberPreviewOverride({
      membershipTypeUniqueId: selectedMembershipType?.value ?? "",
      membershipStatus: selectedMembershipStatus?.value ?? "",
    })
  }

  function handleApplyCustomLists() {
    setCustomListPreviewOverride({
      membershipTypeUniqueIds: selectedMembershipType?.value ? [selectedMembershipType.value] : [],
      membershipStatuses: selectedMembershipStatus?.value ? [selectedMembershipStatus.value] : [],
      customListUniqueIds,
    })
  }

  function handleAudienceChange(details: { value: string }) {
    setValue("targetMode", details.value as AudienceTab, { shouldValidate: true })
  }

  if (isEditMode && alertQuery.isLoading) {
    return (
      <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" boxShadow="card" p={6}>
        <SkeletonText noOfLines={6} />
      </Box>
    )
  }

  if (isEditMode && alertQuery.isError) {
    return (
      <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
        <Text fontSize="sm" fontWeight="700" color="red.700">Failed to load this alert.</Text>
      </Box>
    )
  }

  if (isEditMode && alertQuery.data && alertQuery.data.status !== "Scheduled") {
    return (
      <Stack gap={4}>
        <Box p={4} borderRadius="16px" border="1px solid" borderColor="border.subtle" bg="card.bg">
          <Text fontSize="sm" fontWeight="700" color="gray.900">This alert can no longer be edited.</Text>
          <Text fontSize="sm" color="text.secondary" mt={1}>
            Only a scheduled alert that has not gone out yet can be changed.
          </Text>
        </Box>
        <Button
          variant="outline"
          borderRadius="14px"
          minH="11"
          px={4}
          w="fit-content"
          cursor="pointer"
          onClick={() => navigate(APP_ROUTES.memberAlerts.detail(uniqueId ?? ""))}
        >
          <ArrowLeft size={16} />
          Back to alert
        </Button>
      </Stack>
    )
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
        onSubmit={handleSubmit(handleRequestSend, handleInvalidSubmit)}
        borderRadius="20px"
        border="1px solid"
        borderColor="border.subtle"
        bg="card.bg"
        boxShadow="card"
        p={{ base: 4, md: 6 }}
      >
        <Flex
          direction={{ base: "column", md: "row" }}
          align={{ base: "flex-start", md: "center" }}
          justify="space-between"
          gap={1}
          mb={5}
        >
          <Heading fontSize={{ base: "xl", md: "2xl" }} fontWeight="800" color="gray.900">
            {isEditMode ? "Edit alert" : "New alert"}
          </Heading>
          <CurrentUtcClock />
        </Flex>

        <Stack gap={5}>
          <Box
            borderRadius="18px"
            border="1px solid"
            borderColor="border.subtle"
            bg="card.bg"
            p={{ base: 4, md: 5 }}
            maxH={{ base: "none", lg: "min(42dvh, 28rem)" }}
            overflowY={{ base: "visible", lg: "auto" }}
          >
            <Stack gap={5}>
              <SimpleGrid columns={{ base: 1, md: 3 }} gap={5}>
                <Field.Root>
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

                <Field.Root invalid={Boolean(errors.channel)}>
                  <Field.Label fontWeight="700">
                    Channel <Text as="span" color="red.500">*</Text>
                  </Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field {...register("channel")} borderRadius="14px" minH="11" ps={4} pe={8}>
                      <option value="" disabled>Select a channel</option>
                      <option value="Instant">Instant</option>
                      <option value="Email">Email</option>
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                  {errors.channel ? <Field.ErrorText>{errors.channel.message}</Field.ErrorText> : null}
                </Field.Root>

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
                  <Box mt={3}>
                    <Box>
                      <Input
                        {...register("scheduledAtUtc")}
                        type="datetime-local"
                        minH="11"
                        borderRadius="14px"
                        px={4}
                        maxW={{ base: "full", md: "320px" }}
                        disabled={!scheduleForLater}
                        cursor={scheduleForLater ? "pointer" : "not-allowed"}
                      />
                      {errors.scheduledAtUtc ? (
                        <Field.ErrorText>{errors.scheduledAtUtc.message}</Field.ErrorText>
                      ) : scheduleForLater && scheduledAtUtcValue ? (
                        <Box mt={2}>
                          <ScheduleCountdown targetDateTime={scheduledAtUtcValue} />
                        </Box>
                      ) : null}
                    </Box>
                  </Box>
                </Field.Root>
              </SimpleGrid>

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
                <Text fontSize="xs" color="text.secondary" mb={2}>
                  Compose the alert with basic formatting.
                </Text>
                <Controller
                  control={control}
                  name="body"
                  render={({ field }) => (
                    <AlertMessageEditor
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="What do you want to tell them?"
                    />
                  )}
                />
                {errors.body ? <Field.ErrorText>{errors.body.message}</Field.ErrorText> : null}
              </Field.Root>
            </Stack>
          </Box>

          <Box
            borderRadius="18px"
            border="1px solid"
            borderColor="border.subtle"
            bg="card.bg"
            p={{ base: 4, md: 5 }}
          >
            <Tabs.Root
              value={activeTargetMode}
              onValueChange={handleAudienceChange}
              activationMode="manual"
            >
              <Stack gap={5}>
                <Box>
                  <Text
                    fontSize="xs"
                    fontWeight="800"
                    letterSpacing="0.14em"
                    textTransform="uppercase"
                    color="text.secondary"
                  >
                    Audience
                  </Text>
                  <Heading fontSize={{ base: "md", md: "lg" }} color="gray.900" mt={1}>
                    Choose recipients
                  </Heading>
                  <Text fontSize="sm" color="text.secondary" mt={1}>
                    Select the audience source, then press Apply to refresh the preview.
                  </Text>
                </Box>

                <Tabs.List
                  display="flex"
                  flexDirection={{ base: "column", md: "row" }}
                  gap={0}
                  borderBottom="1px solid"
                  borderColor="border.subtle"
                  mb={4}
                >
                  {AUDIENCE_TABS.map((tab) => (
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
                      bg="white"
                      mb="-1px"
                      px={4}
                      py={3}
                      cursor="pointer"
                      fontWeight="700"
                      whiteSpace="nowrap"
                      color="text.secondary"
                      transition="all 0.18s ease"
                      _selected={{
                        bg: "card.bg",
                        color: "gray.900",
                        borderColor: "border.subtle",
                        borderBottomWidth: "0",
                        borderBottomColor: "card.bg",
                        boxShadow: "0 -1px 0 0 var(--chakra-colors-border-subtle)",
                      }}
                      _hover={{ bg: "gray.100" }}
                    >
                      {tab.label}
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>

                <Box
                  maxH={{ base: "none", lg: "min(48dvh, 34rem)" }}
                  overflowY={{ base: "visible", lg: "auto" }}
                  pr={{ base: 0, lg: 1 }}
                >
                  <Tabs.Content value="members">
                    <Stack gap={4}>
                      <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                        <Field.Root invalid={Boolean(errors.membershipTypeUniqueId)}>
                          <Field.Label fontWeight="700">Membership type</Field.Label>
                          <Text fontSize="xs" color="text.secondary" mb={2}>
                            Choose one membership type.
                          </Text>
                          <Controller
                            control={control}
                            name="membershipTypeUniqueId"
                            render={({ field }) => (
                              <Box w="full">
                                <ReactSelect
                                  isMulti={false}
                                  options={membershipTypeOptions}
                                  value={
                                    membershipTypeOptions.find((option) => option.value === field.value) ?? null
                                  }
                                  onChange={(option: SingleValue<{ value: string; label: string }>) =>
                                    field.onChange(option?.value ?? "")
                                  }
                                  placeholder={membershipTypesQuery.isLoading ? "Loading..." : "Select membership type"}
                                  isLoading={membershipTypesQuery.isLoading}
                                  isClearable
                                />
                              </Box>
                            )}
                          />
                          {errors.membershipTypeUniqueId ? (
                            <Field.ErrorText>{errors.membershipTypeUniqueId.message}</Field.ErrorText>
                          ) : null}
                        </Field.Root>

                        <Field.Root invalid={Boolean(errors.membershipStatus)}>
                          <Field.Label fontWeight="700">Membership status</Field.Label>
                          <Text fontSize="xs" color="text.secondary" mb={2}>
                            Choose one membership status.
                          </Text>
                          <Controller
                            control={control}
                            name="membershipStatus"
                            render={({ field }) => (
                              <Box w="full">
                                <ReactSelect
                                  isMulti={false}
                                  options={membershipStatusOptions}
                                  value={
                                    membershipStatusOptions.find((option) => option.value === field.value) ?? null
                                  }
                                  onChange={(option: SingleValue<{ value: string; label: string }>) =>
                                    field.onChange(option?.value ?? "")
                                  }
                                  placeholder={
                                    membershipStatusesQuery.isLoading ? "Loading..." : "Select membership status"
                                  }
                                  isLoading={membershipStatusesQuery.isLoading}
                                  isClearable
                                />
                              </Box>
                            )}
                          />
                          {errors.membershipStatus ? (
                            <Field.ErrorText>{errors.membershipStatus.message}</Field.ErrorText>
                          ) : null}
                        </Field.Root>
                      </SimpleGrid>

                      <Flex justify="flex-end">
                        <Button
                          variant="solid"
                          borderRadius="14px"
                          minH="11"
                          px={5}
                          color="white"
                          cursor="pointer"
                          onClick={handleApplyMembers}
                          style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                        >
                          Apply
                        </Button>
                      </Flex>

                      <AlertAudiencePreview
                        key={[
                          appliedMemberPreviewFilters.membershipTypeUniqueId,
                          appliedMemberPreviewFilters.membershipStatus,
                        ].join("|")}
                        membershipTypeUniqueId={appliedMemberPreviewFilters.membershipTypeUniqueId}
                        membershipStatus={appliedMemberPreviewFilters.membershipStatus}
                      />
                    </Stack>
                  </Tabs.Content>

                  <Tabs.Content value="custom-lists">
                    <Stack gap={4}>
                      <Field.Root invalid={Boolean(errors.customListUniqueIds)}>
                        <Field.Label fontWeight="700">Custom lists</Field.Label>
                        <Text fontSize="xs" color="text.secondary" mb={2}>
                          Select one or more custom lists, then optionally narrow them with the same refiners.
                        </Text>
                        <Controller
                          control={control}
                          name="customListUniqueIds"
                          render={({ field }) => (
                            <Box w="full">
                              <ReactSelect
                                isMulti
                                options={customListOptions}
                                value={customListOptions.filter((option) => field.value.includes(option.value))}
                                onChange={(values: MultiValue<{ value: string; label: string }>) =>
                                  field.onChange(values.map((option) => option.value))
                                }
                                placeholder={customListsQuery.isLoading ? "Loading..." : "Select custom list(s)"}
                                isLoading={customListsQuery.isLoading}
                                closeMenuOnSelect={false}
                                isClearable
                              />
                            </Box>
                          )}
                        />
                        {errors.customListUniqueIds ? (
                          <Field.ErrorText>{errors.customListUniqueIds.message}</Field.ErrorText>
                        ) : null}
                      </Field.Root>

                      <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                        <Field.Root invalid={Boolean(errors.membershipTypeUniqueId)}>
                          <Field.Label fontWeight="700">Membership type</Field.Label>
                          <Text fontSize="xs" color="text.secondary" mb={2}>
                            Choose one membership type.
                          </Text>
                          <Controller
                            control={control}
                            name="membershipTypeUniqueId"
                            render={({ field }) => (
                              <Box w="full">
                                <ReactSelect
                                  isMulti={false}
                                  options={membershipTypeOptions}
                                  value={
                                    membershipTypeOptions.find((option) => option.value === field.value) ?? null
                                  }
                                  onChange={(option: SingleValue<{ value: string; label: string }>) =>
                                    field.onChange(option?.value ?? "")
                                  }
                                  placeholder={membershipTypesQuery.isLoading ? "Loading..." : "Select membership type"}
                                  isLoading={membershipTypesQuery.isLoading}
                                  isClearable
                                />
                              </Box>
                            )}
                          />
                          {errors.membershipTypeUniqueId ? (
                            <Field.ErrorText>{errors.membershipTypeUniqueId.message}</Field.ErrorText>
                          ) : null}
                        </Field.Root>

                        <Field.Root invalid={Boolean(errors.membershipStatus)}>
                          <Field.Label fontWeight="700">Membership status</Field.Label>
                          <Text fontSize="xs" color="text.secondary" mb={2}>
                            Choose one membership status.
                          </Text>
                          <Controller
                            control={control}
                            name="membershipStatus"
                            render={({ field }) => (
                              <Box w="full">
                                <ReactSelect
                                  isMulti={false}
                                  options={membershipStatusOptions}
                                  value={
                                    membershipStatusOptions.find((option) => option.value === field.value) ?? null
                                  }
                                  onChange={(option: SingleValue<{ value: string; label: string }>) =>
                                    field.onChange(option?.value ?? "")
                                  }
                                  placeholder={
                                    membershipStatusesQuery.isLoading ? "Loading..." : "Select membership status"
                                  }
                                  isLoading={membershipStatusesQuery.isLoading}
                                  isClearable
                                />
                              </Box>
                            )}
                          />
                          {errors.membershipStatus ? (
                            <Field.ErrorText>{errors.membershipStatus.message}</Field.ErrorText>
                          ) : null}
                        </Field.Root>
                      </SimpleGrid>

                      <Flex justify="flex-end">
                        <Button
                          variant="solid"
                          borderRadius="14px"
                          minH="11"
                          px={5}
                          color="white"
                          cursor="pointer"
                          onClick={handleApplyCustomLists}
                          style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                        >
                          Apply
                        </Button>
                      </Flex>

                      <AlertCustomListsPreview
                        key={[
                          appliedCustomListPreviewFilters.membershipTypeUniqueIds.join(","),
                          appliedCustomListPreviewFilters.membershipStatuses.join(","),
                          appliedCustomListPreviewFilters.customListUniqueIds.join(","),
                        ].join("|")}
                        filters={appliedCustomListPreviewFilters}
                      />
                    </Stack>
                  </Tabs.Content>
                </Box>
              </Stack>
            </Tabs.Root>
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
              loading={activeMutation.isPending}
              loadingText={isEditMode ? "Saving..." : scheduleForLater ? "Scheduling..." : "Sending..."}
              disabled={activeMutation.isPending}
              style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
            >
              <Send size={16} />
              {isEditMode ? "Save changes" : scheduleForLater ? "Schedule alert" : "Send alert"}
            </Button>
          </Flex>
        </Stack>
      </Box>

      {pendingValues ? (
        <ConfirmAlertDialog
          title={isEditMode ? "Save changes?" : pendingValues.scheduleForLater ? "Schedule this alert?" : "Send this alert?"}
          message={
            isEditMode
              ? "The alert will be updated with these changes for the selected audience."
              : pendingValues.scheduleForLater
                ? "The alert will be queued and delivered to the selected audience at the scheduled time."
                : "The alert will be delivered to the selected audience right away. This can't be undone."
          }
          confirmLabel={isEditMode ? "Save changes" : pendingValues.scheduleForLater ? "Schedule alert" : "Send alert"}
          tone="brand"
          isLoading={activeMutation.isPending}
          onConfirm={handleConfirmSend}
          onClose={() => {
            if (!activeMutation.isPending) {
              setPendingValues(null)
            }
          }}
        />
      ) : null}
    </Stack>
  )
}
