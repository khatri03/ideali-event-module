import { Box, Button, CloseButton, Dialog, Flex, Input, Menu, Portal, Stack, Switch, Text, Textarea } from "@chakra-ui/react"
import { EditorContent } from "@tiptap/react"
import { useMemo, useState } from "react"
import { extractApiError } from "@/utils/errors"
import { EventThankYouEmailToolbar } from "./EventThankYouEmailStepPage.toolbar"
import { EVENT_THANK_YOU_EMAIL_CONTENT } from "./EventThankYouEmailStepPage.fields"
import { useEventThankYouEmailStep } from "./EventThankYouEmailStepPage.hooks"

function splitNotificationEmails(value: string) {
  return value
    .split(/[;,\n]/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function NotificationEmailTagsField({
  value,
  onChange,
}: {
  value: string
  onChange: (nextValue: string) => void
}) {
  const [draftValue, setDraftValue] = useState("")
  const tags = useMemo(() => splitNotificationEmails(value), [value])

  function commitTags(nextTags: string[]) {
    onChange(nextTags.join(", "))
  }

  function addDraftValue(rawValue: string) {
    const nextItems = splitNotificationEmails(rawValue)
    if (nextItems.length === 0) {
      return
    }

    const nextTags = [...tags]
    nextItems.forEach((item) => {
      if (!nextTags.includes(item)) {
        nextTags.push(item)
      }
    })

    commitTags(nextTags)
  }

  return (
    <Box
      border="1px solid"
      borderColor="gray.200"
      borderRadius="18px"
      bg="white"
      px={4}
      py={3}
      _focusWithin={{ borderColor: "cyan.400", boxShadow: "0 0 0 4px rgba(34, 211, 238, 0.12)" }}
    >
      <Flex flexWrap="wrap" align="center" gap={2}>
        {tags.map((tag) => (
          <Box
            key={tag}
            as="span"
            display="inline-flex"
            alignItems="center"
            gap={2}
            borderRadius="999px"
            border="1px solid"
            borderColor="cyan.200"
            bg="cyan.50"
            px={3}
            py={1}
            fontSize="xs"
            fontWeight="700"
            color="cyan.800"
          >
            <Text maxW="16rem" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
              {tag}
            </Text>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              h="11"
              minW="11"
              borderRadius="full"
              color="cyan.700"
              onClick={() => commitTags(tags.filter((item) => item !== tag))}
              aria-label={`Remove ${tag}`}
              title={`Remove ${tag}`}
            >
              ×
            </Button>
          </Box>
        ))}

        <Input
          variant="subtle"
          minW="220px"
          flex="1"
          fontSize="sm"
          color="gray.900"
          placeholder={tags.length > 0 ? "Add another email" : "email1@example.com"}
          value={draftValue}
          onChange={(event) => {
            const nextValue = event.target.value

            if (nextValue.includes(",") || nextValue.includes("\n")) {
              addDraftValue(nextValue)
              setDraftValue("")
              return
            }

            setDraftValue(nextValue)
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              addDraftValue(draftValue)
              setDraftValue("")
              return
            }

            if (event.key === "Backspace" && draftValue.length === 0 && tags.length > 0) {
              event.preventDefault()
              commitTags(tags.slice(0, -1))
            }
          }}
          onBlur={() => {
            addDraftValue(draftValue)
            setDraftValue("")
          }}
        />
      </Flex>
    </Box>
  )
}

function ThankYouEmailLoadingSkeleton() {
  return (
    <Stack gap={4}>
      <Box h="4" w="min(24rem, 92%)" borderRadius="full" bg="gray.200" />
      <Box h="12" borderRadius="24px" border="1px solid" borderColor="gray.200" bg="gray.100" />
      <Box h="18rem" borderRadius="28px" border="1px solid" borderColor="gray.200" bg="gray.100" />
    </Stack>
  )
}

function ThankYouEmailError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Box border="1px solid" borderColor="red.200" bg="red.50" px={4} py={3} borderRadius="18px" color="red.700">
      <Stack gap={2}>
        <Text fontSize="sm">{message}</Text>
        <Button type="button" size="sm" variant="outline" colorPalette="red" borderRadius="999px" onClick={onRetry}>
          Retry
        </Button>
      </Stack>
    </Box>
  )
}

