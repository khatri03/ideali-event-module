import { useEffect, useMemo, useState } from "react"
import { useEditor } from "@tiptap/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { Color, TextStyle } from "@tiptap/extension-text-style"
import Link from "@tiptap/extension-link"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import { extractApiError } from "@/utils/errors"
import {
  fetchEventEmailTemplatePlaceHolders,
  fetchEventWizardThankYouEmail,
  updateEventWizardThankYouEmail,
  type EventEmailPlaceholderGroup,
  type EventThankYouEmailResponse,
} from "@/api/events"
import { useEventWizardActions } from "../../hooks/useEventWizardActions"
import { EVENT_THANK_YOU_EMAIL_CONTENT, EVENT_THANK_YOU_EMAIL_STEP_NUMBER } from "./EventThankYouEmailStepPage.fields"
import {
  EventPlaceholderTokenExtension,
  FontSizeExtension,
  LineHeightExtension,
} from "./EventThankYouEmailStepPage.extensions"
import { getPlaceholderLabel } from "./EventThankYouEmailStepPage.toolbar.helpers"

export interface EventThankYouEmailStepState {
  editor: ReturnType<typeof useEditor> | null
  subjectEditor: ReturnType<typeof useEditor> | null
  error: string
  isLoading: boolean
  isSaving: boolean
  validationErrors: {
    emailBody?: string
    emailSubject?: string
  }
  notifyOrganizer: boolean
  otherNotificationEmails: string
  setNotifyOrganizer: (value: boolean) => void
  setOtherNotificationEmails: (value: string) => void
  reload: () => void
  placeholders: EventEmailPlaceholderGroup[]
}

function hasMeaningfulEditorContent(editor: ReturnType<typeof useEditor> | null) {
  if (!editor) {
    return false
  }

  return !editor.isEmpty && editor.getText().trim().length > 0
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function buildPlaceholderLookup(placeholders: EventEmailPlaceholderGroup[]) {
  const lookup = new Map<string, { label: string; token: string }>()

  placeholders.forEach((group) => {
    group.items.forEach((item) => {
      const token = item.placeHolderText
      const label = item.displayText || getPlaceholderLabel(token) || token
      lookup.set(token.trim().toLowerCase(), { label, token })
      lookup.set(label.trim().toLowerCase(), { label, token })
      lookup.set(getPlaceholderLabel(token).trim().toLowerCase(), { label, token })
    })
  })

  return lookup
}

function escapeRegExp(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("^", "\\^")
    .replaceAll("$", "\\$")
    .replaceAll(".", "\\.")
    .replaceAll("|", "\\|")
    .replaceAll("?", "\\?")
    .replaceAll("*", "\\*")
    .replaceAll("+", "\\+")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}")
}

function normalizeSubjectTemplateText(template: string, placeholders: EventEmailPlaceholderGroup[]) {
  const rawValue = template.trim()
  if (!rawValue) {
    return ""
  }

  const lookup = buildPlaceholderLookup(placeholders)
  const plainText = /<[^>]+>/.test(rawValue)
    ? (() => {
        const container = document.createElement("div")
        container.innerHTML = rawValue
        return container.textContent || ""
      })()
    : rawValue

  const tokenPattern = /\{\{[^}]+\}\}/g
  const placeholderLabels = Array.from(lookup.values())
    .map((item) => item.label)
    .filter((item, index, array) => array.indexOf(item) === index)
    .sort((a, b) => b.length - a.length)
    .map((item) => escapeRegExp(item))

  const labelPattern = placeholderLabels.length > 0 ? `|${placeholderLabels.join("|")}` : ""
  const matcher = new RegExp(`(${tokenPattern.source}${labelPattern})`, "gi")

  return plainText.replace(matcher, (match) => {
    const normalized = match.trim().toLowerCase()
    return lookup.get(normalized)?.token || match
  })
}

function buildSubjectEditorHtml(template: string, placeholders: EventEmailPlaceholderGroup[]) {
  const normalizedText = normalizeSubjectTemplateText(template, placeholders)
  if (!normalizedText) {
    return "<p></p>"
  }

  const lookup = buildPlaceholderLookup(placeholders)
  const segments = normalizedText.split(/(\{\{[^}]+\}\})/g)

  const html = segments
    .map((segment) => {
      if (!segment) {
        return ""
      }

      const token = segment.trim()
      const placeholder = lookup.get(token.toLowerCase())
      if (placeholder) {
        return [
          "<span",
          ` data-placeholder-label="${escapeHtml(placeholder.label)}"`,
          ` data-placeholder-token="${escapeHtml(placeholder.token)}"`,
          ' contenteditable="false"',
          ` title="${escapeHtml(placeholder.label)}"`,
          `>${escapeHtml(placeholder.label)}</span>`,
        ].join("")
      }

      return escapeHtml(segment).replace(/\n/g, "<br />")
    })
    .join("")

  return `<p>${html}</p>`
}

