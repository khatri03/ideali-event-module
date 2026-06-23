import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import {
  Badge,
  Box,
  Button,
  CloseButton,
  Dialog,
  Field,
  Flex,
  Heading,
  Input,
  SimpleGrid,
  Skeleton,
  SkeletonText,
  Stack,
  Switch,
  Table,
  Text,
} from "@chakra-ui/react"
import { PencilLine, Plus, RefreshCcw } from "lucide-react"
import { StyledSelect } from "@/components/common"
import { extractApiError } from "@/utils/errors"
import {
  createOrganizerPaymentProcessorFee,
  fetchOrganizerPaymentMerchants,
  fetchOrganizerPaymentMerchantMethods,
  fetchOrganizerPaymentProcessorFees,
  type OrganizerPaymentMerchantOption,
  type OrganizerPaymentMethodOption,
  type OrganizerPaymentProcessorFee,
  type PaymentProcessorFeeInput,
  updateOrganizerPaymentProcessorFee,
} from "@/api/paymentProcessorFees"

const paymentProcessorFeeFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80, "Maximum 80 characters allowed."),
  label: z.string().trim().min(1, "Label is required.").max(120, "Maximum 120 characters allowed."),
  paymentMerchantId: z.number().int().positive("Payment merchant is required."),
  paymentProductId: z.number().int().positive("Payment method is required."),
  valueType: z.enum(["Fixed", "Percent"], { message: "Value type is required." }),
  value: z.number().positive("Value must be greater than zero."),
  isActive: z.boolean(),
})

type PaymentProcessorFeeFormValues = z.infer<typeof paymentProcessorFeeFormSchema>

const EMPTY_FORM_VALUES: PaymentProcessorFeeFormValues = {
  name: "",
  label: "",
  paymentMerchantId: 0,
  paymentProductId: 0,
  valueType: "Percent",
  value: 0,
  isActive: true,
}

const FEE_VALUE_TYPE_OPTIONS = [
  { label: "Fixed Amount", value: "Fixed" },
  { label: "Percentage", value: "Percent" },
]

