import { useMemo, useState, type ReactNode } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
  Menu,
  Portal,
  SimpleGrid,
  Skeleton,
  SkeletonText,
  Stack,
  Switch,
  Table,
  Text,
} from "@chakra-ui/react"
import { MoreHorizontal, PencilLine, Plus, RefreshCcw } from "lucide-react"
import { StyledSelect } from "@/components/common"
import { extractApiError } from "@/utils/errors"
import { useCreateChargeRule, useChargeRules, useUpdateChargeRule } from "../hooks/useChargeRules"
import type { OrganizerChargeRuleInput, OrganizerChargeRuleListItem } from "@/api/chargeRules"

const PAGE_SIZE = 10

const chargeRuleFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(80, "Maximum 80 characters allowed."),
    label: z.string().trim().min(1, "Label is required.").max(120, "Maximum 120 characters allowed."),
    chargeKind: z.enum(["Tax", "Other"], { message: "Charge category is required." }),
    calculationType: z.enum(["Fixed", "Percent"], { message: "Calculation type is required." }),
    value: z.number().nonnegative("Value must be zero or greater."),
    isActive: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.calculationType === "Percent" && values.value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "Percentage value cannot exceed 100.",
      })
    }
  })

type ChargeRuleFormValues = z.infer<typeof chargeRuleFormSchema>

const EMPTY_FORM_VALUES: ChargeRuleFormValues = {
  name: "",
  label: "",
  chargeKind: "Tax",
  calculationType: "Fixed",
  value: 0,
  isActive: true,
}

const CHARGE_KIND_OPTIONS = [
  { label: "Tax", value: "Tax" },
  { label: "Other", value: "Other" },
]

const CALCULATION_TYPE_OPTIONS = [
  { label: "Fixed", value: "Fixed" },
  { label: "Percent", value: "Percent" },
]

function formatChargeValue(item: OrganizerChargeRuleListItem) {
  const value = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(item.value)
  return item.calculationType === "Percent" ? `${value}%` : value
}

function buildPageNumbers(page: number, totalPages: number) {
  const pages: number[] = []
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages, page + 2)

  for (let current = start; current <= end; current += 1) {
    pages.push(current)
  }

  return pages
}

function ChargeRulesSkeleton() {
  return (
    <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" p={5}>
      <Skeleton height="28px" width="220px" mb={3} />
      <SkeletonText noOfLines={2} mb={6} />
      <Skeleton height="54px" mb={4} />
      <SkeletonText noOfLines={7} />
    </Box>
  )
}

function RequiredFieldLabel({ children }: { children: ReactNode }) {
  return (
    <Field.Label display="flex" alignItems="center" gap={2} flexWrap="wrap">
      <Text as="span">{children}</Text>
      <Text as="span" color="red.500" fontWeight="800" aria-hidden="true">
        *
      </Text>
    </Field.Label>
  )
}

