import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { Layers3, MoreHorizontal, PencilLine, Plus, RotateCcw, UserRound } from "lucide-react"
import { StyledSelect } from "@/components/common"
import { extractApiError } from "@/utils/errors"
import {
  createAdminRevenuePlan,
  fetchAdminRevenuePlanModules,
  fetchAdminRevenuePlanOrganizers,
  fetchAdminRevenuePlans,
  assignAdminRevenuePlanOrganizer,
  type AdminRevenuePlan,
  type AdminRevenuePlanInput,
  type AdminRevenuePlanModuleOption,
  type AdminOrganizerOption,
  updateAdminRevenuePlan,
} from "@/api/adminFeePlans"

const ruleSchema = z.object({
  target: z.enum(["Organizer", "Buyer"], { message: "Target is required." }),
  valueType: z.enum(["Fixed", "Percent"], { message: "Value type is required." }),
  value: z.number().positive("Value must be greater than zero."),
  isActive: z.boolean(),
})

const adminRevenuePlanSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80, "Maximum 80 characters allowed."),
  label: z.string().trim().min(1, "Display text is required.").max(120, "Maximum 120 characters allowed."),
  moduleId: z.number().int().positive("Module is required."),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  organizerRule: ruleSchema,
  buyerRule: ruleSchema,
})

type AdminRevenuePlanFormValues = z.infer<typeof adminRevenuePlanSchema>

const EMPTY_FORM_VALUES: AdminRevenuePlanFormValues = {
  name: "",
  label: "",
  moduleId: 0,
  isDefault: true,
  isActive: true,
  organizerRule: {
    target: "Organizer",
    valueType: "Percent",
    value: 0,
    isActive: true,
  },
  buyerRule: {
    target: "Buyer",
    valueType: "Percent",
    value: 0,
    isActive: true,
  },
}

function formatValue(valueType: AdminRevenuePlan["rules"][number]["valueType"], value: number) {
  const formattedValue = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)
  return valueType === "Percent" ? `${formattedValue}%` : `$${formattedValue}`
}

