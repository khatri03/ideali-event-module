import { useEffect, type ReactNode } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Field,
  Flex,
  Input,
  SimpleGrid,
  Switch,
  Text,
} from "@chakra-ui/react"
import { StyledSelect } from "@/components/common"
import { extractApiError } from "@/utils/errors"
import { useCreateChargeRule, useUpdateChargeRule } from "../hooks/useChargeRules"
import type { OrganizerChargeRuleInput, OrganizerChargeRuleListItem } from "@/api/chargeRules"

const chargeRuleFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(80, "Maximum 80 characters allowed."),
    label: z.string().trim().min(1, "Label is required.").max(120, "Maximum 120 characters allowed."),
    chargeKind: z.enum(["Tax", "Other"], { message: "Charge category is required." }),
    calculationType: z.enum(["Fixed", "Percent"], { message: "Calculation type is required." }),
    value: z.number().positive("Value must be greater than zero."),
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
  value: 1,
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

interface ChargeRuleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingRule?: OrganizerChargeRuleListItem | null
  onSaved?: (input: OrganizerChargeRuleInput & { uniqueId?: string }) => void
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

function buildInitialValues(rule?: OrganizerChargeRuleListItem | null): ChargeRuleFormValues {
  if (!rule) {
    return EMPTY_FORM_VALUES
  }

  return {
    name: rule.name,
    label: rule.label,
    chargeKind: rule.chargeKind === "Other" ? "Other" : "Tax",
    calculationType: rule.calculationType,
    value: rule.value,
    isActive: rule.isActive,
  }
}

export function ChargeRuleDialog({ open, onOpenChange, editingRule, onSaved }: ChargeRuleDialogProps) {
  const createChargeRuleMutation = useCreateChargeRule()
  const updateChargeRuleMutation = useUpdateChargeRule()

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

  useEffect(() => {
    if (open) {
      reset(buildInitialValues(editingRule))
      return
    }

    reset(EMPTY_FORM_VALUES)
  }, [editingRule, open, reset])

  const saveError = createChargeRuleMutation.error ?? updateChargeRuleMutation.error

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
      onSaved?.({ ...payload, uniqueId: editingRule.uniqueId })
      onOpenChange(false)
      return
    }

    await createChargeRuleMutation.mutateAsync(payload)
    onSaved?.(payload)
    onOpenChange(false)
  }

  function handleOpenChange(details: { open: boolean }) {
    onOpenChange(details.open)
    if (!details.open) {
      createChargeRuleMutation.reset()
      updateChargeRuleMutation.reset()
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange} size="lg">
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
            <form onSubmit={handleSubmit(handleSave)} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
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
              </SimpleGrid>

              <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                <Field.Root invalid={Boolean(errors.chargeKind)}>
                  <RequiredFieldLabel>Charge category</RequiredFieldLabel>
                  <StyledSelect
                    options={CHARGE_KIND_OPTIONS}
                    value={chargeKind}
                    onChange={(value) =>
                      setValue("chargeKind", value as ChargeRuleFormValues["chargeKind"], {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
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
                    min="0.01"
                    step="0.01"
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
                  onClick={() => onOpenChange(false)}
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
  )
}
