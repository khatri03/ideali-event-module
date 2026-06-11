import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Badge,
  Box,
  Button,
  CloseButton,
  Dialog,
  Flex,
  Input,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Text,
  Textarea,
} from "@chakra-ui/react"
import { DndContext, PointerSensor, closestCenter, type DragEndEvent, useSensor, useSensors } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Eye, GripVertical, PencilLine, Plus, Trash2, X } from "lucide-react"
import ReactSelect, { type MultiValue, type StylesConfig } from "react-select"
import { extractApiError } from "@/utils/errors"
import {
  fetchCustomFormControls,
  fetchCustomFormListItems,
  fetchCustomFormPreview,
  type CustomFormControl,
  type CustomFormPreview,
} from "@/api/customForms"
import {
  fetchSessionWizardQuestions,
  updateSessionWizardQuestions,
  type SessionWizardQuestion,
  type SessionWizardQuestionOption,
} from "@/api/sessions"
import { StyledSelect } from "@/components/common/StyledSelect"
import { useSessionWizardActions } from "../hooks/useSessionWizardActions"
import { getSessionWizardStepNumber } from "../hooks/useSessionWizard"

interface SessionQuestionsStepProps {
  sessionId: string
}

type QuestionDraft = SessionWizardQuestion

interface SortableCardProps {
  id: string
  children: ReactNode
}

interface SelectOption {
  value: string
  label: string
}

function toSentenceCase(value: string | null | undefined) {
  const trimmed = value?.trim() || ""
  if (!trimmed) {
    return "Field"
  }

  const normalized = trimmed.toLowerCase()
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function createQuestionOptionDraft(index: number): SessionWizardQuestionOption {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `question-option-${Date.now()}-${index}`,
    displayText: `Option ${index + 1}`,
    value: `option-${index + 1}`,
    isDefault: index === 0,
  }
}

function createQuestionDraft(control: CustomFormControl): QuestionDraft {
  const options = control.hasOptions ? [createQuestionOptionDraft(0)] : []

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `session-question-${Date.now()}`,
    controlId: control.id,
    controlName: control.name,
    controlType: control.controlType,
    iconClass: control.iconClass,
    label: control.defaultLabel || control.name,
    placeHolder: control.canHavePlaceHolder ? control.defaultLabel || control.name : null,
    tooltip: null,
    required: false,
    requiredMessage: `${toSentenceCase(control.defaultLabel || control.name)} is required.`,
    acceptedFileTypes: [],
    minLength: null,
    maxLength: null,
    defaultValue: control.hasOptions ? options[0]?.value ?? null : null,
    displayOrder: 0,
    options,
  }
}

function cloneQuestionDraft(question: QuestionDraft): QuestionDraft {
  return {
    ...question,
    acceptedFileTypes: [...question.acceptedFileTypes],
    options: question.options.map((option) => ({ ...option })),
  }
}

function normalizeQuestionDraft(draft: QuestionDraft): QuestionDraft {
  const options = draft.options
    .map((option, index) => ({
      ...option,
      id: option.id || globalThis.crypto?.randomUUID?.() || `question-option-${Date.now()}-${index}`,
      displayText: option.displayText.trim(),
      value: option.value.trim(),
      isDefault: option.isDefault,
    }))
    .filter((option) => option.displayText.length > 0 || option.value.length > 0)

  return {
    ...draft,
    id: draft.id || globalThis.crypto?.randomUUID?.() || `session-question-${Date.now()}`,
    controlName: draft.controlName.trim(),
    controlType: draft.controlType.trim(),
    iconClass: draft.iconClass.trim(),
    label: draft.label.trim(),
    placeHolder: draft.placeHolder?.trim() || null,
    tooltip: draft.tooltip?.trim() || null,
    requiredMessage: draft.requiredMessage?.trim() || `${toSentenceCase(draft.label)} is required.`,
    acceptedFileTypes: draft.acceptedFileTypes.map((item) => item.trim()).filter((item) => item.length > 0),
    minLength: draft.minLength?.trim() || null,
    maxLength: draft.maxLength?.trim() || null,
    defaultValue: draft.defaultValue?.trim() || null,
    options,
  }
}

function SortableCard({ id, children }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <Box
      ref={setNodeRef}
      cursor="grab"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.72 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      {children}
    </Box>
  )
}

function SessionQuestionsSkeleton() {
  return (
    <Stack gap={4}>
      <Skeleton height="88px" borderRadius="20px" />
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={5}>
        <Skeleton height="240px" borderRadius="24px" />
        <Skeleton height="240px" borderRadius="24px" />
      </SimpleGrid>
    </Stack>
  )
}

function SessionQuestionsEmpty({ title, description }: { title: string; description: string }) {
  return (
    <Box border="1px dashed" borderColor="gray.200" bg="gray.50" borderRadius="20px" px={5} py={5}>
      <Text fontSize="sm" fontWeight="700" color="gray.900">
        {title}
      </Text>
      <Text mt={2} fontSize="sm" color="gray.600">
        {description}
      </Text>
    </Box>
  )
}