function planRuleLabel(rule: AdminRevenuePlan["rules"][number]) {
  return `${rule.target}: ${formatValue(rule.valueType, rule.value)}`
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

function AdminFeePlansSkeleton() {
  return (
    <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" p={5}>
      <Skeleton height="28px" width="240px" mb={3} />
      <SkeletonText noOfLines={2} mb={6} />
      <Skeleton height="54px" mb={4} />
      <SkeletonText noOfLines={7} />
    </Box>
  )
}

export function AdminFeePlansManager() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<AdminRevenuePlan | null>(null)
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false)
  const [mappingPlan, setMappingPlan] = useState<AdminRevenuePlan | null>(null)
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const plansQuery = useQuery({
    queryKey: ["admin-revenue-plans"],
    queryFn: fetchAdminRevenuePlans,
  })

  const modulesQuery = useQuery({
    queryKey: ["admin-revenue-plan-modules"],
    queryFn: fetchAdminRevenuePlanModules,
  })

  const organizersQuery = useQuery({
    queryKey: ["admin-revenue-plan-organizers"],
    queryFn: fetchAdminRevenuePlanOrganizers,
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<AdminRevenuePlanFormValues>({
    resolver: zodResolver(adminRevenuePlanSchema),
    defaultValues: EMPTY_FORM_VALUES,
  })

  const isActive = useWatch({ control, name: "isActive" })
  const isDefault = useWatch({ control, name: "isDefault" })
  const moduleId = useWatch({ control, name: "moduleId" })
  const organizerRuleValueType = useWatch({ control, name: "organizerRule.valueType" })
  const buyerRuleValueType = useWatch({ control, name: "buyerRule.valueType" })
  const organizerRuleIsActive = useWatch({ control, name: "organizerRule.isActive" })
  const buyerRuleIsActive = useWatch({ control, name: "buyerRule.isActive" })

  const moduleOptions = useMemo(
    () => modulesQuery.data?.map((module: AdminRevenuePlanModuleOption) => ({ label: module.text, value: String(module.value) })) ?? [],
    [modulesQuery.data]
  )

  const organizerOptions = useMemo(
    () => organizersQuery.data?.map((organizer: AdminOrganizerOption) => ({ label: organizer.text, value: organizer.value })) ?? [],
    [organizersQuery.data]
  )

  const saveMutation = useMutation({
    mutationFn: async (values: AdminRevenuePlanFormValues) => {
      const payload: AdminRevenuePlanInput = {
        name: values.name.trim(),
        label: values.label.trim(),
        moduleId: values.moduleId,
        isDefault: values.isDefault,
        isActive: values.isActive,
        rules: [values.organizerRule, values.buyerRule],
      }

      if (editingPlan?.uniqueId) {
        await updateAdminRevenuePlan(editingPlan.uniqueId, payload)
        return
      }

      await createAdminRevenuePlan(payload)
    },
    onSuccess: () => {
      setBanner({ type: "success", message: editingPlan ? "Admin revenue plan updated." : "Admin revenue plan saved." })
      setEditingPlan(null)
      setIsDialogOpen(false)
      reset(EMPTY_FORM_VALUES)
    },
    onError: () => {
      setBanner(null)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-revenue-plans"] })
    },
  })

  const mapMutation = useMutation({
    mutationFn: ({ uniqueId, organizerUniqueId }: { uniqueId: string; organizerUniqueId: string }) =>
      assignAdminRevenuePlanOrganizer(uniqueId, organizerUniqueId),
    onSuccess: () => {
      setBanner({ type: "success", message: "Revenue plan assigned to organizer." })
      setMappingPlan(null)
      setIsMapDialogOpen(false)
    },
    onError: () => {
      setBanner(null)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-revenue-plans"] })
    },
  })

  function resetDialogState() {
    setBanner(null)
    saveMutation.reset()
    mapMutation.reset()
  }

  function openCreateDialog() {
    resetDialogState()
    setEditingPlan(null)
    reset(EMPTY_FORM_VALUES)
    setIsDialogOpen(true)
  }

  function openEditDialog(plan: AdminRevenuePlan) {
    resetDialogState()
    setEditingPlan(plan)
    reset({
      name: plan.name,
      label: plan.label,
      moduleId: plan.moduleId,
      isDefault: plan.isDefault,
      isActive: plan.isActive,
      organizerRule:
        plan.rules.find((rule) => rule.target === "Organizer") ??
        {
          target: "Organizer",
          valueType: "Percent",
          value: 0,
          isActive: true,
        },
      buyerRule:
        plan.rules.find((rule) => rule.target === "Buyer") ??
        {
          target: "Buyer",
          valueType: "Percent",
          value: 0,
          isActive: true,
        },
    })
    setIsDialogOpen(true)
  }

  function openMapDialog(plan: AdminRevenuePlan) {
    resetDialogState()
    setMappingPlan(plan)
    setIsMapDialogOpen(true)
  }

  async function handleSave(values: AdminRevenuePlanFormValues) {
    await saveMutation.mutateAsync(values)
  }

  const isBusy = saveMutation.isPending || mapMutation.isPending
  const saveError = saveMutation.error
  const mapError = mapMutation.error
  const plans = plansQuery.data ?? []

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
            Revenue plans
          </Text>
          <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" letterSpacing="-0.03em" color="gray.900">
            Organize checkout revenue rules
          </Heading>
          <Text mt={2} fontSize={{ base: "sm", md: "md" }} color="gray.600" maxW="2xl">
            Define reusable plan slabs, map them to organizers by module, and let the module default cover the cases where no organizer-specific mapping exists.
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
          Add Plan
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

      {plansQuery.isError ? (
        <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
          <Text fontSize="sm" fontWeight="700" color="red.700">
            {extractApiError(plansQuery.error)}
          </Text>
        </Box>
      ) : null}

      {plansQuery.isLoading && !plansQuery.data ? (
        <AdminFeePlansSkeleton />
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
                Available plans
              </Text>
              <Text fontSize="sm" color="text.secondary">
                {plans.length} plan{plans.length === 1 ? "" : "s"} configured
              </Text>
            </Box>
            <Button
              variant="outline"
              minH="11"
              px={4}
              onClick={() => plansQuery.refetch()}
              loading={plansQuery.isFetching}
            >
              <RotateCcw size={16} />
              Refresh
            </Button>
          </Flex>

          <Box overflowX="auto">
            <Table.Root variant="line" size="sm">
              <Table.Header>
                <Table.Row bg="app.bg">
                  <Table.ColumnHeader px={4} py={3} textAlign="right">
                    Actions
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={6} py={3}>
                    Label
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>
                    Module
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>
                    Scope
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>
                    Rules
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>
                    Status
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {plans.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={6} py={14}>
                      <Box textAlign="center">
                        <Text fontSize="lg" fontWeight="700" color="gray.900">
                          No revenue plans configured
                        </Text>
                        <Text mt={2} fontSize="sm" color="gray.600">
                          Add the first plan to define checkout charges for a module.
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
                          Add Plan
                        </Button>
                      </Box>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  plans.map((plan) => (
                    <Table.Row key={plan.uniqueId} _hover={{ bg: "app.bg" }} transition="background 0.15s">
                      <Table.Cell px={4} py={4} textAlign="right">
                        <Menu.Root>
                          <Menu.Trigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              aria-label={`Plan actions for ${plan.label}`}
                              title={`Plan actions for ${plan.label}`}
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
                                minW="13rem"
                                borderRadius="14px"
                                border="1px solid"
                                borderColor="gray.200"
                                bg="white"
                                boxShadow="0 16px 40px rgba(15, 23, 42, 0.12)"
                                p={1}
                              >
                                <Menu.Item
                                  value={`edit-${plan.uniqueId}`}
                                  onClick={() => openEditDialog(plan)}
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
                                <Menu.Item
                                  value={`assign-${plan.uniqueId}`}
                                  onClick={() => openMapDialog(plan)}
                                  borderRadius="10px"
                                  fontSize="sm"
                                  fontWeight="600"
                                  color="gray.700"
                                  px={3}
                                  py={2}
                                  cursor="pointer"
                                >
                                  <UserRound size={14} />
                                  Assign organizer
                                </Menu.Item>
                              </Menu.Content>
                            </Menu.Positioner>
                          </Portal>
                        </Menu.Root>
                      </Table.Cell>
                      <Table.Cell px={6} py={4}>
                        <Box>
                          <Text fontSize="sm" fontWeight="700" color="text.primary">
                            {plan.label}
                          </Text>
                          <Text fontSize="xs" color="text.secondary" mt={0.5}>
                            {plan.name}
                          </Text>
                        </Box>
                      </Table.Cell>
                      <Table.Cell px={4} py={4}>
                        <Text fontSize="sm" color="text.primary">
                          {plan.moduleName}
                        </Text>
                      </Table.Cell>
                      <Table.Cell px={4} py={4}>
                        <Stack gap={1}>
                          <Badge
                            colorPalette={plan.isDefault ? "purple" : "blue"}
                            variant="subtle"
                            borderRadius="999px"
                            px={3}
                            py={1}
                            fontSize="10px"
                            fontWeight="800"
                            textTransform="uppercase"
                            letterSpacing="0.08em"
                          >
                            {plan.isDefault ? "Default fallback" : plan.sourceType}
                          </Badge>
                          <Text fontSize="xs" color="text.secondary">
                            {plan.assignedOrganizerCount} organizer{plan.assignedOrganizerCount === 1 ? "" : "s"} assigned
                          </Text>
                        </Stack>
                      </Table.Cell>
                      <Table.Cell px={4} py={4}>
                        <Stack gap={1.5}>
                          {plan.rules.map((rule) => (
                            <Badge
                              key={`${plan.uniqueId}-${rule.target}`}
                              colorPalette={rule.target === "Organizer" ? "orange" : "cyan"}
                              variant="subtle"
                              borderRadius="999px"
                              px={3}
                              py={1}
                              fontSize="10px"
                              fontWeight="800"
                              textTransform="uppercase"
                              letterSpacing="0.08em"
                              w="fit-content"
                            >
                              {planRuleLabel(rule)}
                            </Badge>
                          ))}
                        </Stack>
                      </Table.Cell>
                      <Table.Cell px={4} py={4}>
                        <Badge
                          colorPalette={plan.isActive ? "green" : "gray"}
                          variant="subtle"
                          borderRadius="999px"
                          px={3}
                          py={1}
                          fontSize="10px"
                          fontWeight="800"
                          textTransform="uppercase"
                          letterSpacing="0.08em"
                        >
                          {plan.isActive ? "Active" : "Inactive"}
                        </Badge>
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
            setEditingPlan(null)
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
            maxW={{ base: "100vw", md: "760px" }}
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
                    {editingPlan ? "Edit revenue plan" : "Add revenue plan"}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Define the module charge structure, then map it to organizers when you want the plan to override the default fallback.
                  </Text>
                </Box>

                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close revenue plan modal" />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>

            <Dialog.Body px={6} py={6} overflowY="auto">
              <form onSubmit={handleSubmit(handleSave)} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                  <Field.Root invalid={Boolean(errors.name)}>
                    <RequiredFieldLabel>Name</RequiredFieldLabel>
                    <Input {...register("name")} minH="11" borderRadius="14px" px={4} placeholder="Stripe checkout plan" />
                    {errors.name ? <Field.ErrorText>{errors.name.message}</Field.ErrorText> : null}
                  </Field.Root>

                  <Field.Root invalid={Boolean(errors.label)}>
                    <RequiredFieldLabel>Display Text</RequiredFieldLabel>
                    <Input {...register("label")} minH="11" borderRadius="14px" px={4} placeholder="Checkout processing" />
                    {errors.label ? <Field.ErrorText>{errors.label.message}</Field.ErrorText> : null}
                  </Field.Root>

                  <Field.Root invalid={Boolean(errors.moduleId)}>
                    <RequiredFieldLabel>Module</RequiredFieldLabel>
                    <StyledSelect
                      options={moduleOptions}
                      value={moduleId > 0 ? String(moduleId) : ""}
                      onChange={(value) => setValue("moduleId", Number(value), { shouldDirty: true, shouldValidate: true })}
                      placeholder={modulesQuery.isLoading ? "Loading modules..." : "Select module"}
                      disabled={modulesQuery.isLoading}
                    />
                    {errors.moduleId ? <Field.ErrorText>{errors.moduleId.message}</Field.ErrorText> : null}
                  </Field.Root>

                  <Field.Root>
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
                            Default fallback
                          </Text>
                          <Text fontSize="xs" color="text.secondary">
                            Used when no organizer-specific plan is mapped for this module.
                          </Text>
                        </Box>
                        <Switch.Root checked={isDefault} onCheckedChange={(details) => setValue("isDefault", details.checked, { shouldDirty: true })}>
                          <Switch.HiddenInput />
                          <Switch.Control />
                        </Switch.Root>
                      </Flex>
                    </Box>
                  </Field.Root>

                  <Field.Root>
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
                            Disabled plans remain saved but will not apply.
                          </Text>
                        </Box>
                        <Switch.Root checked={isActive} onCheckedChange={(details) => setValue("isActive", details.checked, { shouldDirty: true })}>
                          <Switch.HiddenInput />
                          <Switch.Control />
                        </Switch.Root>
                      </Flex>
                    </Box>
                  </Field.Root>
                </SimpleGrid>

                <Box borderRadius="18px" border="1px solid" borderColor="border.subtle" bg="white" p={4}>
                  <Flex align="center" gap={2} mb={4}>
                    <Layers3 size={16} />
                    <Text fontSize="sm" fontWeight="800" color="text.primary">
                      Charge rules
                    </Text>
                  </Flex>

                  <Box mb={4} borderRadius="16px" border="1px solid" borderColor="border.subtle" bg="app.bg" px={4} py={3}>
                    <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
                      <Box>
                        <Text fontSize="xs" fontWeight="800" textTransform="uppercase" letterSpacing="0.08em" color="text.secondary">
                          Precedence
                        </Text>
                        <Text fontSize="sm" fontWeight="600" color="text.primary" mt={1}>
                          Organizer custom rule, organizer mapping, then default fallback.
                        </Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" fontWeight="800" textTransform="uppercase" letterSpacing="0.08em" color="text.secondary">
                          Buyer rule
                        </Text>
                        <Text fontSize="sm" color="text.primary" mt={1}>
                          Adds to checkout total.
                        </Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" fontWeight="800" textTransform="uppercase" letterSpacing="0.08em" color="text.secondary">
                          Organizer rule
                        </Text>
                        <Text fontSize="sm" color="text.primary" mt={1}>
                          Passed through as Admin Fee to Stripe.
                        </Text>
                      </Box>
                    </SimpleGrid>
                  </Box>

                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    <Box borderRadius="16px" border="1px solid" borderColor="border.subtle" p={4} bg="app.bg">
                      <Flex align="center" justify="space-between" mb={3}>
                        <Text fontSize="sm" fontWeight="800" color="text.primary">
                          Organizer rule
                        </Text>
                        <Switch.Root
                          checked={organizerRuleIsActive}
                          onCheckedChange={(details) => setValue("organizerRule.isActive", details.checked, { shouldDirty: true })}
                        >
                          <Switch.HiddenInput />
                          <Switch.Control />
                        </Switch.Root>
                      </Flex>
                      <SimpleGrid columns={2} gap={3}>
                        <Field.Root>
                          <Field.Label fontSize="xs" color="text.secondary">
                            Value type
                          </Field.Label>
                          <StyledSelect
                            options={[
                              { label: "Fixed Amount", value: "Fixed" },
                              { label: "Percentage", value: "Percent" },
                            ]}
                            value={organizerRuleValueType}
                            onChange={(value) => setValue("organizerRule.valueType", value as "Fixed" | "Percent", { shouldDirty: true })}
                            placeholder="Select"
                          />
                        </Field.Root>
                        <Field.Root>
                          <Field.Label fontSize="xs" color="text.secondary">
                            Value
                          </Field.Label>
                          <Input
                            {...register("organizerRule.value", { valueAsNumber: true })}
                            type="number"
                            min="0"
                            step={organizerRuleValueType === "Percent" ? "0.01" : "1"}
                            minH="11"
                            borderRadius="14px"
                            px={4}
                            placeholder={organizerRuleValueType === "Percent" ? "2.00" : "5.00"}
                          />
                        </Field.Root>
                      </SimpleGrid>
                      <Text fontSize="xs" color="text.secondary" mt={3}>
                        This amount does not increase checkout total. It is passed as Admin Fee when charging the organizer side.
                      </Text>
                    </Box>

                    <Box borderRadius="16px" border="1px solid" borderColor="border.subtle" p={4} bg="app.bg">
                      <Flex align="center" justify="space-between" mb={3}>
                        <Text fontSize="sm" fontWeight="800" color="text.primary">
                          Buyer surcharge
                        </Text>
                        <Switch.Root
                          checked={buyerRuleIsActive}
                          onCheckedChange={(details) => setValue("buyerRule.isActive", details.checked, { shouldDirty: true })}
                        >
                          <Switch.HiddenInput />
                          <Switch.Control />
                        </Switch.Root>
                      </Flex>
                      <SimpleGrid columns={2} gap={3}>
                        <Field.Root>
                          <Field.Label fontSize="xs" color="text.secondary">
                            Value type
                          </Field.Label>
                          <StyledSelect
                            options={[
                              { label: "Fixed Amount", value: "Fixed" },
                              { label: "Percentage", value: "Percent" },
                            ]}
                            value={buyerRuleValueType}
                            onChange={(value) => setValue("buyerRule.valueType", value as "Fixed" | "Percent", { shouldDirty: true })}
                            placeholder="Select"
                          />
                        </Field.Root>
                        <Field.Root>
                          <Field.Label fontSize="xs" color="text.secondary">
                            Value
                          </Field.Label>
                          <Input
                            {...register("buyerRule.value", { valueAsNumber: true })}
                            type="number"
                            min="0"
                            step={buyerRuleValueType === "Percent" ? "0.01" : "1"}
                            minH="11"
                            borderRadius="14px"
                            px={4}
                            placeholder={buyerRuleValueType === "Percent" ? "2.00" : "5.00"}
                          />
                        </Field.Root>
                      </SimpleGrid>
                      <Text fontSize="xs" color="text.secondary" mt={3}>
                        This amount is added to checkout total and also counted in the Admin Fee sent to Stripe.
                      </Text>
                    </Box>
                  </SimpleGrid>
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
                    {editingPlan ? "Update plan" : "Save plan"}
                  </Button>
                </Flex>
              </form>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <Dialog.Root
        open={isMapDialogOpen}
        onOpenChange={(details) => {
          setIsMapDialogOpen(details.open)
          if (!details.open) {
            setMappingPlan(null)
            resetDialogState()
          }
        }}
        size="md"
      >
        <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius={{ base: 0, md: "24px" }}
            maxW={{ base: "100vw", md: "540px" }}
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
                    Assign organizer
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Apply an existing revenue plan to an organizer for the selected module.
                  </Text>
                </Box>
                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close map organizer modal" />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>

            <Dialog.Body px={6} py={6} overflowY="auto">
              <Stack gap={4}>
                <Box borderRadius="16px" border="1px solid" borderColor="border.subtle" bg="app.bg" p={4}>
                  <Text fontSize="sm" fontWeight="700" color="text.primary">
                    {mappingPlan?.label ?? "Selected plan"}
                  </Text>
                  <Text fontSize="xs" color="text.secondary" mt={1}>
                    {mappingPlan?.moduleName ?? ""}
                  </Text>
                </Box>

                <Field.Root>
                  <RequiredFieldLabel>Organizer</RequiredFieldLabel>
                  <StyledSelect
                    options={organizerOptions}
                    value=""
                    onChange={async (value) => {
                      if (!mappingPlan?.uniqueId || !value) {
                        return
                      }
                      await mapMutation.mutateAsync({ uniqueId: mappingPlan.uniqueId, organizerUniqueId: value })
                    }}
                    placeholder={organizersQuery.isLoading ? "Loading organizers..." : "Select organizer"}
                    disabled={organizersQuery.isLoading || mapMutation.isPending}
                  />
                  {mapError ? (
                    <Text mt={2} fontSize="sm" color="red.600">
                      {extractApiError(mapError)}
                    </Text>
                  ) : null}
                </Field.Root>

                <Button
                  variant="outline"
                  colorPalette="gray"
                  borderRadius="14px"
                  h="44px"
                  px={6}
                  minW={{ base: "full", md: "140px" }}
                  onClick={() => setIsMapDialogOpen(false)}
                >
                  Close
                </Button>
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Stack>
  )
}
