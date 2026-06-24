import type { ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useForm, useWatch, type FieldErrors } from "react-hook-form"
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
import { Check, CheckCircle2, Layers3, MoreHorizontal, PencilLine, Plus, RotateCcw, Trash2, UserRound } from "lucide-react"
import ReactSelect, {
  components,
  type InputActionMeta,
  type MultiValue,
  type OptionProps,
  type StylesConfig,
} from "react-select"
import { StyledSelect } from "@/components/common"
import { extractApiError } from "@/utils/errors"
import { toaster } from "@/lib/toaster"
import {
  createAdminRevenuePlan,
  fetchAdminRevenuePlanModules,
  fetchAdminRevenuePlan,
  fetchAdminRevenuePlanOrganizerNames,
  fetchAdminRevenuePlanOrganizers,
  fetchAdminRevenuePlans,
  assignAdminRevenuePlanOrganizers,
  saveAdminRevenuePlanModule,
  unmapAdminRevenuePlanModule,
  unmapAdminRevenuePlanOrganizer,
  updateAdminRevenuePlanMetadata,
  type AdminRevenuePlan,
  type AdminRevenuePlanInput,
  type AdminRevenuePlanModuleOption,
  type AdminRevenuePlanModuleInput,
  type AdminRevenuePlanMetadataInput,
  type AdminOrganizerOption,
  type AdminRevenuePlanScope,
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
  moduleId: z.number().int().positive("Module is required."),
  scope: z.enum(["OrganizerSpecific", "Reusable", "Default"]),
  organizerUniqueId: z.string().uuid().nullable().optional(),
  isActive: z.boolean(),
  organizerRule: ruleSchema,
  buyerRule: ruleSchema,
}).superRefine((values, ctx) => {
  if (values.scope === "OrganizerSpecific" && !values.organizerUniqueId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["organizerUniqueId"],
      message: "Organizer is required for organizer-specific plans.",
    })
  }
})

const adminRevenuePlanMetadataSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80, "Maximum 80 characters allowed."),
  label: z.string().trim().min(1, "Display text is required.").max(120, "Maximum 120 characters allowed."),
  scope: z.enum(["OrganizerSpecific", "Reusable", "Default"]),
  organizerUniqueId: z.string().uuid().nullable().optional(),
  isActive: z.boolean(),
}).superRefine((values, ctx) => {
  if (values.scope === "OrganizerSpecific" && !values.organizerUniqueId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["organizerUniqueId"],
      message: "Organizer is required for organizer-specific plans.",
    })
  }
})

type AdminRevenuePlanFormValues = z.infer<typeof adminRevenuePlanSchema>
type AdminRevenuePlanMetadataFormValues = z.infer<typeof adminRevenuePlanMetadataSchema>

interface OrganizerSelectOption {
  label: string
  value: string
}

const EMPTY_FORM_VALUES: AdminRevenuePlanFormValues = {
  name: "",
  label: "",
  moduleId: 0,
  scope: "Reusable",
  organizerUniqueId: null,
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
    isActive: false,
  },
}

const EMPTY_METADATA_FORM_VALUES: AdminRevenuePlanMetadataFormValues = {
  name: "",
  label: "",
  scope: "Reusable",
  organizerUniqueId: null,
  isActive: true,
}

const ADMIN_REVENUE_PLAN_PAGE_SIZE = 6

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