function SelectedFormCard({
  form,
  onRemove,
  onPreview,
}: {
  form: SelectOption
  onRemove: () => void
  onPreview: () => void
}) {
  return (
    <Flex
      align="center"
      gap={3}
      border="1px solid"
      borderColor="brand.200"
      bg="brand.50"
      borderRadius="18px"
      px={4}
      py={3}
    >
      <Flex align="center" gap={3} flex={1} minW={0}>
        <Box
          aria-label="Drag selected custom form"
          cursor="grab"
          color="brand.500"
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
        >
          <GripVertical size={16} />
        </Box>
        <Box minW={0} flex={1}>
          <Text fontSize="sm" fontWeight="700" color="gray.900" lineClamp={1}>
            {form.label}
          </Text>
          <Text fontSize="xs" color="gray.600">
            Attached custom form
          </Text>
        </Box>
      </Flex>

      <Flex gap={2}>
        <Button
          variant="outline"
          borderRadius="full"
          h="36px"
          w="36px"
          minW="36px"
          p={0}
          aria-label={`Preview ${form.label}`}
          onClick={onPreview}
        >
          <Eye size={14} />
        </Button>
        <Button
          variant="outline"
          colorPalette="red"
          borderRadius="full"
          h="36px"
          w="36px"
          minW="36px"
          p={0}
          aria-label={`Remove ${form.label}`}
          onClick={onRemove}
        >
          <X size={14} />
        </Button>
      </Flex>
    </Flex>
  )
}

function QuestionCard({
  question,
  onEdit,
  onDelete,
}: {
  question: QuestionDraft
  onEdit: () => void
  onDelete: () => void
}) {
  const hasOptions = question.options.length > 0

  return (
    <Box border="1px solid" borderColor="gray.200" bg="white" borderRadius="20px" px={4} py={4}>
      <Flex align="flex-start" justify="space-between" gap={4}>
        <Flex align="flex-start" gap={3} minW={0} flex={1}>
          <Box
            aria-label="Drag custom question"
            cursor="grab"
            color="gray.500"
            display="inline-flex"
            alignItems="center"
            justifyContent="center"
            pt={0.5}
          >
            <GripVertical size={16} />
          </Box>
          <Box minW={0} flex={1}>
            <Text fontSize="sm" fontWeight="800" color="gray.900" lineClamp={1}>
              {question.label}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {question.controlName} {hasOptions ? "• options enabled" : "• free-form"}
            </Text>
          </Box>
        </Flex>

        <Flex gap={2}>
          <Button
            variant="outline"
            borderRadius="full"
            h="36px"
            w="36px"
            minW="36px"
            p={0}
            aria-label={`Edit ${question.label}`}
            onClick={onEdit}
          >
            <PencilLine size={14} />
          </Button>
          <Button
            variant="outline"
            colorPalette="red"
            borderRadius="full"
            h="36px"
            w="36px"
            minW="36px"
            p={0}
            aria-label={`Delete ${question.label}`}
            onClick={onDelete}
          >
            <Trash2 size={14} />
          </Button>
        </Flex>
      </Flex>

      <SimpleGrid mt={4} columns={{ base: 1, md: 2 }} gap={3}>
        <Box>
          <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
            Required
          </Text>
          <Badge mt={1} colorPalette={question.required ? "green" : "gray"} variant="subtle" borderRadius="999px" px={3} py={1}>
            {question.required ? "Yes" : "No"}
          </Badge>
        </Box>

        <Box>
          <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
            Default
          </Text>
          <Text mt={1} fontSize="sm" color="gray.700" lineClamp={1}>
            {question.defaultValue || "Not set"}
          </Text>
        </Box>
      </SimpleGrid>
    </Box>
  )
}