export function EventThankYouEmailStepPage() {
  const {
    editor,
    error,
    isLoading,
    isSaving,
    notifyOrganizer,
    placeholders,
    otherNotificationEmails,
    saveSnippet,
    savedSnippets,
    reload,
    subjectEditor,
    validationErrors,
    setNotifyOrganizer,
    setOtherNotificationEmails,
  } = useEventThankYouEmailStep()
  const subjectVariableGroups = useMemo(
    () =>
      placeholders.map((group) => ({
        label: group.label.toUpperCase(),
        options: group.items.map((item) => ({
          label: item.displayText || item.placeHolderText,
          value: item.placeHolderText,
        })),
      })),
    [placeholders],
  )
  const [isSaveSnippetOpen, setIsSaveSnippetOpen] = useState(false)
  const [snippetName, setSnippetName] = useState("")
  const [snippetDescription, setSnippetDescription] = useState("")
  const [snippetDialogError, setSnippetDialogError] = useState("")
  const [isSavingSnippet, setIsSavingSnippet] = useState(false)

  function openSaveSnippetDialog() {
    setSnippetName("")
    setSnippetDescription("")
    setSnippetDialogError("")
    setIsSaveSnippetOpen(true)
  }

  async function handleSaveSnippet() {
    const trimmedName = snippetName.trim()
    const template = editor?.getHTML() ?? "<p></p>"

    if (!trimmedName) {
      setSnippetDialogError("Snippet name is required.")
      return
    }

    if (!editor) {
      setSnippetDialogError("Email body editor is not ready yet.")
      return
    }

    setIsSavingSnippet(true)
    setSnippetDialogError("")

    try {
      await saveSnippet({
        name: trimmedName,
        description: snippetDescription.trim(),
        template,
      })
      setIsSaveSnippetOpen(false)
    } catch (error) {
      setSnippetDialogError(extractApiError(error))
    } finally {
      setIsSavingSnippet(false)
    }
  }

  return (
    <Stack gap={5}>
      {error ? <ThankYouEmailError message={error} onRetry={reload} /> : null}

      <Stack gap={3}>
        <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" color="gray.900" letterSpacing="-0.03em">
          {EVENT_THANK_YOU_EMAIL_CONTENT.title}
        </Text>
        <Text fontSize={{ base: "sm", md: "md" }} color="gray.600" maxW="3xl" lineHeight="1.7">
          {EVENT_THANK_YOU_EMAIL_CONTENT.description}
        </Text>
      </Stack>

      <Stack gap={4} maxW="5xl">
        {isLoading ? (
          <ThankYouEmailLoadingSkeleton />
        ) : (
          <>
            <Box border="1px solid" borderColor="gray.200" borderRadius="24px" bg="gray.50" p={4} boxShadow="sm">
              <Flex direction={{ base: "column", lg: "row" }} gap={4} justify="space-between" align={{ lg: "flex-start" }}>
                <Stack gap={1}>
                  <Text fontSize="md" fontWeight="700" color="gray.900">
                    Notifications
                  </Text>
                </Stack>
                <Box ml={{ lg: "auto" }} w={{ base: "full", sm: "auto" }} minW={{ sm: "18rem" }}>
                  <Box border="1px solid" borderColor="gray.200" borderRadius="18px" bg="white" px={4} py={3} boxShadow="sm">
                    <Flex align="center" justify="space-between" gap={4}>
                      <Stack gap={0}>
                        <Text fontSize="sm" fontWeight="700" color="gray.800">
                          Notify Organizer
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          Send a copy to the organizer.
                        </Text>
                      </Stack>
                      <Switch.Root
                        checked={notifyOrganizer}
                        onCheckedChange={(details) => {
                          setNotifyOrganizer(Boolean(details.checked))
                        }}
                        colorPalette="brand"
                      >
                        <Switch.HiddenInput />
                        <Switch.Control />
                      </Switch.Root>
                    </Flex>
                  </Box>
                </Box>
              </Flex>

              <Box mt={4}>
                <Text mb={2} fontSize="sm" fontWeight="700" color="gray.800">
                  Other Notification Emails
                </Text>
                <NotificationEmailTagsField value={otherNotificationEmails} onChange={setOtherNotificationEmails} />
                <Text mt={2} fontSize="xs" color="gray.500">
                  Enter comma-separated email addresses for additional recipients.
                </Text>
              </Box>
            </Box>

            <Stack gap={2}>
              <Flex align="center" justify="space-between" gap={3} flexWrap="wrap">
                <Text fontSize="sm" fontWeight="700" color="gray.800">
                  Email Subject <Text as="span" color="red.500">*</Text>
                </Text>
                <Menu.Root positioning={{ placement: "bottom-start" }}>
                  <Menu.Trigger asChild>
                    <Button
                      type="button"
                      border="1px solid"
                      borderColor="gray.200"
                      borderRadius="12px"
                      bg="white"
                      px={3}
                      py={2}
                      minH="11"
                      minW="12rem"
                      fontSize="sm"
                      color="gray.700"
                      fontWeight="500"
                      justifyContent="space-between"
                      disabled={!subjectEditor}
                    >
                      Subject variable
                    </Button>
                  </Menu.Trigger>
                  <Portal>
                    <Menu.Positioner>
                      <Menu.Content
                        minW="20rem"
                        maxH="min(70vh, 28rem)"
                        overflowY="auto"
                        borderRadius="16px"
                        border="1px solid"
                        borderColor="gray.200"
                        boxShadow="0 16px 40px rgba(15, 23, 42, 0.12)"
                        p={1.5}
                        bg="white"
                      >
                        <Box px={3} pt={2} pb={1}>
                          <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
                            Subject variable
                          </Text>
                        </Box>

                        {subjectVariableGroups.map((group, index) => (
                          <Box key={group.label}>
                            {index > 0 ? <Menu.Separator borderColor="gray.100" mx={1} my={1} /> : null}
                            <Box px={3} pt={2} pb={1}>
                              <Box
                                display="flex"
                                alignItems="center"
                                w="full"
                                borderRadius="10px"
                                bg="gray.100"
                                border="1px solid"
                                borderColor="gray.200"
                                px={3}
                                py={2}
                              >
                                <Text
                                  fontSize="xs"
                                  fontWeight="700"
                                  color="gray.500"
                                  textTransform="uppercase"
                                  letterSpacing="0.08em"
                                >
                                  {group.label}
                                </Text>
                              </Box>
                            </Box>
                            {group.options.map((option) => (
                              <Menu.Item
                                key={option.value}
                                value={`subject:${group.label}:${option.value}`}
                                borderRadius="10px"
                                fontSize="sm"
                                fontWeight="500"
                                color="gray.700"
                                px={5}
                                py={2}
                                mx={1}
                                mb={0.5}
                                _hover={{ bg: "gray.50" }}
                                onClick={() => {
                                  const placeholder = placeholders
                                    .flatMap((entry) => entry.items)
                                    .find((item) => item.placeHolderText === option.value)

                                  subjectEditor
                                    ?.chain()
                                    .focus()
                                    .insertContent([
                                      {
                                        type: "eventPlaceholderToken",
                                        attrs: {
                                          label: placeholder?.displayText || option.value,
                                          token: option.value,
                                        },
                                      },
                                      { type: "text", text: " " },
                                    ])
                                    .run()
                                }}
                              >
                                {option.label}
                              </Menu.Item>
                            ))}
                          </Box>
                        ))}
                      </Menu.Content>
                    </Menu.Positioner>
                  </Portal>
                </Menu.Root>
              </Flex>

              <Box
                border="1px solid"
                borderColor="gray.200"
                borderRadius="20px"
                bg="white"
                px={4}
                py={3}
                _focusWithin={{ borderColor: "cyan.400", boxShadow: "0 0 0 4px rgba(34, 211, 238, 0.12)" }}
              >
                <EditorContent editor={subjectEditor} />
              </Box>
              {validationErrors.emailSubject ? (
                <Text fontSize="sm" fontWeight="600" color="red.500">
                  {validationErrors.emailSubject}
                </Text>
              ) : null}
            </Stack>

            <Stack gap={1}>
              <Text fontSize="sm" fontWeight="700" color="gray.800">
                Email Body <Text as="span" color="red.500">*</Text>
              </Text>
              <Text fontSize="xs" color="gray.500">
                Compose the thank you email body using the rich text toolbar.
              </Text>
            </Stack>

            <EventThankYouEmailToolbar
              editor={editor}
              placeholders={placeholders}
              savedSnippets={savedSnippets}
              onOpenSaveSnippet={openSaveSnippetDialog}
              onLoadSavedSnippet={(snippet) => {
                editor?.commands.setContent(snippet.template || "<p></p>", { emitUpdate: false })
              }}
              onInsertVariable={(placeholder) => {
                editor
                  ?.chain()
                  .focus()
                  .insertContent([
                    {
                      type: "eventPlaceholderToken",
                      attrs: { label: placeholder.label, token: placeholder.token },
                    },
                    { type: "text", text: " " },
                  ])
                  .run()
              }}
            />

            <Box
              border="1px solid"
              borderColor="gray.200"
              borderRadius="28px"
              bg="gray.50"
              p={4}
            >
              <style>{`
                .event-thank-you-email-subject-editor,
                .event-thank-you-email-body-editor {
                  outline: none;
                  color: var(--chakra-colors-gray-900);
                }

                .event-thank-you-email-subject-editor {
                  min-height: 1.75rem;
                  font-size: 0.95rem;
                  line-height: 1.6;
                }

                .event-thank-you-email-body-editor {
                  min-height: 18rem;
                  font-size: 0.95rem;
                  line-height: 1.75;
                }

                .event-thank-you-email-subject-editor p,
                .event-thank-you-email-body-editor p {
                  margin: 0 0 0.75rem;
                }

                .event-thank-you-email-subject-editor p.is-editor-empty:first-child::before,
                .event-thank-you-email-body-editor p.is-editor-empty:first-child::before {
                  content: attr(data-placeholder);
                  float: left;
                  color: var(--chakra-colors-gray-400);
                  pointer-events: none;
                  height: 0;
                }

                .event-thank-you-email-body-editor ul,
                .event-thank-you-email-body-editor ol {
                  padding-left: 1.25rem;
                  margin: 0 0 0.75rem;
                }

                .event-thank-you-email-body-editor blockquote {
                  border-left: 4px solid var(--chakra-colors-cyan-500);
                  margin: 0 0 0.75rem;
                  padding-left: 1rem;
                  color: var(--chakra-colors-gray-700);
                }

                .event-thank-you-email-body-editor h1,
                .event-thank-you-email-body-editor h2,
                .event-thank-you-email-body-editor h3 {
                  line-height: 1.2;
                  margin: 1rem 0 0.65rem;
                }

                .event-thank-you-email-body-editor h1 { font-size: 1.45rem; }
                .event-thank-you-email-body-editor h2 { font-size: 1.2rem; }
                .event-thank-you-email-body-editor h3 { font-size: 1.05rem; }
              `}</style>
              <EditorContent editor={editor} />
            </Box>

              {validationErrors.emailBody ? (
                <Text fontSize="sm" fontWeight="600" color="red.500">
                  {validationErrors.emailBody}
                </Text>
              ) : null}

            <Text fontSize="sm" color="gray.500">
              {EVENT_THANK_YOU_EMAIL_CONTENT.helper}
            </Text>
            {isSaving ? (
              <Text fontSize="sm" fontWeight="600" color="cyan.700">
                Saving thank you email...
              </Text>
            ) : null}
          </>
        )}
      </Stack>

      <Dialog.Root open={isSaveSnippetOpen} onOpenChange={(details) => !details.open && setIsSaveSnippetOpen(false)} size="lg">
        <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
        <Dialog.Positioner>
          {isSaveSnippetOpen ? (
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
                  <Box minW={0}>
                    <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
                      Save snippet
                    </Text>
                    <Text mt={2} fontSize="lg" fontWeight="800" color="gray.900">
                      Save the current email body as a reusable snippet
                    </Text>
                    <Text mt={1} fontSize="sm" color="gray.600" lineHeight="1.6">
                      We’ll store the current rich-text body, then you can load it again from the snippets menu.
                    </Text>
                  </Box>

                  <Dialog.CloseTrigger asChild>
                    <CloseButton aria-label="Close save snippet dialog" />
                  </Dialog.CloseTrigger>
                </Flex>
              </Box>

              <Dialog.Body px={6} py={6} overflowY="auto" bg="gray.50">
                <Stack gap={4}>
                  <Box border="1px solid" borderColor="gray.200" borderRadius="22px" bg="white" p={{ base: 4, md: 6 }} shadow="sm">
                    <Stack gap={4}>
                      <Box>
                        <Text fontSize="sm" fontWeight="700" color="gray.800">
                          Snippet name <Text as="span" color="red.500">*</Text>
                        </Text>
                        <Input
                          mt={2}
                          value={snippetName}
                          onChange={(event) => {
                            setSnippetName(event.target.value)
                            setSnippetDialogError("")
                          }}
                          placeholder="Welcome email body"
                          borderRadius="14px"
                          h="11"
                          borderColor="gray.200"
                        />
                      </Box>

                      <Box>
                        <Text fontSize="sm" fontWeight="700" color="gray.800">
                          Description
                        </Text>
                        <Textarea
                          mt={2}
                          value={snippetDescription}
                          onChange={(event) => {
                            setSnippetDescription(event.target.value)
                            setSnippetDialogError("")
                          }}
                          placeholder="Optional note about when to use this snippet"
                          borderRadius="14px"
                          minH="120px"
                          borderColor="gray.200"
                          resize="vertical"
                        />
                      </Box>

                      {snippetDialogError ? (
                        <Text fontSize="sm" fontWeight="600" color="red.500">
                          {snippetDialogError}
                        </Text>
                      ) : null}

                      <Flex justify="flex-end" gap={3} flexWrap="wrap">
                        <Button
                          type="button"
                          variant="outline"
                          borderRadius="999px"
                          onClick={() => setIsSaveSnippetOpen(false)}
                          disabled={isSavingSnippet}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          colorPalette="cyan"
                          borderRadius="999px"
                          onClick={() => void handleSaveSnippet()}
                          disabled={isSavingSnippet}
                          loading={isSavingSnippet}
                          loadingText="Saving..."
                        >
                          Save Snippet
                        </Button>
                      </Flex>
                    </Stack>
                  </Box>
                </Stack>
              </Dialog.Body>
            </Dialog.Content>
          ) : null}
        </Dialog.Positioner>
      </Dialog.Root>
    </Stack>
  )
}