function useBackendErrorToast(error: unknown, source: string) {
  const lastToastKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!error) {
      lastToastKeyRef.current = null
      return
    }

    const message = extractApiError(error)
    const toastKey = `${source}:${message}`

    if (lastToastKeyRef.current === toastKey) {
      return
    }

    lastToastKeyRef.current = toastKey
    toaster.create({
      description: message,
      type: "error",
    })
  }, [error, source])
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
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false)
  const [editingMetadataPlan, setEditingMetadataPlan] = useState<AdminRevenuePlan | null>(null)
  const [isModuleLocked, setIsModuleLocked] = useState(false)
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false)
  const [mappingPlan, setMappingPlan] = useState<AdminRevenuePlan | null>(null)
  const [selectedMappingOrganizerUniqueIds, setSelectedMappingOrganizerUniqueIds] = useState<string[]>([])
  const [organizerNamesPlan, setOrganizerNamesPlan] = useState<AdminRevenuePlan | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<
    | { kind: "module"; planUniqueId: string; moduleId: number; label: string }
    | { kind: "organizer"; planUniqueId: string; organizerUniqueId: string; label: string }
    | null
  >(null)
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [mappingOrganizerSearchValue, setMappingOrganizerSearchValue] = useState("")
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

  useBackendErrorToast(plansQuery.error, "admin-revenue-plans")
  useBackendErrorToast(modulesQuery.error, "admin-revenue-plan-modules")
  useBackendErrorToast(organizersQuery.error, "admin-revenue-plan-organizers")
  useBackendErrorToast(organizerNamesQuery.error, "admin-revenue-plan-organizer-names")

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

  const {
    register: registerMetadata,
    handleSubmit: handleMetadataSubmit,
    reset: resetMetadata,
    setValue: setMetadataValue,
    control: metadataControl,
    formState: { errors: metadataErrors },
  } = useForm<AdminRevenuePlanMetadataFormValues>({
    resolver: zodResolver(adminRevenuePlanMetadataSchema),
    defaultValues: EMPTY_METADATA_FORM_VALUES,
  })

  const isActive = useWatch({ control, name: "isActive" })
  const scope = useWatch({ control, name: "scope" })
  const organizerUniqueId = useWatch({ control, name: "organizerUniqueId" })
  const moduleId = useWatch({ control, name: "moduleId" })
  const organizerRuleValueType = useWatch({ control, name: "organizerRule.valueType" })
  const buyerRuleValueType = useWatch({ control, name: "buyerRule.valueType" })
  const organizerRuleIsActive = useWatch({ control, name: "organizerRule.isActive" })
  const buyerRuleIsActive = useWatch({ control, name: "buyerRule.isActive" })
  const metadataIsActive = useWatch({ control: metadataControl, name: "isActive" })
  const metadataScope = useWatch({ control: metadataControl, name: "scope" })
  const metadataOrganizerUniqueId = useWatch({ control: metadataControl, name: "organizerUniqueId" })

  const moduleOptions = useMemo(
    () =>
      (modulesQuery.data?.map((module: AdminRevenuePlanModuleOption) => ({ label: module.text, value: String(module.value) })) ?? []).sort((a, b) =>
        a.label.localeCompare(b.label)
      ),
    [modulesQuery.data]
  )

  const selectedModuleValue = moduleId > 0 ? String(moduleId) : ""

  const organizerOptions = useMemo(
    () =>
      (organizersQuery.data?.map((organizer: AdminOrganizerOption) => ({ label: organizer.text, value: organizer.value })) ?? []).sort((a, b) =>
        a.label.localeCompare(b.label)
      ),
    [organizersQuery.data]
  )

  const scopeOptions = useMemo(
    () => [
      { label: "Organizer Specific", value: "OrganizerSpecific" },
      { label: "Reusable", value: "Reusable" },
      { label: "Default", value: "Default" },
    ],
    [],
  )

  const assignedOrganizerIds = useMemo(
    () => new Set(mappingPlan?.assignedOrganizerUniqueIds ?? []),
    [mappingPlan?.assignedOrganizerUniqueIds],
  )

  const selectedMappingOrganizerOptions = useMemo(
    () => organizerOptions.filter((option) => selectedMappingOrganizerUniqueIds.includes(option.value)),
    [organizerOptions, selectedMappingOrganizerUniqueIds],
  )

  useEffect(() => {
    if (scope === "OrganizerSpecific" && organizerUniqueId) {
      return
    }

    if (scope !== "OrganizerSpecific" && organizerUniqueId) {
      setValue("organizerUniqueId", null, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }, [organizerUniqueId, scope, setValue])

  useEffect(() => {
    if (metadataScope === "OrganizerSpecific" && metadataOrganizerUniqueId) {
      return
    }

    if (metadataScope !== "OrganizerSpecific" && metadataOrganizerUniqueId) {
      setMetadataValue("organizerUniqueId", null, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }, [metadataOrganizerUniqueId, metadataScope, setMetadataValue])

  function handleModuleChange(value: string) {
    setValue("moduleId", Number(value), {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  function handleOrganizerSelectChange(value: string) {
    setValue("organizerUniqueId", value || null, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  function handleMappingOrganizerChange(values: MultiValue<OrganizerSelectOption>) {
    setSelectedMappingOrganizerUniqueIds(values.map((item) => item.value))
  }

  function trackTrashClick(payload: {
    kind: "module" | "organizer"
    planUniqueId: string
    label: string
    moduleId?: number
    organizerUniqueId?: string
  }) {
    if (typeof window === "undefined") {
      return
    }

    window.dispatchEvent(new CustomEvent("admin-revenue-plans:trash-click", { detail: payload }))
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

  function getValidationMessage(formErrors: FieldErrors<AdminRevenuePlanFormValues>) {
    return (
      formErrors.name?.message?.toString() ||
      formErrors.label?.message?.toString() ||
      formErrors.moduleId?.message?.toString() ||
      formErrors.scope?.message?.toString() ||
      formErrors.organizerUniqueId?.message?.toString() ||
      formErrors.buyerRule?.value?.message?.toString() ||
      formErrors.organizerRule?.value?.message?.toString() ||
      "Please fix the highlighted fields and try again."
    )
  }

  function handleSaveInvalid(formErrors: FieldErrors<AdminRevenuePlanFormValues>) {
    setBanner({
      type: "error",
      message: getValidationMessage(formErrors),
    })
  }

  const buyerRuleValueError = errors.buyerRule?.value?.message?.toString() ?? ""
  const organizerRuleValueError = errors.organizerRule?.value?.message?.toString() ?? ""

  function handleMappingOrganizerInputChange(nextValue: string, actionMeta: InputActionMeta) {
    if (actionMeta.action === "input-change") {
      setMappingOrganizerSearchValue(nextValue)
      return nextValue
    }

    return mappingOrganizerSearchValue
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


  const saveMutation = useMutation({
    mutationFn: async (values: AdminRevenuePlanFormValues) => {
      const payload: AdminRevenuePlanInput = {
        name: values.name.trim(),
        label: values.label.trim(),
        moduleId: values.moduleId,
        scope: values.scope,
        organizerUniqueId: values.organizerUniqueId ?? null,
        isActive: values.isActive,
        organizerUniqueIds: [],
        rules: [values.buyerRule, values.organizerRule],
      }

      if (editingPlan?.uniqueId) {
        await updateAdminRevenuePlan(editingPlan.uniqueId, payload)
        return
      }

      await createAdminRevenuePlan(payload)
    },
    onSuccess: () => {
      setBanner({
        type: "success",
        message: editingPlan ? "Admin revenue plan updated." : "Admin revenue plan saved.",
      })
      setEditingPlan(null)
      setIsDialogOpen(false)
      reset(EMPTY_FORM_VALUES)
    },
    onError: (error) => {
      toaster.create({
        description: extractApiError(error),
        type: "error",
      })
      setBanner(null)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-revenue-plans"] })
    },
  })

  const moduleMutation = useMutation({
    mutationFn: async (values: AdminRevenuePlanFormValues) => {
      if (!editingPlan?.uniqueId) {
        return
      }

      const payload: AdminRevenuePlanModuleInput = {
        moduleId: values.moduleId,
        isEdit: isModuleLocked,
        rules: [values.buyerRule, values.organizerRule],
      }

      await saveAdminRevenuePlanModule(editingPlan.uniqueId, payload)
    },
    onSuccess: () => {
      setBanner({ type: "success", message: "Revenue plan module saved." })
      setEditingPlan(null)
      setIsDialogOpen(false)
      reset(EMPTY_FORM_VALUES)
    },
    onError: (error) => {
      toaster.create({
        description: extractApiError(error),
        type: "error",
      })
      setBanner(null)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-revenue-plans"] })
    },
  })

  const metadataMutation = useMutation({
    mutationFn: async (values: AdminRevenuePlanMetadataFormValues) => {
      if (!editingMetadataPlan?.uniqueId) {
        return
      }

      const payload: AdminRevenuePlanMetadataInput = {
        name: values.name.trim(),
        label: values.label.trim(),
        scope: values.scope,
        organizerUniqueId: values.organizerUniqueId ?? null,
        isActive: values.isActive,
      }

      await updateAdminRevenuePlanMetadata(editingMetadataPlan.uniqueId, payload)
    },
    onSuccess: () => {
      setBanner({ type: "success", message: "Admin revenue plan updated." })
      setEditingMetadataPlan(null)
      setIsPlanDialogOpen(false)
      resetMetadata(EMPTY_METADATA_FORM_VALUES)
    },
    onError: (error) => {
      toaster.create({
        description: extractApiError(error),
        type: "error",
      })
      setBanner(null)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-revenue-plans"] })
    },
  })

  const mapMutation = useMutation({
    mutationFn: ({ uniqueId, organizerUniqueIds }: { uniqueId: string; organizerUniqueIds: string[] }) =>
      assignAdminRevenuePlanOrganizers(uniqueId, { organizerUniqueIds }),
    onSuccess: () => {
      setBanner({ type: "success", message: "Revenue plan assigned to selected organizers." })
      setMappingPlan(null)
      setIsMapDialogOpen(false)
      setSelectedMappingOrganizerUniqueIds([])
    },
    onError: (error) => {
      toaster.create({
        description: extractApiError(error),
        type: "error",
      })
      setBanner(null)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-revenue-plans"] })
    },
  })

  const unmapOrganizerMutation = useMutation({
    mutationFn: ({ uniqueId, organizerUniqueId }: { uniqueId: string; organizerUniqueId: string }) =>
      unmapAdminRevenuePlanOrganizer(uniqueId, organizerUniqueId),
    onSuccess: () => {
      setBanner({ type: "success", message: "Organizer removed from revenue plan." })
    },
    onError: (error) => {
      toaster.create({
        description: extractApiError(error),
        type: "error",
      })
      setBanner(null)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-revenue-plans"] })
      queryClient.invalidateQueries({ queryKey: ["admin-revenue-plan-organizer-names"] })
    },
  })

  const unmapModuleMutation = useMutation({
    mutationFn: ({ uniqueId, moduleId }: { uniqueId: string; moduleId: number }) =>
      unmapAdminRevenuePlanModule(uniqueId, moduleId),
    onSuccess: () => {
      setBanner({ type: "success", message: "Module removed from revenue plan." })
    },
    onError: (error) => {
      toaster.create({
        description: extractApiError(error),
        type: "error",
      })
      setBanner(null)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-revenue-plans"] })
    },
  })

  function resetDialogState() {
    setBanner(null)
    saveMutation.reset()
    moduleMutation.reset()
    mapMutation.reset()
    unmapOrganizerMutation.reset()
    unmapModuleMutation.reset()
    setPendingRemoval(null)
    setMappingOrganizerSearchValue("")
    setSelectedMappingOrganizerUniqueIds([])
    setOrganizerRuleValueInput("")
    setBuyerRuleValueInput("")
    setIsModuleLocked(false)
  }

  function resetPlanDialogState() {
    setBanner(null)
    metadataMutation.reset()
  }

  function openCreateDialog() {
    resetDialogState()
    setEditingPlan(null)
    reset(EMPTY_FORM_VALUES)
    setOrganizerRuleValueInput("")
    setBuyerRuleValueInput("")
    setIsDialogOpen(true)
  }

  function openPlanEditDialog(plan: AdminRevenuePlan) {
    resetPlanDialogState()
    setEditingMetadataPlan(plan)
    resetMetadata({
      name: plan.name,
      label: plan.label,
      scope: plan.scope,
      organizerUniqueId: plan.organizerUniqueId ?? null,
      isActive: plan.isActive,
    })
    setIsPlanDialogOpen(true)
  }

  function openModuleDialog(plan: AdminRevenuePlan) {
    resetDialogState()
    setEditingPlan(plan)
    setIsModuleLocked(true)
    reset({
      name: plan.name,
      label: plan.label,
      moduleId: plan.moduleId,
      scope: plan.scope,
      organizerUniqueId: plan.organizerUniqueId ?? null,
      isActive: plan.isActive,
      buyerRule: getPlanRuleDefaults(plan, "Buyer", false),
      organizerRule: getPlanRuleDefaults(plan, "Organizer", true),
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

  function openAddModuleDialog(plan: AdminRevenuePlan) {
    resetDialogState()
    setEditingPlan(plan)
    reset({
      name: plan.name,
      label: plan.label,
      moduleId: 0,
      scope: plan.scope,
      organizerUniqueId: plan.organizerUniqueId ?? null,
      isActive: plan.isActive,
      buyerRule: {
        target: "Buyer",
        valueType: "Percent",
        value: 0,
        isActive: false,
      },
      organizerRule: {
        target: "Organizer",
        valueType: "Percent",
        value: 0,
        isActive: true,
      },
    })
    setOrganizerRuleValueInput("")
    setBuyerRuleValueInput("")
    setIsDialogOpen(true)
  }

  async function handleEditModule(plan: AdminRevenuePlan, moduleId?: number) {
    resetDialogState()

    try {
      const detail = await fetchAdminRevenuePlan(plan.uniqueId, moduleId ?? plan.moduleId)
      openModuleDialog(detail)
    } catch (error) {
      toaster.create({
        description: extractApiError(error),
        type: "error",
      })
      setBanner({ type: "error", message: extractApiError(error) })
    }
  }

  async function handleSaveMetadata(values: AdminRevenuePlanMetadataFormValues) {
    try {
      await metadataMutation.mutateAsync(values)
    } catch {
      // Toast already handled in the mutation callback.
    }
  }

  function openMapDialog(plan: AdminRevenuePlan) {
    if (plan.scope !== "Reusable") {
      toaster.create({
        description: "Only reusable plans can have organizer assignments.",
        type: "error",
      })
      return
    }

    resetDialogState()
    setMappingPlan(plan)
    setSelectedMappingOrganizerUniqueIds([])
    setMappingOrganizerSearchValue("")
    setIsMapDialogOpen(true)
  }

  const isModuleDialog = Boolean(editingPlan)

  async function handleSave(values: AdminRevenuePlanFormValues) {
    try {
      if (isModuleDialog) {
        await moduleMutation.mutateAsync(values)
        return
      }

      await saveMutation.mutateAsync(values)
    } catch {
      // Toast already handled in the mutation callback.
    }
  }

  const isBusy =
    saveMutation.isPending ||
    moduleMutation.isPending ||
    mapMutation.isPending ||
    unmapOrganizerMutation.isPending ||
    unmapModuleMutation.isPending
  const saveError = isModuleDialog ? moduleMutation.error : saveMutation.error
  const metadataSaveError = metadataMutation.error
  const mapError = mapMutation.error
  const plans = plansQuery.data?.items ?? []
  const totalPlans = plansQuery.data?.total ?? 0
  const currentPlanPage = planPage
  const totalPlanPages = plansQuery.data?.totalPages ?? 0
  const planPageNumbers = useMemo(
    () => buildPageNumbers(planPage, totalPlanPages),
    [planPage, totalPlanPages],
  )
  const organizerNames = useMemo(
    () => organizerNamesQuery.data ?? [],
    [organizerNamesQuery.data],
  )

  async function confirmPendingRemoval() {
    if (!pendingRemoval) {
      return
    }

    if (pendingRemoval.kind === "module") {
      try {
        await unmapModuleMutation.mutateAsync({
          uniqueId: pendingRemoval.planUniqueId,
          moduleId: pendingRemoval.moduleId,
        })
      } catch {
        // Toast already handled in the mutation callback.
      }
    } else {
      try {
        await unmapOrganizerMutation.mutateAsync({
          uniqueId: pendingRemoval.planUniqueId,
          organizerUniqueId: pendingRemoval.organizerUniqueId,
        })
      } catch {
        // Toast already handled in the mutation callback.
      }
    }

    setPendingRemoval(null)
  }

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
                    Module
                  </Table.ColumnHeader>
                  <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" borderRightWidth="1px" px={4} py={3} textAlign="center">
                    Organizers
                  </Table.ColumnHeader>
                  <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" borderRightWidth="1px" px={4} py={3} textAlign="center">
                    Scope
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
                    const moduleIds = plan.moduleIds.length > 0 ? plan.moduleIds : plan.moduleId > 0 ? [plan.moduleId] : []
                    const isDefaultPlan = plan.scope === "Default"
                    const isReusablePlan = plan.scope === "Reusable"
                    const isOrganizerSpecificPlan = plan.scope === "OrganizerSpecific"
                    const organizerCount = isDefaultPlan
                      ? 0
                      : isOrganizerSpecificPlan
                        ? 1
                        : (plan.organizerCount ?? plan.assignedOrganizerCount)
                    const organizerPills = isDefaultPlan
                      ? []
                      : isOrganizerSpecificPlan
                        ? [
                            {
                              name: plan.organizerName ?? plan.topOrganizerNames[0] ?? "Organizer",
                              uniqueId: plan.organizerUniqueId ?? plan.topOrganizerUniqueIds[0] ?? "",
                            },
                          ]
                        : plan.topOrganizerNames.slice(0, 3).map((organizerName, index) => ({
                            name: organizerName,
                            uniqueId: plan.topOrganizerUniqueIds[index] ?? "",
                          }))
                    const remainingOrganizerCount = isReusablePlan ? Math.max(organizerCount - organizerPills.length, 0) : 0

                    return (
                      <Table.Row key={`${plan.uniqueId}-${plan.moduleId}`} _hover={{ bg: "app.bg" }} transition="background 0.15s">
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
                                  onClick={() => openPlanEditDialog(plan)}
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
                                  value={`add-module-${plan.uniqueId}`}
                                  onClick={() => openAddModuleDialog(plan)}
                                  borderRadius="10px"
                                  fontSize="sm"
                                  fontWeight="600"
                                  color="gray.700"
                                  px={3}
                                  py={2}
                                  cursor="pointer"
                                >
                                  <Plus size={14} />
                                  Add module
                                </Menu.Item>
                                {plan.scope === "Reusable" ? (
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
                                    Add Organizers
                                  </Menu.Item>
                                ) : null}
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
                          {modules.length > 0 ? (
                            <Flex wrap="wrap" gap={2}>
                              {modules.map((moduleName, index) => {
                                const moduleId = moduleIds[index]

                                return (
                                  <Box key={`${plan.uniqueId}-${moduleId ?? moduleName}-${index}`} display="inline-flex">
                                    <Button
                                      type="button"
                                      variant="subtle"
                                      onClick={() => {
                                        if (moduleId) {
                                          void handleEditModule(plan, moduleId)
                                        }
                                      }}
                                      display="inline-flex"
                                      alignItems="center"
                                      justifyContent="center"
                                      gap={1.5}
                                      borderRadius="999px"
                                      border="1px solid"
                                      borderColor="gray.200"
                                      bg="gray.100"
                                      color="gray.700"
                                      px={3}
                                      py={1.5}
                                      minH="30px"
                                      h="30px"
                                      fontSize="10px"
                                      fontWeight="800"
                                      textTransform="uppercase"
                                      letterSpacing="0.08em"
                                      cursor={moduleId ? "pointer" : "not-allowed"}
                                      _hover={moduleId ? { bg: "gray.200", borderColor: "gray.300" } : undefined}
                                      disabled={!moduleId || unmapModuleMutation.isPending}
                                      aria-label={moduleId ? `Edit ${moduleName} module` : moduleName}
                                      title={moduleName}
                                      >
                                      {moduleName}
                                      {moduleId ? <PencilLine size={11} aria-hidden="true" /> : null}
                                      {moduleId ? (
                                        <Text
                                          as="span"
                                          display="inline-flex"
                                          alignItems="center"
                                          justifyContent="center"
                                          ml={1}
                                          color="red.500"
                                          aria-label={`Remove ${moduleName} module`}
                                          title={`Remove ${moduleName} module`}
                                          cursor="pointer"
                                          onClick={(event) => {
                                            event.stopPropagation()
                                            if (!plan.uniqueId) {
                                              return
                                            }

                                            trackTrashClick({
                                              kind: "module",
                                              planUniqueId: plan.uniqueId,
                                              moduleId,
                                              label: moduleName,
                                            })
                                            setPendingRemoval({
                                              kind: "module",
                                              planUniqueId: plan.uniqueId,
                                              moduleId,
                                              label: moduleName,
                                            })
                                          }}
                                        >
                                          <Trash2 size={11} />
                                        </Text>
                                      ) : null}
                                    </Button>
                                  </Box>
                                )
                              })}
                            </Flex>
                          ) : (
                            <Text fontSize="sm" color="text.secondary">
                              -
                            </Text>
                          )}
                        </Box>
                      </Table.Cell>
                      <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4}>
                        <Box minW={0}>
                          {organizerCount > 0 ? (
                            <Flex wrap="wrap" gap={2}>
                              {organizerPills.map((organizer) => (
                                <Box
                                  key={`${plan.uniqueId}-${organizer.uniqueId || organizer.name}`}
                                  display="inline-flex"
                                  alignItems="center"
                                  gap={1.5}
                                  borderRadius="999px"
                                  border="1px solid"
                                  borderColor="gray.200"
                                  bg="gray.100"
                                  color="gray.700"
                                  px={3}
                                  py={1.5}
                                  minH="30px"
                                  h="30px"
                                  fontSize="10px"
                                  fontWeight="800"
                                  textTransform="uppercase"
                                  letterSpacing="0.08em"
                                >
                                  <Text as="span">{organizer.name}</Text>
                                  {isReusablePlan && organizer.uniqueId ? (
                                    <Box
                                      as="button"
                                      display="inline-flex"
                                      alignItems="center"
                                      justifyContent="center"
                                      color="red.500"
                                      aria-label={`Remove organizer ${organizer.name}`}
                                      title={`Remove organizer ${organizer.name}`}
                                      cursor="pointer"
                                      minW="11px"
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        if (!plan.uniqueId) {
                                          return
                                        }

                                        trackTrashClick({
                                          kind: "organizer",
                                          planUniqueId: plan.uniqueId,
                                          organizerUniqueId: organizer.uniqueId,
                                          label: organizer.name,
                                        })
                                        setPendingRemoval({
                                          kind: "organizer",
                                          planUniqueId: plan.uniqueId,
                                          organizerUniqueId: organizer.uniqueId,
                                          label: organizer.name,
                                        })
                                      }}
                                    >
                                      <Trash2 size={11} />
                                    </Box>
                                  ) : null}
                                </Box>
                              ))}
                              {remainingOrganizerCount > 0 ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  colorPalette="gray"
                                  borderRadius="999px"
                                  h="30px"
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
                          <Badge
                            colorPalette={
                              plan.scope === "Default"
                                ? "green"
                                : plan.scope === "OrganizerSpecific"
                                  ? "blue"
                                  : "gray"
                            }
                            variant="subtle"
                            borderRadius="999px"
                            px={3}
                            py={1}
                            fontSize="10px"
                            fontWeight="800"
                            textTransform="uppercase"
                            letterSpacing="0.08em"
                          >
                            <Flex align="center" gap={1.5}>
                              {plan.scope === "Default" ? (
                                <CheckCircle2 size={13} strokeWidth={2.4} />
                              ) : plan.scope === "OrganizerSpecific" ? (
                                <UserRound size={13} strokeWidth={2.4} />
                              ) : (
                                <Layers3 size={13} strokeWidth={2.4} />
                              )}
                              <Text as="span">
                                {plan.scope === "OrganizerSpecific" ? "Organizer Specific" : plan.scope}
                              </Text>
                            </Flex>
                          </Badge>
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
                  {organizerNames.map((organizer) => (
                    <Box key={organizer.uniqueId} display="inline-flex">
                      <Badge
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
                        {organizer.name}
                        <Text
                          as="span"
                          display="inline-flex"
                          alignItems="center"
                          justifyContent="center"
                          ml={1}
                          color="red.500"
                          aria-label={`Remove organizer ${organizer.name}`}
                          title={`Remove organizer ${organizer.name}`}
                          cursor="pointer"
                          onClick={(event) => {
                            event.stopPropagation()
                            if (!organizerNamesPlan?.uniqueId) {
                              return
                            }

                            trackTrashClick({
                              kind: "organizer",
                              planUniqueId: organizerNamesPlan.uniqueId,
                              organizerUniqueId: organizer.uniqueId,
                              label: organizer.name,
                            })
                            setPendingRemoval({
                              kind: "organizer",
                              planUniqueId: organizerNamesPlan.uniqueId,
                              organizerUniqueId: organizer.uniqueId,
                              label: organizer.name,
                            })
                          }}
                        >
                          <Trash2 size={11} />
                        </Text>
                      </Badge>
                    </Box>
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
                    {isModuleDialog ? (isModuleLocked ? "Edit module" : "Add module") : "Add revenue plan"}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {isModuleDialog
                      ? "Keep the plan identity fixed, then choose the module and charge rules."
                      : "Create a new plan shell before adding modules and charge rules."}
                  </Text>
                </Box>

                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close revenue plan modal" />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>

            <Dialog.Body px={6} py={6} overflowY="auto">
              <form onSubmit={handleSubmit(handleSave, handleSaveInvalid)} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {saveError ? (
                  <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
                    <Text fontSize="sm" fontWeight="700" color="red.700">
                      {extractApiError(saveError)}
                    </Text>
                  </Box>
                ) : null}

                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                  <Field.Root w="full" invalid={Boolean(errors.name)}>
                    <RequiredFieldLabel>Name</RequiredFieldLabel>
                    <Input
                      w="full"
                      {...register("name")}
                      minH="11"
                      borderRadius="14px"
                      px={4}
                      placeholder="Stripe checkout plan"
                      readOnly={isModuleDialog}
                      cursor={isModuleDialog ? "not-allowed" : "text"}
                      bg={isModuleDialog ? "gray.50" : "white"}
                    />
                    {errors.name ? <Field.ErrorText>{errors.name.message}</Field.ErrorText> : null}
                  </Field.Root>

                  <Field.Root w="full" invalid={Boolean(errors.label)}>
                    <RequiredFieldLabel>Display Text</RequiredFieldLabel>
                    <Input
                      w="full"
                      {...register("label")}
                      minH="11"
                      borderRadius="14px"
                      px={4}
                      placeholder="Checkout processing"
                      readOnly={isModuleDialog}
                      cursor={isModuleDialog ? "not-allowed" : "text"}
                      bg={isModuleDialog ? "gray.50" : "white"}
                    />
                    {errors.label ? <Field.ErrorText>{errors.label.message}</Field.ErrorText> : null}
                  </Field.Root>
                </SimpleGrid>

                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                  <Field.Root w="full" invalid={Boolean(errors.scope)}>
                    <RequiredFieldLabel>Scope</RequiredFieldLabel>
                    <StyledSelect
                      options={scopeOptions}
                      value={scope}
                      onChange={(value) => setValue("scope", value as AdminRevenuePlanScope, { shouldDirty: true, shouldValidate: true })}
                      disabled={isModuleDialog}
                      placeholder="Select scope"
                    />
                    {errors.scope ? <Field.ErrorText>{errors.scope.message?.toString()}</Field.ErrorText> : null}
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
                          disabled={isModuleDialog}
                          onCheckedChange={(details) => setValue("isActive", details.checked, { shouldDirty: true })}
                        >
                          <Switch.HiddenInput />
                          <Switch.Control />
                        </Switch.Root>
                      </Flex>
                    </Box>
                  </Field.Root>
                </SimpleGrid>

                {!isModuleDialog && scope === "OrganizerSpecific" ? (
                  <Field.Root w="full" invalid={Boolean(errors.organizerUniqueId)}>
                    <RequiredFieldLabel>Organizer</RequiredFieldLabel>
                    <StyledSelect
                      options={organizerOptions}
                      value={organizerUniqueId ?? ""}
                      onChange={handleOrganizerSelectChange}
                      placeholder={organizersQuery.isLoading ? "Loading organizers..." : "Select organizer"}
                      disabled={organizersQuery.isLoading}
                    />
                    {errors.organizerUniqueId ? <Field.ErrorText>{errors.organizerUniqueId.message?.toString()}</Field.ErrorText> : null}
                  </Field.Root>
                ) : null}

                <Field.Root invalid={Boolean(errors.moduleId)}>
                  <RequiredFieldLabel>Module</RequiredFieldLabel>
                  <StyledSelect
                    options={moduleOptions}
                    value={selectedModuleValue}
                    onChange={handleModuleChange}
                    placeholder={modulesQuery.isLoading ? "Loading modules..." : "Select module"}
                    disabled={modulesQuery.isLoading || isModuleLocked}
                  />
                  {errors.moduleId ? <Field.ErrorText>{errors.moduleId.message}</Field.ErrorText> : null}
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
                              onChange={(value) => {
                                if (!buyerRuleIsActive) {
                                  return
                                }

                                const nextValueType = value as "Fixed" | "Percent"
                                setValue("buyerRule.valueType", nextValueType, { shouldDirty: true, shouldValidate: true })

                                const currentValue = parseNumericInput(buyerRuleValueInput)
                                if (nextValueType === "Percent" && currentValue !== null && currentValue > 100) {
                                  setBuyerRuleValueInput(formatNumericBlurValue(100))
                                  setValue("buyerRule.value", 100, { shouldDirty: true, shouldValidate: true })
                                }
                              }}
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
                            {buyerRuleValueError ? (
                              <Text fontSize="xs" fontWeight="700" color="red.600" mt={2}>
                                {buyerRuleValueError}
                              </Text>
                            ) : null}
                          </Table.Cell>
                        </Table.Row>

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
                              onChange={(value) => {
                                if (!organizerRuleIsActive) {
                                  return
                                }

                                const nextValueType = value as "Fixed" | "Percent"
                                setValue("organizerRule.valueType", nextValueType, { shouldDirty: true, shouldValidate: true })

                                const currentValue = parseNumericInput(organizerRuleValueInput)
                                if (nextValueType === "Percent" && currentValue !== null && currentValue > 100) {
                                  setOrganizerRuleValueInput(formatNumericBlurValue(100))
                                  setValue("organizerRule.value", 100, { shouldDirty: true, shouldValidate: true })
                                }
                              }}
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
                            {organizerRuleValueError ? (
                              <Text fontSize="xs" fontWeight="700" color="red.600" mt={2}>
                                {organizerRuleValueError}
                              </Text>
                            ) : null}
                          </Table.Cell>
                        </Table.Row>
                      </Table.Body>
                    </Table.Root>
                  </Box>
                </Box>

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
                    {editingPlan ? (isModuleLocked ? "Update module" : "Add module") : "Save plan"}
                  </Button>
                </Flex>
              </form>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <Dialog.Root
        open={isPlanDialogOpen}
        onOpenChange={(details) => {
          setIsPlanDialogOpen(details.open)
          if (!details.open) {
            setEditingMetadataPlan(null)
            resetMetadata(EMPTY_METADATA_FORM_VALUES)
            resetPlanDialogState()
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
                    Edit revenue plan
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Update the plan identity, scope and status without touching module-specific charge rules.
                  </Text>
                </Box>
                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close plan modal" onClick={() => setIsPlanDialogOpen(false)} />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>

            <Dialog.Body px={6} py={6} overflowY="auto">
              <form
                onSubmit={handleMetadataSubmit(handleSaveMetadata)}
                style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
              >
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                  <Field.Root w="full" invalid={Boolean(metadataErrors.name)}>
                    <RequiredFieldLabel>Name</RequiredFieldLabel>
                    <Input
                      w="full"
                      {...registerMetadata("name")}
                      minH="11"
                      borderRadius="14px"
                      px={4}
                      placeholder="Stripe checkout plan"
                    />
                    {metadataErrors.name ? <Field.ErrorText>{metadataErrors.name.message}</Field.ErrorText> : null}
                  </Field.Root>

                  <Field.Root w="full" invalid={Boolean(metadataErrors.label)}>
                    <RequiredFieldLabel>Display Text</RequiredFieldLabel>
                    <Input
                      w="full"
                      {...registerMetadata("label")}
                      minH="11"
                      borderRadius="14px"
                      px={4}
                      placeholder="Checkout processing"
                    />
                    {metadataErrors.label ? <Field.ErrorText>{metadataErrors.label.message}</Field.ErrorText> : null}
                  </Field.Root>
                </SimpleGrid>

                <Field.Root w="full" invalid={Boolean(metadataErrors.scope)}>
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
                          Scope
                        </Text>
                      </Box>
                      <Box minW="180px">
                        <StyledSelect
                          options={scopeOptions}
                          value={metadataScope}
                          onChange={(value) =>
                            setMetadataValue("scope", value as AdminRevenuePlanScope, {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                          }
                          placeholder="Select scope"
                        />
                      </Box>
                    </Flex>
                  </Box>
                  {metadataErrors.scope ? <Field.ErrorText>{metadataErrors.scope.message?.toString()}</Field.ErrorText> : null}
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
                        checked={metadataIsActive}
                        colorPalette="brand"
                        onCheckedChange={(details) => setMetadataValue("isActive", details.checked, { shouldDirty: true })}
                      >
                        <Switch.HiddenInput />
                        <Switch.Control />
                      </Switch.Root>
                    </Flex>
                  </Box>
                </Field.Root>

                {metadataScope === "OrganizerSpecific" ? (
                  <Field.Root w="full" invalid={Boolean(metadataErrors.organizerUniqueId)}>
                    <RequiredFieldLabel>Organizer</RequiredFieldLabel>
                    <StyledSelect
                      options={organizerOptions}
                      value={metadataOrganizerUniqueId ?? ""}
                      onChange={(value) =>
                        setMetadataValue("organizerUniqueId", value || null, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      placeholder={organizersQuery.isLoading ? "Loading organizers..." : "Select organizer"}
                      disabled={organizersQuery.isLoading}
                    />
                    {metadataErrors.organizerUniqueId ? (
                      <Field.ErrorText>{metadataErrors.organizerUniqueId.message?.toString()}</Field.ErrorText>
                    ) : null}
                  </Field.Root>
                ) : null}

                {metadataSaveError ? (
                  <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
                    <Text fontSize="sm" fontWeight="700" color="red.700">
                      {extractApiError(metadataSaveError)}
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
                    onClick={() => setIsPlanDialogOpen(false)}
                  >
                    Close
                  </Button>

                  <Button
                    borderRadius="14px"
                    h="44px"
                    px={6}
                    minW={{ base: "full", md: "160px" }}
                    loading={metadataMutation.isPending}
                    loadingText="Saving..."
                    type="submit"
                    color="white"
                    style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                  >
                    Update plan
                  </Button>
                </Flex>
              </form>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(pendingRemoval)}
        onOpenChange={(details) => {
          if (!details.open) {
            setPendingRemoval(null)
          }
        }}
        size="md"
      >
        <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius={{ base: 0, md: "24px" }}
            maxW={{ base: "100vw", md: "520px" }}
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
                    Confirm removal
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    This action will remove the selected item from the plan.
                  </Text>
                </Box>
                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close removal dialog" onClick={() => setPendingRemoval(null)} />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>

            <Dialog.Body px={6} py={6}>
              <Stack gap={4}>
                <Box borderRadius="16px" border="1px solid" borderColor="border.subtle" bg="app.bg" p={4}>
                  <Text fontSize="sm" fontWeight="700" color="text.primary">
                    {pendingRemoval?.kind === "module" ? "Remove module" : "Remove organizer"}
                  </Text>
                  <Text fontSize="sm" color="text.secondary" mt={1}>
                    {pendingRemoval?.label ?? ""}
                  </Text>
                </Box>

                <Flex gap={3} justify="flex-end" wrap="wrap">
                  <Button variant="outline" colorPalette="gray" borderRadius="14px" h="44px" px={6} onClick={() => setPendingRemoval(null)}>
                    Cancel
                  </Button>
                  <Button
                    colorPalette="red"
                    borderRadius="14px"
                    h="44px"
                    px={6}
                    loading={unmapOrganizerMutation.isPending || unmapModuleMutation.isPending}
                    loadingText="Removing..."
                    onClick={() => void confirmPendingRemoval()}
                  >
                    Remove
                  </Button>
                </Flex>
              </Stack>
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
                    Add Organizers
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Apply the selected revenue plan to one or more organizers for the selected module.
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
                  <RequiredFieldLabel>Organizers</RequiredFieldLabel>
                  <ReactSelect
                    isMulti
                    options={organizerOptions}
                    value={selectedMappingOrganizerOptions}
                    onChange={handleMappingOrganizerChange}
                    placeholder={organizersQuery.isLoading ? "Loading organizers..." : "Select organizers"}
                    inputValue={mappingOrganizerSearchValue}
                    onInputChange={handleMappingOrganizerInputChange}
                    closeMenuOnSelect={false}
                    hideSelectedOptions={false}
                    isClearable={false}
                    isDisabled={organizersQuery.isLoading || mapMutation.isPending}
                    controlShouldRenderValue={false}
                    blurInputOnSelect={false}
                    menuShouldScrollIntoView={false}
                    components={{ Option: OrganizerOption }}
                    styles={organizerMultiSelectStyles}
                    isOptionDisabled={(option) => assignedOrganizerIds.has(option.value)}
                  />
                  {selectedMappingOrganizerOptions.length > 0 ? (
                    <Flex wrap="wrap" gap={2} mt={3}>
                      {selectedMappingOrganizerOptions.map((option) => (
                        <Box
                          key={option.value}
                          as="button"
                          onClick={() =>
                            setSelectedMappingOrganizerUniqueIds((current) => current.filter((uniqueId) => uniqueId !== option.value))
                          }
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
                  {mapError ? (
                    <Text mt={2} fontSize="sm" color="red.600">
                      {extractApiError(mapError)}
                    </Text>
                  ) : null}
                </Field.Root>

                <Flex gap={3} justify="flex-end" wrap="wrap">
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
                  <Button
                    borderRadius="14px"
                    h="44px"
                    px={6}
                    minW={{ base: "full", md: "160px" }}
                    loading={mapMutation.isPending}
                    loadingText="Saving..."
                    disabled={!mappingPlan?.uniqueId || selectedMappingOrganizerUniqueIds.length === 0}
                    color="white"
                    style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                    onClick={async () => {
                      if (!mappingPlan?.uniqueId || selectedMappingOrganizerUniqueIds.length === 0) {
                        return
                      }

                      await mapMutation.mutateAsync({
                        uniqueId: mappingPlan.uniqueId,
                        organizerUniqueIds: selectedMappingOrganizerUniqueIds,
                      })
                    }}
                  >
                    Save organizers
                  </Button>
                </Flex>
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Stack>
  )
}
