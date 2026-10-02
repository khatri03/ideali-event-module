import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate, useParams } from "react-router-dom"
import { Box, Flex, Grid, Input, Stack, Text, Textarea, chakra } from "@chakra-ui/react"
import { Field } from "@chakra-ui/react"
import { format } from "date-fns"
import { FileText, Lock } from "lucide-react"
import { ConfirmDialog, ErrorState, StyledSelect } from "@/components/common"
import { RequiredFieldLabel } from "@/features/custom-lists"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import { parseUtcDateTime, startOfLocalDayAsUtcIso } from "@/utils/utcDates"
import type { CustomInvoiceForEdit, CustomInvoiceWritePayload } from "@/api/customInvoices"
import { useEventInvoiceFilterOptions } from "../hooks/useEventInvoices"
import {
  useActiveInvoiceCategoryOptions,
  useCreateCustomInvoice,
  useUpdateCustomInvoice,
} from "../hooks/useCustomInvoiceMutations"
import { useCustomInvoiceForEdit } from "../hooks/useCustomInvoiceForEdit"
import { customInvoiceSchema, type CustomInvoiceFormValues } from "../schemas/customInvoice.schemas"
import { BackToInvoicesButton } from "../components/BackToInvoicesButton"
import { CustomInvoiceBuyerSection } from "../components/CustomInvoiceBuyerSection"
import { CustomInvoiceLineItems } from "../components/CustomInvoiceLineItems"
import { CustomInvoiceFormPageSkeleton } from "./CustomInvoiceFormPage.skeleton"

const NOTES_MAX = 2000

const FIELD_LABEL_PROPS = { fontSize: "sm", fontWeight: "700", color: "text.primary" } as const

const EMPTY_VALUES: CustomInvoiceFormValues = {
  eventUniqueId: "",
  categoryUniqueId: "",
  memberUniqueId: "",
  dueDate: "",
  companyName: "",
  firstName: "",
  middleName: "",
  lastName: "",
  cellPhone: "",
  email: "",
  specialNotes: "",
  lineItems: [{ description: "", amount: "" }],
}

function toDateInputValue(dueDateUtc: string): string {
  const parsed = parseUtcDateTime(dueDateUtc)
  return parsed ? format(parsed, "yyyy-MM-dd") : ""
}

function toFormValues(initial: CustomInvoiceForEdit): CustomInvoiceFormValues {
  return {
    eventUniqueId: initial.entityUniqueId,
    categoryUniqueId: initial.categoryUniqueId,
    memberUniqueId: "",
    dueDate: toDateInputValue(initial.dueDateUtc),
    companyName: initial.companyName,
    firstName: initial.firstName,
    middleName: initial.middleName,
    lastName: initial.lastName,
    cellPhone: initial.cellPhone,
    email: initial.email,
    specialNotes: initial.specialNotes,
    lineItems:
      initial.lineItems.length > 0
        ? initial.lineItems.map((line) => ({ description: line.description, amount: line.amount }))
        : [{ description: "", amount: "" }],
  }
}

interface CustomInvoiceFormProps {
  invoiceUniqueId?: string
  initial?: CustomInvoiceForEdit
}

/**
 * The custom-invoice authoring form, in create and edit modes. When the server reports the invoice is no
 * longer editable (`canEdit` false - any status past PendingPayment) every control is rendered read-only
 * behind a locked banner with no Save - the values still read, but nothing can be submitted (CINV-06); the
 * server enforces the same lock.
 */
