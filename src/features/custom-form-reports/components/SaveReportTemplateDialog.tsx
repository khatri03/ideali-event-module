import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { Box, Button, CloseButton, Dialog, Field, Flex, Input, Stack, Text } from "@chakra-ui/react"
import { extractApiError } from "@/utils/errors"
import { useCreateReportTemplate, useUpdateReportTemplate } from "../hooks/useCustomFormReportTemplateMutations"
import {
  reportTemplateFormSchema,
  toTemplateColumns,
  type ReportTemplateFormValues,
} from "../schemas/customFormReport.schemas"
import { ReportTemplateColumnField } from "./ReportTemplateColumnField"
import type { ReportField } from "@/api/customFormReports"

interface SaveReportTemplateFormProps {
  /** Present when editing, absent when saving the current selection as a new template. */
  templateUniqueId?: string
  moduleId: number
  formUniqueId: string
  /** Every column the form offers, so one left out of the report can still be added to the template here. */
  fields: ReportField[]
  initialName: string
  initialFieldIds: string[]
  /** Headings already saved on the template, keyed by field unique id. */
  initialColumnHeadings: Record<string, string>
  maxColumns: number
  onSaved: (templateUniqueId: string) => void
  onClose: () => void
}

interface SaveReportTemplateDialogProps extends SaveReportTemplateFormProps {
  /** Reactive visibility. The dialog stays mounted between opens so its close transition can run. */
  open: boolean
  /** Bumped by the caller on every open, so the form below remounts with a clean slate each time. */
  editSessionKey: number
}

/**
 * Owns only the dialog chrome. Kept mounted across opens so Ark's dialog machine runs its own close
 * transition, releasing the scroll lock and focus trap it set up, rather than that cleanup being skipped
 * because the component vanished while it was still open.
 */
export function SaveReportTemplateDialog({ open, editSessionKey, ...form }: SaveReportTemplateDialogProps) {
  const isEditing = Boolean(form.templateUniqueId)

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(details) => (details.open ? null : form.onClose())}
      size={{ base: "full", md: "lg" }}
    >
      <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
      <Dialog.Positioner p={{ base: 0, md: 4 }}>
        <Dialog.Content
          bg="white"
          borderRadius={{ base: "0", md: "24px" }}
          w="full"
          maxW={{ base: "full", md: "620px" }}
          maxH={{ base: "100dvh", md: "calc(100dvh - 2rem)" }}
          overflow="hidden"
        >
          <Box px={{ base: 4, md: 6 }} pt={6} pb={4}>
            <Flex align="flex-start" justify="space-between" gap={4}>
              <Dialog.Title fontSize="lg" fontWeight="800" color="gray.900">
                {isEditing ? "Edit report template" : "Save as template"}
              </Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton aria-label="Close template dialog" cursor="pointer" />
              </Dialog.CloseTrigger>
            </Flex>
          </Box>

          <SaveReportTemplateForm key={editSessionKey} {...form} />
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

