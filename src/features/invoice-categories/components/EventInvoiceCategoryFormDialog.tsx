import { useRef } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Box, Button, CloseButton, Dialog, Field, Flex, Input, Stack, Switch, Text } from "@chakra-ui/react"
import { extractApiError } from "@/utils/errors"
import type { EventInvoiceCategoryListItem } from "@/api/eventInvoiceCategories"
import {
  eventInvoiceCategoryFormSchema,
  type EventInvoiceCategoryFormValues,
} from "../schemas/eventInvoiceCategory.schemas"
import {
  useCreateEventInvoiceCategory,
  useUpdateEventInvoiceCategory,
} from "../hooks/useEventInvoiceCategoryMutations"

interface EventInvoiceCategoryFormDialogProps {
  /** Reactive visibility. The dialog stays mounted between opens so its close transition can run. */
  open: boolean
  /** Bumped by the caller on every open, so the form below remounts with a clean slate each time. */
  editSessionKey: number
  /** The row being edited, or null when creating. */
  category: EventInvoiceCategoryListItem | null
  onClose: () => void
}

/**
 * Owns only the dialog chrome. Kept mounted across opens so Ark's dialog machine runs its own close
 * transition before anything is torn down, rather than that cleanup being skipped mid-transition.
 */
export function EventInvoiceCategoryFormDialog({
  open,
  editSessionKey,
  category,
  onClose,
}: EventInvoiceCategoryFormDialogProps) {
  // The form remounts (via key) on each open, so the trap's default initial-focus target can resolve to a
  // detached node mid-transition. Anchoring focus to the always-mounted content keeps that node valid.
  const contentRef = useRef<HTMLDivElement>(null)
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(details) => (details.open ? null : onClose())}
      size={{ base: "full", md: "lg" }}
      initialFocusEl={() => contentRef.current}
    >
      <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
      <Dialog.Positioner p={{ base: 0, md: 4 }}>
        <Dialog.Content
          ref={contentRef}
          tabIndex={-1}
          bg="card.bg"
          borderRadius={{ base: 0, md: "24px" }}
          w="full"
          maxW={{ base: "full", md: "560px" }}
          minH={{ base: "100dvh", md: "auto" }}
          maxH={{ base: "100dvh", md: "calc(100dvh - 2rem)" }}
          alignSelf="center"
          mx="auto"
          overflow="hidden"
        >
          <Box px={{ base: 5, md: 6 }} pt={6} pb={4} borderBottom="1px solid" borderColor="border.subtle">
            <Flex align="flex-start" justify="space-between" gap={4}>
              <Dialog.Title fontSize="lg" fontWeight="800" color="text.primary">
                {category ? "Edit category" : "New category"}
              </Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton aria-label="Close category form" cursor="pointer" />
              </Dialog.CloseTrigger>
            </Flex>
          </Box>

          <EventInvoiceCategoryForm key={editSessionKey} category={category} onClose={onClose} />
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

interface EventInvoiceCategoryFormProps {
  category: EventInvoiceCategoryListItem | null
  onClose: () => void
}

/**
 * The form and its mutations - remounted fresh (via the parent's `key`) every time the dialog opens,
 * so a stale value or a previous attempt's error never survives into a later edit.
 */
function EventInvoiceCategoryForm({ category, onClose }: EventInvoiceCategoryFormProps) {
  const isEdit = category !== null
  const createMutation = useCreateEventInvoiceCategory()
  const updateMutation = useUpdateEventInvoiceCategory()

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<EventInvoiceCategoryFormValues>({
    resolver: zodResolver(eventInvoiceCategoryFormSchema),
    defaultValues: {
      name: category?.name ?? "",
      isActive: category?.isActive ?? true,
      displayOrder: category ? String(category.displayOrder) : "",
    },
  })

  const isActive = useWatch({ control, name: "isActive" })
  const isSaving = createMutation.isPending || updateMutation.isPending

  async function onSubmit(values: EventInvoiceCategoryFormValues) {
    const payload = {
      name: values.name.trim(),
      isActive: values.isActive,
      displayOrder: values.displayOrder.trim() === "" ? 0 : Number(values.displayOrder),
    }

    try {
      if (isEdit && category) {
        await updateMutation.mutateAsync({ uniqueId: category.uniqueId, payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      onClose()
    } catch {
      // Kept open so the error banner below stays on screen with the values that failed still in view.
    }
  }

  const saveError = createMutation.error ?? updateMutation.error

  return (
    <Dialog.Body as="form" onSubmit={handleSubmit(onSubmit)} px={{ base: 5, md: 6 }} py={5} overflowY="auto">
      <Stack gap={5}>
        <Field.Root invalid={Boolean(errors.name)}>
          <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
            Name
          </Field.Label>
          <Input
            {...register("name")}
            placeholder="e.g. Gold Sponsor, Booth, Programme Ad"
            minH="11"
            borderRadius="12px"
            autoComplete="off"
          />
          <Field.ErrorText>{errors.name?.message}</Field.ErrorText>
        </Field.Root>

        <Box borderRadius="16px" border="1px solid" borderColor="border.subtle" bg="app.bg" px={4} py={4}>
          <Flex align="center" justify="space-between" gap={4}>
            <Box>
              <Text fontSize="sm" fontWeight="700" color="text.primary">
                Active
              </Text>
              <Text fontSize="xs" color="text.secondary">
                Inactive categories stay on existing invoices but can't be picked for new ones.
              </Text>
            </Box>
            <Switch.Root
              colorPalette="brand"
              checked={isActive}
              onCheckedChange={(details) => setValue("isActive", details.checked, { shouldDirty: true })}
            >
              <Switch.HiddenInput aria-label="Active" />
              <Switch.Control cursor="pointer" />
            </Switch.Root>
          </Flex>
        </Box>

        <Field.Root invalid={Boolean(errors.displayOrder)}>
          <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
            Display order
          </Field.Label>
          <Input
            {...register("displayOrder")}
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            minH="11"
            borderRadius="12px"
          />
          <Field.HelperText>Optional. Lower numbers appear first in the picker.</Field.HelperText>
          <Field.ErrorText>{errors.displayOrder?.message}</Field.ErrorText>
        </Field.Root>

        {saveError ? (
          <Box role="alert" p={4} borderRadius="16px" bg="status.error.bg">
            <Text fontSize="sm" fontWeight="700" color="status.error.fg">
              {extractApiError(saveError)}
            </Text>
          </Box>
        ) : null}
      </Stack>

      <Flex pt={6} justify="flex-end" gap={3} direction={{ base: "column-reverse", md: "row" }}>
        <Button
          variant="outline"
          borderRadius="14px"
          minH="11"
          px={6}
          w={{ base: "full", md: "auto" }}
          cursor="pointer"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          colorPalette="brand"
          color="white"
          borderRadius="14px"
          minH="11"
          px={6}
          w={{ base: "full", md: "auto" }}
          disabled={isSaving}
          loading={isSaving}
          loadingText="Saving..."
          cursor={isSaving ? "not-allowed" : "pointer"}
          bg="brand.gradient"
        >
          {isEdit ? "Save changes" : "Create category"}
        </Button>
      </Flex>
    </Dialog.Body>
  )
}
