import { useEffect, useMemo } from "react"
import { Box } from "@chakra-ui/react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"

interface AlertMessageViewerProps {
  value: string
}

export function AlertMessageViewer({ value }: AlertMessageViewerProps) {
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
    ],
    [],
  )

  const editor = useEditor({
    extensions,
    content: value || "<p></p>",
    editable: false,
    editorProps: {
      attributes: {
        class: "alert-message-viewer",
      },
    },
    immediatelyRender: false,
  })

  useEffect(() => {
    if (!editor) {
      return
    }

    const nextValue = value || "<p></p>"
    if (editor.getHTML() !== nextValue) {
      editor.commands.setContent(nextValue, { emitUpdate: false })
    }
  }, [editor, value])

  return (
    <Box
      borderRadius="16px"
      border="1px solid"
      borderColor="border.subtle"
      bg="white"
      px={4}
      py={3}
      _focusWithin={{
        borderColor: "blue.500",
        boxShadow: "0 0 0 1px var(--chakra-colors-blue-500), 0 0 0 4px rgba(59, 130, 246, 0.12)",
      }}
    >
      <style>{`
        .alert-message-viewer {
          outline: none;
          line-height: 1.7;
          font-size: 0.98rem;
          min-height: 1.5rem;
        }
        .alert-message-viewer p {
          margin: 0 0 0.75rem;
        }
        .alert-message-viewer p:last-child {
          margin-bottom: 0;
        }
        .alert-message-viewer ul,
        .alert-message-viewer ol {
          padding-left: 1.25rem;
          margin: 0 0 0.75rem;
        }
        .alert-message-viewer blockquote {
          border-left: 4px solid var(--chakra-colors-blue-500);
          margin: 0 0 0.75rem;
          padding-left: 1rem;
          color: var(--chakra-colors-gray-700);
        }
        .alert-message-viewer h1,
        .alert-message-viewer h2,
        .alert-message-viewer h3 {
          line-height: 1.2;
          margin: 1rem 0 0.65rem;
        }
        .alert-message-viewer h1 { font-size: 1.45rem; }
        .alert-message-viewer h2 { font-size: 1.2rem; }
        .alert-message-viewer h3 { font-size: 1.05rem; }
      `}</style>
      <EditorContent editor={editor} />
    </Box>
  )
}
