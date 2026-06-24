import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
import { Check, CheckCircle2, Layers3, MoreHorizontal, PencilLine, Plus, RotateCcw, UserRound } from "lucide-react"
import ReactSelect, {
  components,
  type InputActionMeta,
  type MultiValue,
  type OptionProps,
  type StylesConfig,
} from "react-select"
import { StyledSelect } from "@/components/common"
import { extractApiError } from "@/utils/errors"
import {
  createAdminRevenuePlan,
  fetchAdminRevenuePlanModules,
  fetchAdminRevenuePlan,
  fetchAdminRevenuePlanOrganizerNames,
  fetchAdminRevenuePlanOrganizers,
  fetchAdminRevenuePlans,
  assignAdminRevenuePlanOrganizer,
  type AdminRevenuePlan,
  type AdminRevenuePlanInput,
  type AdminRevenuePlanModuleOption,
  type AdminOrganizerOption,
  updateAdminRevenuePlan,
} from "@/api/adminFeePlans"

const ruleSchema = z
  .object({
    target: z.enum(["Organizer", "Buyer"], { message: "Target is required." }),
    valueType: z.enum(["Fixed", "Percent"], { message: "Value type is required." }),
    value: z.number().nonnegative(),
    isActive: z.boolean(),
  })
  .superRefine((rule, ctx) => {
    if (!rule.isActive) {
      return
    }

    if (rule.value <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "Value must be greater than zero.",
      })
    }

    if (rule.valueType === "Percent" && rule.value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "Percentage value cannot exceed 100.",
      })
    }
  })

const adminRevenuePlanSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80, "Maximum 80 characters allowed."),
  label: z.string().trim().min(1, "Display text is required.").max(120, "Maximum 120 characters allowed."),
  moduleIds: z.array(z.number().int().positive()).min(1, "At least one module is required."),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  organizerUniqueIds: z.array(z.string()),
  organizerRule: ruleSchema,
  buyerRule: ruleSchema,
})

type AdminRevenuePlanFormValues = z.infer<typeof adminRevenuePlanSchema>

interface OrganizerSelectOption {
  label: string
  value: string
}

interface ModuleSelectOption {
  label: string
  value: string
}

const EMPTY_FORM_VALUES: AdminRevenuePlanFormValues = {
  name: "",
  label: "",
  moduleIds: [],
  isDefault: true,
  isActive: true,
  organizerUniqueIds: [],
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
    isActive: false,
  },
}

const ADMIN_REVENUE_PLAN_PAGE_SIZE = 6

function formatValue(valueType: AdminRevenuePlan["rules"][number]["valueType"], value: number) {
  const formattedValue = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)
  return valueType === "Percent" ? `${formattedValue}%` : `$${formattedValue}`
}

function planRuleLabel(rule: AdminRevenuePlan["rules"][number]) {
  return `${rule.target}: ${formatValue(rule.valueType, rule.value)}`
}

function getPlanRuleDefaults(
  plan: AdminRevenuePlan,
  target: "Organizer" | "Buyer",
  fallbackIsActive: boolean,
) {
  const matchedRules = plan.rules.filter((rule) => rule.target === target)
  const selectedRule = matchedRules[0]

  return {
    target,
    valueType: selectedRule?.valueType ?? "Percent",
    value: selectedRule?.value ?? 0,
    isActive: matchedRules.length > 0 ? matchedRules.every((rule) => rule.isActive) : fallbackIsActive,
  }
}