function CustomInvoiceForm({ invoiceUniqueId, initial }: CustomInvoiceFormProps) {
  const navigate = useNavigate()
  const isEditMode = Boolean(invoiceUniqueId)
  const isReadOnly = Boolean(initial) && initial?.canEdit === false

  const eventsQuery = useEventInvoiceFilterOptions()
  const categoriesQuery = useActiveInvoiceCategoryOptions()
  const createMutation = useCreateCustomInvoice()
  const updateMutation = useUpdateCustomInvoice()
  const activeMutation = isEditMode ? updateMutation : createMutation

  const [isDiscardOpen, setIsDiscardOpen] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CustomInvoiceFormValues>({
    resolver: zodResolver(customInvoiceSchema),
    defaultValues: initial ? toFormValues(initial) : EMPTY_VALUES,
  })

  const eventOptions = (eventsQuery.data?.events ?? []).map((event) => ({ label: event.name, value: event.uniqueId }))
  const categoryOptions = (categoriesQuery.data ?? []).map((category) => ({ label: category.name, value: category.uniqueId }))
  const hasNoActiveCategories = categoriesQuery.isSuccess && categoryOptions.length === 0

  const notes = useWatch({ control, name: "specialNotes" }) ?? ""

  function leave() {
    navigate(isEditMode && invoiceUniqueId ? APP_ROUTES.customInvoices.detail(invoiceUniqueId) : APP_ROUTES.eventInvoices.list)
  }

  function handleCancel() {
    if (!isReadOnly && isDirty) {
      setIsDiscardOpen(true)
      return
    }
    leave()
  }

  async function onSubmit(values: CustomInvoiceFormValues) {
    // What an invoice bills is fixed at creation, so an edit repeats the stored binding rather than the picker.
    const payload: CustomInvoiceWritePayload = {
      moduleType: initial?.moduleType ?? "Event",
      entityUniqueId: initial ? initial.entityUniqueId : values.eventUniqueId,
      categoryUniqueId: values.categoryUniqueId,
      memberUniqueId: values.memberUniqueId ? values.memberUniqueId : null,
      dueDateUtc: startOfLocalDayAsUtcIso(values.dueDate) ?? "",
      companyName: values.companyName,
      firstName: values.firstName,
      middleName: values.middleName,
      lastName: values.lastName,
      cellPhone: values.cellPhone,
      email: values.email,
      specialNotes: values.specialNotes,
      lineItems: values.lineItems.map((line) => ({ description: line.description, amount: line.amount })),
    }

    try {
      if (isEditMode && invoiceUniqueId) {
        await updateMutation.mutateAsync({ invoiceUniqueId, payload })
        navigate(APP_ROUTES.customInvoices.detail(invoiceUniqueId))
      } else {
        const newInvoiceId = await createMutation.mutateAsync(payload)
        navigate(newInvoiceId ? APP_ROUTES.customInvoices.detail(newInvoiceId) : APP_ROUTES.eventInvoices.list)
      }
    } catch {
      // Kept on the page so the banner stays visible with the entered values still in view.
    }
  }

  return (
    <Stack gap={5} maxW="4xl" mx="auto" as="form" onSubmit={handleSubmit(onSubmit)}>
      <Box borderRadius="20px" bg="brand.700" color="white" boxShadow="card" overflow="hidden">
        <Stack gap={{ base: 4, md: 5 }} px={{ base: 4, md: 7 }} py={{ base: 5, md: 6 }}>
          <BackToInvoicesButton onBack={handleCancel} tone="onBrand" />
          <Flex gap={4} align="center">
            <Flex w="12" h="12" flexShrink={0} align="center" justify="center" borderRadius="16px" bg="whiteAlpha.200" aria-hidden="true">
              <FileText size={22} />
            </Flex>
            <Stack gap={1} minW={0}>
              <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="900" lineHeight="1.1">
                {isEditMode ? "Edit custom invoice" : "New custom invoice"}
              </Text>
              <Text fontSize={{ base: "sm", md: "md" }} color="whiteAlpha.800">
                Bill a sponsor or partner against one of your events.
              </Text>
            </Stack>
          </Flex>
        </Stack>
      </Box>

      {isReadOnly ? (
        <Flex role="alert" gap={3} align="flex-start" p={4} borderRadius="16px" bg="status.warning.bg">
          <Box color="status.warning.fg" flexShrink={0} mt={0.5}>
            <Lock size={18} />
          </Box>
          <Text fontSize="sm" fontWeight="700" color="status.warning.fg">
            This invoice can no longer be edited.
          </Text>
        </Flex>
      ) : null}

      {activeMutation.isError ? (
        <Box role="alert" p={4} borderRadius="16px" bg="status.error.bg">
          <Text fontSize="sm" fontWeight="700" color="status.error.fg">
            {extractApiError(activeMutation.error)}
          </Text>
        </Box>
      ) : null}

      <Box borderRadius="20px" bg="card.bg" boxShadow="card" p={{ base: 4, md: 6 }}>
        <Stack gap={5}>
          <Text fontSize="md" fontWeight="800" color="text.primary">
            Invoice basics
          </Text>

          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
            <Field.Root invalid={Boolean(errors.eventUniqueId)}>
              <RequiredFieldLabel>Event</RequiredFieldLabel>
              <Controller
                control={control}
                name="eventUniqueId"
                render={({ field }) => (
                  <StyledSelect
                    options={eventOptions}
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isEditMode || isReadOnly || eventsQuery.isLoading}
                    placeholder={eventsQuery.isLoading ? "Loading events..." : "Select an event"}
                    ariaLabel="Event"
                  />
                )}
              />
              <Field.ErrorText>{errors.eventUniqueId?.message}</Field.ErrorText>
            </Field.Root>

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
        </Stack>
      </Box>

      <Box borderRadius="20px" bg="card.bg" boxShadow="card" p={{ base: 4, md: 6 }}>
        <Stack gap={5}>
          <Text fontSize="md" fontWeight="800" color="text.primary">
            Buyer
          </Text>
          <CustomInvoiceBuyerSection register={register} errors={errors} setValue={setValue} disabled={isReadOnly} />
        </Stack>
      </Box>

      <Box borderRadius="20px" bg="card.bg" boxShadow="card" p={{ base: 4, md: 6 }}>
        <Stack gap={5}>
          <Text fontSize="md" fontWeight="800" color="text.primary">
            Line items
          </Text>
          <CustomInvoiceLineItems control={control} register={register} errors={errors} disabled={isReadOnly} />
        </Stack>
      </Box>

      <Box borderRadius="20px" bg="card.bg" boxShadow="card" p={{ base: 4, md: 6 }}>
        <Field.Root invalid={Boolean(errors.specialNotes)}>
          <Field.Label {...FIELD_LABEL_PROPS}>Special notes</Field.Label>
          <Textarea
            borderRadius="12px"
            rows={4}
            resize="vertical"
            maxLength={NOTES_MAX}
            autoComplete="off"
            disabled={isReadOnly}
            {...register("specialNotes")}
          />
          <Field.HelperText>{`${notes.length}/${NOTES_MAX} characters`}</Field.HelperText>
          <Field.ErrorText>{errors.specialNotes?.message}</Field.ErrorText>
        </Field.Root>
      </Box>

      <Flex gap={3} justify="flex-end" direction={{ base: "column-reverse", md: "row" }}>
        <chakra.button
          type="button"
          onClick={handleCancel}
          minH="11"
          px={6}
          borderRadius="14px"
          border="1px solid"
          borderColor="border.subtle"
          bg="transparent"
          fontWeight="700"
          color="text.primary"
          cursor="pointer"
          w={{ base: "full", md: "auto" }}
          _hover={{ bg: "app.bg" }}
        >
          {isReadOnly ? "Back to invoices" : "Cancel"}
        </chakra.button>
        {isReadOnly ? null : (
          <chakra.button
            type="submit"
            minH="11"
            px={8}
            borderRadius="14px"
            bg="brand.gradient"
            color="white"
            fontWeight="800"
            w={{ base: "full", md: "auto" }}
            cursor={activeMutation.isPending ? "not-allowed" : "pointer"}
            opacity={activeMutation.isPending ? 0.7 : 1}
            disabled={activeMutation.isPending}
          >
            {activeMutation.isPending ? "Saving..." : "Save invoice"}
          </chakra.button>
        )}
      </Flex>

      {isDiscardOpen ? (
        <ConfirmDialog
          title="Discard unsaved changes?"
          description={<Text>Your edits to this invoice have not been saved. Leaving now discards them.</Text>}
          confirmLabel="Discard changes"
          tone="destructive"
          isPending={false}
          onConfirm={leave}
          onClose={() => setIsDiscardOpen(false)}
        />
      ) : null}
    </Stack>
  )
}

/**
 * The routed entry point. In edit mode it loads the invoice first - showing the page skeleton while it
 * arrives and a retryable error state if it fails - then hands the resolved values to the form; in create
 * mode it renders the empty form straight away.
 */
export function CustomInvoiceFormPage() {
  const navigate = useNavigate()
  const { invoiceUniqueId } = useParams<{ invoiceUniqueId: string }>()
  const editQuery = useCustomInvoiceForEdit(invoiceUniqueId)

  if (invoiceUniqueId) {
    if (editQuery.isLoading) {
      return <CustomInvoiceFormPageSkeleton />
    }
    if (editQuery.isError || !editQuery.data) {
      return (
        <Stack gap={5} maxW="4xl" mx="auto">
          <BackToInvoicesButton onBack={() => navigate(APP_ROUTES.eventInvoices.list)} />
          <ErrorState
            title="This invoice could not be loaded"
            message="Something went wrong loading the invoice for editing. Try again in a moment."
            onRetry={() => editQuery.refetch()}
            isRetrying={editQuery.isFetching}
          />
        </Stack>
      )
    }
    return <CustomInvoiceForm invoiceUniqueId={invoiceUniqueId} initial={editQuery.data} />
  }

  return <CustomInvoiceForm />
}
