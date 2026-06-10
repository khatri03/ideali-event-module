import { Badge, Box, Button, Flex, SimpleGrid, Skeleton, Stack, Table, Text } from "@chakra-ui/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { Check, Copy, Pencil, Plus, Trash2 } from "lucide-react"
import { useEventWizardActions } from "../hooks/useEventWizardActions"
import { useEventDiscountCoupons, useSaveEventDiscountCoupons } from "../hooks/useEventDiscountCoupons"
import {
  convertCouponToDraft,
  formatDiscountAmount,
  formatDiscountTypeLabel,
  isLocalCoupon,
  type DiscountCouponDraft,
} from "./EventDiscountCouponsStepPage.helpers"
import {
  DeleteDiscountCouponModal,
  EventDiscountCouponModal,
} from "./EventDiscountCouponsStepPage.parts"
import type { DiscountCouponListItem } from "@/api/discountCoupons"
import { extractApiError } from "@/utils/errors"

function CouponTableSkeleton() {
  return (
    <Stack gap={3}>
      {Array.from({ length: 3 }).map((_, index) => (
        <Flex key={index} gap={3} align="center" p={4} borderRadius="16px" border="1px solid" borderColor="gray.200" bg="white">
          <Skeleton height="18px" width="30%" />
          <Skeleton height="18px" width="16%" />
          <Skeleton height="18px" width="20%" />
          <Skeleton height="34px" width="86px" borderRadius="999px" ml="auto" />
        </Flex>
      ))}
    </Stack>
  )
}

function CouponStepSkeleton() {
  return (
    <Stack gap={5}>
      <Skeleton height="140px" borderRadius="20px" />
      <Skeleton height="92px" borderRadius="24px" />
      <Skeleton height="92px" borderRadius="24px" />
      <CouponTableSkeleton />
    </Stack>
  )
}