function formatFeeValue(valueType: OrganizerPaymentProcessorFee["valueType"], value: number) {
  if (valueType === "Percent") {
    return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)}%`
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value)
}

function PaymentProcessorFeesSkeleton() {
  return (
    <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" p={5}>
      <Skeleton height="28px" width="220px" mb={3} />
      <SkeletonText noOfLines={2} mb={6} />
      <Skeleton height="54px" mb={4} />
      <SkeletonText noOfLines={7} />
    </Box>
  )
}

function asNumber(value: string) {
  return Number(value || 0)
}

export function PaymentProcessorFeesManager() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingFee, setEditingFee] = useState<OrganizerPaymentProcessorFee | null>(null)
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const feesQuery = useQuery({
    queryKey: ["payment-processor-fees"],
    queryFn: fetchOrganizerPaymentProcessorFees,
  })

  const merchantsQuery = useQuery({
    queryKey: ["payment-merchants"],
    queryFn: fetchOrganizerPaymentMerchants,
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<PaymentProcessorFeeFormValues>({
    resolver: zodResolver(paymentProcessorFeeFormSchema),
    defaultValues: EMPTY_FORM_VALUES,
  })

  const paymentMerchantId = useWatch({ control, name: "paymentMerchantId" })
  const paymentProductId = useWatch({ control, name: "paymentProductId" })
  const isActive = useWatch({ control, name: "isActive" })
  const currentValueType = useWatch({ control, name: "valueType" })

  const methodsQuery = useQuery({
    queryKey: ["payment-merchant-methods", paymentMerchantId],
    queryFn: () => fetchOrganizerPaymentMerchantMethods(paymentMerchantId),
    enabled: paymentMerchantId > 0,
  })

  const merchantOptions = useMemo(
    () =>
      merchantsQuery.data?.map((merchant: OrganizerPaymentMerchantOption) => ({
        label: merchant.name,
        value: String(merchant.id),
      })) ?? [],
    [merchantsQuery.data]
  )

  const methodOptions = useMemo(
    () =>
      methodsQuery.data?.map((method: OrganizerPaymentMethodOption) => ({
        label: method.text,
        value: String(method.value),
      })) ?? [],
    [methodsQuery.data]
  )

  const createMutation = useMutation({
    mutationFn: createOrganizerPaymentProcessorFee,
    onSuccess: () => {
      setBanner({ type: "success", message: "Payment processor fee saved." })
      setIsDialogOpen(false)
      setEditingFee(null)
      reset(EMPTY_FORM_VALUES)
    },
    onError: () => {
      setBanner(null)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-processor-fees"] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ uniqueId, input }: { uniqueId: string; input: PaymentProcessorFeeInput }) =>
      updateOrganizerPaymentProcessorFee(uniqueId, input),
    onSuccess: () => {
      setBanner({ type: "success", message: "Payment processor fee updated." })
      setIsDialogOpen(false)
      setEditingFee(null)
      reset(EMPTY_FORM_VALUES)
    },
    onError: () => {
      setBanner(null)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-processor-fees"] })
    },
  })

  useEffect(() => {
    if (!isDialogOpen || editingFee || paymentMerchantId > 0 || !merchantsQuery.data?.length) {
      return
    }

    const firstMerchant = merchantsQuery.data?.[0]
    if (firstMerchant && paymentMerchantId !== firstMerchant.id) {
      setValue("paymentMerchantId", firstMerchant.id, { shouldDirty: true, shouldValidate: true })
    }
  }, [editingFee, isDialogOpen, merchantsQuery.data, paymentMerchantId, setValue])

  useEffect(() => {
    if (!methodsQuery.data?.length) {
      return
    }

    const hasSelectedMethod = methodsQuery.data.some((method) => method.value === paymentProductId)
    if (!hasSelectedMethod) {
      setValue("paymentProductId", methodsQuery.data[0].value, { shouldDirty: true, shouldValidate: true })
    }
  }, [methodsQuery.data, paymentProductId, setValue])

  function openCreateDialog() {
    setBanner(null)
    setEditingFee(null)
    reset(EMPTY_FORM_VALUES)
    setIsDialogOpen(true)
  }

  function openEditDialog(fee: OrganizerPaymentProcessorFee) {
    setBanner(null)
    setEditingFee(fee)
    reset({
      name: fee.name,
      label: fee.label,
      paymentMerchantId: fee.paymentMerchantId,
      paymentProductId: fee.paymentProductId,
      valueType: fee.valueType,
      value: fee.value,
      isActive: fee.isActive,
    })
    setIsDialogOpen(true)
  }

  async function handleSave(values: PaymentProcessorFeeFormValues) {
    const payload: PaymentProcessorFeeInput = {
      name: values.name.trim(),
      label: values.label.trim(),
      paymentMerchantId: values.paymentMerchantId,
      paymentProductId: values.paymentProductId,
      valueType: values.valueType,
      value: values.value,
      isActive: values.isActive,
    }

    if (editingFee?.uniqueId) {
      await updateMutation.mutateAsync({ uniqueId: editingFee.uniqueId, input: payload })
      return
    }

    await createMutation.mutateAsync(payload)
  }

  const isBusy = createMutation.isPending || updateMutation.isPending
  const saveError = createMutation.error ?? updateMutation.error
  const fees = feesQuery.data ?? []

  return (
    <Stack gap={5}>
      <Flex
        direction={{ base: "column", lg: "row" }}
        align={{ base: "stretch", lg: "center" }}
        justify="space-between"
        gap={4}
      >
        <Box>
          <Text fontSize="xs" fontWeight="800" textTransform="uppercase" letterSpacing="0.12em" color="gray.500">
            Payment processor fees
          </Text>
          <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" letterSpacing="-0.03em" color="gray.900">
            Merchant cut offsets
          </Heading>
          <Text mt={2} fontSize={{ base: "sm", md: "md" }} color="gray.600" maxW="2xl">
            Define a fee offset per merchant and payment method so the organizer can recoup processor cut damage without touching platform charges.
          </Text>
        </Box>

        <Button
          w={{ base: "full", md: "auto" }}
          minH="11"
          px={6}
          py={3}
          borderRadius="14px"
          fontWeight="700"
          bg="linear-gradient(135deg, #7551FF 0%, #422AFB 100%)"
          color="white"
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          gap={2}
          onClick={openCreateDialog}
        >
          <Plus size={16} />
          Add Fee
        </Button>
      </Flex>

      {banner ? (
        <Box
          p={4}
          borderRadius="16px"
          border="1px solid"
          borderColor={banner.type === "success" ? "green.200" : "red.200"}
          bg={banner.type === "success" ? "green.50" : "red.50"}
        >
          <Text fontSize="sm" fontWeight="700" color={banner.type === "success" ? "green.700" : "red.700"}>
            {banner.message}
          </Text>
        </Box>
      ) : null}

      {feesQuery.isError ? (
        <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
          <Text fontSize="sm" fontWeight="700" color="red.700">
            {extractApiError(feesQuery.error)}
          </Text>
        </Box>
      ) : null}

      {feesQuery.isLoading && !feesQuery.data ? (
        <PaymentProcessorFeesSkeleton />
      ) : (
        <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" boxShadow="card" overflow="hidden">
          <Flex
            px={{ base: 4, md: 6 }}
            py={4}
            align={{ base: "stretch", md: "center" }}
            justify="space-between"
            direction={{ base: "column", md: "row" }}
            gap={3}
            borderBottom="1px solid"
            borderColor="border.subtle"
          >
            <Box>
              <Text fontSize="lg" fontWeight="700" color="text.primary">
                Saved fees
              </Text>
              <Text fontSize="sm" color="text.secondary">
                {fees.length} fee{fees.length === 1 ? "" : "s"} configured
              </Text>
            </Box>
            <Button
              variant="outline"
              minH="11"
              px={4}
              onClick={() => feesQuery.refetch()}
              loading={feesQuery.isFetching}
            >
              <RefreshCcw size={16} />
              Refresh
            </Button>
          </Flex>

          <Box overflowX="auto">
            <Table.Root variant="line" size="sm">
              <Table.Header>
                <Table.Row bg="app.bg">
                  <Table.ColumnHeader px={6} py={3}>
                    Name
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>
                    Merchant
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>
                    Method
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>
                    Value
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>
                    Status
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3} textAlign="right">
                    Actions
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {fees.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={6} py={14}>
                      <Box textAlign="center">
                        <Text fontSize="lg" fontWeight="700" color="gray.900">
                          No processor fees configured
                        </Text>
                        <Text mt={2} fontSize="sm" color="gray.600">
                          Add the first fee to map processor cut offsets by merchant and payment method.
                        </Text>
                        <Button
                          mt={5}
                          px={6}
                          py={3}
                          minH="11"
                          borderRadius="14px"
                          display="inline-flex"
                          alignItems="center"
                          justifyContent="center"
                          gap={2}
                          onClick={openCreateDialog}
                        >
                          <Plus size={16} />
                          Add Fee
                        </Button>
                      </Box>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  fees.map((fee) => (
                    <Table.Row key={fee.uniqueId} _hover={{ bg: "app.bg" }} transition="background 0.15s">
                      <Table.Cell px={6} py={4}>
                        <Box>
                          <Text fontSize="sm" fontWeight="700" color="text.primary">
                            {fee.name}
                          </Text>
                          <Text fontSize="xs" color="text.secondary" lineClamp={1}>
                            {fee.label}
                          </Text>
                        </Box>
                      </Table.Cell>
                      <Table.Cell px={4} py={4}>
                        <Text fontSize="sm" color="text.primary">
                          {fee.paymentMerchantName}
                        </Text>
                      </Table.Cell>
                      <Table.Cell px={4} py={4}>
                        <Text fontSize="sm" color="text.primary">
                          {fee.paymentProductName}
                        </Text>
                      </Table.Cell>
                      <Table.Cell px={4} py={4}>
                        <Flex direction="column" gap={1}>
                          <Badge variant="subtle" colorPalette={fee.valueType === "Percent" ? "cyan" : "orange"} borderRadius="999px" px={3} py={1} alignSelf="start">
                            {fee.valueType === "Percent" ? "Percentage" : "Fixed Amount"}
                          </Badge>
                          <Text fontSize="sm" fontWeight="700" color="text.primary">
                            {formatFeeValue(fee.valueType, fee.value)}
                          </Text>
                        </Flex>
                      </Table.Cell>
                      <Table.Cell px={4} py={4}>
                        <Badge
                          colorPalette={fee.isActive ? "green" : "gray"}
                          variant="subtle"
                          borderRadius="999px"
                          px={3}
                          py={1}
                          fontSize="10px"
                          fontWeight="800"
                          textTransform="uppercase"
                          letterSpacing="0.08em"
                        >
                          {fee.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell px={4} py={4} textAlign="right">
                        <Button variant="outline" minH="11" px={4} onClick={() => openEditDialog(fee)}>
                          <PencilLine size={16} />
                          Edit
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table.Root>
          </Box>
        </Box>
      )}

      <Dialog.Root
        open={isDialogOpen}
        onOpenChange={(details) => {
          setIsDialogOpen(details.open)
          if (!details.open) {
            setEditingFee(null)
            reset(EMPTY_FORM_VALUES)
          }
        }}
        size="lg"
      >
        <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius={{ base: 0, md: "24px" }}
            maxW={{ base: "100vw", md: "680px" }}
            maxH={{ base: "100dvh", md: "90vh" }}
            m={{ base: 0, md: "auto" }}
            overflow="hidden"
            display="flex"
            flexDirection="column"
          >
            <Box px={6} pt={6} pb={4} borderBottom="1px solid" borderColor="gray.200">
              <Flex align="flex-start" justify="space-between" gap={4}>
                <Box>
                  <Text fontSize="lg" fontWeight="800" color="gray.900">
                    {editingFee ? "Edit fee" : "Add fee"}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Map a surcharge against the merchant and payment method the user actually pays with.
                  </Text>
                </Box>

                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close fee modal" />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>

            <Dialog.Body px={6} py={6} overflowY="auto">
              <form
                onSubmit={handleSubmit(handleSave)}
                style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
              >
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                  <Field.Root invalid={Boolean(errors.name)}>
                    <Field.Label>Name</Field.Label>
                    <Input {...register("name")} minH="11" borderRadius="14px" px={4} placeholder="Stripe card fee" />
                    {errors.name ? <Field.ErrorText>{errors.name.message}</Field.ErrorText> : null}
                  </Field.Root>

                  <Field.Root invalid={Boolean(errors.label)}>
                    <Field.Label>Label</Field.Label>
                    <Input {...register("label")} minH="11" borderRadius="14px" px={4} placeholder="Processor fee offset" />
                    {errors.label ? <Field.ErrorText>{errors.label.message}</Field.ErrorText> : null}
                  </Field.Root>

                  <Field.Root invalid={Boolean(errors.paymentMerchantId)}>
                    <Field.Label>Payment merchant</Field.Label>
                    <StyledSelect
                      options={merchantOptions}
                      value={paymentMerchantId > 0 ? String(paymentMerchantId) : ""}
                      onChange={(value) => {
                        const nextMerchantId = asNumber(value)
                        setValue("paymentMerchantId", nextMerchantId, { shouldDirty: true, shouldValidate: true })
                        setValue("paymentProductId", 0, { shouldDirty: true, shouldValidate: true })
                      }}
                      placeholder={merchantsQuery.isLoading ? "Loading merchants..." : "Select merchant"}
                      disabled={merchantsQuery.isLoading}
                    />
                    {errors.paymentMerchantId ? <Field.ErrorText>{errors.paymentMerchantId.message}</Field.ErrorText> : null}
                  </Field.Root>

                  <Field.Root invalid={Boolean(errors.paymentProductId)}>
                    <Field.Label>Payment method</Field.Label>
                    <StyledSelect
                      options={methodOptions}
                      value={paymentProductId > 0 ? String(paymentProductId) : ""}
                      onChange={(value) => setValue("paymentProductId", asNumber(value), { shouldDirty: true, shouldValidate: true })}
                      placeholder={!paymentMerchantId ? "Select merchant first" : methodsQuery.isLoading ? "Loading methods..." : "Select method"}
                      disabled={!paymentMerchantId || methodsQuery.isLoading}
                    />
                    {methodsQuery.isError ? (
                      <Text mt={2} fontSize="sm" color="red.600">
                        {extractApiError(methodsQuery.error)}
                      </Text>
                    ) : null}
                    {errors.paymentProductId ? <Field.ErrorText>{errors.paymentProductId.message}</Field.ErrorText> : null}
                  </Field.Root>

                  <Field.Root invalid={Boolean(errors.valueType)}>
                    <Field.Label>Value type</Field.Label>
                    <StyledSelect
                      options={FEE_VALUE_TYPE_OPTIONS}
                      value={currentValueType}
                      onChange={(value) => setValue("valueType", value as PaymentProcessorFeeFormValues["valueType"], { shouldDirty: true, shouldValidate: true })}
                      placeholder="Select value type"
                    />
                    {errors.valueType ? <Field.ErrorText>{errors.valueType.message}</Field.ErrorText> : null}
                  </Field.Root>

                  <Field.Root invalid={Boolean(errors.value)}>
                    <Field.Label>Value</Field.Label>
                    <Input
                      {...register("value", { valueAsNumber: true })}
                      type="number"
                      min="0"
                      step={currentValueType === "Percent" ? "0.01" : "1"}
                      minH="11"
                      borderRadius="14px"
                      px={4}
                      placeholder={currentValueType === "Percent" ? "2.00" : "5.00"}
                    />
                    {errors.value ? <Field.ErrorText>{errors.value.message}</Field.ErrorText> : null}
                  </Field.Root>
                </SimpleGrid>

                <Box
                  borderRadius="18px"
                  border="1px solid"
                  borderColor="border.subtle"
                  bg="app.bg"
                  px={4}
                  py={4}
                >
                  <Flex align="center" justify="space-between" gap={4}>
                    <Box>
                      <Text fontSize="sm" fontWeight="700" color="text.primary">
                        Active
                      </Text>
                      <Text fontSize="xs" color="text.secondary">
                        Disabled fees stay on record but will not be applied.
                      </Text>
                    </Box>
                    <Switch.Root checked={isActive} onCheckedChange={(details) => setValue("isActive", details.checked, { shouldDirty: true })}>
                      <Switch.HiddenInput />
                      <Switch.Control />
                    </Switch.Root>
                  </Flex>
                </Box>

                {saveError ? (
                  <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
                    <Text fontSize="sm" fontWeight="700" color="red.700">
                      {extractApiError(saveError)}
                    </Text>
                  </Box>
                ) : null}

                <Flex
                  pt={5}
                  borderTop="1px solid"
                  borderColor="gray.200"
                  align="center"
                  justify="space-between"
                  gap={3}
                  flexWrap="wrap"
                >
                  <Button
                    variant="outline"
                    colorPalette="gray"
                    borderRadius="14px"
                    h="44px"
                    px={6}
                    minW={{ base: "full", md: "140px" }}
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Close
                  </Button>

                  <Button
                    borderRadius="14px"
                    h="44px"
                    px={6}
                    minW={{ base: "full", md: "160px" }}
                    loading={isBusy}
                    loadingText="Saving..."
                    type="submit"
                    color="white"
                    style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                  >
                    {editingFee ? "Update fee" : "Save fee"}
                  </Button>
                </Flex>
              </form>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Stack>
  )
}