function getModuleRuleSummary(plan: AdminRevenuePlan, moduleIndex: number) {
  const moduleRules = plan.rules.slice(moduleIndex * 2, moduleIndex * 2 + 2).filter((rule) => rule.isActive)

  if (moduleRules.length === 0) {
    return ""
  }

  return moduleRules.map(planRuleLabel).join("\n")
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

function formatNumericInput(value: string) {
  const normalized = value.replace(/,/g, "").replace(/[^\d.]/g, "")

  if (!normalized) {
    return ""
  }

  const hasDot = normalized.includes(".")
  const [integerPartRaw = "", decimalPartRaw = ""] = normalized.split(".")
  const integerPart = integerPartRaw === "" ? "0" : integerPartRaw
  const formattedIntegerPart = new Intl.NumberFormat("en-US").format(Number(integerPart))
  const decimalPart = decimalPartRaw.slice(0, 2)

  if (!hasDot) {
    return formattedIntegerPart
  }

  return decimalPart.length > 0 ? `${formattedIntegerPart}.${decimalPart}` : `${formattedIntegerPart}.`
}

function formatNumericBlurValue(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function parseNumericInput(value: string) {
  const normalized = value.replace(/,/g, "")
  if (!normalized || normalized === ".") {
    return null
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function clampRuleValue(valueType: "Fixed" | "Percent", value: number) {
  if (valueType === "Percent") {
    return Math.min(value, 100)
  }

  return value
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

function OrganizerOption(props: OptionProps<OrganizerSelectOption, true>) {
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
          {props.isSelected ? <Check size={12} /> : null}
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

function ModuleOption(props: OptionProps<ModuleSelectOption, true>) {
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
          {props.isSelected ? <Check size={12} /> : null}
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
  const [planPage, setPlanPage] = useState(1)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<AdminRevenuePlan | null>(null)
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false)
  const [mappingPlan, setMappingPlan] = useState<AdminRevenuePlan | null>(null)
  const [organizerNamesPlan, setOrganizerNamesPlan] = useState<AdminRevenuePlan | null>(null)
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [organizerSearchValue, setOrganizerSearchValue] = useState("")
  const [moduleSearchValue, setModuleSearchValue] = useState("")
  const [organizerRuleValueInput, setOrganizerRuleValueInput] = useState("")
  const [buyerRuleValueInput, setBuyerRuleValueInput] = useState("")

  const plansQuery = useQuery({
    queryKey: ["admin-revenue-plans", { pageNo: planPage, pageSize: ADMIN_REVENUE_PLAN_PAGE_SIZE }],
    queryFn: () => fetchAdminRevenuePlans(planPage, ADMIN_REVENUE_PLAN_PAGE_SIZE),
    placeholderData: keepPreviousData,
  })

  const modulesQuery = useQuery({
    queryKey: ["admin-revenue-plan-modules"],
    queryFn: fetchAdminRevenuePlanModules,
  })

  const organizersQuery = useQuery({
    queryKey: ["admin-revenue-plan-organizers"],
    queryFn: fetchAdminRevenuePlanOrganizers,
  })

  const organizerNamesQuery = useQuery({
    queryKey: ["admin-revenue-plan-organizer-names", organizerNamesPlan?.uniqueId ?? ""],
    queryFn: () => {
      if (!organizerNamesPlan?.uniqueId) {
        return Promise.resolve([])
      }

      return fetchAdminRevenuePlanOrganizerNames(organizerNamesPlan.uniqueId)
    },
    enabled: Boolean(organizerNamesPlan?.uniqueId),
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
  const moduleIds = useWatch({ control, name: "moduleIds" })
  const organizerUniqueIds = useWatch({ control, name: "organizerUniqueIds" })
  const organizerRuleValueType = useWatch({ control, name: "organizerRule.valueType" })
  const buyerRuleValueType = useWatch({ control, name: "buyerRule.valueType" })
  const organizerRuleIsActive = useWatch({ control, name: "organizerRule.isActive" })
  const buyerRuleIsActive = useWatch({ control, name: "buyerRule.isActive" })

  const moduleOptions = useMemo(
    () =>
      (modulesQuery.data?.map((module: AdminRevenuePlanModuleOption) => ({ label: module.text, value: String(module.value) })) ?? []).sort((a, b) =>
        a.label.localeCompare(b.label)
      ),
    [modulesQuery.data]
  )

  const selectedModuleOptions = useMemo(
    () => moduleOptions.filter((option) => moduleIds.includes(Number(option.value))),
    [moduleIds, moduleOptions],
  )

  const organizerOptions = useMemo(
    () =>
      (organizersQuery.data?.map((organizer: AdminOrganizerOption) => ({ label: organizer.text, value: organizer.value })) ?? []).sort((a, b) =>
        a.label.localeCompare(b.label)
      ),
    [organizersQuery.data]
  )

  const selectedOrganizerOptions = useMemo(
    () => organizerOptions.filter((option) => organizerUniqueIds.includes(option.value)),
    [organizerOptions, organizerUniqueIds],
  )

  function handleModuleChange(values: MultiValue<ModuleSelectOption>) {
    setValue(
      "moduleIds",
      values.map((item) => Number(item.value)),
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    )
  }

  function handleRemoveModule(moduleId: number) {
    setValue(
      "moduleIds",
      moduleIds.filter((current) => current !== moduleId),
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    )
  }

  function handleOrganizerChange(values: MultiValue<OrganizerSelectOption>) {
    setValue(
      "organizerUniqueIds",
      values.map((item) => item.value),
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    )
  }

  function handleRemoveOrganizer(uniqueId: string) {
    setValue(
      "organizerUniqueIds",
      organizerUniqueIds.filter((current) => current !== uniqueId),
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    )
  }

  function handleRuleValueChange(
    nextValue: string,
    valueType: "Fixed" | "Percent",
    setInputValue: (value: string) => void,
    fieldName: "organizerRule.value" | "buyerRule.value",
  ) {
    const formattedValue = formatNumericInput(nextValue)
    const parsedValue = parseNumericInput(formattedValue)
    const clampedValue = clampRuleValue(valueType, parsedValue ?? 0)
    const displayValue = valueType === "Percent" && parsedValue !== null && parsedValue > 100 ? formatNumericInput("100") : formattedValue

    setInputValue(displayValue)
    setValue(fieldName, clampedValue, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  function handleRuleValueBlur(
    value: string,
    valueType: "Fixed" | "Percent",
    setInputValue: (value: string) => void,
    fieldName: "organizerRule.value" | "buyerRule.value",
  ) {
    const parsedValue = parseNumericInput(value)

    if (parsedValue === null) {
      setInputValue("")
      setValue(fieldName, 0, {
        shouldDirty: true,
        shouldValidate: true,
      })
      return
    }

    const nextValue = clampRuleValue(valueType, parsedValue)
    setInputValue(formatNumericBlurValue(nextValue))
    setValue(fieldName, nextValue, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  function handleOrganizerInputChange(nextValue: string, actionMeta: InputActionMeta) {
    if (actionMeta.action === "input-change") {
      setOrganizerSearchValue(nextValue)
      return nextValue
    }

    return organizerSearchValue
  }

  function handleModuleInputChange(nextValue: string, actionMeta: InputActionMeta) {
    if (actionMeta.action === "input-change") {
      setModuleSearchValue(nextValue)
      return nextValue
    }

    return moduleSearchValue
  }

  const organizerMultiSelectStyles = useMemo(
    () =>
      ({
        control: (base, state) => ({
          ...base,
          width: "100%",
          minHeight: 44,
          borderRadius: 16,
          borderColor: state.isFocused ? "#7551FF" : "#E2E8F0",
          boxShadow: state.isFocused ? "0 0 0 3px rgba(117, 81, 255, 0.15)" : "none",
          backgroundColor: "#fff",
        }),
        container: (base) => ({
          ...base,
          width: "100%",
        }),
        valueContainer: (base) => ({
          ...base,
          flex: 1,
          minWidth: 0,
        }),
        input: (base) => ({
          ...base,
          width: "100%",
        }),
        menu: (base) => ({
          ...base,
          zIndex: 40,
          borderRadius: 14,
        }),
        multiValue: (base) => ({
          ...base,
          borderRadius: 999,
          backgroundColor: "rgba(117, 81, 255, 0.12)",
          border: "1px solid rgba(117, 81, 255, 0.18)",
          margin: "2px",
        }),
        multiValueLabel: (base) => ({
          ...base,
          fontSize: 12,
          fontWeight: 700,
          color: "#422AFB",
          paddingLeft: "8px",
          paddingRight: "4px",
        }),
        multiValueRemove: (base) => ({
          ...base,
          borderRadius: 999,
          color: "#7551FF",
          paddingLeft: "4px",
          paddingRight: "8px",
          ":hover": {
            backgroundColor: "rgba(117, 81, 255, 0.18)",
            color: "#422AFB",
          },
        }),
      }) satisfies StylesConfig<OrganizerSelectOption, true>,
    [],
  )

  const moduleMultiSelectStyles = useMemo(
    () =>
      ({
        control: (base, state) => ({
          ...base,
          width: "100%",
          minHeight: 44,
          borderRadius: 16,
          borderColor: state.isFocused ? "#7551FF" : "#E2E8F0",
          boxShadow: state.isFocused ? "0 0 0 3px rgba(117, 81, 255, 0.15)" : "none",
          backgroundColor: "#fff",
        }),
        container: (base) => ({
          ...base,
          width: "100%",
        }),
        valueContainer: (base) => ({
          ...base,
          flex: 1,
          minWidth: 0,
        }),
        input: (base) => ({
          ...base,
          width: "100%",
        }),
        menu: (base) => ({
          ...base,
          zIndex: 40,
          borderRadius: 14,
        }),
        multiValue: (base) => ({
          ...base,
          borderRadius: 999,
          backgroundColor: "rgba(117, 81, 255, 0.12)",
          border: "1px solid rgba(117, 81, 255, 0.18)",
          margin: "2px",
        }),
        multiValueLabel: (base) => ({
          ...base,
          fontSize: 12,
          fontWeight: 700,
          color: "#422AFB",
          paddingLeft: "8px",
          paddingRight: "4px",
        }),
        multiValueRemove: (base) => ({
          ...base,
          borderRadius: 999,
          color: "#7551FF",
          paddingLeft: "4px",
          paddingRight: "8px",
          ":hover": {
            backgroundColor: "rgba(117, 81, 255, 0.18)",
            color: "#422AFB",
          },
        }),
      }) satisfies StylesConfig<ModuleSelectOption, true>,
    [],
  )

  const saveMutation = useMutation({
    mutationFn: async (values: AdminRevenuePlanFormValues) => {
      const payload: AdminRevenuePlanInput = {
        name: values.name.trim(),
        label: values.label.trim(),
        moduleIds: values.moduleIds,
        isDefault: values.isDefault,
        isActive: values.isActive,
        organizerUniqueIds: values.organizerUniqueIds,
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
    setOrganizerSearchValue("")
    setModuleSearchValue("")
    setOrganizerRuleValueInput("")
    setBuyerRuleValueInput("")
  }

  function openCreateDialog() {
    resetDialogState()
    setEditingPlan(null)
    reset(EMPTY_FORM_VALUES)
    setOrganizerRuleValueInput("")
    setBuyerRuleValueInput("")
    setIsDialogOpen(true)
  }

  function openEditDialog(plan: AdminRevenuePlan) {
    resetDialogState()
    setEditingPlan(plan)
    reset({
      name: plan.name,
      label: plan.label,
      moduleIds: plan.moduleIds.length > 0 ? plan.moduleIds : plan.moduleId > 0 ? [plan.moduleId] : [],
      isDefault: plan.isDefault,
      isActive: plan.isActive,
      organizerUniqueIds: plan.assignedOrganizerUniqueIds,
      organizerRule: getPlanRuleDefaults(plan, "Organizer", true),
      buyerRule: getPlanRuleDefaults(plan, "Buyer", false),
    })
    setOrganizerRuleValueInput(
      formatNumericBlurValue(
        clampRuleValue(
          (plan.rules.find((rule) => rule.target === "Organizer")?.valueType ?? "Percent") as "Fixed" | "Percent",
          plan.rules.find((rule) => rule.target === "Organizer")?.value ?? 0,
        ),
      ),
    )
    setBuyerRuleValueInput(
      formatNumericBlurValue(
        clampRuleValue(
          (plan.rules.find((rule) => rule.target === "Buyer")?.valueType ?? "Percent") as "Fixed" | "Percent",
          plan.rules.find((rule) => rule.target === "Buyer")?.value ?? 0,
        ),
      ),
    )
    setIsDialogOpen(true)
  }

  async function handleEditPlan(uniqueId: string) {
    resetDialogState()

    try {
      const plan = await fetchAdminRevenuePlan(uniqueId)
      openEditDialog(plan)
    } catch (error) {
      setBanner({ type: "error", message: extractApiError(error) })
    }
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
  const plans = plansQuery.data?.items ?? []
  const totalPlans = plansQuery.data?.total ?? 0
  const currentPlanPage = planPage
  const totalPlanPages = plansQuery.data?.totalPages ?? 0
  const planPageNumbers = useMemo(
    () => buildPageNumbers(planPage, totalPlanPages),
    [planPage, totalPlanPages],
  )
  const organizerNames = organizerNamesQuery.data ?? []

  function openOrganizerNamesDialog(plan: AdminRevenuePlan) {
    setOrganizerNamesPlan(plan)
  }

  function closeOrganizerNamesDialog() {
    setOrganizerNamesPlan(null)
  }

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
                {totalPlans} plan{totalPlans === 1 ? "" : "s"} total
              </Text>
            </Box>
            <Flex direction="column" align={{ base: "stretch", md: "end" }} gap={2}>
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
              <Badge variant="subtle" colorPalette="purple" borderRadius="999px" px={3} py={1}>
                Page {currentPlanPage} of {Math.max(totalPlanPages, 1)}
              </Badge>
            </Flex>
          </Flex>

          <Box overflowX="auto" border="1px solid" borderColor="border.subtle" bg="app.bg">
            <Table.Root variant="line" size="sm" borderColor="border.subtle" minW={{ base: "760px", md: "auto" }}>
              <Table.Header>
                <Table.Row bg="app.bg">
                  <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" borderRightWidth="1px" px={4} py={3} textAlign="center">
                    Actions
                  </Table.ColumnHeader>
                  <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" borderRightWidth="1px" px={4} py={3} textAlign="center">
                    Name
                  </Table.ColumnHeader>
                  <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" borderRightWidth="1px" px={4} py={3} textAlign="center">
                    Display Text
                  </Table.ColumnHeader>
                  <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" borderRightWidth="1px" px={4} py={3} textAlign="center">
                    Modules
                  </Table.ColumnHeader>
                  <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" borderRightWidth="1px" px={4} py={3} textAlign="center">
                    Organizers
                  </Table.ColumnHeader>
                  <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" borderRightWidth="1px" px={4} py={3} textAlign="center">
                    Default
                  </Table.ColumnHeader>
                  <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" px={4} py={3} textAlign="center">
                    Status
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {plans.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={7} py={14}>
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
                  plans.map((plan) => {
                    const modules = plan.moduleNames.length > 0 ? plan.moduleNames : plan.moduleName ? [plan.moduleName] : []
                    const organizerCount = plan.organizerCount ?? plan.assignedOrganizerCount
                    const organizerNames = plan.topOrganizerNames.slice(0, 3)
                    const remainingOrganizerCount = Math.max(organizerCount - organizerNames.length, 0)

                    return (
                      <Table.Row key={plan.uniqueId} _hover={{ bg: "app.bg" }} transition="background 0.15s">
                      <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4} textAlign="center">
                        <Flex align="center" justify="center" w="full">
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
                                display="inline-flex"
                                alignItems="center"
                                justifyContent="center"
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
                                  onClick={() => void handleEditPlan(plan.uniqueId)}
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
                        </Flex>
                      </Table.Cell>
                      <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4}>
                        <Text fontSize="sm" fontWeight="700" color="text.primary">
                          {plan.name}
                        </Text>
                      </Table.Cell>
                      <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4}>
                        <Text fontSize="sm" fontWeight="700" color="text.primary">
                          {plan.label}
                        </Text>
                      </Table.Cell>
                      <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4}>
                        <Box minW={0}>
                          <Flex wrap="wrap" gap={2}>
                            {modules.map((module, moduleIndex) => {
                              const moduleRuleSummary = getModuleRuleSummary(plan, moduleIndex)

                              return (
                                <Badge
                                  key={`${plan.uniqueId}-${module}`}
                                  colorPalette="gray"
                                  variant="subtle"
                                  borderRadius="999px"
                                  px={3}
                                  py={1}
                                  fontSize="10px"
                                  fontWeight="800"
                                  textTransform="uppercase"
                                  letterSpacing="0.08em"
                                  w="fit-content"
                                  cursor={moduleRuleSummary ? "help" : "default"}
                                  title={moduleRuleSummary || undefined}
                                  aria-label={moduleRuleSummary ? `${module}. ${moduleRuleSummary.replaceAll("\n", ". ")}` : module}
                                >
                                  {module}
                                </Badge>
                              )
                            })}
                          </Flex>
                        </Box>
                      </Table.Cell>
                      <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4}>
                        <Box minW={0}>
                          {organizerCount > 0 ? (
                            <Flex wrap="wrap" gap={2}>
                              {organizerNames.map((organizerName) => (
                                <Badge
                                  key={`${plan.uniqueId}-${organizerName}`}
                                  colorPalette="gray"
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
                                  {organizerName}
                                </Badge>
                              ))}
                              {remainingOrganizerCount > 0 ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  colorPalette="gray"
                                  borderRadius="999px"
                                  h="28px"
                                  px={3}
                                  fontSize="10px"
                                  fontWeight="800"
                                  textTransform="uppercase"
                                  letterSpacing="0.08em"
                                  onClick={() => openOrganizerNamesDialog(plan)}
                                >
                                  +{remainingOrganizerCount} more
                                </Button>
                              ) : null}
                            </Flex>
                          ) : (
                            <Text fontSize="sm" color="text.secondary">
                              -
                            </Text>
                          )}
                        </Box>
                      </Table.Cell>
                      <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4} textAlign="center">
                        <Flex align="center" justify="center">
                          {plan.isDefault ? (
                            <Box
                              display="inline-flex"
                              alignItems="center"
                              justifyContent="center"
                              boxSize="32px"
                              borderRadius="999px"
                              bg="green.50"
                              color="green.600"
                              border="1px solid"
                              borderColor="green.200"
                              aria-label="Default plan"
                              title="Default"
                            >
                              <CheckCircle2 size={18} strokeWidth={2.4} />
                            </Box>
                          ) : (
                            <Badge
                              colorPalette="blue"
                              variant="subtle"
                              borderRadius="999px"
                              px={3}
                              py={1}
                              fontSize="10px"
                              fontWeight="800"
                              textTransform="uppercase"
                              letterSpacing="0.08em"
                            >
                              {plan.sourceType}
                            </Badge>
                          )}
                        </Flex>
                      </Table.Cell>
                      <Table.Cell borderColor="border.subtle" px={4} py={4}>
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
                    )
                  })
                )}
              </Table.Body>
            </Table.Root>
          </Box>
        </Box>
      )}

      <Dialog.Root
        open={Boolean(organizerNamesPlan)}
        onOpenChange={(details) => {
          if (!details.open) {
            closeOrganizerNamesDialog()
          }
        }}
        size="md"
      >
        <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius={{ base: 0, md: "24px" }}
            maxW={{ base: "100vw", md: "560px" }}
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
                    Organizers
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {organizerNamesPlan?.label ?? "Selected plan"}
                  </Text>
                </Box>
                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close organizers dialog" onClick={closeOrganizerNamesDialog} />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>

            <Dialog.Body px={6} py={6} overflowY="auto">
              {organizerNamesQuery.isLoading ? (
                <Stack gap={3}>
                  <Skeleton height="24px" width="180px" />
                  <SkeletonText noOfLines={4} />
                </Stack>
              ) : organizerNamesQuery.isError ? (
                <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
                  <Text fontSize="sm" fontWeight="700" color="red.700">
                    {extractApiError(organizerNamesQuery.error)}
                  </Text>
                </Box>
              ) : organizerNames.length === 0 ? (
                <Text fontSize="sm" color="text.secondary">
                  No organizers mapped.
                </Text>
              ) : (
                <Flex wrap="wrap" gap={2}>
                  {organizerNames.map((organizerName) => (
                    <Badge
                      key={organizerName}
                      colorPalette="gray"
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
                      {organizerName}
                    </Badge>
                  ))}
                </Flex>
              )}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {plansQuery.data ? (
        <Flex
          mt={6}
          direction={{ base: "column", md: "row" }}
          align={{ base: "stretch", md: "center" }}
          justify="space-between"
          gap={3}
        >
          <Text fontSize="sm" color="gray.600">
            Page {currentPlanPage} of {Math.max(totalPlanPages, 1)}
          </Text>

          <Flex gap={2} wrap="wrap">
            <Button
              minH="11"
              px={4}
              variant="outline"
              disabled={currentPlanPage <= 1 || plansQuery.isFetching}
              onClick={() => setPlanPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            {planPageNumbers.map((item) => (
              <Button
                key={item}
                minH="11"
                px={4}
                variant={item === currentPlanPage ? "solid" : "outline"}
                bg={item === currentPlanPage ? "brand.500" : undefined}
                color={item === currentPlanPage ? "white" : undefined}
                disabled={plansQuery.isFetching}
                onClick={() => setPlanPage(item)}
              >
                {item}
              </Button>
            ))}
            <Button
              minH="11"
              px={4}
              variant="outline"
              disabled={currentPlanPage >= totalPlanPages || plansQuery.isFetching || totalPlanPages === 0}
              onClick={() => setPlanPage((current) => current + 1)}
            >
              Next
            </Button>
          </Flex>
        </Flex>
      ) : null}

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
                  <Field.Root w="full" invalid={Boolean(errors.name)}>
                    <RequiredFieldLabel>Name</RequiredFieldLabel>
                    <Input w="full" {...register("name")} minH="11" borderRadius="14px" px={4} placeholder="Stripe checkout plan" />
                    {errors.name ? <Field.ErrorText>{errors.name.message}</Field.ErrorText> : null}
                  </Field.Root>

                  <Field.Root w="full" invalid={Boolean(errors.label)}>
                    <RequiredFieldLabel>Display Text</RequiredFieldLabel>
                    <Input w="full" {...register("label")} minH="11" borderRadius="14px" px={4} placeholder="Checkout processing" />
                    {errors.label ? <Field.ErrorText>{errors.label.message}</Field.ErrorText> : null}
                  </Field.Root>
                </SimpleGrid>

                <Field.Root w="full">
                  <RequiredFieldLabel>Organizers</RequiredFieldLabel>
                  <ReactSelect
                    isMulti
                    options={organizerOptions}
                    value={selectedOrganizerOptions}
                    onChange={handleOrganizerChange}
                    placeholder={organizersQuery.isLoading ? "Loading organizers..." : "Select organizers"}
                    inputValue={organizerSearchValue}
                    onInputChange={handleOrganizerInputChange}
                    closeMenuOnSelect={false}
                    hideSelectedOptions={false}
                    isClearable={false}
                    isDisabled={organizersQuery.isLoading}
                    controlShouldRenderValue={false}
                    blurInputOnSelect={false}
                    menuShouldScrollIntoView={false}
                    components={{ Option: OrganizerOption }}
                    styles={organizerMultiSelectStyles}
                  />
                  {selectedOrganizerOptions.length > 0 ? (
                    <Flex wrap="wrap" gap={2} mt={3}>
                      {selectedOrganizerOptions.map((option) => (
                        <Box
                          key={option.value}
                          as="button"
                          type="button"
                          onClick={() => handleRemoveOrganizer(option.value)}
                          display="inline-flex"
                          alignItems="center"
                          gap={2}
                          borderRadius="999px"
                          border="1px solid"
                          borderColor="rgba(117, 81, 255, 0.18)"
                          bg="rgba(117, 81, 255, 0.12)"
                          color="brand.500"
                          px={3}
                          py={1.5}
                          fontSize="sm"
                          fontWeight="700"
                          cursor="pointer"
                          _hover={{ bg: "rgba(117, 81, 255, 0.18)" }}
                        >
                          <Text as="span" lineHeight={1.1}>
                            {option.label}
                          </Text>
                          <Text as="span" fontSize="xs" lineHeight={1} aria-hidden="true">
                            ×
                          </Text>
                        </Box>
                      ))}
                    </Flex>
                  ) : null}
                </Field.Root>

                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                  <Field.Root w="full">
                    <Box
                      w="full"
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
                            Is Default
                          </Text>
                        </Box>
                        <Switch.Root
                          checked={isDefault}
                          colorPalette="brand"
                          onCheckedChange={(details) => setValue("isDefault", details.checked, { shouldDirty: true })}
                        >
                          <Switch.HiddenInput />
                          <Switch.Control />
                        </Switch.Root>
                      </Flex>
                    </Box>
                  </Field.Root>

                  <Field.Root w="full">
                    <Box
                      w="full"
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
                        </Box>
                        <Switch.Root
                          checked={isActive}
                          colorPalette="brand"
                          onCheckedChange={(details) => setValue("isActive", details.checked, { shouldDirty: true })}
                        >
                          <Switch.HiddenInput />
                          <Switch.Control />
                        </Switch.Root>
                      </Flex>
                    </Box>
                  </Field.Root>
                </SimpleGrid>

                <Field.Root invalid={Boolean(errors.moduleIds)}>
                  <RequiredFieldLabel>Module</RequiredFieldLabel>
                  <ReactSelect
                    isMulti
                    options={moduleOptions}
                    value={selectedModuleOptions}
                    onChange={handleModuleChange}
                    placeholder={modulesQuery.isLoading ? "Loading modules..." : "Select modules"}
                    inputValue={moduleSearchValue}
                    onInputChange={handleModuleInputChange}
                    closeMenuOnSelect={false}
                    hideSelectedOptions={false}
                    isClearable={false}
                    isDisabled={modulesQuery.isLoading}
                    controlShouldRenderValue={false}
                    blurInputOnSelect={false}
                    menuShouldScrollIntoView={false}
                    components={{ Option: ModuleOption }}
                    styles={moduleMultiSelectStyles}
                  />
                  {selectedModuleOptions.length > 0 ? (
                    <Flex wrap="wrap" gap={2} mt={3}>
                      {selectedModuleOptions.map((option) => (
                        <Box
                          key={option.value}
                          as="button"
                          type="button"
                          onClick={() => handleRemoveModule(Number(option.value))}
                          display="inline-flex"
                          alignItems="center"
                          gap={2}
                          borderRadius="999px"
                          border="1px solid"
                          borderColor="rgba(117, 81, 255, 0.18)"
                          bg="rgba(117, 81, 255, 0.12)"
                          color="brand.500"
                          px={3}
                          py={1.5}
                          fontSize="sm"
                          fontWeight="700"
                          cursor="pointer"
                          _hover={{ bg: "rgba(117, 81, 255, 0.18)" }}
                        >
                          <Text as="span" lineHeight={1.1}>
                            {option.label}
                          </Text>
                          <Text as="span" fontSize="xs" lineHeight={1} aria-hidden="true">
                            ×
                          </Text>
                        </Box>
                      ))}
                    </Flex>
                  ) : null}
                  {errors.moduleIds ? <Field.ErrorText>{errors.moduleIds.message}</Field.ErrorText> : null}
                </Field.Root>

                <Box borderRadius="18px" border="1px solid" borderColor="border.subtle" bg="white" p={4}>
                  <Flex align="center" gap={2} mb={4}>
                    <Layers3 size={16} />
                    <Text fontSize="sm" fontWeight="800" color="text.primary">
                      Charge rules
                    </Text>
                  </Flex>

                  <Box overflowX="auto">
                    <Table.Root variant="line" size="sm" borderColor="border.subtle" minW={{ base: "760px", md: "auto" }}>
                      <Table.Header>
                        <Table.Row bg="app.bg">
                          <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" borderRightWidth="1px" px={4} py={3} textAlign="center">
                            Rule For
                          </Table.ColumnHeader>
                          <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" borderRightWidth="1px" px={4} py={3} textAlign="center">
                            Active
                          </Table.ColumnHeader>
                          <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" borderRightWidth="1px" px={4} py={3} textAlign="center">
                            <Flex align="center" gap={1} wrap="wrap">
                              <Text as="span">Value Type</Text>
                              <Text as="span" color="red.500" fontWeight="800" aria-hidden="true">
                                *
                              </Text>
                            </Flex>
                          </Table.ColumnHeader>
                          <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" px={4} py={3} textAlign="center">
                            <Flex align="center" gap={1} wrap="wrap">
                              <Text as="span">Value</Text>
                              <Text as="span" color="red.500" fontWeight="800" aria-hidden="true">
                                *
                              </Text>
                            </Flex>
                          </Table.ColumnHeader>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        <Table.Row>
                          <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4} fontWeight="700" color="text.primary">
                            Organizer
                          </Table.Cell>
                          <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4}>
                            <Switch.Root
                              checked={organizerRuleIsActive}
                              colorPalette="brand"
                              onCheckedChange={(details) => setValue("organizerRule.isActive", details.checked, { shouldDirty: true })}
                            >
                              <Switch.HiddenInput />
                              <Switch.Control />
                            </Switch.Root>
                          </Table.Cell>
                          <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4}>
                            <StyledSelect
                              options={[
                                { label: "Fixed Amount", value: "Fixed" },
                                { label: "Percentage", value: "Percent" },
                              ]}
                              value={organizerRuleValueType}
                              onChange={
                                organizerRuleIsActive
                                  ? (value) => {
                                      const nextValueType = value as "Fixed" | "Percent"
                                      setValue("organizerRule.valueType", nextValueType, { shouldDirty: true, shouldValidate: true })

                                      const currentValue = parseNumericInput(organizerRuleValueInput)
                                      if (nextValueType === "Percent" && currentValue !== null && currentValue > 100) {
                                        setOrganizerRuleValueInput(formatNumericBlurValue(100))
                                        setValue("organizerRule.value", 100, { shouldDirty: true, shouldValidate: true })
                                      }
                                    }
                                  : undefined
                              }
                              disabled={!organizerRuleIsActive}
                              placeholder="Select"
                            />
                          </Table.Cell>
                          <Table.Cell borderColor="border.subtle" px={4} py={4}>
                            <Input
                              value={organizerRuleValueInput}
                              onChange={(event) =>
                                handleRuleValueChange(
                                  event.target.value,
                                  organizerRuleValueType,
                                  setOrganizerRuleValueInput,
                                  "organizerRule.value",
                                )
                              }
                              onBlur={() =>
                                handleRuleValueBlur(
                                  organizerRuleValueInput,
                                  organizerRuleValueType,
                                  setOrganizerRuleValueInput,
                                  "organizerRule.value",
                                )
                              }
                              type="text"
                              inputMode="decimal"
                              disabled={!organizerRuleIsActive}
                              cursor={!organizerRuleIsActive ? "not-allowed" : "text"}
                              minH="11"
                              borderRadius="14px"
                              px={4}
                              placeholder={organizerRuleValueType === "Percent" ? "2.00" : "5.00"}
                            />
                          </Table.Cell>
                        </Table.Row>

                        <Table.Row>
                          <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4} fontWeight="700" color="text.primary">
                            Buyer
                          </Table.Cell>
                          <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4}>
                            <Switch.Root
                              checked={buyerRuleIsActive}
                              colorPalette="brand"
                              onCheckedChange={(details) => setValue("buyerRule.isActive", details.checked, { shouldDirty: true })}
                            >
                              <Switch.HiddenInput />
                              <Switch.Control />
                            </Switch.Root>
                          </Table.Cell>
                          <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4}>
                            <StyledSelect
                              options={[
                                { label: "Fixed Amount", value: "Fixed" },
                                { label: "Percentage", value: "Percent" },
                              ]}
                              value={buyerRuleValueType}
                              onChange={
                                buyerRuleIsActive
                                  ? (value) => {
                                      const nextValueType = value as "Fixed" | "Percent"
                                      setValue("buyerRule.valueType", nextValueType, { shouldDirty: true, shouldValidate: true })

                                      const currentValue = parseNumericInput(buyerRuleValueInput)
                                      if (nextValueType === "Percent" && currentValue !== null && currentValue > 100) {
                                        setBuyerRuleValueInput(formatNumericBlurValue(100))
                                        setValue("buyerRule.value", 100, { shouldDirty: true, shouldValidate: true })
                                      }
                                    }
                                  : undefined
                              }
                              disabled={!buyerRuleIsActive}
                              placeholder="Select"
                            />
                          </Table.Cell>
                          <Table.Cell borderColor="border.subtle" px={4} py={4}>
                            <Input
                              value={buyerRuleValueInput}
                              onChange={(event) =>
                                handleRuleValueChange(
                                  event.target.value,
                                  buyerRuleValueType,
                                  setBuyerRuleValueInput,
                                  "buyerRule.value",
                                )
                              }
                              onBlur={() =>
                                handleRuleValueBlur(
                                  buyerRuleValueInput,
                                  buyerRuleValueType,
                                  setBuyerRuleValueInput,
                                  "buyerRule.value",
                                )
                              }
                              type="text"
                              inputMode="decimal"
                              disabled={!buyerRuleIsActive}
                              cursor={!buyerRuleIsActive ? "not-allowed" : "text"}
                              minH="11"
                              borderRadius="14px"
                              px={4}
                              placeholder={buyerRuleValueType === "Percent" ? "2.00" : "5.00"}
                            />
                          </Table.Cell>
                        </Table.Row>
                      </Table.Body>
                    </Table.Root>
                  </Box>
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
