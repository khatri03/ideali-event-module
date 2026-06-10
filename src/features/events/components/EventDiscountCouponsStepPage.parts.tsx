import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Flex,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react"
import { useEffect, useRef, useState } from "react"
import type { DiscountCouponTypeValue } from "@/api/discountCoupons"
import {
  buildGeneratedCouponCode,
  getDefaultCouponDraft,
  getDiscountTypeHelperText,
  sanitizeCouponCode,
  validateCouponDraft,
  type DiscountCouponDraft,
  type DiscountCouponDraftErrors,
} from "./EventDiscountCouponsStepPage.helpers"

export function EventDiscountCouponModal({
  isOpen,
  initialDraft,
  mode,
  onClose,
  onSaveClose,
  onSaveContinue,
}: {
  isOpen: boolean
  initialDraft?: DiscountCouponDraft | null
  mode: "create" | "edit"
  onClose: () => void
  onSaveClose: (draft: DiscountCouponDraft) => void
  onSaveContinue: (draft: DiscountCouponDraft) => void
}) {
  const modalKey = initialDraft
    ? `${mode}-${initialDraft.code}-${initialDraft.discountType}-${initialDraft.discountValue}-${initialDraft.maxDiscountAmount}-${initialDraft.totalCoupons}-${initialDraft.isActive}`
    : `${mode}-new`

  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => !details.open && onClose()} size="xl">
      <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
      <Dialog.Positioner>
        {isOpen ? (
          <EventDiscountCouponModalContent
            key={modalKey}
            initialDraft={initialDraft}
            mode={mode}
            onClose={onClose}
            onSaveClose={onSaveClose}
            onSaveContinue={onSaveContinue}
          />
        ) : null}
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

