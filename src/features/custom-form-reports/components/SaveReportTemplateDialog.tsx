import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { Box, Button, Checkbox, CloseButton, Dialog, Field, Flex, Input, Stack, Text } from "@chakra-ui/react"
import { extractApiError } from "@/utils/errors"
import { useCreateReportTemplate, useUpdateReportTemplate } from "../hooks/useCustomFormReportTemplateMutations"
import { reportTemplateFormSchema, type ReportTemplateFormValues } from "../schemas/customFormReport.schemas"
import type { ReportField } from "@/api/customFormReports"

interface SaveReportTemplateDialogProps {
  /** Present when editing, absent when saving the current selection as a new template. */
  templateUniqueId?: string
  moduleId: number
  formUniqueId: string
  fields: ReportField[]
  initialName: string
  initialFieldIds: string[]
  maxColumns: number
  onSaved: (templateUniqueId: string) => void
  onClose: () => void
}

export function SaveReportTemplateDialog({
  templateUniqueId,
  moduleId,
  formUniqueId,
  fields,
  initialName,
  initialFieldIds,
  maxColumns,
  onSaved,
  onClose,
}: SaveReportTemplateDialogProps) {
  const createMutation = useCreateReportTemplate()
  const updateMutation = useUpdateReportTemplate()
  const isEditing = Boolean(templateUniqueId)
  const mutation = isEditing ? updateMutation : createMutation

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ReportTemplateFormValues>({
    resolver: zodResolver(reportTemplateFormSchema),
    defaultValues: { name: initialName, fieldUniqueIds: initialFieldIds },
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
    const request = {
      name: values.name,
      moduleId,
      formUniqueId,
      fieldUniqueIds: fields
        .filter((field) => values.fieldUniqueIds.includes(field.uniqueId))
        .map((field) => field.uniqueId),
    }

    const savedUniqueId = templateUniqueId
      ? await updateMutation.mutateAsync({ templateUniqueId, request })
      : await createMutation.mutateAsync(request)

    onSaved(savedUniqueId)
    onClose()
  }

  return (
    <Dialog.Root open onOpenChange={(details) => (details.open ? null : onClose())} size={{ base: "full", md: "lg" }}>
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
                    Only the checked columns are saved. {selectedFieldIds.length} of {maxColumns || "—"} selected.
                  </Text>

                  <Stack gap={2}>
                    {fields.map((field) => {
                      const isSelected = selectedFieldIds.includes(field.uniqueId)
                      const isDisabled = !isSelected && hasReachedLimit

                      return (
                        <Checkbox.Root
                          key={field.uniqueId}
                          checked={isSelected}
                          disabled={isDisabled}
                          onCheckedChange={() => handleToggleField(field.uniqueId)}
                          cursor={isDisabled ? "not-allowed" : "pointer"}
                          minH="11"
                        >
                          <Checkbox.HiddenInput />
                          <Checkbox.Control />
                          <Checkbox.Label fontSize="sm" fontWeight="600">
                            {field.label}
                          </Checkbox.Label>
                        </Checkbox.Root>
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
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
