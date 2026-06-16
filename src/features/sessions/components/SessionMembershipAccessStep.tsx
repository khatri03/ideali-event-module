import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Badge, Box, Flex, Input, SimpleGrid, Skeleton, Stack, Text } from "@chakra-ui/react"
import { CheckCircle2, Shield, Sparkles, X } from "lucide-react"
import ReactSelect, { components, type MultiValue, type OptionProps, type StylesConfig } from "react-select"
import { fetchMembershipTypeOptions, type MembershipTypeOption } from "@/api/memberships"
import {
  fetchSessionWizardMembershipAccess,
  updateSessionWizardMembershipAccess,
  type SessionWizardMembershipAccessItem,
  type SessionWizardMembershipDiscountType,
} from "@/api/sessions"
import { StyledSelect } from "@/components/common/StyledSelect"
import { extractApiError } from "@/utils/errors"
import { getSessionWizardStepNumber } from "../hooks/useSessionWizard"
import { useSessionWizardActions } from "../hooks/useSessionWizardActions"

interface SessionMembershipAccessStepProps {
  sessionId: string
}

interface MembershipDraftItem {
  membershipTypeUniqueId: string
  discountType: SessionWizardMembershipDiscountType | null
  discountValueInput: string
  maxDiscountAmountInput: string
}

interface MembershipSelectOption {
  value: string
  label: string
}

const DISCOUNT_TYPE_OPTIONS: Array<{ label: string; value: SessionWizardMembershipDiscountType }> = [
  { label: "Fixed Amount", value: "FixedAmount" },
  { label: "Percentage", value: "Percentage" },
]

function MembershipOption(props: OptionProps<MembershipSelectOption, true>) {
  return (
    <components.Option {...props}>
      <Flex align="center" gap={3}>
        <Box
          flexShrink={0}
          boxSize="18px"
          borderRadius="6px"
          border="1px solid"
          borderColor={props.isSelected ? "brand.500" : "gray.300"}
          bg={props.isSelected ? "brand.500" : "white"}
          color="white"
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
        >
          {props.isSelected ? "✓" : null}
        </Box>
        <Box minW={0}>
          <Text fontSize="sm" fontWeight="600" color="gray.800" lineClamp={1}>
            {props.label}
          </Text>
        </Box>
      </Flex>
    </components.Option>
  )
}

function SessionMembershipAccessSkeleton() {
  return (
    <Stack gap={4}>
      <Skeleton height="88px" borderRadius="20px" />
      <Skeleton height="160px" borderRadius="20px" />
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} height="160px" borderRadius="20px" />
        ))}
      </SimpleGrid>
    </Stack>
  )
}

function toInputValue(value: number | null) {
  return value === null ? "" : String(value)
}

function parseMaybeNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function createDraft(membershipTypeUniqueId: string): MembershipDraftItem {
  return {
    membershipTypeUniqueId,
    discountType: "FixedAmount",
    discountValueInput: "",
    maxDiscountAmountInput: "",
  }
}