function getPlainTextTemplate(editor: ReturnType<typeof useEditor> | null, fallback: string) {
  if (!editor) {
    return fallback
  }

  return editor
    .getText({ blockSeparator: " " })
    .replace(/\s+/g, " ")
    .trim()
}

function validateThankYouEmailStep(subjectEditor: ReturnType<typeof useEditor> | null, editor: ReturnType<typeof useEditor> | null) {
  return {
    emailSubject: hasMeaningfulEditorContent(subjectEditor) ? "" : "Email subject is required.",
    emailBody: hasMeaningfulEditorContent(editor) ? "" : "Email body is required.",
  }
}

export function useEventThankYouEmailStep(): EventThankYouEmailStepState {
  const { eventId } = useParams<{ eventId?: string }>()
  const currentEventId = eventId ?? ""
  const queryClient = useQueryClient()
  const { setPrimaryAction, setSkipAction, setPrimaryActionReady, setPrimaryActionEnabled } = useEventWizardActions()
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{ emailBody?: string; emailSubject?: string }>({})
  const [notifyOrganizerOverride, setNotifyOrganizerOverride] = useState<boolean | null>(null)
  const [otherNotificationEmailsOverride, setOtherNotificationEmailsOverride] = useState<string | null>(null)

  const thankYouEmailQuery = useQuery<EventThankYouEmailResponse>({
    queryKey: ["events", "wizard-draft", currentEventId, "thank-you-email"],
    queryFn: () => {
      if (!currentEventId) {
        throw new Error("Event id is required.")
      }

      return fetchEventWizardThankYouEmail(currentEventId)
    },
    enabled: !!currentEventId,
    retry: false,
  })

  const placeholdersQuery = useQuery({
    queryKey: ["events", "email-template", "place-holders"],
    queryFn: fetchEventEmailTemplatePlaceHolders,
    retry: false,
  })

  const emailSubjectHtml = useMemo(() => {
    const info = thankYouEmailQuery.data
    const placeholderItems = placeholdersQuery.data ?? []
    return buildSubjectEditorHtml(info?.emailSubject || "", placeholderItems)
  }, [placeholdersQuery.data, thankYouEmailQuery.data])

  const emailTemplateHtml = useMemo(() => thankYouEmailQuery.data?.emailTemplate || "<p></p>", [thankYouEmailQuery.data?.emailTemplate])

  const resolvedNotifyOrganizer = notifyOrganizerOverride ?? thankYouEmailQuery.data?.notifyOrganizer ?? false
  const resolvedOtherNotificationEmails = otherNotificationEmailsOverride ?? thankYouEmailQuery.data?.otherNotificationEmails ?? ""

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      emailSubject: string | null
      emailTemplate: string | null
      notifyOrganizer: boolean
      otherNotificationEmails: string | null
    }) => {
      if (!currentEventId) {
        throw new Error("Event id is required.")
      }

      return updateEventWizardThankYouEmail(currentEventId, payload, EVENT_THANK_YOU_EMAIL_STEP_NUMBER)
    },
    onSuccess: (result) => {
      if (!currentEventId) {
        return
      }

      queryClient.setQueryData(["events", "wizard-draft", currentEventId, "thank-you-email"], result)
      queryClient.setQueryData(["events", "wizard-progress", currentEventId], { stepNo: result.stepNo })
    },
    onError: (saveError) => {
      setError(extractApiError(saveError))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] })
    },
  })

  const subjectEditor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      TextStyle,
      Color.configure({ types: ["textStyle"] }),
      FontSizeExtension,
      EventPlaceholderTokenExtension,
      Link.configure({
        autolink: true,
        defaultProtocol: "https",
        linkOnPaste: true,
        openOnClick: false,
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder: "Write the thank you email subject here...",
      }),
    ],
    content: emailSubjectHtml,
    editorProps: {
      attributes: {
        class: "event-thank-you-email-subject-editor",
        "data-wizard-focus": "true",
      },
    },
  })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      TextStyle,
      Color.configure({ types: ["textStyle"] }),
      FontSizeExtension,
      LineHeightExtension,
      EventPlaceholderTokenExtension,
      Link.configure({
        autolink: true,
        defaultProtocol: "https",
        linkOnPaste: true,
        openOnClick: false,
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder: EVENT_THANK_YOU_EMAIL_CONTENT.placeholder,
      }),
    ],
    content: emailTemplateHtml,
    editorProps: {
      attributes: {
        class: "event-thank-you-email-body-editor",
      },
    },
  })

  useEffect(() => {
    if (!subjectEditor) {
      return
    }

    subjectEditor.commands.setContent(emailSubjectHtml, { emitUpdate: false })
  }, [emailSubjectHtml, subjectEditor])

  useEffect(() => {
    if (!editor) {
      return
    }

    editor.commands.setContent(emailTemplateHtml, { emitUpdate: false })
  }, [editor, emailTemplateHtml])

  useEffect(() => {
    if (
      !currentEventId ||
      !subjectEditor ||
      !editor ||
      thankYouEmailQuery.isLoading ||
      placeholdersQuery.isLoading ||
      thankYouEmailQuery.isError ||
      placeholdersQuery.isError
    ) {
      setPrimaryAction(null)
      setSkipAction(null)
      setPrimaryActionReady(false)
      setPrimaryActionEnabled(false)
      return
    }

    setPrimaryActionEnabled(true)
    setPrimaryAction(async () => {
      setError("")
      setValidationErrors({})
      const nextValidationErrors = validateThankYouEmailStep(subjectEditor, editor)
      setValidationErrors(nextValidationErrors)

      if (nextValidationErrors.emailSubject || nextValidationErrors.emailBody) {
        throw new Error("Validation failed.")
      }

      setIsSaving(true)
      setPrimaryActionReady(false)

      try {
        await saveMutation.mutateAsync({
          emailSubject: getPlainTextTemplate(subjectEditor, ""),
          emailTemplate: editor?.getHTML() ?? "<p></p>",
          notifyOrganizer: resolvedNotifyOrganizer,
          otherNotificationEmails: resolvedOtherNotificationEmails,
        })
      } finally {
        setIsSaving(false)
        setPrimaryActionReady(true)
      }
    })

    setSkipAction(async () => {
      setError("")
      setValidationErrors({})
      setIsSaving(true)
      setPrimaryActionReady(false)

      try {
        await saveMutation.mutateAsync({
          emailSubject: null,
          emailTemplate: null,
          notifyOrganizer: resolvedNotifyOrganizer,
          otherNotificationEmails: resolvedOtherNotificationEmails,
        })
      } finally {
        setIsSaving(false)
        setPrimaryActionReady(true)
      }
    })

    setPrimaryActionReady(true)

    return () => {
      setPrimaryAction(null)
      setSkipAction(null)
      setPrimaryActionReady(false)
      setPrimaryActionEnabled(false)
    }
  }, [
    currentEventId,
    editor,
    placeholdersQuery.isError,
    placeholdersQuery.isLoading,
    saveMutation,
    setPrimaryAction,
    setPrimaryActionEnabled,
    setPrimaryActionReady,
    setSkipAction,
    subjectEditor,
    thankYouEmailQuery.isError,
    thankYouEmailQuery.isLoading,
    resolvedNotifyOrganizer,
    resolvedOtherNotificationEmails,
  ])

  const loadError = thankYouEmailQuery.error || placeholdersQuery.error
  const queryErrorMessage = loadError instanceof Error ? loadError.message : ""
  const missingEventError = currentEventId ? "" : "Event id is required."

  return {
    editor,
    subjectEditor,
    error: error || queryErrorMessage || missingEventError,
    isLoading:
      !!currentEventId && (thankYouEmailQuery.isLoading || placeholdersQuery.isLoading || !subjectEditor || !editor),
    isSaving,
    validationErrors,
    notifyOrganizer: resolvedNotifyOrganizer,
    otherNotificationEmails: resolvedOtherNotificationEmails,
    setNotifyOrganizer: (value: boolean) => {
      setNotifyOrganizerOverride(value)
    },
    setOtherNotificationEmails: (value: string) => {
      setOtherNotificationEmailsOverride(value)
    },
    placeholders: placeholdersQuery.data ?? [],
    reload: () => {
      setError("")
      setValidationErrors({})
      void Promise.all([thankYouEmailQuery.refetch(), placeholdersQuery.refetch()])
    },
  }
}
