import { useId, useState, type FormEvent } from "react"
import { Badge, Box, Button, CloseButton, Dialog, Field, Flex, Heading, HStack, Stack, Text, Textarea } from "@chakra-ui/react"
import { format } from "date-fns"
import { ChevronDown, Plus } from "lucide-react"
import type { EventInvoiceNote } from "@/api/eventInvoices"
import { extractApiError } from "@/utils/errors"
import { EMPTY_VALUE } from "@/utils/format"
import { parseUtcDateTime } from "@/utils/utcDates"
import { useAddEventInvoiceNote } from "../hooks/useEventInvoices"

interface EventInvoiceNotesSectionProps {
  invoiceUniqueId: string
  notes: EventInvoiceNote[]
}

function formatTimestamp(value: string) {
  const parsed = parseUtcDateTime(value)
  return parsed ? format(parsed, "MMM d, yyyy h:mm a") : EMPTY_VALUE
}

export function EventInvoiceNotesSection({ invoiceUniqueId, notes }: EventInvoiceNotesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [hasOpenedDialog, setHasOpenedDialog] = useState(false)
  const [noteText, setNoteText] = useState("")
  const contentId = useId()
  const addNoteMutation = useAddEventInvoiceNote(invoiceUniqueId)

  const trimmedNote = noteText.trim()
  const showNotes = notes.length > 0

  async function handleSubmit(event: FormEvent<HTMLElement>) {
    event.preventDefault()
    if (!trimmedNote) return

    try {
      await addNoteMutation.mutateAsync(trimmedNote)
      setNoteText("")
      setIsDialogOpen(false)
      setIsExpanded(true)
    } catch {
      // The dialog stays open and shows the mutation error below.
    }
  }

  return (
    <>
      <Box border="1px solid" borderColor="border.subtle" borderRadius="20px" bg="card.bg" boxShadow="card" overflow="hidden">
        <Flex align={{ base: "stretch", md: "center" }} justify="space-between" direction={{ base: "column", md: "row" }} gap={3} px={{ base: 4, md: 6 }} py={4}>
          <Stack gap={1}>
            <Heading as="h2" fontSize="lg" fontWeight="800" color="text.primary">
              {showNotes ? (
                <Button
                  variant="ghost"
                  justifyContent="flex-start"
                  fontSize="lg"
                  fontWeight="800"
                  minH="11"
                  px={0}
                  color="text.primary"
                  cursor="pointer"
                  aria-expanded={isExpanded}
                  aria-controls={contentId}
                  onClick={() => setIsExpanded((value) => !value)}
                >
                  <ChevronDown
                    size={18}
                    aria-hidden="true"
                    style={{
                      transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                      transition: "transform 0.16s ease",
                    }}
                  />
                  Invoice notes
                  <Badge colorPalette="brand" variant="subtle" borderRadius="full">
                    {notes.length}
                  </Badge>
                </Button>
              ) : (
                "Invoice notes"
              )}
            </Heading>
            {showNotes ? null : (
              <Text fontSize="sm" color="text.secondary">
                No invoice notes yet.
              </Text>
            )}
          </Stack>

          <Button
            data-print-hide
            colorPalette="brand"
            color="white"
            borderRadius="14px"
            minH="11"
            px={4}
            w={{ base: "full", md: "auto" }}
            cursor="pointer"
            onClick={() => {
              setHasOpenedDialog(true)
              setIsDialogOpen(true)
            }}
            bg="brand.gradient"
          >
            <Plus size={16} />
            Add note
          </Button>
        </Flex>

        {showNotes && isExpanded ? (
          <Stack id={contentId} gap={3} px={{ base: 4, md: 6 }} pb={{ base: 4, md: 6 }}>
            {notes.map((note, index) => (
              <Box
                key={`${note.createdOnUtc}-${index}`}
                border="1px solid"
                borderColor="border.subtle"
                borderRadius="16px"
                bg="app.bg"
                p={4}
              >
                <Text fontSize="sm" color="text.primary" whiteSpace="pre-wrap">
                  {note.note}
                </Text>
                <HStack mt={3} gap={2} wrap="wrap" fontSize="xs" color="text.secondary">
                  <Text fontWeight="700">{note.createdBy}</Text>
                  <Text aria-hidden="true">•</Text>
                  <Text>{formatTimestamp(note.createdOnUtc)}</Text>
                </HStack>
              </Box>
            ))}
          </Stack>
        ) : null}
      </Box>

      {/*
        Mounted once opened and kept mounted after - toggling `open` instead of unmounting lets Ark's
        dialog machine run its close transition (releasing the scroll lock it set up) before anything
        is torn down, rather than skipping that cleanup because the component vanished mid-transition.
      */}
      {hasOpenedDialog ? (
        <Dialog.Root
          open={isDialogOpen}
          onOpenChange={(details) => (details.open ? null : setIsDialogOpen(false))}
          size={{ base: "full", md: "md" }}
        >
          <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
          <Dialog.Positioner p={{ base: 0, md: 4 }}>
            <Dialog.Content
              as="form"
              onSubmit={handleSubmit}
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
                    Add invoice note
                  </Dialog.Title>
                  <Dialog.CloseTrigger asChild>
                    <CloseButton aria-label="Close add note" cursor="pointer" />
                  </Dialog.CloseTrigger>
                </Flex>
              </Box>

              <Dialog.Body px={{ base: 5, md: 6 }} py={5}>
                <Field.Root invalid={noteText.length > 400}>
                  <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
                    Note
                  </Field.Label>
                  <Textarea
                    value={noteText}
                    maxLength={400}
                    minH="140px"
                    resize="vertical"
                    placeholder="Add a private note for this invoice"
                    onChange={(event) => setNoteText(event.target.value)}
                  />
                  <Field.HelperText>{noteText.length}/400 characters</Field.HelperText>
                </Field.Root>

                {addNoteMutation.error ? (
                  <Box role="alert" mt={4} p={4} borderRadius="16px" bg="status.error.bg">
                    <Text fontSize="sm" fontWeight="700" color="status.error.fg">
                      {extractApiError(addNoteMutation.error)}
                    </Text>
                  </Box>
                ) : null}

                <Flex pt={6} justify="flex-end" gap={3} direction={{ base: "column-reverse", md: "row" }}>
                  <Button
                    variant="outline"
                    borderRadius="14px"
                    minH="11"
                    px={6}
                    w={{ base: "full", md: "auto" }}
                    cursor="pointer"
                    onClick={() => setIsDialogOpen(false)}
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
                    disabled={!trimmedNote || addNoteMutation.isPending}
                    loading={addNoteMutation.isPending}
                    loadingText="Saving..."
                    cursor={!trimmedNote || addNoteMutation.isPending ? "not-allowed" : "pointer"}
                    bg="brand.gradient"
                  >
                    Save note
                  </Button>
                </Flex>
              </Dialog.Body>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>
      ) : null}
    </>
  )
}