export function SessionMembershipAccessStep({ sessionId }: SessionMembershipAccessStepProps) {
  const queryClient = useQueryClient()
  const { setPrimaryAction, setPrimaryActionReady } = useSessionWizardActions()
  const [isDirty, setIsDirty] = useState(false)
  const [draftMemberships, setDraftMemberships] = useState<MembershipDraftItem[]>([])
  const [membershipError, setMembershipError] = useState("")

  const membershipTypesQuery = useQuery({
    queryKey: ["membership-types", "options"],
    queryFn: fetchMembershipTypeOptions,
    retry: false,
  })

  const sessionAccessQuery = useQuery({
    queryKey: ["sessions", { sessionId, step: "membership-access" }],
    queryFn: () => fetchSessionWizardMembershipAccess(sessionId),
    enabled: !!sessionId,
    retry: false,
  })

  const membershipTypeOptions = useMemo(
    () =>
      [...(membershipTypesQuery.data ?? [])]
        .sort((left, right) => left.text.localeCompare(right.text))
        .map((membershipType: MembershipTypeOption) => ({
          value: membershipType.value,
          label: membershipType.text,
        })),
    [membershipTypesQuery.data],
  )

  const membershipTypeOptionMap = useMemo(
    () => new Map(membershipTypeOptions.map((option) => [option.value, option])),
    [membershipTypeOptions],
  )

  const initialDraftMemberships = useMemo(() => {
    if (!sessionAccessQuery.isSuccess) {
      return []
    }

    return (sessionAccessQuery.data?.memberships ?? [])
      .filter((membership) => membershipTypeOptionMap.has(membership.membershipTypeUniqueId))
      .map((membership) => ({
        membershipTypeUniqueId: membership.membershipTypeUniqueId,
        discountType: membership.discountType,
        discountValueInput: toInputValue(membership.discountValue),
        maxDiscountAmountInput: toInputValue(membership.maxDiscountAmount),
      }))
  }, [membershipTypeOptionMap, sessionAccessQuery.data, sessionAccessQuery.isSuccess])

  const activeDraftMemberships = isDirty ? draftMemberships : initialDraftMemberships
  const selectedMembershipCount = activeDraftMemberships.length

  const updateMutation = useMutation({
    mutationFn: (payload: { memberships: SessionWizardMembershipAccessItem[] }) =>
      updateSessionWizardMembershipAccess(sessionId, payload, getSessionWizardStepNumber("membership-access")),
    onSuccess: async (data) => {
      setMembershipError("")
      setIsDirty(false)
      setDraftMemberships([])
      queryClient.setQueryData(["sessions", { sessionId, step: "membership-access" }], data)
      queryClient.setQueryData(["sessions", "wizard-progress", sessionId], (current: { stepNo?: number } | undefined) => ({
        stepNo: Math.max(current?.stepNo ?? 0, getSessionWizardStepNumber("membership-access")),
      }))
      await queryClient.invalidateQueries({ queryKey: ["sessions", "review", sessionId] })
    },
    onError: (error) => {
      setMembershipError(extractApiError(error))
    },
    onSettled: () => {
      setPrimaryActionReady(true)
    },
  })

  useEffect(() => {
    if (!membershipTypesQuery.isSuccess || !sessionAccessQuery.isSuccess) {
      setPrimaryAction(null)
      setPrimaryActionReady(false)
      return
    }

    setPrimaryAction(async () => {
      setPrimaryActionReady(false)
      setMembershipError("")

      const memberships = activeDraftMemberships.map((item) => {
        const discountValue = parseMaybeNumber(item.discountValueInput)
        const maxDiscountAmount = parseMaybeNumber(item.maxDiscountAmountInput)
        const hasDiscount = discountValue !== null && discountValue > 0 && item.discountType !== null
        const shouldPersistMaxDiscountAmount = item.discountType === "Percentage" && maxDiscountAmount !== null

        return {
          membershipTypeUniqueId: item.membershipTypeUniqueId,
          discountType: hasDiscount ? item.discountType : null,
          discountValue: hasDiscount ? discountValue : null,
          maxDiscountAmount: hasDiscount ? (shouldPersistMaxDiscountAmount ? maxDiscountAmount : null) : null,
        } satisfies SessionWizardMembershipAccessItem
      })

      await updateMutation.mutateAsync({ memberships })
    })
    setPrimaryActionReady(true)

    return () => {
      setPrimaryAction(null)
      setPrimaryActionReady(true)
    }
  }, [
    activeDraftMemberships,
    membershipTypesQuery.isSuccess,
    sessionAccessQuery.isSuccess,
    setPrimaryAction,
    setPrimaryActionReady,
    updateMutation,
  ])

  function handleMembershipChange(values: MultiValue<MembershipSelectOption>) {
    const nextMembershipIds = values.map((item) => item.value)
    const currentMap = new Map(activeDraftMemberships.map((item) => [item.membershipTypeUniqueId, item]))

    setMembershipError("")
    setIsDirty(true)
    setDraftMemberships(nextMembershipIds.map((membershipTypeUniqueId) => currentMap.get(membershipTypeUniqueId) ?? createDraft(membershipTypeUniqueId)))
  }

  function updateMembershipField(
    membershipTypeUniqueId: string,
    field: "discountType" | "discountValueInput" | "maxDiscountAmountInput",
    value: string,
  ) {
    setMembershipError("")
    setIsDirty(true)
    setDraftMemberships(
      activeDraftMemberships.map((item) =>
        item.membershipTypeUniqueId === membershipTypeUniqueId
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    )
  }

  const isLoading = membershipTypesQuery.isLoading || sessionAccessQuery.isLoading
  const queryError = membershipTypesQuery.error ?? sessionAccessQuery.error
  const isEmpty = membershipTypesQuery.isSuccess && membershipTypeOptions.length === 0
  const selectedMembershipValues = activeDraftMemberships
    .map((item) => membershipTypeOptionMap.get(item.membershipTypeUniqueId))
    .filter((item): item is MembershipSelectOption => Boolean(item))

  if (isLoading) {
    return <SessionMembershipAccessSkeleton />
  }

  if (queryError) {
    return (
      <Box border="1px solid" borderColor="red.200" bg="red.50" color="red.700" borderRadius="20px" p={5}>
        <Text fontSize="sm" fontWeight="700">
          {extractApiError(queryError)}
        </Text>
      </Box>
    )
  }

  return (
    <Stack gap={5}>
      <Box
        border="1px solid"
        borderColor="gray.200"
        borderRadius="20px"
        bg="linear-gradient(135deg, rgba(117,81,255,0.05) 0%, rgba(66,42,251,0.03) 100%)"
        p={{ base: 4, md: 5 }}
      >
        <Flex align="flex-start" justify="space-between" gap={4} wrap="wrap">
          <Box minW={0}>
            <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
              Membership Access
            </Text>
            <Text mt={2} fontSize={{ base: "sm", md: "md" }} fontWeight="700" color="gray.800">
              Leave everything empty to keep this session public. Select one or more memberships to restrict visibility and optionally set a discount.
            </Text>
          </Box>

          <Badge variant="subtle" colorPalette={selectedMembershipCount > 0 ? "green" : "gray"} borderRadius="999px" px={3} py={1}>
            <Flex align="center" gap={1.5}>
              {selectedMembershipCount > 0 ? <Shield size={14} /> : <X size={14} />}
              <Text as="span" fontSize="xs" fontWeight="800">
                {selectedMembershipCount > 0 ? `${selectedMembershipCount} selected` : "Public"}
              </Text>
            </Flex>
          </Badge>
        </Flex>
      </Box>

      {isEmpty ? (
        <Box border="1px dashed" borderColor="gray.300" borderRadius="20px" p={6} bg="white">
          <Text fontSize="sm" fontWeight="700" color="gray.700">
            No memberships are available for this organizer yet.
          </Text>
          <Text fontSize="sm" color="gray.600" mt={1}>
            This session will remain public until live memberships exist.
          </Text>
        </Box>
      ) : (
        <Stack gap={4}>
          <Box border="1px solid" borderColor="gray.200" borderRadius="20px" bg="white" p={{ base: 4, md: 5 }}>
            <Text fontSize="sm" fontWeight="700" color="gray.900">
              Select memberships
            </Text>
            <Box mt={4}>
              <ReactSelect
                isMulti
                options={membershipTypeOptions}
                value={selectedMembershipValues}
                onChange={handleMembershipChange}
                placeholder="Search live memberships"
                closeMenuOnSelect={false}
                hideSelectedOptions={false}
                isClearable={false}
                components={{ Option: MembershipOption }}
                styles={
                  {
                    control: (base, state) => ({
                      ...base,
                      minHeight: 44,
                      borderRadius: 16,
                      borderColor: state.isFocused ? "#7551FF" : "#E2E8F0",
                      boxShadow: state.isFocused ? "0 0 0 3px rgba(117, 81, 255, 0.15)" : "none",
                      backgroundColor: "#fff",
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 40,
                      borderRadius: 14,
                    }),
                    multiValue: (base) => ({
                      ...base,
                      borderRadius: 999,
                      backgroundColor: "#EEF2FF",
                    }),
                    multiValueLabel: (base) => ({
                      ...base,
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#1E293B",
                    }),
                    multiValueRemove: (base) => ({
                      ...base,
                      borderRadius: 999,
                      color: "#475569",
                      ":hover": {
                        backgroundColor: "#C7D2FE",
                        color: "#111827",
                      },
                    }),
                  } satisfies StylesConfig<MembershipSelectOption, true>
                }
              />
            </Box>
          </Box>

          {activeDraftMemberships.length > 0 ? (
            <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
              {activeDraftMemberships.map((item) => {
                const membership = membershipTypeOptionMap.get(item.membershipTypeUniqueId)

                return (
                  <Box
                    key={item.membershipTypeUniqueId}
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="20px"
                    bg="gray.50"
                    p={4}
                  >
                    <Flex align="center" justify="space-between" gap={3}>
                      <Box minW={0}>
                        <Text fontSize="sm" fontWeight="800" color="gray.900" lineClamp={1}>
                          {membership?.label ?? "Selected membership"}
                        </Text>
                        <Text fontSize="xs" color="gray.600">
                          Optional discount settings for this membership.
                        </Text>
                      </Box>
                      <Badge variant="subtle" colorPalette="green" borderRadius="999px" px={3} py={1}>
                        <Flex align="center" gap={1.5}>
                          <CheckCircle2 size={14} />
                          <Text as="span" fontSize="xs" fontWeight="800">
                            Selected
                          </Text>
                        </Flex>
                      </Badge>
                    </Flex>

                    <SimpleGrid columns={{ base: 1, md: 3 }} gap={3} mt={4}>
                      <StyledSelect
                        options={DISCOUNT_TYPE_OPTIONS}
                        value={item.discountType ?? "FixedAmount"}
                        onChange={(value) =>
                          updateMembershipField(item.membershipTypeUniqueId, "discountType", value || "FixedAmount")
                        }
                        placeholder="Discount type"
                        size="sm"
                      />

                      <Input
                        value={item.discountValueInput}
                        onChange={(event) =>
                          updateMembershipField(item.membershipTypeUniqueId, "discountValueInput", event.target.value)
                        }
                        placeholder="Discount value"
                        type="number"
                        step="0.01"
                        min="0"
                        bg="white"
                        h="38px"
                        px={4}
                        borderRadius="12px"
                      />

                      <Input
                        value={item.maxDiscountAmountInput}
                        onChange={(event) =>
                          updateMembershipField(item.membershipTypeUniqueId, "maxDiscountAmountInput", event.target.value)
                        }
                        placeholder="Max discount amount"
                        type="number"
                        step="0.01"
                        min="0"
                        bg="white"
                        h="38px"
                        px={4}
                        borderRadius="12px"
                        disabled={item.discountType !== "Percentage"}
                      />
                    </SimpleGrid>
                  </Box>
                )
              })}
            </SimpleGrid>
          ) : (
            <Box border="1px dashed" borderColor="gray.300" borderRadius="20px" p={5} bg="white">
              <Text fontSize="sm" fontWeight="700" color="gray.700">
                No memberships selected.
              </Text>
              <Text fontSize="sm" color="gray.600" mt={1}>
                Choose one or more live memberships above, or leave it empty to keep the session public.
              </Text>
            </Box>
          )}
        </Stack>
      )}

      {membershipError ? (
        <Box border="1px solid" borderColor="red.200" bg="red.50" color="red.700" borderRadius="16px" px={4} py={3}>
          <Text fontSize="sm" fontWeight="600">
            {membershipError}
          </Text>
        </Box>
      ) : null}

      <Flex align="center" gap={2} color="gray.600" fontSize="sm">
        <Sparkles size={14} />
        <Text>When nothing is selected, the session remains visible to everyone.</Text>
      </Flex>
    </Stack>
  )
}
