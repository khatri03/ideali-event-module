import { useEffect, useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "react-router-dom"
import {
  Box,
  Button,
  Field,
  Flex,
  Heading,
  Input,
  SimpleGrid,
  SkeletonText,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react"
import ReactSelect, { type MultiValue } from "react-select"
import { ArrowLeft, Save } from "lucide-react"
import { APP_ROUTES } from "@/utils/routes"
import { toaster } from "@/lib/toaster"
import { ConfirmDialog } from "@/components/common"
import {
  useDocumentCategory,
  useDocumentCategoryMembershipTypeOptions,
} from "../hooks/useDocumentCategories"
import {
  useCreateDocumentCategory,
  useUpdateDocumentCategory,
  useUploadDocuments,
} from "../hooks/useDocumentCategoryMutations"
import { DocumentUploadZone } from "./DocumentUploadZone"
import {
  documentCategoryFormSchema,
  type DocumentCategoryFormValues,
} from "../schemas/documentCategory.schemas"

interface DocumentCategoryFormProps {
  /** Present only when editing an existing category; absent for a brand new one. */
  uniqueId?: string
}

export function DocumentCategoryForm({ uniqueId }: DocumentCategoryFormProps) {
  const navigate = useNavigate()
  const isEditMode = Boolean(uniqueId)
  const categoryQuery = useDocumentCategory(uniqueId ?? "")
  const membershipTypesQuery = useDocumentCategoryMembershipTypeOptions()
  const createMutation = useCreateDocumentCategory()
  const updateMutation = useUpdateDocumentCategory()
  const uploadMutation = useUploadDocuments()
  const [stagedFiles, setStagedFiles] = useState<File[]>([])
  /**
   * Set once the category has actually been created. Create and upload are two calls, so if the upload
   * half fails we must not create a second category on retry - from here on the save half is an update.
   */
  const [createdUniqueId, setCreatedUniqueId] = useState<string | null>(null)
  const savedUniqueId = uniqueId ?? createdUniqueId
  const isSaving = createMutation.isPending || updateMutation.isPending || uploadMutation.isPending
  /** Holds the validated values while the confirmation dialog is open; the save happens on confirm. */
  const [pendingValues, setPendingValues] = useState<DocumentCategoryFormValues | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<DocumentCategoryFormValues>({
    resolver: zodResolver(documentCategoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      membershipTypeUniqueIds: [],
    },
  })

  // defaultValues only apply at mount and the fetch is necessarily async, so this is what prefills edit mode.
  useEffect(() => {
    const detail = categoryQuery.data
    if (!detail) {
      return
    }

    reset({
      name: detail.name,
      description: detail.description ?? "",
      membershipTypeUniqueIds: detail.membershipTypeUniqueIds,
    })
    // Keyed off the id rather than the object, which changes identity on every refetch and would
    // otherwise clobber in-progress edits after a background refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryQuery.data?.uniqueId, reset])

  const membershipTypeOptions = useMemo(
    () =>
      (membershipTypesQuery.data ?? []).map((option) => ({
        value: option.uniqueId,
        label: `${option.name} (${option.activeMemberCount})`,
      })),
    [membershipTypesQuery.data],
  )

  // Submit only validates and opens the confirmation; the save itself happens on confirm.
  function handleRequestSave(values: DocumentCategoryFormValues) {
    setPendingValues(values)
  }

  async function handleConfirmSave() {
    if (!pendingValues) {
      return
    }
    // handleSave swallows its own failures and navigates on success, so closing unconditionally is safe:
    // a success has already unmounted this, a failure leaves the toast and the relabelled retry button.
    await handleSave(pendingValues)
    setPendingValues(null)
  }

  async function handleSave(values: DocumentCategoryFormValues) {
    const payload = {
      name: values.name.trim(),
      description: values.description.trim() ? values.description.trim() : null,
      // The per-category download toggle is not exposed for now, so every save re-asserts the default.
      // The column and its server-side enforcement stay in place, ready if the control comes back.
      allowDownload: true,
      membershipTypeUniqueIds: values.membershipTypeUniqueIds,
    }

    try {
      let targetUniqueId = savedUniqueId

      if (targetUniqueId) {
        // Covers both a real edit and a retry after the upload half failed - resubmitting still applies
        // any field the organizer changed in between, rather than silently dropping it.
        await updateMutation.mutateAsync({ uniqueId: targetUniqueId, payload })
      } else {
        targetUniqueId = await createMutation.mutateAsync(payload)
        setCreatedUniqueId(targetUniqueId)
      }

      if (!targetUniqueId) {
        navigate(APP_ROUTES.documentCategories.list)
        return
      }

      if (stagedFiles.length > 0) {
        await uploadMutation.mutateAsync({ uniqueId: targetUniqueId, files: stagedFiles })
        setStagedFiles([])
      }

      navigate(APP_ROUTES.documentCategories.detail(targetUniqueId))
    } catch {
      // The mutation hooks already toast the reason. Staying put keeps the staged files intact so the
      // organizer can retry the upload without re-picking them, and without creating a duplicate.
    }
  }

  // A blocked submit is otherwise silent: the only signal is inline error text, easy to miss.
  function handleInvalidSubmit(fieldErrors: typeof errors) {
    const firstErrorMessage = Object.values(fieldErrors)[0]?.message
    toaster.create({
      type: "error",
      title: firstErrorMessage ?? "Fix the highlighted fields before saving.",
    })
  }

  if (isEditMode && categoryQuery.isLoading) {
    return (
      <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" boxShadow="card" p={6}>
        <SkeletonText noOfLines={5} />
      </Box>
    )
  }

  if (isEditMode && categoryQuery.isError) {
    return (
      <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
        <Text fontSize="sm" fontWeight="700" color="red.700">Failed to load this category.</Text>
      </Box>
    )
  }

  return (
    <Stack gap={5} w="full">
      <Flex align="center" gap={3}>
        <Button
          variant="outline"
          borderRadius="14px"
          minH="11"
          px={4}
          cursor="pointer"
          onClick={() => navigate(APP_ROUTES.documentCategories.list)}
        >
          <ArrowLeft size={16} />
          Back to categories
        </Button>
      </Flex>

      <Box
        as="form"
        onSubmit={handleSubmit(handleRequestSave, handleInvalidSubmit)}
        borderRadius="20px"
        border="1px solid"
        borderColor="border.subtle"
        bg="card.bg"
        boxShadow="card"
        p={{ base: 4, md: 6 }}
      >
        <Heading fontSize={{ base: "xl", md: "2xl" }} fontWeight="800" color="gray.900" mb={5}>
          {isEditMode ? "Edit category" : "New category"}
        </Heading>

        <Stack gap={5}>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
            <Field.Root invalid={Boolean(errors.name)}>
              <Field.Label fontWeight="700">
                Name <Text as="span" color="red.500">*</Text>
              </Field.Label>
              <Input {...register("name")} minH="11" borderRadius="14px" px={4} placeholder="Category name" />
              {errors.name ? <Field.ErrorText>{errors.name.message}</Field.ErrorText> : null}
            </Field.Root>

            <Field.Root invalid={Boolean(errors.membershipTypeUniqueIds)}>
              <Field.Label fontWeight="700">Membership types</Field.Label>
              <Controller
                control={control}
                name="membershipTypeUniqueIds"
                render={({ field }) => (
                  <Box w="full">
                    <ReactSelect
                      isMulti
                      options={membershipTypeOptions}
                      value={membershipTypeOptions.filter((option) => field.value.includes(option.value))}
                      onChange={(values: MultiValue<{ value: string; label: string }>) =>
                        field.onChange(values.map((option) => option.value))
                      }
                      placeholder={
                        membershipTypesQuery.isLoading ? "Loading..." : "All members (select to restrict)"
                      }
                      isLoading={membershipTypesQuery.isLoading}
                      closeMenuOnSelect={false}
                      isClearable
                    />
                  </Box>
                )}
              />
              {errors.membershipTypeUniqueIds ? (
                <Field.ErrorText>{errors.membershipTypeUniqueIds.message}</Field.ErrorText>
              ) : (
                <Field.HelperText fontSize="xs">
                  Leave empty to share with every member.
                </Field.HelperText>
              )}
            </Field.Root>
          </SimpleGrid>

          <Field.Root invalid={Boolean(errors.description)}>
            <Field.Label fontWeight="700">Description</Field.Label>
            <Textarea
              {...register("description")}
              borderRadius="14px"
              px={4}
              py={3}
              rows={3}
              placeholder="What is in this category?"
            />
            {errors.description ? <Field.ErrorText>{errors.description.message}</Field.ErrorText> : null}
          </Field.Root>

          {isEditMode ? null : (
            <Field.Root>
              <Field.Label fontWeight="700">Documents</Field.Label>
              <Text fontSize="xs" color="text.secondary" mb={2}>
                Optional. These upload as soon as the category is created.
              </Text>
              <Box w="full">
                <DocumentUploadZone
                  files={stagedFiles}
                  onFilesChange={setStagedFiles}
                  disabled={isSaving}
                />
              </Box>
            </Field.Root>
          )}

          <Flex justify="flex-end" pt={2}>
            <Button
              type="submit"
              borderRadius="14px"
              h="44px"
              px={7}
              w={{ base: "full", md: "auto" }}
              color="white"
              cursor="pointer"
              loading={isSaving}
              loadingText={uploadMutation.isPending ? "Uploading..." : "Saving..."}
              disabled={isSaving}
              style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
            >
              <Save size={16} />
              {isEditMode
                ? "Save changes"
                : createdUniqueId
                  ? "Retry upload"
                  : stagedFiles.length > 0
                    ? `Create and upload ${stagedFiles.length} file${stagedFiles.length === 1 ? "" : "s"}`
                    : "Create category"}
            </Button>
          </Flex>
        </Stack>
      </Box>

      {pendingValues ? (
        <ConfirmDialog
          title={
            isEditMode ? "Save changes?" : createdUniqueId ? "Retry upload?" : "Create this category?"
          }
          description={describeSave({
            isEditMode,
            isRetry: Boolean(createdUniqueId),
            fileCount: stagedFiles.length,
            membershipTypeCount: pendingValues.membershipTypeUniqueIds.length,
          })}
          confirmLabel={isEditMode ? "Save changes" : createdUniqueId ? "Retry upload" : "Create"}
          tone="primary"
          isPending={isSaving}
          onConfirm={() => void handleConfirmSave()}
          onClose={() => {
            if (!isSaving) {
              setPendingValues(null)
            }
          }}
        />
      ) : null}
    </Stack>
  )
}

/**
 * Spells out who will be able to see the result, because that is the consequence worth pausing over -
 * an empty membership selection quietly means "every member", which is easy to do by accident.
 */
function describeSave({
  isEditMode,
  isRetry,
  fileCount,
  membershipTypeCount,
}: {
  isEditMode: boolean
  isRetry: boolean
  fileCount: number
  membershipTypeCount: number
}): string {
  const audience =
    membershipTypeCount === 0
      ? "every member of your organization"
      : `members of the ${membershipTypeCount} selected membership type${membershipTypeCount === 1 ? "" : "s"}`

  if (isRetry) {
    return `${fileCount} file${fileCount === 1 ? "" : "s"} will be uploaded to this category, visible to ${audience}.`
  }

  if (isEditMode) {
    return `These changes will be saved. This category will be visible to ${audience}.`
  }

  const filePart =
    fileCount === 0
      ? "The category will be created"
      : `The category will be created and ${fileCount} file${fileCount === 1 ? "" : "s"} uploaded`

  return `${filePart}, visible to ${audience}.`
}
