import { useEffect } from "react"
import { Field, Flex, Grid, Input, Text } from "@chakra-ui/react"
import { TriangleAlert } from "lucide-react"
import { Controller, useWatch, type Control, type FieldErrors, type UseFormRegister, type UseFormSetValue } from "react-hook-form"
import { StyledSelect } from "@/components/common"
import { RequiredFieldLabel } from "@/features/custom-lists"
import type { CustomInvoiceForEdit, CustomInvoiceModule } from "@/api/customInvoices"
import { billedEntityLabel } from "@/utils/customInvoiceEntity"
import { useActiveInvoiceCategoryOptions } from "../hooks/useCustomInvoiceMutations"
import { useEnabledCustomInvoiceModules } from "../hooks/useCustomInvoiceAuthoringOptions"
import { clearInvoiceLink, type CustomInvoiceFormValues } from "../schemas/customInvoice.schemas"
import { CustomInvoiceEntityPicker } from "./CustomInvoiceEntityPicker"

interface CustomInvoiceAboutSectionProps {
  control: Control<CustomInvoiceFormValues>
  register: UseFormRegister<CustomInvoiceFormValues>
  errors: FieldErrors<CustomInvoiceFormValues>
  setValue: UseFormSetValue<CustomInvoiceFormValues>
  /** The invoice being edited; absent when creating. Its module and record are fixed and shown read-only. */
  initial?: CustomInvoiceForEdit
  isReadOnly: boolean
  /** Custom invoicing is turned on for no module, so there is nothing to create. */
  hasNoEnabledModules: boolean
}

function NoModulesEnabledNotice() {
  return (
    <Flex role="alert" gap={3} align="flex-start" p={4} borderRadius="16px" bg="status.warning.bg" gridColumn="1 / -1">
      <Flex color="status.warning.fg" flexShrink={0} mt={0.5}>
        <TriangleAlert size={18} />
      </Flex>
      <Text fontSize="sm" fontWeight="700" color="status.warning.fg">
        Custom invoicing is not turned on for any module. Ask your platform admin to turn it on.
      </Text>
    </Flex>
  )
}

function BilledEntityReadOnly({ initial }: { initial: CustomInvoiceForEdit }) {
  return (
    <Field.Root readOnly>
      <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
        {billedEntityLabel(initial.moduleType)}
      </Field.Label>
      <Input
        readOnly
        value={initial.entityName.trim() || "This record no longer exists"}
        minH="11"
        borderRadius="12px"
        bg="app.bg"
        cursor="not-allowed"
      />
      <Field.HelperText>What an invoice bills cannot change after it is created.</Field.HelperText>
    </Field.Root>
  )
}

/** What the invoice bills and under which terms: module, billed record, sponsorship type and due date. */
export function CustomInvoiceAboutSection({ control, register, errors, setValue, initial, isReadOnly, hasNoEnabledModules }: CustomInvoiceAboutSectionProps) {
  const modulesQuery = useEnabledCustomInvoiceModules()
  const categoriesQuery = useActiveInvoiceCategoryOptions()
  const moduleType = useWatch({ control, name: "moduleType" }) as CustomInvoiceModule | undefined

  const isEditMode = Boolean(initial)
  const enabledModules = modulesQuery.data ?? []
  const moduleOptions = (initial ? [initial.moduleType] : enabledModules).map((module) => ({ label: module, value: module }))
  const onlyModule = !isEditMode && enabledModules.length === 1 ? enabledModules[0] : undefined

  // With a single enabled module there is no choice to make, so it is filled in rather than asked for.
  useEffect(() => {
    if (onlyModule && !moduleType) {
      setValue("moduleType", onlyModule)
    }
  }, [onlyModule, moduleType, setValue])

  const categoryOptions = (categoriesQuery.data ?? []).map((category) => ({ label: category.name, value: category.uniqueId }))
  const hasNoActiveCategories = categoriesQuery.isSuccess && categoryOptions.length === 0

  function handleModuleChange(next: string) {
    if (next === moduleType) return
    setValue("moduleType", next as CustomInvoiceModule, { shouldDirty: true, shouldValidate: true })
    setValue("entityUniqueId", "", { shouldDirty: true })
    // Link candidates belong to one module, so a picked invoice from the old module cannot stay linked.
    clearInvoiceLink(setValue)
  }

  return (
    <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
      {hasNoEnabledModules ? <NoModulesEnabledNotice /> : null}
      <Field.Root invalid={Boolean(errors.moduleType)}>
        <RequiredFieldLabel>Module</RequiredFieldLabel>
        <StyledSelect
          options={moduleOptions}
          value={moduleType ?? ""}
          onChange={handleModuleChange}
          disabled={isEditMode || isReadOnly || modulesQuery.isLoading || Boolean(onlyModule) || hasNoEnabledModules}
          placeholder={modulesQuery.isLoading ? "Loading modules..." : "Select a module"}
          ariaLabel="Module"
        />
        {onlyModule ? <Field.HelperText>{`Custom invoicing is only turned on for ${onlyModule}.`}</Field.HelperText> : null}
        <Field.ErrorText>{errors.moduleType?.message}</Field.ErrorText>
      </Field.Root>

      {initial ? (
        <BilledEntityReadOnly initial={initial} />
      ) : (
        <CustomInvoiceEntityPicker key={moduleType ?? "none"} control={control} errors={errors} moduleType={moduleType} disabled={isReadOnly} />
      )}

      <Field.Root invalid={Boolean(errors.categoryUniqueId)}>
        <RequiredFieldLabel>Sponsorship type</RequiredFieldLabel>
        <Controller
          control={control}
          name="categoryUniqueId"
          render={({ field }) => (
            <StyledSelect
              options={categoryOptions}
              value={field.value}
              onChange={field.onChange}
              disabled={isReadOnly || categoriesQuery.isLoading || hasNoActiveCategories}
              placeholder={categoriesQuery.isLoading ? "Loading types..." : "Select a sponsorship type"}
              ariaLabel="Sponsorship type"
            />
          )}
        />
        {hasNoActiveCategories ? (
          <Field.HelperText>No active sponsorship types yet. Add one under Invoice Categories first.</Field.HelperText>
        ) : null}
        <Field.ErrorText>{errors.categoryUniqueId?.message}</Field.ErrorText>
      </Field.Root>

      <Field.Root invalid={Boolean(errors.dueDate)}>
        <RequiredFieldLabel>Payment due date</RequiredFieldLabel>
        <Input type="date" minH="11" borderRadius="12px" disabled={isReadOnly} {...register("dueDate")} />
        <Field.ErrorText>{errors.dueDate?.message}</Field.ErrorText>
      </Field.Root>
    </Grid>
  )
}