function EventDiscountCouponModalContent({
  initialDraft,
  mode,
  onClose,
  onSaveClose,
  onSaveContinue,
}: {
  initialDraft?: DiscountCouponDraft | null
  mode: "create" | "edit"
  onClose: () => void
  onSaveClose: (draft: DiscountCouponDraft) => void
  onSaveContinue: (draft: DiscountCouponDraft) => void
}) {
  const [draft, setDraft] = useState<DiscountCouponDraft>(() => initialDraft ?? getDefaultCouponDraft())
  const [errors, setErrors] = useState<DiscountCouponDraftErrors>({})
  const [formError, setFormError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const codeInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    window.setTimeout(() => {
      codeInputRef.current?.focus()
    }, 0)
  }, [])

  const isPercentage = draft.discountType === "Percentage"

  const updateDraft = <K extends keyof DiscountCouponDraft>(key: K, value: DiscountCouponDraft[K]) => {
    setDraft((current) => {
      const next = { ...current, [key]: value }

      if (key === "discountType" && value !== "Percentage") {
        next.maxDiscountAmount = ""
      }

      return next
    })

    setErrors((current) => ({ ...current, [key]: undefined }))
    setFormError("")
  }

  const submit = async (modeToSave: "close" | "continue") => {
    if (isSaving) {
      return
    }

    const nextErrors = validateCouponDraft(draft)
    setErrors(nextErrors)
    setFormError("")

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSaving(true)
    try {
      if (modeToSave === "close") {
        onSaveClose(draft)
        onClose()
        return
      }

      onSaveContinue(draft)
      setDraft(getDefaultCouponDraft())
      setErrors({})
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save discount coupon.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog.Content
      bg="white"
      borderRadius={{ base: 0, md: "24px" }}
      maxW={{ base: "100vw", md: "980px" }}
      maxH={{ base: "100dvh", md: "90vh" }}
      m={{ base: 0, md: "auto" }}
      overflow="hidden"
      display="flex"
      flexDirection="column"
    >
      <Box px={6} pt={6} pb={4} borderBottom="1px solid" borderColor="gray.200">
        <Flex align="flex-start" justify="space-between" gap={4}>
          <Box minW={0}>
            <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
              Discount coupon
            </Text>
            <Text mt={2} fontSize="lg" fontWeight="800" color="gray.900">
              {mode === "edit" ? "Update discount coupon" : "Add discount coupon"}
            </Text>
            <Text mt={1} fontSize="sm" color="gray.600" lineHeight="1.6">
              {mode === "edit"
                ? "Update the coupon details for this event. Mandatory fields are marked with *."
                : "Create a coupon code for this event. Mandatory fields are marked with *."}
            </Text>
          </Box>

          <Dialog.CloseTrigger asChild>
            <CloseButton aria-label="Close discount coupon modal" />
          </Dialog.CloseTrigger>
        </Flex>
      </Box>

      <Dialog.Body px={6} py={6} overflowY="auto" bg="gray.50">
        <Box border="1px solid" borderColor="gray.200" borderRadius="22px" bg="white" p={{ base: 4, md: 6 }} shadow="sm">
          <Stack gap={4}>
            <Box>
              <Flex align="flex-start" justify="space-between" gap={3} wrap="wrap">
                <Text fontSize="sm" fontWeight="700" color="gray.800">
                  Code <Text as="span" color="red.500">*</Text>
                </Text>
                <Button
                  type="button"
                  variant="outline"
                  borderRadius="full"
                  h="34px"
                  px={3}
                  size="sm"
                  onClick={() => updateDraft("code", buildGeneratedCouponCode(draft))}
                >
                  Generate Random Code
                </Button>
              </Flex>
              <Box mt={2} position="relative">
                <Input
                  ref={codeInputRef}
                  value={draft.code}
                  onChange={(event) => updateDraft("code", sanitizeCouponCode(event.target.value))}
                  type="text"
                  autoComplete="off"
                  maxLength={16}
                  borderRadius="14px"
                  h="44px"
                  px={4}
                  pr={12}
                  borderColor="gray.200"
                  _focusVisible={{
                    borderColor: "green.400",
                    boxShadow: "0 0 0 3px color-mix(in srgb, var(--chakra-colors-green-500) 12%, transparent)",
                  }}
                  placeholder="WELCOME10"
                />
                {draft.code ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    position="absolute"
                    right="6px"
                    top="50%"
                    transform="translateY(-50%)"
                    minW="30px"
                    h="30px"
                    px={0}
                    borderRadius="full"
                    colorPalette="gray"
                    onClick={() => updateDraft("code", "")}
                  >
                    Clear
                  </Button>
                ) : null}
              </Box>
              {errors.code ? (
                <Text mt={2} fontSize="sm" color="red.500">
                  {errors.code}
                </Text>
              ) : null}
            </Box>

            <Box display="grid" gridTemplateColumns={{ base: "1fr", md: "repeat(3, minmax(0, 1fr))" }} gap={4}>
              <label style={{ display: "grid", gap: "0.5rem" }}>
                <Text fontSize="sm" fontWeight="700" color="gray.800">
                  Type <Text as="span" color="red.500">*</Text>
                </Text>
                <select
                  value={draft.discountType}
                  onChange={(event) => updateDraft("discountType", event.target.value as DiscountCouponTypeValue)}
                  style={{
                    width: "100%",
                    height: "44px",
                    borderRadius: "14px",
                    padding: "0 16px",
                    border: "1px solid var(--chakra-colors-gray-200)",
                    background: "white",
                    fontSize: "0.875rem",
                  }}
                >
                  <option value="FixedAmount">$</option>
                  <option value="Percentage">%</option>
                </select>
                <Text fontSize="xs" color="gray.500">
                  {getDiscountTypeHelperText(draft.discountType)}
                </Text>
                {errors.discountType ? <Text fontSize="xs" color="red.500">{errors.discountType}</Text> : null}
              </label>

              <label style={{ display: "grid", gap: "0.5rem" }}>
                <Text fontSize="sm" fontWeight="700" color="gray.800">
                  Max Discount
                </Text>
                <Input
                  value={draft.maxDiscountAmount}
                  onChange={(event) => updateDraft("maxDiscountAmount", event.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={!isPercentage}
                  borderRadius="14px"
                  h="44px"
                  px={4}
                  borderColor="gray.200"
                  bg={isPercentage ? "white" : "gray.100"}
                  _disabled={{ cursor: "not-allowed", opacity: 0.75 }}
                  placeholder="25"
                />
                <Text fontSize="xs" color="gray.500">
                  {isPercentage ? "Optional cap for percentage discounts." : "Available only for percentage discounts."}
                </Text>
                {errors.maxDiscountAmount ? (
                  <Text fontSize="xs" color="red.500">
                    {errors.maxDiscountAmount}
                  </Text>
                ) : null}
              </label>

              <label style={{ display: "grid", gap: "0.5rem" }}>
                <Text fontSize="sm" fontWeight="700" color="gray.800">
                  Value <Text as="span" color="red.500">*</Text>
                </Text>
                <Input
                  value={draft.discountValue}
                  onChange={(event) => updateDraft("discountValue", event.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  borderRadius="14px"
                  h="44px"
                  px={4}
                  borderColor="gray.200"
                  bg="white"
                  placeholder="10"
                />
                {errors.discountValue ? <Text fontSize="xs" color="red.500">{errors.discountValue}</Text> : null}
              </label>

              <label style={{ display: "grid", gap: "0.5rem" }}>
                <Text fontSize="sm" fontWeight="700" color="gray.800">
                  Total Coupons <Text as="span" color="red.500">*</Text>
                </Text>
                <Input
                  value={draft.totalCoupons}
                  onChange={(event) => updateDraft("totalCoupons", event.target.value)}
                  type="number"
                  min="1"
                  step="1"
                  borderRadius="14px"
                  h="44px"
                  px={4}
                  borderColor="gray.200"
                  bg="white"
                  placeholder="100"
                />
                {errors.totalCoupons ? <Text fontSize="xs" color="red.500">{errors.totalCoupons}</Text> : null}
              </label>
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="700" color="gray.800">
                Active
              </Text>
              <Flex mt={2} align="center" justify="space-between" gap={3} border="1px solid" borderColor="gray.200" borderRadius="16px" bg="gray.50" px={4} py={3}>
                <Text fontSize="sm" color="gray.600">
                  {draft.isActive ? "Available to use?" : "Inactive?"}
                </Text>
                <Button
                  type="button"
                  role="switch"
                  aria-checked={draft.isActive}
                  aria-label="Toggle coupon active state"
                  onClick={() => updateDraft("isActive", !draft.isActive)}
                  borderRadius="full"
                  h="34px"
                  w="58px"
                  minW="58px"
                  p={0}
                  bg={draft.isActive ? "green.500" : "gray.200"}
                  color="white"
                  _hover={{ bg: draft.isActive ? "green.600" : "gray.300" }}
                >
                  <Box
                    h="24px"
                    w="24px"
                    borderRadius="full"
                    bg="white"
                    transform={draft.isActive ? "translateX(13px)" : "translateX(-13px)"}
                    transition="transform 0.15s ease"
                  />
                </Button>
              </Flex>
            </Box>

            {formError ? (
              <Box border="1px solid" borderColor="red.200" bg="red.50" px={4} py={3} borderRadius="16px">
                <Text fontSize="sm" color="red.700">
                  {formError}
                </Text>
              </Box>
            ) : null}
          </Stack>
        </Box>
      </Dialog.Body>

      <Box px={6} py={5} borderTop="1px solid" borderColor="gray.200">
        <Flex flexDirection={{ base: "column-reverse", md: "row" }} align={{ md: "center" }} justify="space-between" gap={3}>
          <Button
            variant="outline"
            colorPalette="gray"
            borderRadius="14px"
            h="44px"
            px={5}
            minW={{ base: "full", md: "auto" }}
            onClick={onClose}
          >
            Close
          </Button>

          <Flex gap={3} flexWrap="wrap" justifyContent="flex-end" ml={{ md: "auto" }}>
            <Button
              variant="outline"
              borderRadius="14px"
              h="44px"
              px={5}
              minW={{ base: "full", md: "auto" }}
              onClick={() => void submit("continue")}
              disabled={isSaving}
            >
              {mode === "edit" ? "Update & Continue" : "Add & Continue"}
            </Button>
            <Button
              borderRadius="14px"
              h="44px"
              px={5}
              minW={{ base: "full", md: "auto" }}
              onClick={() => void submit("close")}
              disabled={isSaving}
              color="white"
              style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
            >
              {mode === "edit" ? "Update & Close" : "Add & Close"}
            </Button>
          </Flex>
        </Flex>
      </Box>
    </Dialog.Content>
  )
}

export function DeleteDiscountCouponModal({
  code,
  onCancel,
  onConfirm,
}: {
  code: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog.Root open size="md" onOpenChange={(details) => !details.open && onCancel()}>
      <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
      <Dialog.Positioner>
        <Dialog.Content
          bg="white"
          borderRadius={{ base: 0, md: "24px" }}
          maxW={{ base: "100vw", md: "560px" }}
          maxH={{ base: "100dvh", md: "90vh" }}
          m={{ base: 0, md: "auto" }}
          overflow="hidden"
        >
          <Box px={6} pt={6} pb={4} borderBottom="1px solid" borderColor="gray.200">
            <Text fontSize="xs" fontWeight="800" color="red.600" textTransform="uppercase" letterSpacing="0.12em">
              Delete discount coupon
            </Text>
            <Text mt={2} fontSize="lg" fontWeight="800" color="gray.900">
              Are you sure?
            </Text>
          </Box>

          <Box px={6} py={5}>
            <Stack gap={3}>
              <Text fontSize="sm" color="gray.600" lineHeight="1.7">
                This will remove <Text as="span" fontWeight="700" color="gray.900">{code}</Text> from the coupon list.
              </Text>
              <Text fontSize="sm" color="gray.600" lineHeight="1.7">
                This action cannot be undone.
              </Text>
            </Stack>
          </Box>

          <Box px={6} py={4} borderTop="1px solid" borderColor="gray.200">
            <Flex justify="space-between" gap={3}>
              <Button variant="outline" borderRadius="14px" h="44px" px={5} onClick={onCancel}>
                Cancel
              </Button>
              <Button colorPalette="red" borderRadius="14px" h="44px" px={5} onClick={onConfirm}>
                Delete
              </Button>
            </Flex>
          </Box>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