export function EventDiscountCouponsStepPage() {
  const { eventId } = useParams<{ eventId?: string }>()
  const currentEventId = eventId ?? ""
  const { setPrimaryAction, setPrimaryActionReady, setPrimaryActionEnabled } = useEventWizardActions()
  const { data, isLoading, isError, error } = useEventDiscountCoupons(currentEventId)
  const saveMutation = useSaveEventDiscountCoupons(currentEventId)
  const [discountsEnabled, setDiscountsEnabled] = useState(false)
  const [coupons, setCoupons] = useState<DiscountCouponListItem[]>([])
  const [deletedCouponIds, setDeletedCouponIds] = useState<string[]>([])
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false)
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null)
  const [pendingDeleteCouponId, setPendingDeleteCouponId] = useState<string | null>(null)
  const [copiedCouponUniqueId, setCopiedCouponUniqueId] = useState("")
  const [copyMessage, setCopyMessage] = useState("")
  const [stepError, setStepError] = useState("")
  const copyTimerRef = useRef<number | null>(null)
  const messageTimerRef = useRef<number | null>(null)
  const loadedEventIdRef = useRef<string | null>(null)

  const editingCoupon = editingCouponId ? coupons.find((coupon) => coupon.uniqueId === editingCouponId) ?? null : null
  const pendingDeleteCoupon = pendingDeleteCouponId
    ? coupons.find((coupon) => coupon.uniqueId === pendingDeleteCouponId) ?? null
    : null

  useEffect(() => {
    if (!currentEventId || !data) {
      return
    }

    if (loadedEventIdRef.current === currentEventId) {
      return
    }

    loadedEventIdRef.current = currentEventId
    setDiscountsEnabled(data.discountsEnabled)
    setCoupons(data.coupons)
    setDeletedCouponIds([])
    setIsCouponModalOpen(false)
    setEditingCouponId(null)
    setPendingDeleteCouponId(null)
    setStepError("")
  }, [currentEventId, data])

  useEffect(() => {
    if (!currentEventId) {
      setPrimaryAction(null)
      setPrimaryActionReady(false)
      setPrimaryActionEnabled(false)
      return
    }

    if (isLoading || isError) {
      setPrimaryAction(null)
      setPrimaryActionReady(false)
      setPrimaryActionEnabled(false)
      return
    }

    setPrimaryActionEnabled(true)
    setPrimaryAction(async () => {
      setStepError("")
      setPrimaryActionReady(false)

      try {
        await saveMutation.mutateAsync({
          discountsEnabled,
          coupons: coupons.map((coupon) => ({
            uniqueId: isLocalCoupon(coupon) ? undefined : coupon.uniqueId,
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            maxDiscountAmount: coupon.discountType === "Percentage" ? coupon.maxDiscountAmount : null,
            totalCoupons: coupon.totalCoupons ?? 0,
            isActive: coupon.isActive,
          })),
          deletedCouponIds,
        })
      } catch (saveError) {
        const message = extractApiError(saveError)
        setStepError(message)
        throw saveError
      } finally {
        setPrimaryActionReady(true)
      }
    })
    setPrimaryActionReady(true)

    return () => {
      setPrimaryAction(null)
      setPrimaryActionReady(false)
      setPrimaryActionEnabled(false)
    }
  }, [
    coupons,
    currentEventId,
    deletedCouponIds,
    discountsEnabled,
    isError,
    isLoading,
    saveMutation,
    setPrimaryAction,
    setPrimaryActionEnabled,
    setPrimaryActionReady,
  ])

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current)
      }

      if (messageTimerRef.current) {
        window.clearTimeout(messageTimerRef.current)
      }
    }
  }, [])

  const activeCouponCount = useMemo(() => coupons.filter((coupon) => coupon.isActive).length, [coupons])

  function handleToggleDiscounts() {
    if (isLoading || saveMutation.isPending) {
      return
    }

    setDiscountsEnabled((currentValue) => {
      const nextValue = !currentValue

      if (nextValue && coupons.length === 0) {
        setEditingCouponId(null)
        setIsCouponModalOpen(true)
      }

      return nextValue
    })
  }

  function handleCreateDiscountCoupon(draft: DiscountCouponDraft) {
    const discountValue = Number(draft.discountValue)
    const maxDiscountAmount = draft.maxDiscountAmount.trim() ? Number(draft.maxDiscountAmount) : null
    const totalCoupons = Number(draft.totalCoupons)

    const localCoupon: DiscountCouponListItem = {
      uniqueId: editingCouponId ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      code: draft.code.trim(),
      moduleType: "Event",
      discountType: draft.discountType,
      discountValue,
      maxDiscountAmount: draft.discountType === "Percentage" ? maxDiscountAmount : null,
      totalCoupons,
      isActive: draft.isActive,
      usageCount: 0,
    }

    if (editingCouponId) {
      setCoupons((current) => current.map((coupon) => (coupon.uniqueId === editingCouponId ? localCoupon : coupon)))
      return
    }

    setCoupons((current) => [...current, localCoupon])
  }

  function handleOpenCreateModal() {
    setEditingCouponId(null)
    setIsCouponModalOpen(true)
  }

  function handleEditCoupon(coupon: DiscountCouponListItem) {
    setEditingCouponId(coupon.uniqueId)
    setIsCouponModalOpen(true)
  }

  function handleDeleteCoupon(couponId: string) {
    setPendingDeleteCouponId(couponId)
  }

  function canDeleteCoupon(coupon: DiscountCouponListItem) {
    return coupon.usageCount <= 0
  }

  function handleToggleCouponActive(couponId: string) {
    setCoupons((current) =>
      current.map((coupon) =>
        coupon.uniqueId === couponId ? { ...coupon, isActive: !coupon.isActive } : coupon,
      ),
    )
  }

  async function handleCopyCouponCode(coupon: DiscountCouponListItem) {
    try {
      await navigator.clipboard.writeText(coupon.code)
      setCopiedCouponUniqueId(coupon.uniqueId)
      setCopyMessage(`Copied ${coupon.code} to clipboard.`)

      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current)
      }

      if (messageTimerRef.current) {
        window.clearTimeout(messageTimerRef.current)
      }

      copyTimerRef.current = window.setTimeout(() => {
        setCopiedCouponUniqueId((current) => (current === coupon.uniqueId ? "" : current))
      }, 3000)

      messageTimerRef.current = window.setTimeout(() => {
        setCopyMessage("")
      }, 3000)
    } catch {
      setStepError("Unable to copy the coupon code.")
    }
  }

  function confirmDeleteCoupon() {
    if (!pendingDeleteCouponId) {
      return
    }

    if (pendingDeleteCoupon && !isLocalCoupon(pendingDeleteCoupon)) {
      setDeletedCouponIds((current) =>
        current.includes(pendingDeleteCouponId) ? current : [...current, pendingDeleteCouponId],
      )
    }

    setCoupons((current) => current.filter((coupon) => coupon.uniqueId !== pendingDeleteCouponId))

    if (editingCouponId === pendingDeleteCouponId) {
      setEditingCouponId(null)
      setIsCouponModalOpen(false)
    }

    setPendingDeleteCouponId(null)
  }

  if (!currentEventId) {
    return (
      <Stack gap={3}>
        <Text fontSize="sm" color="red.500">
          Event id is required.
        </Text>
      </Stack>
    )
  }

  if (isError) {
    return (
      <Stack gap={3}>
        <Text fontSize="sm" color="red.500">
          {extractApiError(error)}
        </Text>
      </Stack>
    )
  }

  if (isLoading) {
    return <CouponStepSkeleton />
  }

  return (
    <Stack gap={5} h="full">
      <Box
        border="1px solid"
        borderColor="gray.200"
        borderRadius="20px"
        bg="linear-gradient(135deg, rgba(66,42,251,0.08) 0%, rgba(117,81,255,0.04) 100%)"
        p={{ base: 4, md: 5 }}
      >
        <Flex align="flex-start" justify="space-between" gap={4} wrap="wrap">
          <Box minW={0}>
            <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
              Discount coupon
            </Text>
            <Text mt={2} fontSize={{ base: "sm", md: "md" }} fontWeight="700" color="gray.800">
              Let attendees apply promotional codes to this event. Toggle discounts on or off, add coupons, then save.
            </Text>
            <Text mt={2} fontSize="sm" color="gray.600">
              The modal is for staging coupons locally. Footer actions persist the step when you are ready.
            </Text>
          </Box>

          <Badge variant="subtle" colorPalette={discountsEnabled ? "green" : "gray"} borderRadius="999px" px={3} py={1}>
            <Flex align="center" gap={1.5}>
              <Text as="span" fontSize="xs" fontWeight="800">
                {discountsEnabled ? "Enabled" : "Disabled"}
              </Text>
            </Flex>
          </Badge>
        </Flex>
      </Box>

      <Box border="1px solid" borderColor="gray.200" borderRadius="24px" bg="white" boxShadow="0 10px 28px rgba(15, 23, 42, 0.05)" p={{ base: 4, md: 5 }}>
        <Flex flexDirection={{ base: "column", md: "row" }} align={{ md: "center" }} justify="space-between" gap={4}>
          <Box>
            <Text fontSize="sm" fontWeight="800" color="gray.900">
              Want To Enable Discounts?
            </Text>
            <Text mt={1} fontSize="sm" color="gray.600">
              Make discount coupons available for this event.
            </Text>
          </Box>

          <Button
            type="button"
            role="switch"
            aria-checked={discountsEnabled}
            aria-label="Toggle event discounts"
            onClick={handleToggleDiscounts}
            disabled={isLoading || saveMutation.isPending}
            borderRadius="full"
            h="40px"
            w="68px"
            minW="68px"
            p={0}
            bg={discountsEnabled ? "green.500" : "gray.200"}
            color="white"
            _hover={{ bg: discountsEnabled ? "green.600" : "gray.300" }}
          >
            <Box
              h="28px"
              w="28px"
              borderRadius="full"
              bg="white"
              transform={discountsEnabled ? "translateX(17px)" : "translateX(-17px)"}
              transition="transform 0.15s ease"
            />
          </Button>
        </Flex>
      </Box>

      <Box border="1px solid" borderColor="gray.200" borderRadius="24px" bg="white" boxShadow="0 10px 28px rgba(15, 23, 42, 0.05)" p={{ base: 4, md: 5 }}>
        <Flex align="center" justify="space-between" gap={4}>
          <Box>
            <Text fontSize="sm" fontWeight="800" color="gray.900">
              Available Coupons
            </Text>
            <Text mt={1} fontSize="sm" color="gray.600">
              Add coupons only after discounts are enabled.
            </Text>
          </Box>

          <Button
            type="button"
            aria-label="Add discount coupon"
            onClick={handleOpenCreateModal}
            disabled={!discountsEnabled || isLoading || saveMutation.isPending}
            variant="outline"
            borderRadius="full"
            h="40px"
            w="40px"
            minW="40px"
            p={0}
            colorPalette={discountsEnabled ? "green" : "gray"}
          >
            <Plus size={18} />
          </Button>
        </Flex>

        <Stack gap={3} mt={5}>
          {copyMessage ? (
            <Box border="1px solid" borderColor="green.200" bg="green.50" px={4} py={3} borderRadius="16px">
              <Flex align="center" gap={2}>
                <Check size={14} />
                <Text fontSize="sm" fontWeight="600" color="green.800">
                  {copyMessage}
                </Text>
              </Flex>
            </Box>
          ) : null}

          {coupons.length > 0 ? (
            <>
              {!discountsEnabled ? (
                <Box border="1px solid" borderColor="orange.200" bg="orange.50" px={4} py={3} borderRadius="16px">
                  <Text fontSize="sm" color="orange.800">
                    Coupons are disabled until discount is enabled.
                  </Text>
                </Box>
              ) : null}

              <Box border="1px solid" borderColor="gray.200" borderRadius="20px" overflow="hidden" bg="white" opacity={discountsEnabled ? 1 : 0.65}>
                <Table.Root variant="line" size="sm">
                  <Table.Header>
                    <Table.Row bg="gray.50">
                      <Table.ColumnHeader px={4} py={3} fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.05em">
                        Code
                      </Table.ColumnHeader>
                      <Table.ColumnHeader px={4} py={3} fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.05em">
                        Type
                      </Table.ColumnHeader>
                      <Table.ColumnHeader px={4} py={3} fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.05em">
                        Value
                      </Table.ColumnHeader>
                      <Table.ColumnHeader px={4} py={3} textAlign="center" fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.05em">
                        Active
                      </Table.ColumnHeader>
                      <Table.ColumnHeader px={4} py={3} textAlign="right" fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.05em">
                        Actions
                      </Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>

                  <Table.Body>
                    {coupons.map((coupon) => (
                      <Table.Row key={coupon.uniqueId} borderColor="gray.200">
                        <Table.Cell px={4} py={4}>
                          <Flex align="center" gap={2} minW={0}>
                            <Text fontSize="sm" fontWeight="700" color="gray.900" lineClamp={1}>
                              {coupon.code}
                            </Text>
                            <Button
                              type="button"
                              variant="ghost"
                              h="28px"
                              w="28px"
                              minW="28px"
                              p={0}
                              borderRadius="full"
                              disabled={!discountsEnabled}
                              onClick={() => void handleCopyCouponCode(coupon)}
                            >
                              {copiedCouponUniqueId === coupon.uniqueId ? <Check size={14} /> : <Copy size={14} />}
                            </Button>
                          </Flex>
                        </Table.Cell>
                        <Table.Cell px={4} py={4}>
                          <Badge borderRadius="999px" px={2.5} py={1} colorPalette="gray" variant="subtle">
                            {formatDiscountTypeLabel(coupon.discountType)}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell px={4} py={4}>
                          <Text fontSize="sm" fontWeight="700" color="gray.900">
                            {formatDiscountAmount(coupon)}
                          </Text>
                        </Table.Cell>
                        <Table.Cell px={4} py={4} textAlign="center">
                          <Button
                            type="button"
                            role="switch"
                            aria-checked={coupon.isActive}
                            aria-label={`Toggle ${coupon.code} active state`}
                            onClick={() => handleToggleCouponActive(coupon.uniqueId)}
                            disabled={!discountsEnabled}
                            borderRadius="full"
                            h="32px"
                            w="56px"
                            minW="56px"
                            p={0}
                            bg={coupon.isActive ? "green.500" : "gray.200"}
                            color="white"
                          >
                            <Box
                              h="24px"
                              w="24px"
                              borderRadius="full"
                              bg="white"
                              transform={coupon.isActive ? "translateX(13px)" : "translateX(-13px)"}
                              transition="transform 0.15s ease"
                            />
                          </Button>
                        </Table.Cell>
                        <Table.Cell px={4} py={4}>
                          <Flex justify="flex-end" gap={2}>
                            <Button
                              type="button"
                              variant="outline"
                              h="36px"
                              w="36px"
                              minW="36px"
                              p={0}
                              borderRadius="full"
                              disabled={!discountsEnabled}
                              onClick={() => handleEditCoupon(coupon)}
                            >
                              <Pencil size={15} />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              h="36px"
                              w="36px"
                              minW="36px"
                              p={0}
                              borderRadius="full"
                              disabled={!discountsEnabled || !canDeleteCoupon(coupon)}
                              colorPalette="red"
                              onClick={() => handleDeleteCoupon(coupon.uniqueId)}
                            >
                              <Trash2 size={15} />
                            </Button>
                          </Flex>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            </>
          ) : (
            <Box border="1px dashed" borderColor="gray.200" borderRadius="18px" bg="gray.50" px={4} py={5}>
              <Text fontSize="sm" color="gray.600">
                No discount coupons have been created yet.
              </Text>
            </Box>
          )}
        </Stack>

        {stepError ? (
          <Box mt={4} border="1px solid" borderColor="red.200" bg="red.50" px={4} py={3} borderRadius="16px">
            <Text fontSize="sm" color="red.700">
              {stepError}
            </Text>
          </Box>
        ) : null}

      </Box>

      <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
        <Box border="1px solid" borderColor="gray.200" borderRadius="20px" bg="white" p={4}>
          <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
            Coupons
          </Text>
          <Text mt={2} fontSize="xl" fontWeight="800" color="gray.900">
            {coupons.length}
          </Text>
        </Box>
        <Box border="1px solid" borderColor="gray.200" borderRadius="20px" bg="white" p={4}>
          <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
            Active
          </Text>
          <Text mt={2} fontSize="xl" fontWeight="800" color="gray.900">
            {activeCouponCount}
          </Text>
        </Box>
        <Box border="1px solid" borderColor="gray.200" borderRadius="20px" bg="white" p={4}>
          <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
            Status
          </Text>
          <Text mt={2} fontSize="xl" fontWeight="800" color="gray.900">
            {discountsEnabled ? "Enabled" : "Disabled"}
          </Text>
        </Box>
      </SimpleGrid>

      <EventDiscountCouponModal
        isOpen={isCouponModalOpen}
        initialDraft={editingCoupon ? convertCouponToDraft(editingCoupon) : null}
        mode={editingCouponId ? "edit" : "create"}
        onClose={() => {
          setEditingCouponId(null)
          setIsCouponModalOpen(false)
        }}
        onSaveClose={handleCreateDiscountCoupon}
        onSaveContinue={handleCreateDiscountCoupon}
      />

      {pendingDeleteCoupon ? (
        <DeleteDiscountCouponModal
          code={pendingDeleteCoupon.code}
          onCancel={() => setPendingDeleteCouponId(null)}
          onConfirm={confirmDeleteCoupon}
        />
      ) : null}
    </Stack>
  )
}