function QuestionEditorModal({
  controls,
  draft,
  isEditing,
  onClose,
  onSubmit,
  onSubmitAndContinue,
  onSelectControl,
  onUpdateDraft,
}: {
  controls: CustomFormControl[]
  draft: QuestionDraft | null
  isEditing: boolean
  onClose: () => void
  onSubmit: (draft: QuestionDraft) => void
  onSubmitAndContinue: (draft: QuestionDraft) => void
  onSelectControl: (controlId: number) => void
  onUpdateDraft: (updater: (current: QuestionDraft) => QuestionDraft) => void
}) {
  const [localError, setLocalError] = useState("")

  if (!draft) {
    return null
  }

  const currentDraft = draft
  const selectedControl = controls.find((control) => control.id === draft.controlId) ?? controls[0] ?? null
  const canShowOptions = selectedControl?.hasOptions ?? currentDraft.options.length > 0

  function handleSubmit(keepOpen: boolean) {
    const normalized = normalizeQuestionDraft(currentDraft)

    if (!normalized.label) {
      setLocalError("Question label is required.")
      return
    }

    if (normalized.options.length === 0 && canShowOptions) {
      setLocalError("Add at least one option for this control.")
      return
    }

    if (normalized.options.some((option) => !option.displayText || !option.value)) {
      setLocalError("Option text and value are required.")
      return
    }

    setLocalError("")

    if (keepOpen) {
      onSubmitAndContinue(normalized)
      return
    }

    onSubmit(normalized)
  }

  return (
    <Dialog.Root open onOpenChange={(details) => !details.open && onClose()} size="lg">
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
                  {isEditing ? "Edit question" : "Add question"}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Configure the question that organizers will collect for this session.
                </Text>
              </Box>

              <Dialog.CloseTrigger asChild>
                <CloseButton aria-label="Close question modal" />
              </Dialog.CloseTrigger>
            </Flex>
          </Box>

          <Dialog.Body px={6} py={6} overflowY="auto">
            <Stack gap={5}>
              <Box>
                <Text fontSize="sm" fontWeight="700" color="gray.900" mb={2}>
                  Control
                </Text>
                <StyledSelect
                  options={controls.map((control) => ({
                    label: control.name,
                    value: String(control.id),
                  }))}
                  value={String(selectedControl?.id ?? draft.controlId ?? "")}
                  onChange={(value) => {
                    const parsed = Number(value)
                    if (Number.isFinite(parsed) && parsed > 0) {
                      onSelectControl(parsed)
                    }
                  }}
                  placeholder={controls.length > 0 ? "Select control" : "No controls available"}
                  disabled={controls.length === 0}
                />
              </Box>

              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <Box>
                  <Text fontSize="sm" fontWeight="700" color="gray.900" mb={2}>
                    Label
                  </Text>
                  <Input
                    value={draft.label}
                    onChange={(event) => {
                      setLocalError("")
                      onUpdateDraft((current) => ({ ...current, label: event.target.value }))
                    }}
                    placeholder="Question label"
                    borderRadius="14px"
                    h="44px"
                  />
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="700" color="gray.900" mb={2}>
                    Placeholder
                  </Text>
                  <Input
                    value={draft.placeHolder ?? ""}
                    onChange={(event) =>
                      onUpdateDraft((current) => ({ ...current, placeHolder: event.target.value || null }))
                    }
                    placeholder="Optional placeholder text"
                    borderRadius="14px"
                    h="44px"
                  disabled={!(selectedControl?.canHavePlaceHolder ?? false)}
                  />
                </Box>
              </SimpleGrid>

              <Box>
                <Text fontSize="sm" fontWeight="700" color="gray.900" mb={2}>
                  Tooltip
                </Text>
                <Textarea
                  value={draft.tooltip ?? ""}
                  onChange={(event) => onUpdateDraft((current) => ({ ...current, tooltip: event.target.value || null }))}
                  placeholder="Helpful guidance for organizers"
                  borderRadius="14px"
                  minH="100px"
                  resize="vertical"
                />
              </Box>

              <Flex align="center" justify="space-between" gap={4} wrap="wrap">
                <Box>
                  <Text fontSize="sm" fontWeight="700" color="gray.900">
                    Required
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Mark this question as mandatory.
                  </Text>
                </Box>
                <Switch.Root
                  checked={draft.required}
                  onCheckedChange={(details) => onUpdateDraft((current) => ({ ...current, required: details.checked }))}
                  colorPalette="brand"
                >
                  <Switch.HiddenInput />
                  <Switch.Control />
                </Switch.Root>
              </Flex>

              <Box>
                <Text fontSize="sm" fontWeight="700" color="gray.900" mb={2}>
                  Required message
                </Text>
                <Input
                  value={draft.requiredMessage ?? ""}
                  onChange={(event) =>
                    onUpdateDraft((current) => ({ ...current, requiredMessage: event.target.value || null }))
                  }
                  placeholder="Leave blank to auto-generate"
                  borderRadius="14px"
                  h="44px"
                />
              </Box>

              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <Box>
                  <Text fontSize="sm" fontWeight="700" color="gray.900" mb={2}>
                    Min length
                  </Text>
                  <Input
                    value={draft.minLength ?? ""}
                    onChange={(event) => onUpdateDraft((current) => ({ ...current, minLength: event.target.value || null }))}
                    placeholder="Optional minimum"
                    borderRadius="14px"
                    h="44px"
                  />
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="700" color="gray.900" mb={2}>
                    Max length
                  </Text>
                  <Input
                    value={draft.maxLength ?? ""}
                    onChange={(event) => onUpdateDraft((current) => ({ ...current, maxLength: event.target.value || null }))}
                    placeholder="Optional maximum"
                    borderRadius="14px"
                    h="44px"
                  />
                </Box>
              </SimpleGrid>

              <Box>
                <Text fontSize="sm" fontWeight="700" color="gray.900" mb={2}>
                  Default value
                </Text>
                <Input
                  value={draft.defaultValue ?? ""}
                  onChange={(event) => onUpdateDraft((current) => ({ ...current, defaultValue: event.target.value || null }))}
                  placeholder="Optional default value"
                  borderRadius="14px"
                  h="44px"
                />
              </Box>

              {canShowOptions ? (
                <Stack gap={3}>
                  <Flex align="center" justify="space-between" gap={3}>
                    <Box>
                      <Text fontSize="sm" fontWeight="700" color="gray.900">
                        Options
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        Configure answer choices for this control.
                      </Text>
                    </Box>
                    <Button
                      variant="outline"
                      borderRadius="full"
                      h="38px"
                      px={4}
                      onClick={() => {
                        onUpdateDraft((current) => ({
                          ...current,
                          options: [...current.options, createQuestionOptionDraft(current.options.length)],
                        }))
                      }}
                    >
                      Add option
                    </Button>
                  </Flex>

                  <Stack gap={3}>
                    {draft.options.map((option, index) => (
                      <Box key={option.id} border="1px solid" borderColor="gray.200" borderRadius="16px" p={4}>
                        <SimpleGrid columns={{ base: 1, md: 12 }} gap={3}>
                          <Box gridColumn={{ base: "span 1", md: "span 5" }}>
                            <Text fontSize="xs" fontWeight="700" color="gray.500" mb={2}>
                              Display text
                            </Text>
                            <Input
                              value={option.displayText}
                              onChange={(event) =>
                                onUpdateDraft((current) => ({
                                  ...current,
                                  options: current.options.map((candidate, candidateIndex) =>
                                    candidate.id === option.id
                                      ? { ...candidate, displayText: event.target.value }
                                      : candidateIndex === index
                                        ? { ...candidate, displayText: event.target.value }
                                        : candidate,
                                  ),
                                }))
                              }
                              placeholder="Option label"
                              borderRadius="14px"
                              h="44px"
                            />
                          </Box>

                          <Box gridColumn={{ base: "span 1", md: "span 5" }}>
                            <Text fontSize="xs" fontWeight="700" color="gray.500" mb={2}>
                              Value
                            </Text>
                            <Input
                              value={option.value}
                              onChange={(event) =>
                                onUpdateDraft((current) => ({
                                  ...current,
                                  options: current.options.map((candidate, candidateIndex) =>
                                    candidate.id === option.id
                                      ? { ...candidate, value: event.target.value }
                                      : candidateIndex === index
                                        ? { ...candidate, value: event.target.value }
                                        : candidate,
                                  ),
                                }))
                              }
                              placeholder="Stored value"
                              borderRadius="14px"
                              h="44px"
                            />
                          </Box>

                          <Flex
                            gridColumn={{ base: "span 1", md: "span 2" }}
                            align="end"
                            justify="space-between"
                            gap={2}
                          >
                            <Switch.Root
                              checked={option.isDefault}
                              onCheckedChange={(details) =>
                                onUpdateDraft((current) => ({
                                  ...current,
                                  options: current.options.map((candidate) => ({
                                    ...candidate,
                                    isDefault: candidate.id === option.id ? details.checked : false,
                                  })),
                                }))
                              }
                              colorPalette="brand"
                            >
                              <Switch.HiddenInput />
                              <Switch.Control />
                            </Switch.Root>

                            <Button
                              variant="outline"
                              colorPalette="red"
                              borderRadius="full"
                              h="36px"
                              w="36px"
                              minW="36px"
                              p={0}
                              aria-label={`Remove option ${index + 1}`}
                              onClick={() =>
                                onUpdateDraft((current) => ({
                                  ...current,
                                  options: current.options
                                    .filter((candidate) => candidate.id !== option.id)
                                    .map((candidate, candidateIndex) => ({
                                      ...candidate,
                                      isDefault: candidateIndex === 0 ? candidate.isDefault : candidate.isDefault,
                                    })),
                                }))
                              }
                            >
                              <Trash2 size={14} />
                            </Button>
                          </Flex>
                        </SimpleGrid>
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              ) : null}

              <Box>
                <Text fontSize="sm" fontWeight="700" color="gray.900" mb={2}>
                  Accepted file types
                </Text>
                <Input
                  value={draft.acceptedFileTypes.join(", ")}
                  onChange={(event) =>
                    onUpdateDraft((current) => ({
                      ...current,
                      acceptedFileTypes: event.target.value
                        .split(",")
                        .map((item) => item.trim())
                        .filter((item) => item.length > 0),
                    }))
                  }
                  placeholder="Image, PDF, docx..."
                  borderRadius="14px"
                  h="44px"
                  disabled={!(selectedControl?.controlType.toLowerCase() === "file" || selectedControl?.controlType.toLowerCase() === "upload")}
                />
              </Box>

              {localError ? (
                <Text fontSize="sm" color="red.500">
                  {localError}
                </Text>
              ) : null}
            </Stack>
          </Dialog.Body>

          <Box px={6} pb={6} pt={4} borderTop="1px solid" borderColor="gray.200">
            <Flex gap={3} justify="space-between" flexWrap="wrap">
              <Button
                variant="outline"
                borderRadius="14px"
                h="44px"
                px={6}
                minW={{ base: "full", md: "140px" }}
                onClick={onClose}
              >
                Cancel
              </Button>

              <Flex gap={3} flexWrap="wrap" ml="auto">
                <Button
                  variant="outline"
                  borderRadius="14px"
                  h="44px"
                  px={6}
                  minW={{ base: "full", md: "140px" }}
                  onClick={() => handleSubmit(true)}
                >
                  Add & Continue
                </Button>
                <Button
                  borderRadius="14px"
                  h="44px"
                  px={6}
                  minW={{ base: "full", md: "140px" }}
                  onClick={() => handleSubmit(false)}
                  color="white"
                  style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                >
                  Add & Close
                </Button>
              </Flex>
            </Flex>
          </Box>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

function CustomFormPreviewModal({
  preview,
  formName,
  onClose,
}: {
  preview: CustomFormPreview | undefined
  formName: string
  onClose: () => void
}) {
  return (
    <Dialog.Root open onOpenChange={(details) => !details.open && onClose()} size="lg">
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
                  {preview?.headerText || preview?.name || formName || "Custom form preview"}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  {preview?.description || "Read-only preview of the selected form."}
                </Text>
              </Box>
              <Dialog.CloseTrigger asChild>
                <CloseButton aria-label="Close custom form preview" />
              </Dialog.CloseTrigger>
            </Flex>
          </Box>

          <Dialog.Body px={6} py={6} overflowY="auto">
            {preview ? (
              <Stack gap={4}>
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                  <Box>
                    <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
                      Layout
                    </Text>
                    <Text mt={1} fontSize="sm" color="gray.700">
                      {preview.layoutColumn || 2} columns
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
                      Fields
                    </Text>
                    <Text mt={1} fontSize="sm" color="gray.700">
                      {preview.fields.length}
                    </Text>
                  </Box>
                </SimpleGrid>

                <Stack gap={4}>
                  {preview.fields.length > 0 ? (
                    preview.fields.map((field) => (
                      <Box key={field.uniqueId} border="1px solid" borderColor="gray.200" borderRadius="20px" p={4}>
                        <Text fontSize="sm" fontWeight="700" color="gray.900" mb={3}>
                          {field.controlLabel}
                          {field.isMandatory ? <Text as="span" color="red.500"> *</Text> : null}
                        </Text>

                        <Box border="1px solid" borderColor="gray.200" borderRadius="14px" bg="gray.50" px={4} py={3}>
                          <Text fontSize="sm" color="gray.600">
                            {field.formControl?.controlType || "text"} field preview
                          </Text>
                          <Text mt={1} fontSize="xs" color="gray.500">
                            {field.placeHolder || field.controlLabel}
                          </Text>
                        </Box>
                      </Box>
                    ))
                  ) : (
                    <SessionQuestionsEmpty
                      title="No fields"
                      description="This custom form does not contain any fields."
                    />
                  )}
                </Stack>
              </Stack>
            ) : (
              <SessionQuestionsEmpty
                title="Preview loading"
                description="We are loading the custom form preview."
              />
            )}
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

export function SessionQuestionsStep({ sessionId }: SessionQuestionsStepProps) {
  const queryClient = useQueryClient()
  const { setPrimaryAction, setPrimaryActionReady } = useSessionWizardActions()
  const [selectedCustomFormUniqueIds, setSelectedCustomFormUniqueIds] = useState<string[]>([])
  const [customQuestions, setCustomQuestions] = useState<QuestionDraft[]>([])
  const [customForms, setCustomForms] = useState<SelectOption[]>([])
  const [customFormControls, setCustomFormControls] = useState<CustomFormControl[]>([])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [previewCustomFormUniqueId, setPreviewCustomFormUniqueId] = useState("")
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [questionDraft, setQuestionDraft] = useState<QuestionDraft | null>(null)
  const [pendingQuestionRemoval, setPendingQuestionRemoval] = useState<{ id: string; label: string } | null>(null)
  const [pendingFormRemoval, setPendingFormRemoval] = useState<{ id: string; label: string } | null>(null)

  const selectedFormOptions = useMemo(
    () => customForms.filter((form) => selectedCustomFormUniqueIds.includes(form.value)),
    [customForms, selectedCustomFormUniqueIds],
  )

  const selectedCustomForms = selectedFormOptions

  const previewQuery = useQuery({
    queryKey: ["organizer", "custom-form", "preview", previewCustomFormUniqueId],
    queryFn: () => fetchCustomFormPreview(previewCustomFormUniqueId),
    enabled: Boolean(previewCustomFormUniqueId),
    retry: false,
  })

  const saveMutation = useMutation({
    mutationFn: (payload: { customFormUniqueIds: string[] | null; customQuestions: QuestionDraft[] | null }) =>
      updateSessionWizardQuestions(sessionId, payload, getSessionWizardStepNumber("questions")),
    onSuccess: async (data) => {
      queryClient.setQueryData(["sessions", "questions", sessionId], data)
      queryClient.setQueryData(["sessions", "wizard-progress", sessionId], (current: { stepNo?: number } | undefined) => ({
        stepNo: Math.max(current?.stepNo ?? 0, data.stepNo ?? 12),
      }))
      await queryClient.invalidateQueries({ queryKey: ["sessions", "review", sessionId] })
    },
    onSettled: () => {
      setPrimaryActionReady(true)
    },
  })

  const customFormSelectOptions = useMemo(
    () =>
      customForms.map((form) => ({
        value: form.value,
        label: form.label,
      })),
    [customForms],
  )

  const selectedFormSelectValues = useMemo(
    () =>
      selectedCustomFormUniqueIds
        .map((value) => customFormSelectOptions.find((option) => option.value === value))
        .filter((item): item is SelectOption => Boolean(item)),
    [customFormSelectOptions, selectedCustomFormUniqueIds],
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  useEffect(() => {
    if (!sessionId) {
      return
    }

    let isMounted = true

    async function loadQuestions() {
      setIsLoading(true)
      setError("")

      try {
        const [forms, controls, questions] = await Promise.all([
          queryClient.fetchQuery({
            queryKey: ["organizer", "custom-form", "list-items"],
            queryFn: fetchCustomFormListItems,
            retry: false,
          }),
          queryClient.fetchQuery({
            queryKey: ["organizer", "custom-form", "controls"],
            queryFn: fetchCustomFormControls,
            retry: false,
          }),
          queryClient.fetchQuery({
            queryKey: ["sessions", "questions", sessionId],
            queryFn: () => fetchSessionWizardQuestions(sessionId),
            retry: false,
          }),
        ])

        if (!isMounted) {
          return
        }

        const nextForms = forms ?? []
        const nextControls = controls ?? []
        const nextQuestions = questions

        setCustomForms(
          nextForms.map((form) => ({
            value: form.value,
            label: form.text,
          })),
        )
        setCustomFormControls(nextControls)
        setSelectedCustomFormUniqueIds(nextQuestions?.customFormUniqueIds ?? [])
        setCustomQuestions((nextQuestions?.customQuestions ?? []).map((question) => ({
          ...question,
          acceptedFileTypes: [...question.acceptedFileTypes],
          options: question.options.map((option) => ({ ...option })),
        })))
      } catch (loadError) {
        if (!isMounted) {
          return
        }

        setCustomForms([])
        setCustomFormControls([])
        setSelectedCustomFormUniqueIds([])
        setCustomQuestions([])
        setError(loadError instanceof Error ? loadError.message : "Unable to load session questions.")
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadQuestions()

    return () => {
      isMounted = false
    }
  }, [queryClient, sessionId])

  useEffect(() => {
    if (isLoading || !sessionId) {
      setPrimaryAction(null)
      setPrimaryActionReady(false)
      return
    }

    setPrimaryAction(async () => {
      setPrimaryActionReady(false)
      setError("")

      try {
        const normalizedQuestions = customQuestions.map(normalizeQuestionDraft).map((question, index) => ({
          ...question,
          displayOrder: index + 1,
        }))

        await saveMutation.mutateAsync({
          customFormUniqueIds: selectedCustomFormUniqueIds.length > 0 ? selectedCustomFormUniqueIds : null,
          customQuestions: normalizedQuestions.length > 0 ? normalizedQuestions : null,
        })
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Unable to save session questions.")
        throw saveError
      }
    })
    setPrimaryActionReady(true)

    return () => {
      setPrimaryAction(null)
      setPrimaryActionReady(true)
    }
  }, [
    customQuestions,
    isLoading,
    saveMutation,
    selectedCustomFormUniqueIds,
    sessionId,
    setPrimaryAction,
    setPrimaryActionReady,
  ])

  const previewForm = useMemo(
    () => selectedCustomForms.find((form) => form.value === previewCustomFormUniqueId),
    [previewCustomFormUniqueId, selectedCustomForms],
  )

  const saveError = saveMutation.error ? extractApiError(saveMutation.error) : ""

  function openQuestionEditor(questionId?: string) {
    if (questionId) {
      const existingQuestion = customQuestions.find((question) => question.id === questionId)

      if (!existingQuestion) {
        return
      }

      setEditingQuestionId(questionId)
      setQuestionDraft(cloneQuestionDraft(existingQuestion))
      setIsQuestionModalOpen(true)
      return
    }

    const initialControl = customFormControls[0]
    setEditingQuestionId(null)
    setQuestionDraft(initialControl ? createQuestionDraft(initialControl) : null)
    setIsQuestionModalOpen(true)
  }

  function closeQuestionEditor() {
    setIsQuestionModalOpen(false)
    setEditingQuestionId(null)
    setQuestionDraft(null)
  }

  function persistQuestionDraft(nextDraft: QuestionDraft, keepOpen: boolean) {
    const normalized = normalizeQuestionDraft(nextDraft)

    setCustomQuestions((current) => {
      if (editingQuestionId) {
        return current.map((question) =>
          question.id === editingQuestionId
            ? {
                ...normalized,
                id: editingQuestionId,
                displayOrder: question.displayOrder,
              }
            : question,
        )
      }

      return [
        ...current,
        {
          ...normalized,
          displayOrder: current.length + 1,
        },
      ]
    })

    if (keepOpen) {
      setEditingQuestionId(null)
      const selectedControl = customFormControls.find((control) => control.id === normalized.controlId)
      const nextControl = selectedControl ?? customFormControls[0]
      setQuestionDraft(nextControl ? createQuestionDraft(nextControl) : null)
      setIsQuestionModalOpen(true)
      return
    }

    closeQuestionEditor()
  }

  function requestQuestionRemoval(questionId: string) {
    const target = customQuestions.find((question) => question.id === questionId)
    if (!target) {
      return
    }

    setPendingQuestionRemoval({
      id: questionId,
      label: target.label || target.controlName,
    })
  }

  function confirmQuestionRemoval() {
    if (!pendingQuestionRemoval) {
      return
    }

    setCustomQuestions((current) =>
      current
        .filter((question) => question.id !== pendingQuestionRemoval.id)
        .map((question, index) => ({ ...question, displayOrder: index + 1 })),
    )
    setPendingQuestionRemoval(null)
  }

  function cancelQuestionRemoval() {
    setPendingQuestionRemoval(null)
  }

  function requestFormRemoval(formUniqueId: string) {
    const target = customForms.find((form) => form.value === formUniqueId)
    if (!target) {
      return
    }

    setPendingFormRemoval({
      id: formUniqueId,
      label: target.label,
    })
  }

  function confirmFormRemoval() {
    if (!pendingFormRemoval) {
      return
    }

    setSelectedCustomFormUniqueIds((current) => current.filter((value) => value !== pendingFormRemoval.id))
    if (previewCustomFormUniqueId === pendingFormRemoval.id) {
      setPreviewCustomFormUniqueId("")
    }
    setPendingFormRemoval(null)
  }

  function cancelFormRemoval() {
    setPendingFormRemoval(null)
  }

  function handleQuestionsDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    setCustomQuestions((current) => {
      const oldIndex = current.findIndex((question) => question.id === String(active.id))
      const newIndex = current.findIndex((question) => question.id === String(over.id))

      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
        return current
      }

      return arrayMove(current, oldIndex, newIndex).map((question, index) => ({
        ...question,
        displayOrder: index + 1,
      }))
    })
  }

  function handleSelectedFormsDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    setSelectedCustomFormUniqueIds((current) => {
      const oldIndex = current.indexOf(String(active.id))
      const newIndex = current.indexOf(String(over.id))

      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
        return current
      }

      return arrayMove(current, oldIndex, newIndex)
    })
  }

  function handleFormPreview(formUniqueId: string) {
    setPreviewCustomFormUniqueId(formUniqueId)
  }

  function onSelectChange(values: MultiValue<SelectOption>) {
    setSelectedCustomFormUniqueIds(values.map((item) => item.value))
    setError("")
  }

  const previewFormDetails = previewQuery.data ?? undefined

  if (!sessionId) {
    return (
      <SessionQuestionsEmpty
        title="Session id missing"
        description="Open this step from a valid session route."
      />
    )
  }

  return (
    <Stack gap={5}>
      <Box
        border="1px solid"
        borderColor="gray.200"
        borderRadius="20px"
        bg="linear-gradient(135deg, rgba(117,81,255,0.05) 0%, rgba(66,42,251,0.03) 100%)"
        p={{ base: 4, md: 5 }}
      >
        <Flex align="flex-start" justify="space-between" gap={4} wrap="wrap">
          <Box minW={0}>
            <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
              Questions
            </Text>
            <Text mt={2} fontSize={{ base: "sm", md: "md" }} fontWeight="700" color="gray.800">
              Attach custom forms and standalone questions that will be captured for this session.
            </Text>
          </Box>

          <Badge variant="subtle" colorPalette="brand" borderRadius="999px" px={3} py={1}>
            {selectedCustomFormUniqueIds.length} form{selectedCustomFormUniqueIds.length === 1 ? "" : "s"} selected
          </Badge>
        </Flex>
      </Box>

      {isLoading ? (
        <SessionQuestionsSkeleton />
      ) : (
        <Stack gap={5}>
          <Box border="1px solid" borderColor="gray.200" borderRadius="20px" p={{ base: 4, md: 5 }} bg="white">
            <Flex align="center" justify="space-between" gap={4} wrap="wrap">
              <Box>
                <Text fontSize="sm" fontWeight="700" color="gray.900">
                  Custom forms
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Use react-select to map one or more reusable forms to this session.
                </Text>
              </Box>

              <Button
                variant="outline"
                colorPalette="brand"
                borderRadius="full"
                h="38px"
                px={4}
                onClick={() => {
                  setPreviewCustomFormUniqueId(selectedCustomFormUniqueIds[0] ?? "")
                }}
                disabled={selectedCustomFormUniqueIds.length === 0}
              >
                Preview first form
              </Button>
            </Flex>

            <Box mt={4}>
              <ReactSelect
                isMulti
                options={customFormSelectOptions}
                value={selectedFormSelectValues}
                onChange={onSelectChange}
                placeholder={customForms.length > 0 ? "Select custom forms" : "No custom forms available"}
                isDisabled={customForms.length === 0}
                closeMenuOnSelect={false}
                styles={
                  {
                    control: (base, state) => ({
                      ...base,
                      minHeight: 44,
                      borderRadius: 14,
                      borderColor: state.isFocused ? "#7551FF" : "#E2E8F0",
                      boxShadow: state.isFocused ? "0 0 0 3px rgba(117, 81, 255, 0.15)" : "none",
                      backgroundColor: "#fff",
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 30,
                      borderRadius: 14,
                    }),
                    multiValue: (base) => ({
                      ...base,
                      borderRadius: 999,
                      backgroundColor: "#EEF2FF",
                    }),
                    multiValueLabel: (base) => ({
                      ...base,
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#1E293B",
                    }),
                    multiValueRemove: (base) => ({
                      ...base,
                      borderRadius: 999,
                      color: "#475569",
                      ":hover": {
                        backgroundColor: "#C7D2FE",
                        color: "#111827",
                      },
                    }),
                  } satisfies StylesConfig<SelectOption, true>
                }
              />
            </Box>

            {selectedCustomForms.length > 0 ? (
              <Box mt={4} border="1px solid" borderColor="brand.200" bg="brand.50" borderRadius="18px" p={4}>
                <Flex align="center" justify="space-between" gap={3}>
                  <Box>
                    <Text fontSize="sm" fontWeight="700" color="brand.900">
                      Selected custom forms
                    </Text>
                    <Text fontSize="xs" color="brand.700">
                      Drag cards to change their order.
                    </Text>
                  </Box>
                  <Badge colorPalette="brand" variant="subtle" borderRadius="999px" px={3} py={1}>
                    {selectedCustomForms.length}
                  </Badge>
                </Flex>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSelectedFormsDragEnd}>
                  <SortableContext items={selectedCustomFormUniqueIds} strategy={verticalListSortingStrategy}>
                    <Stack mt={4} gap={3}>
                      {selectedCustomForms.map((form) => (
                        <SortableCard key={form.value} id={form.value}>
                          <SelectedFormCard
                            form={form}
                            onPreview={() => handleFormPreview(form.value)}
                            onRemove={() => requestFormRemoval(form.value)}
                          />
                        </SortableCard>
                      ))}
                    </Stack>
                  </SortableContext>
                </DndContext>
              </Box>
            ) : (
              <Box mt={4}>
                <SessionQuestionsEmpty
                  title="No custom forms selected"
                  description="Choose forms above to attach them to the session."
                />
              </Box>
            )}
          </Box>

          <Box border="1px solid" borderColor="gray.200" borderRadius="20px" p={{ base: 4, md: 5 }} bg="white">
            <Flex align="center" justify="space-between" gap={4} wrap="wrap">
              <Box>
                <Text fontSize="sm" fontWeight="700" color="gray.900">
                  Standalone questions
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Add extra questions without forcing attendees through every custom form again.
                </Text>
              </Box>

              <Button
                variant="outline"
                colorPalette="brand"
                borderRadius="full"
                h="38px"
                w="38px"
                minW="38px"
                p={0}
                aria-label="Add question"
                onClick={() => openQuestionEditor()}
                disabled={customFormControls.length === 0}
              >
                <Plus size={16} />
              </Button>
            </Flex>

            {customQuestions.length > 0 ? (
              <Box mt={4}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleQuestionsDragEnd}>
                  <SortableContext items={customQuestions.map((question) => question.id)} strategy={verticalListSortingStrategy}>
                    <Stack gap={3}>
                      {customQuestions.map((question) => (
                        <SortableCard key={question.id} id={question.id}>
                          <QuestionCard
                            question={question}
                            onEdit={() => openQuestionEditor(question.id)}
                            onDelete={() => requestQuestionRemoval(question.id)}
                          />
                        </SortableCard>
                      ))}
                    </Stack>
                  </SortableContext>
                </DndContext>
              </Box>
            ) : (
              <Box mt={4}>
                <SessionQuestionsEmpty
                  title="No questions added"
                  description="Use the plus button to add standalone questions."
                />
              </Box>
            )}
          </Box>

          {error || saveError ? (
            <Text fontSize="sm" color="red.500">
              {error || saveError}
            </Text>
          ) : null}
        </Stack>
      )}

      {isQuestionModalOpen ? (
        <QuestionEditorModal
          key={questionDraft?.id ?? "question-modal"}
          controls={customFormControls}
          draft={questionDraft}
          isEditing={Boolean(editingQuestionId)}
          onClose={closeQuestionEditor}
          onSubmit={(draft) => {
            persistQuestionDraft(draft, false)
          }}
          onSubmitAndContinue={(draft) => {
            persistQuestionDraft(draft, true)
          }}
          onSelectControl={(controlId) => {
            const selectedControl = customFormControls.find((control) => control.id === controlId)
            setQuestionDraft(selectedControl ? createQuestionDraft(selectedControl) : null)
          }}
          onUpdateDraft={(updater) => {
            setQuestionDraft((current) => (current ? updater(current) : current))
          }}
        />
      ) : null}

      {pendingQuestionRemoval ? (
        <Dialog.Root open onOpenChange={(details) => !details.open && cancelQuestionRemoval()} size="sm">
          <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
          <Dialog.Positioner>
            <Dialog.Content bg="white" borderRadius="20px" maxW="480px" m="auto">
              <Box px={6} pt={6} pb={4}>
                <Text fontSize="lg" fontWeight="800" color="gray.900">
                  Delete question?
                </Text>
                <Text mt={2} fontSize="sm" color="gray.600">
                  {pendingQuestionRemoval.label}
                </Text>
              </Box>
              <Box px={6} pb={6}>
                <Flex gap={3} justify="space-between" wrap="wrap">
                  <Button variant="outline" borderRadius="14px" h="44px" px={6} onClick={cancelQuestionRemoval}>
                    Cancel
                  </Button>
                  <Button
                    borderRadius="14px"
                    h="44px"
                    px={6}
                    color="white"
                    style={{ background: "linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)" }}
                    onClick={confirmQuestionRemoval}
                  >
                    Delete
                  </Button>
                </Flex>
              </Box>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>
      ) : null}

      {pendingFormRemoval ? (
        <Dialog.Root open onOpenChange={(details) => !details.open && cancelFormRemoval()} size="sm">
          <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
          <Dialog.Positioner>
            <Dialog.Content bg="white" borderRadius="20px" maxW="480px" m="auto">
              <Box px={6} pt={6} pb={4}>
                <Text fontSize="lg" fontWeight="800" color="gray.900">
                  Remove custom form?
                </Text>
                <Text mt={2} fontSize="sm" color="gray.600">
                  {pendingFormRemoval.label}
                </Text>
              </Box>
              <Box px={6} pb={6}>
                <Flex gap={3} justify="space-between" wrap="wrap">
                  <Button variant="outline" borderRadius="14px" h="44px" px={6} onClick={cancelFormRemoval}>
                    Cancel
                  </Button>
                  <Button
                    borderRadius="14px"
                    h="44px"
                    px={6}
                    color="white"
                    style={{ background: "linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)" }}
                    onClick={confirmFormRemoval}
                  >
                    Remove
                  </Button>
                </Flex>
              </Box>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>
      ) : null}

      {previewCustomFormUniqueId ? (
        <CustomFormPreviewModal
          preview={previewFormDetails}
          formName={previewForm?.label ?? "Custom form preview"}
          onClose={() => setPreviewCustomFormUniqueId("")}
        />
      ) : null}
    </Stack>
  )
}
