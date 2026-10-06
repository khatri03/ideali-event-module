import { useState, type ReactNode } from "react"
import { useForm, useWatch, type DefaultValues } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "react-router-dom"
import { Box, Field, Flex, Grid, Stack, Text, Textarea } from "@chakra-ui/react"
import { format } from "date-fns"
import { FileText, Lock } from "lucide-react"
import { ConfirmDialog } from "@/components/common"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import { parseUtcDateTime } from "@/utils/utcDates"
import type { CustomInvoiceDetail, CustomInvoiceForEdit } from "@/api/customInvoices"
import { useCustomInvoiceSubmit } from "../hooks/useCustomInvoiceSubmit"
import { useEnabledCustomInvoiceModules } from "../hooks/useCustomInvoiceAuthoringOptions"
import {
  customInvoiceEditSchema,
  customInvoiceSchema,
  type CustomInvoiceFormValues,
} from "../schemas/customInvoice.schemas"
import { BackToInvoicesButton } from "./BackToInvoicesButton"
import { CustomInvoiceAboutSection } from "./CustomInvoiceAboutSection"
import { CustomInvoiceBuyerSection } from "./CustomInvoiceBuyerSection"
import { CustomInvoiceLineItems } from "./CustomInvoiceLineItems"
import { CustomInvoiceSummaryPanel } from "./CustomInvoiceSummaryPanel"

const NOTES_MAX = 2000

const EMPTY_VALUES: DefaultValues<CustomInvoiceFormValues> = {
  entityUniqueId: "",
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
  emailOnCreate: true,
}

function toDateInputValue(dueDateUtc: string): string {
  const parsed = parseUtcDateTime(dueDateUtc)
  return parsed ? format(parsed, "yyyy-MM-dd") : ""
}

function toFormValues(initial: CustomInvoiceForEdit): CustomInvoiceFormValues {
  return {
    moduleType: initial.moduleType,
    entityUniqueId: initial.entityUniqueId,
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
    emailOnCreate: false,
  }
}

function submitLabelFor(isEditMode: boolean, emailOnCreate: boolean): string {
  if (isEditMode) return "Save changes"
  return emailOnCreate ? "Create and email invoice" : "Create invoice"
}

function EditorCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box as="section" aria-label={title} borderRadius="20px" bg="card.bg" boxShadow="card" p={{ base: 4, md: 6 }}>
      <Stack gap={5}>
        <Text fontSize="md" fontWeight="800" color="text.primary">
          {title}
        </Text>
        {children}
      </Stack>
    </Box>
  )
}

function EditorHeader({ isEditMode, onBack }: { isEditMode: boolean; onBack: () => void }) {
  return (
    <Box borderRadius="20px" bg="brand.700" color="white" boxShadow="card" overflow="hidden">
      <Stack gap={{ base: 4, md: 5 }} px={{ base: 4, md: 7 }} py={{ base: 5, md: 6 }}>
        <BackToInvoicesButton onBack={onBack} tone="onBrand" />
        <Flex gap={4} align="center">
          <Flex w="12" h="12" flexShrink={0} align="center" justify="center" borderRadius="16px" bg="whiteAlpha.200" aria-hidden="true">
            <FileText size={22} />
          </Flex>
          <Stack gap={1} minW={0}>
            <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="900" lineHeight="1.1">
              {isEditMode ? "Edit custom invoice" : "New custom invoice"}
            </Text>
            <Text fontSize={{ base: "sm", md: "md" }} color="whiteAlpha.800">
              Bill a sponsor or partner for one of your events, memberships or campaigns.
            </Text>
          </Stack>
        </Flex>
      </Stack>
    </Box>
  )
}

function LockedBanner() {
  return (
    <Flex role="alert" gap={3} align="flex-start" p={4} borderRadius="16px" bg="status.warning.bg">
      <Box color="status.warning.fg" flexShrink={0} mt={0.5}>
        <Lock size={18} />
      </Box>
      <Text fontSize="sm" fontWeight="700" color="status.warning.fg">
        This invoice can no longer be edited.
      </Text>
    </Flex>
  )
}

