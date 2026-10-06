import { Field, Grid, Input } from "@chakra-ui/react"
import { Controller, useWatch, type Control, type FieldErrors, type UseFormRegister, type UseFormSetValue } from "react-hook-form"
import { StyledSelect } from "@/components/common"
import { RequiredFieldLabel } from "@/features/custom-lists"
import type { CustomInvoiceModule } from "@/api/customInvoices"
import { useActiveInvoiceCategoryOptions } from "../hooks/useCustomInvoiceMutations"
import { useEnabledCustomInvoiceModules } from "../hooks/useCustomInvoiceAuthoringOptions"
import type { CustomInvoiceFormValues } from "../schemas/customInvoice.schemas"
import { CustomInvoiceEntityPicker } from "./CustomInvoiceEntityPicker"

interface CustomInvoiceAboutSectionProps {
  control: Control<CustomInvoiceFormValues>
  register: UseFormRegister<CustomInvoiceFormValues>
  errors: FieldErrors<CustomInvoiceFormValues>
  setValue: UseFormSetValue<CustomInvoiceFormValues>
  isEditMode: boolean
  isReadOnly: boolean
}

/** What the invoice bills and under which terms: module, billed record, sponsorship type and due date. */
export function CustomInvoiceAboutSection({ control, register, errors, setValue, isEditMode, isReadOnly }: CustomInvoiceAboutSectionProps) {
  const modulesQuery = useEnabledCustomInvoiceModules()
  const categoriesQuery = useActiveInvoiceCategoryOptions()
  const moduleType = useWatch({ control, name: "moduleType" }) as CustomInvoiceModule | undefined

  const moduleOptions = (modulesQuery.data ?? []).map((module) => ({ label: module, value: module }))
  const categoryOptions = (categoriesQuery.data ?? []).map((category) => ({ label: category.name, value: category.uniqueId }))
  const hasNoActiveCategories = categoriesQuery.isSuccess && categoryOptions.length === 0

  function handleModuleChange(next: string) {
    setValue("moduleType", next as CustomInvoiceModule, { shouldDirty: true, shouldValidate: true })
    setValue("entityUniqueId", "", { shouldDirty: true })
  }

  return (
    <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
      <Field.Root invalid={Boolean(errors.moduleType)}>
        <RequiredFieldLabel>Module</RequiredFieldLabel>
        <StyledSelect
          options={moduleOptions}
          value={moduleType ?? ""}
          onChange={handleModuleChange}
          disabled={isEditMode || isReadOnly || modulesQuery.isLoading}
          placeholder={modulesQuery.isLoading ? "Loading modules..." : "Select a module"}
          ariaLabel="Module"
        />
        <Field.ErrorText>{errors.moduleType?.message}</Field.ErrorText>
      </Field.Root>

      <CustomInvoiceEntityPicker control={control} errors={errors} moduleType={moduleType} disabled={isEditMode || isReadOnly} />

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
