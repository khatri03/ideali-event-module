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
  SimpleGrid,
  Stack,
  Tabs,
  Text,
} from "@chakra-ui/react"
import ReactSelect, { type MultiValue, type SingleValue } from "react-select"
import { ArrowLeft, Send } from "lucide-react"
import { APP_ROUTES } from "@/utils/routes"
import type { AlertCustomListPreviewFilters } from "@/api/alerts"
import { alertFormSchema, toChannelMask, type AlertFormValues } from "../schemas/alert.schemas"
import { useCreateAlert } from "../hooks/useAlertMutations"
import {
  useAlertCustomListOptions,
  useAlertMembershipStatusOptions,
  useAlertMembershipTypeOptions,
} from "../hooks/useAlerts"
import { PRIORITY_OPTIONS } from "../constants"
import { AlertMessageEditor } from "./AlertMessageEditor"
import { AlertAudiencePreview } from "./AlertAudiencePreview"
import { AlertCustomListsPreview } from "./AlertCustomListsPreview"

type AudienceTab = "members" | "custom-lists"

const AUDIENCE_TABS: { value: AudienceTab; label: string }[] = [
  { value: "members", label: "Members" },
  { value: "custom-lists", label: "Custom Lists" },
]

export function AlertComposer() {
  const navigate = useNavigate()
  const createMutation = useCreateAlert()
  const membershipTypesQuery = useAlertMembershipTypeOptions()
  const membershipStatusesQuery = useAlertMembershipStatusOptions()
  const customListsQuery = useAlertCustomListOptions()
  const [appliedMemberPreviewFilters, setAppliedMemberPreviewFilters] = useState({
    searchTerm: "",
    membershipTypeUniqueId: "",
    membershipStatus: "",
  })
  const [appliedCustomListPreviewFilters, setAppliedCustomListPreviewFilters] =
    useState<AlertCustomListPreviewFilters>({
      searchTerm: "",
      membershipTypeUniqueIds: [],
      membershipStatuses: [],
      customListUniqueIds: [],
    })

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<AlertFormValues>({
    resolver: zodResolver(alertFormSchema),
    defaultValues: {
      targetMode: "members",
      memberSearchTerm: "",
      title: "",
      body: "",
      priority: "Normal",
      channel: "Instant",
      scheduleForLater: false,
      scheduledAtUtc: null,
      membershipTypeUniqueId: "",
      membershipStatus: "",
      customListUniqueIds: [],
    },
  })

  const scheduleForLater = useWatch({ control, name: "scheduleForLater" })
  const activeTargetMode = useWatch({ control, name: "targetMode" })
  const memberSearchTerm = useWatch({ control, name: "memberSearchTerm" })
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

  async function handleSend(values: AlertFormValues) {
    await createMutation.mutateAsync({
      title: values.title.trim(),
      body: values.body.trim(),
      priority: values.priority,
      channels: toChannelMask(values.channel),
      scheduledAtUtc:
        values.scheduleForLater && values.scheduledAtUtc
          ? new Date(values.scheduledAtUtc).toISOString()
          : null,
      recipientUniqueIds: [],
      memberSearchTerm: values.memberSearchTerm.trim(),
      membershipTypeUniqueIds: values.membershipTypeUniqueId ? [values.membershipTypeUniqueId] : [],
      membershipStatuses: values.membershipStatus ? [values.membershipStatus] : [],
      customListUniqueIds: values.targetMode === "custom-lists" ? values.customListUniqueIds : [],
    })
    navigate(APP_ROUTES.memberAlerts.list)
  }

  function handleApplyMembers() {
    setAppliedMemberPreviewFilters({
      searchTerm: memberSearchTerm,
      membershipTypeUniqueId: selectedMembershipType?.value ?? "",
      membershipStatus: selectedMembershipStatus?.value ?? "",
    })
  }

  function handleApplyCustomLists() {
    setAppliedCustomListPreviewFilters({
      searchTerm: memberSearchTerm,
      membershipTypeUniqueIds: selectedMembershipType?.value ? [selectedMembershipType.value] : [],
      membershipStatuses: selectedMembershipStatus?.value ? [selectedMembershipStatus.value] : [],
      customListUniqueIds,
    })
  }

  function handleAudienceChange(details: { value: AudienceTab }) {
    setValue("targetMode", details.value, { shouldValidate: true })
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

                <Field.Root>
                  <Field.Label fontWeight="700">
                    Channel <Text as="span" color="red.500">*</Text>
                  </Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field {...register("channel")} borderRadius="14px" minH="11" ps={4} pe={8}>
                      <option value="Instant">Instant</option>
                      <option value="Email">Email</option>
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
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
                    {errors.scheduledAtUtc ? <Field.ErrorText>{errors.scheduledAtUtc.message}</Field.ErrorText> : null}
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

          <Box borderRadius="18px" border="1px solid" borderColor="border.subtle" bg="card.bg" p={{ base: 4, md: 5 }}>
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

                <Tabs.Content value="members">
                  <Stack gap={4}>
                    <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                      <Field.Root invalid={Boolean(errors.memberSearchTerm)}>
                        <Field.Label fontWeight="700">Search by name or email</Field.Label>
                        <Text fontSize="xs" color="text.secondary" mb={2}>
                          Narrow the preview with a member name or email fragment.
                        </Text>
                        <Input
                          {...register("memberSearchTerm")}
                          minH="11"
                          borderRadius="14px"
                          px={4}
                          placeholder="Search members"
                        />
                        {errors.memberSearchTerm ? (
                          <Field.ErrorText>{errors.memberSearchTerm.message}</Field.ErrorText>
                        ) : null}
                      </Field.Root>

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
                        appliedMemberPreviewFilters.searchTerm.trim(),
                        appliedMemberPreviewFilters.membershipTypeUniqueId,
                        appliedMemberPreviewFilters.membershipStatus,
                      ].join("|")}
                      searchTerm={appliedMemberPreviewFilters.searchTerm}
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
                      <Field.Root invalid={Boolean(errors.memberSearchTerm)}>
                        <Field.Label fontWeight="700">Search by name or email</Field.Label>
                        <Text fontSize="xs" color="text.secondary" mb={2}>
                          Narrow the preview with a member name or email fragment.
                        </Text>
                        <Input
                          {...register("memberSearchTerm")}
                          minH="11"
                          borderRadius="14px"
                          px={4}
                          placeholder="Search members"
                        />
                        {errors.memberSearchTerm ? (
                          <Field.ErrorText>{errors.memberSearchTerm.message}</Field.ErrorText>
                        ) : null}
                      </Field.Root>

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
                        appliedCustomListPreviewFilters.searchTerm.trim(),
                        appliedCustomListPreviewFilters.membershipTypeUniqueIds.join(","),
                        appliedCustomListPreviewFilters.membershipStatuses.join(","),
                        appliedCustomListPreviewFilters.customListUniqueIds.join(","),
                      ].join("|")}
                      filters={appliedCustomListPreviewFilters}
                    />
                  </Stack>
                </Tabs.Content>
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