function ErrorBanner({ error }: { error: unknown }) {
  return (
    <Box role="alert" p={4} borderRadius="16px" bg="status.error.bg">
      <Text fontSize="sm" fontWeight="700" color="status.error.fg">
        {extractApiError(error)}
      </Text>
    </Box>
  )
}

interface CustomInvoiceEditorProps {
  invoiceUniqueId?: string
  initial?: CustomInvoiceForEdit
  /** The saved invoice as its detail reports it, for the summary's status, link and delivery. Edit mode only. */
  detail?: CustomInvoiceDetail
}

/**
 * The two-pane custom-invoice editor, in create and edit modes: About, Bill to and Charges on the left, the
 * summary with the save action on the right. When the server reports the invoice is no longer editable
 * (`canEdit` false) every control is read-only behind a locked banner with no Save; the server enforces the
 * same lock.
 */
export function CustomInvoiceEditor({ invoiceUniqueId, initial, detail }: CustomInvoiceEditorProps) {
  const navigate = useNavigate()
  const isEditMode = Boolean(invoiceUniqueId)
  const isReadOnly = initial?.canEdit === false
  const { submit, isPending, error } = useCustomInvoiceSubmit({ invoiceUniqueId, initial, detail })
  const modulesQuery = useEnabledCustomInvoiceModules()
  const hasNoEnabledModules = !isEditMode && modulesQuery.isSuccess && modulesQuery.data.length === 0
  const [isDiscardOpen, setIsDiscardOpen] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CustomInvoiceFormValues>({
    resolver: zodResolver(initial ? customInvoiceEditSchema : customInvoiceSchema),
    defaultValues: initial ? toFormValues(initial) : EMPTY_VALUES,
  })
  const notes = useWatch({ control, name: "specialNotes" }) ?? ""
  const emailOnCreate = useWatch({ control, name: "emailOnCreate" })

  function leave() {
    navigate(invoiceUniqueId ? APP_ROUTES.customInvoices.detail(invoiceUniqueId) : APP_ROUTES.eventInvoices.list)
  }

  function handleCancel() {
    if (!isReadOnly && isDirty) {
      setIsDiscardOpen(true)
      return
    }
    leave()
  }

  return (
    <Stack gap={5} maxW="7xl" mx="auto" w="full" as="form" onSubmit={handleSubmit(submit)}>
      <EditorHeader isEditMode={isEditMode} onBack={handleCancel} />
      {isReadOnly ? <LockedBanner /> : null}
      {error ? <ErrorBanner error={error} /> : null}

      <Grid templateColumns={{ base: "1fr", lg: "minmax(0, 2fr) minmax(0, 1fr)" }} gap={5} alignItems="start">
        <Stack gap={5} minW={0}>
          <EditorCard title="About">
            <CustomInvoiceAboutSection
              control={control}
              register={register}
              errors={errors}
              setValue={setValue}
              initial={initial}
              isReadOnly={isReadOnly}
              hasNoEnabledModules={hasNoEnabledModules}
            />
          </EditorCard>
          <EditorCard title="Bill to">
            <CustomInvoiceBuyerSection register={register} errors={errors} setValue={setValue} disabled={isReadOnly} />
          </EditorCard>
          <EditorCard title="Charges">
            <CustomInvoiceLineItems control={control} register={register} errors={errors} disabled={isReadOnly} />
            <Field.Root invalid={Boolean(errors.specialNotes)}>
              <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
                Special notes
              </Field.Label>
              <Textarea borderRadius="12px" rows={4} resize="vertical" maxLength={NOTES_MAX} autoComplete="off" disabled={isReadOnly} {...register("specialNotes")} />
              <Field.HelperText>{`${notes.length}/${NOTES_MAX} characters`}</Field.HelperText>
              <Field.ErrorText>{errors.specialNotes?.message}</Field.ErrorText>
            </Field.Root>
          </EditorCard>
        </Stack>

        <CustomInvoiceSummaryPanel
          control={control}
          detail={detail}
          submitLabel={submitLabelFor(isEditMode, emailOnCreate)}
          isPending={isPending}
          canSubmit={!isReadOnly && !hasNoEnabledModules}
          cancelLabel={isReadOnly ? "Back to invoices" : "Cancel"}
          onCancel={handleCancel}
        />
      </Grid>

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