function SaveReportTemplateForm({
  templateUniqueId,
  moduleId,
  formUniqueId,
  fields,
  initialName,
  initialFieldIds,
  initialColumnHeadings,
  maxColumns,
  onSaved,
  onClose,
}: SaveReportTemplateFormProps) {
  const createMutation = useCreateReportTemplate()
  const updateMutation = useUpdateReportTemplate()
  const isEditing = Boolean(templateUniqueId)
  const mutation = isEditing ? updateMutation : createMutation

  /**
   * A column left unchecked never renders its heading input, so its value has to start out blank here —
   * the form would otherwise submit an undefined heading for it and fail validation with nothing on screen.
   */
  const initialHeadings = Object.fromEntries(
    fields.map((field) => [field.uniqueId, initialColumnHeadings[field.uniqueId] ?? ""]),
  )

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ReportTemplateFormValues>({
    resolver: zodResolver(reportTemplateFormSchema),
    defaultValues: { name: initialName, fieldUniqueIds: initialFieldIds, columnHeadings: initialHeadings },
  })

  const selectedFieldIds = useWatch({ control, name: "fieldUniqueIds" })
  const hasReachedLimit = maxColumns > 0 && selectedFieldIds.length >= maxColumns

  function handleToggleField(fieldUniqueId: string) {
    const next = selectedFieldIds.includes(fieldUniqueId)
      ? selectedFieldIds.filter((id) => id !== fieldUniqueId)
      : [...selectedFieldIds, fieldUniqueId]

    setValue("fieldUniqueIds", next, { shouldValidate: true })
  }

  async function handleSave(values: ReportTemplateFormValues) {
    const orderedFieldIds = fields
      .filter((field) => values.fieldUniqueIds.includes(field.uniqueId))
      .map((field) => field.uniqueId)

    const request = {
      name: values.name,
      moduleId,
      formUniqueId,
      columns: toTemplateColumns(orderedFieldIds, values.columnHeadings),
    }

    const savedUniqueId = templateUniqueId
      ? await updateMutation.mutateAsync({ templateUniqueId, request })
      : await createMutation.mutateAsync(request)

    onSaved(savedUniqueId)
    onClose()
  }

  return (
    <Dialog.Body px={{ base: 4, md: 6 }} pb={6} overflowY="auto">
      <form onSubmit={handleSubmit(handleSave)} noValidate>
        <Stack gap={5}>
          <Field.Root invalid={Boolean(errors.name)} required>
            <Field.Label fontSize="sm" fontWeight="700">
              Template name <Field.RequiredIndicator />
            </Field.Label>
            <Input
              {...register("name")}
              placeholder="e.g. Gold members - dietary answers"
              h="44px"
              borderRadius="14px"
              autoFocus
            />
            <Field.ErrorText>{errors.name?.message}</Field.ErrorText>
          </Field.Root>

          <Box>
            <Text fontSize="sm" fontWeight="700" color="text.primary">
              Columns in this template
            </Text>
            <Text fontSize="sm" color="text.secondary" mb={3}>
              Every column of this form is listed, so check one here rather than going back to the report. Only
              the checked columns are saved. {selectedFieldIds.length} of {maxColumns || "—"} selected. Give a
              column its own heading where the question is too long to read as one.
            </Text>

            <Stack gap={4}>
              {fields.map((field) => {
                const isSelected = selectedFieldIds.includes(field.uniqueId)

                return (
                  <ReportTemplateColumnField
                    key={field.uniqueId}
                    field={field}
                    isSelected={isSelected}
                    isDisabled={!isSelected && hasReachedLimit}
                    headingRegistration={register(`columnHeadings.${field.uniqueId}`)}
                    headingError={errors.columnHeadings?.[field.uniqueId]?.message}
                    onToggle={() => handleToggleField(field.uniqueId)}
                  />
                )
              })}
            </Stack>

            {errors.fieldUniqueIds ? (
              <Text mt={2} fontSize="sm" color="red.600" fontWeight="600">
                {errors.fieldUniqueIds.message}
              </Text>
            ) : null}
          </Box>

          {mutation.isError ? (
            <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
              <Text fontSize="sm" fontWeight="700" color="red.700">
                {extractApiError(mutation.error)}
              </Text>
            </Box>
          ) : null}

          <Flex justify="flex-end" gap={3} direction={{ base: "column-reverse", md: "row" }}>
            <Button
              type="button"
              variant="outline"
              colorPalette="gray"
              borderRadius="14px"
              h="44px"
              px={6}
              w={{ base: "full", md: "auto" }}
              cursor="pointer"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              borderRadius="14px"
              h="44px"
              px={6}
              w={{ base: "full", md: "auto" }}
              color="white"
              style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
              cursor={mutation.isPending ? "not-allowed" : "pointer"}
              disabled={mutation.isPending}
              loading={mutation.isPending}
              loadingText="Saving..."
            >
              {isEditing ? "Update template" : "Save template"}
            </Button>
          </Flex>
        </Stack>
      </form>
    </Dialog.Body>
  )
}