export function ChargeRulesManager() {
  const [page, setPage] = useState(1)
  const chargeRulesQuery = useChargeRules(page, PAGE_SIZE)
  const createChargeRuleMutation = useCreateChargeRule()
  const updateChargeRuleMutation = useUpdateChargeRule()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<OrganizerChargeRuleListItem | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<ChargeRuleFormValues>({
    resolver: zodResolver(chargeRuleFormSchema),
    defaultValues: EMPTY_FORM_VALUES,
  })

  const chargeKind = useWatch({ control, name: "chargeKind" })
  const calculationType = useWatch({ control, name: "calculationType" })
  const isActive = useWatch({ control, name: "isActive" })

  const isBusy = createChargeRuleMutation.isPending || updateChargeRuleMutation.isPending
  const rulesPage = chargeRulesQuery.data
  const rules = rulesPage?.items ?? []
  const totalPages = rulesPage?.totalPages ?? 0
  const currentPage = rulesPage?.page ?? page
  const pageNumbers = useMemo(() => buildPageNumbers(currentPage, totalPages), [currentPage, totalPages])

  function resetDialogState() {
    createChargeRuleMutation.reset()
    updateChargeRuleMutation.reset()
  }

  function openCreateDialog() {
    resetDialogState()
    setEditingRule(null)
    reset(EMPTY_FORM_VALUES)
    setIsDialogOpen(true)
  }

  function openEditDialog(rule: OrganizerChargeRuleListItem) {
    resetDialogState()
    setEditingRule(rule)
    reset({
      name: rule.name,
      label: rule.label,
      chargeKind: rule.chargeKind === "Other" ? "Other" : "Tax",
      calculationType: rule.calculationType,
      value: rule.value,
      isActive: rule.isActive,
    })
    setIsDialogOpen(true)
  }

  async function handleSave(values: ChargeRuleFormValues) {
    const payload: OrganizerChargeRuleInput = {
      name: values.name.trim(),
      label: values.label.trim(),
      chargeKind: values.chargeKind,
      calculationType: values.calculationType,
      value: values.value,
      isActive: values.isActive,
    }

    if (editingRule?.uniqueId) {
      await updateChargeRuleMutation.mutateAsync({ uniqueId: editingRule.uniqueId, input: payload })
      setIsDialogOpen(false)
      setEditingRule(null)
      reset(EMPTY_FORM_VALUES)
      return
    }

    await createChargeRuleMutation.mutateAsync(payload)
    setIsDialogOpen(false)
    setEditingRule(null)
    reset(EMPTY_FORM_VALUES)
  }

  const saveError = createChargeRuleMutation.error ?? updateChargeRuleMutation.error

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
            Charge rules
          </Text>
          <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" letterSpacing="-0.03em" color="gray.900">
            Organizer Charge Rules
          </Heading>
          <Text mt={2} fontSize={{ base: "sm", md: "md" }} color="gray.600" maxW="2xl">
            Create reusable buyer-facing charges, then edit them later without rebuilding the flow.
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
          Add Charge Rule
        </Button>
      </Flex>

      {chargeRulesQuery.isError ? (
        <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
          <Text fontSize="sm" fontWeight="700" color="red.700">
            {extractApiError(chargeRulesQuery.error)}
          </Text>
        </Box>
      ) : null}

      {chargeRulesQuery.isLoading && !chargeRulesQuery.data ? (
        <ChargeRulesSkeleton />
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
                Saved rules
              </Text>
              <Text fontSize="sm" color="text.secondary">
                {rules.length} rule{rules.length === 1 ? "" : "s"} configured
              </Text>
            </Box>
            <Button
              variant="outline"
              minH="11"
              px={4}
              onClick={() => chargeRulesQuery.refetch()}
              loading={chargeRulesQuery.isFetching}
            >
              <RefreshCcw size={16} />
              Refresh
            </Button>
          </Flex>

          <Flex
            px={{ base: 4, md: 6 }}
            py={3}
            align={{ base: "stretch", md: "center" }}
            justify="space-between"
            direction={{ base: "column", md: "row" }}
            gap={3}
            borderBottom="1px solid"
            borderColor="border.subtle"
          >
            <Text fontSize="sm" color="gray.600">
              Page {currentPage} of {Math.max(totalPages, 1)}
            </Text>

            {totalPages > 1 ? (
              <Flex gap={2} align="center" wrap="wrap" justify="flex-end">
                <Button variant="outline" disabled={currentPage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  Previous
                </Button>
                {pageNumbers.map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    variant={pageNumber === currentPage ? "solid" : "outline"}
                    onClick={() => setPage(pageNumber)}
                    minW="42px"
                    colorPalette={pageNumber === currentPage ? "brand" : undefined}
                  >
                    {pageNumber}
                  </Button>
                ))}
                <Button variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages || 1, current + 1))}>
                  Next
                </Button>
              </Flex>
            ) : null}
          </Flex>

          <Box overflowX="auto">
            <Table.Root
              variant="line"
              size="sm"
              css={{
                borderCollapse: "collapse",
                "& th, & td": {
                  border: "1px solid",
                  borderColor: "gray.300",
                },
              }}
            >
              <Table.Header>
                <Table.Row bg="app.bg">
                  <Table.ColumnHeader px={4} py={3} textAlign="center">
                    Actions
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={6} py={3} textAlign="center">
                    Name
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3} textAlign="center">
                    Display Text
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3} textAlign="center">
                    Category
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3} textAlign="center">
                    Calculation
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3} textAlign="center">
                    Value
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3} textAlign="center">
                    Status
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {rules.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={7} py={14}>
                      <Box textAlign="center">
                        <Text fontSize="lg" fontWeight="700" color="gray.900">
                          No charge rules configured
                        </Text>
                        <Text mt={2} fontSize="sm" color="gray.600">
                          Add the first rule to define reusable buyer-facing charges.
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
                          Add Charge Rule
                        </Button>
                      </Box>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  rules.map((rule) => (
                    <Table.Row key={rule.uniqueId} _hover={{ bg: "app.bg" }} transition="background 0.15s">
                      <Table.Cell px={4} py={4} textAlign="center">
                        <Menu.Root>
                          <Menu.Trigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              aria-label={`Charge rule actions for ${rule.name}`}
                              title={`Charge rule actions for ${rule.name}`}
                              borderRadius="full"
                              h="36px"
                              w="36px"
                              minW="36px"
                              p={0}
                            >
                              <MoreHorizontal size={15} />
                            </Button>
                          </Menu.Trigger>
                          <Portal>
                            <Menu.Positioner>
                              <Menu.Content
                                minW="12rem"
                                borderRadius="14px"
                                border="1px solid"
                                borderColor="gray.200"
                                bg="white"
                                boxShadow="0 16px 40px rgba(15, 23, 42, 0.12)"
                                p={1}
                              >
                                <Menu.Item
                                  value={`edit-${rule.uniqueId}`}
                                  onClick={() => openEditDialog(rule)}
                                  borderRadius="10px"
                                  fontSize="sm"
                                  fontWeight="600"
                                  color="gray.700"
                                  px={3}
                                  py={2}
                                  cursor="pointer"
                                >
                                  <PencilLine size={14} />
                                  Edit
                                </Menu.Item>
                              </Menu.Content>
                            </Menu.Positioner>
                          </Portal>
                        </Menu.Root>
                      </Table.Cell>
                      <Table.Cell px={6} py={4}>
                        <Text fontSize="sm" fontWeight="700" color="text.primary">
                          {rule.name}
                        </Text>
                      </Table.Cell>
                      <Table.Cell px={4} py={4}>
                        <Text fontSize="sm" color="text.primary" lineClamp={1}>
                          {rule.label}
                        </Text>
                      </Table.Cell>
                      <Table.Cell px={4} py={4}>
                        <Text fontSize="sm" color="text.primary">
                          {rule.chargeKind}
                        </Text>
                      </Table.Cell>
                      <Table.Cell px={4} py={4} textAlign="center">
                        <Text fontSize="sm" color="text.primary">
                          {rule.calculationType}
                        </Text>
                      </Table.Cell>
                      <Table.Cell px={4} py={4} textAlign="center">
                        <Text fontSize="sm" fontWeight="700" color="text.primary">
                          {formatChargeValue(rule)}
                        </Text>
                      </Table.Cell>
                      <Table.Cell px={4} py={4} textAlign="center">
                        <Badge
                          colorPalette={rule.isActive ? "green" : "gray"}
                          variant="subtle"
                          borderRadius="999px"
                          px={3}
                          py={1}
                          fontSize="10px"
                          fontWeight="800"
                          textTransform="uppercase"
                          letterSpacing="0.08em"
                        >
                          {rule.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table.Root>
          </Box>

          <Flex
            px={{ base: 4, md: 6 }}
            py={4}
            align={{ base: "stretch", md: "center" }}
            justify="space-between"
            direction={{ base: "column", md: "row" }}
            gap={3}
            borderTop="1px solid"
            borderColor="border.subtle"
          >
            <Text fontSize="sm" color="gray.600">
              Page {currentPage} of {Math.max(totalPages, 1)}
            </Text>

            {totalPages > 1 ? (
              <Flex gap={2} align="center" wrap="wrap" justify="flex-end">
                <Button variant="outline" disabled={currentPage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  Previous
                </Button>
                {pageNumbers.map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    variant={pageNumber === currentPage ? "solid" : "outline"}
                    onClick={() => setPage(pageNumber)}
                    minW="42px"
                    colorPalette={pageNumber === currentPage ? "brand" : undefined}
                  >
                    {pageNumber}
                  </Button>
                ))}
                <Button variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages || 1, current + 1))}>
                  Next
                </Button>
              </Flex>
            ) : null}
          </Flex>
        </Box>
      )}

      <Dialog.Root
        open={isDialogOpen}
        onOpenChange={(details) => {
          setIsDialogOpen(details.open)
          if (!details.open) {
            setEditingRule(null)
            reset(EMPTY_FORM_VALUES)
            resetDialogState()
          }
        }}
        size="lg"
      >
        <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius={{ base: 0, md: "24px" }}
            maxW={{ base: "100vw", md: "720px" }}
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
                    {editingRule ? "Edit charge rule" : "Add charge rule"}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Define a reusable buyer-facing charge.
                  </Text>
                </Box>

                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close charge rule modal" />
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
                    <RequiredFieldLabel>Name</RequiredFieldLabel>
                    <Input {...register("name")} minH="11" borderRadius="14px" px={4} placeholder="Festival tax rule" />
                    {errors.name ? <Field.ErrorText>{errors.name.message}</Field.ErrorText> : null}
                  </Field.Root>

                  <Field.Root invalid={Boolean(errors.label)}>
                    <RequiredFieldLabel>Display Text</RequiredFieldLabel>
                    <Input {...register("label")} minH="11" borderRadius="14px" px={4} placeholder="Sales tax" />
                    {errors.label ? <Field.ErrorText>{errors.label.message}</Field.ErrorText> : null}
                  </Field.Root>

                  <Field.Root invalid={Boolean(errors.chargeKind)}>
                    <RequiredFieldLabel>Charge category</RequiredFieldLabel>
                    <StyledSelect
                      options={CHARGE_KIND_OPTIONS}
                      value={chargeKind}
                      onChange={(value) => setValue("chargeKind", value as ChargeRuleFormValues["chargeKind"], { shouldDirty: true, shouldValidate: true })}
                      placeholder="Select category"
                    />
                    {errors.chargeKind ? <Field.ErrorText>{errors.chargeKind.message}</Field.ErrorText> : null}
                  </Field.Root>

                  <Field.Root invalid={Boolean(errors.calculationType)}>
                    <RequiredFieldLabel>Calculation type</RequiredFieldLabel>
                    <StyledSelect
                      options={CALCULATION_TYPE_OPTIONS}
                      value={calculationType}
                      onChange={(value) =>
                        setValue("calculationType", value as ChargeRuleFormValues["calculationType"], {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      placeholder="Select calculation"
                    />
                    {errors.calculationType ? <Field.ErrorText>{errors.calculationType.message}</Field.ErrorText> : null}
                  </Field.Root>

                  <Field.Root invalid={Boolean(errors.value)}>
                    <RequiredFieldLabel>Value</RequiredFieldLabel>
                    <Input
                      {...register("value", { valueAsNumber: true })}
                      type="number"
                      min="0"
                      step={calculationType === "Percent" ? "0.01" : "1"}
                      minH="11"
                      borderRadius="14px"
                      px={4}
                      placeholder={calculationType === "Percent" ? "2.00" : "5.00"}
                    />
                    {errors.value ? <Field.ErrorText>{errors.value.message}</Field.ErrorText> : null}
                  </Field.Root>
                </SimpleGrid>

                <Box borderRadius="18px" border="1px solid" borderColor="border.subtle" bg="app.bg" px={4} py={4}>
                  <Flex align="center" justify="space-between" gap={4}>
                    <Box>
                      <Text fontSize="sm" fontWeight="700" color="text.primary">
                        Active
                      </Text>
                      <Text fontSize="xs" color="text.secondary">
                        Disabled rules stay on record but are not applied.
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
                    {editingRule ? "Update rule" : "Save rule"}
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
