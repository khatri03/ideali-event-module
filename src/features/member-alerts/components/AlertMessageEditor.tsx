import { useEffect, useMemo } from "react"
import type { ReactNode } from "react"
import { Badge, Box, Flex, HStack, IconButton, Stack, Text } from "@chakra-ui/react"
import Placeholder from "@tiptap/extension-placeholder"
import StarterKit from "@tiptap/starter-kit"
import { EditorContent, useEditor } from "@tiptap/react"
import { Bold, Italic, List, ListOrdered, Quote, Redo2, Undo2 } from "lucide-react"

interface AlertMessageEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function ToolbarButton({
  icon,
  label,
  isActive,
  onClick,
}: {
  icon: ReactNode
  label: string
  isActive?: boolean
  onClick: () => void
}) {
  return (
    <IconButton
      type="button"
      size="sm"
      variant={isActive ? "solid" : "outline"}
      colorPalette={isActive ? "blue" : undefined}
      onClick={onClick}
      borderRadius="12px"
      minH="10"
      h="10"
      w="10"
      aria-label={label}
      title={label}
    >
      {icon}
    </IconButton>
  )
}

export function AlertMessageEditor({ onChange, placeholder, value }: AlertMessageEditorProps) {
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "Write the alert message...",
      }),
    ],
    [placeholder],
  )

  const editor = useEditor({
    extensions,
    content: value || "<p></p>",
    editorProps: {
      attributes: {
        class: "alert-message-editor",
      },
    },
    immediatelyRender: false,
    onUpdate: ({ editor: instance }) => {
      onChange(instance.isEmpty ? "" : instance.getHTML())
    },
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
    <Stack gap={3} w="full" align="stretch">
      <Flex
        align={{ base: "flex-start", md: "center" }}
        justify="space-between"
        gap={3}
        wrap="wrap"
        w="full"
        borderRadius="16px"
        border="1px solid"
        borderColor="border.subtle"
        bg="gray.50"
        px={3}
        py={3}
      >
        <HStack gap={2} wrap="wrap">
          <Badge variant="subtle" colorPalette="blue" borderRadius="full" px={2.5} py={1} fontWeight="700">
            Basic formatting
          </Badge>
          <Text fontSize="xs" color="text.secondary">
            Compose with emphasis, lists, and quotes.
          </Text>
        </HStack>
        <HStack gap={2} wrap="wrap">
          <ToolbarButton icon={<Bold size={15} />} label="Bold" isActive={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()} />
          <ToolbarButton icon={<Italic size={15} />} label="Italic" isActive={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()} />
          <ToolbarButton icon={<Quote size={15} />} label="Quote" isActive={editor?.isActive("blockquote")} onClick={() => editor?.chain().focus().toggleBlockquote().run()} />
          <ToolbarButton icon={<List size={15} />} label="Bullet list" isActive={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()} />
          <ToolbarButton icon={<ListOrdered size={15} />} label="Numbered list" isActive={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()} />
          <ToolbarButton icon={<Undo2 size={15} />} label="Undo" onClick={() => editor?.chain().focus().undo().run()} />
          <ToolbarButton icon={<Redo2 size={15} />} label="Redo" onClick={() => editor?.chain().focus().redo().run()} />
        </HStack>
      </Flex>

      <Box
        minH={{ base: "260px", md: "300px" }}
        borderRadius="18px"
        border="1px solid"
        borderColor="border.subtle"
        bg="white"
        px={4}
        py={4}
        w="full"
        transition="border-color 0.15s ease, box-shadow 0.15s ease"
        _focusWithin={{
          borderColor: "blue.500",
          boxShadow: "0 0 0 1px var(--chakra-colors-blue-500), 0 0 0 4px rgba(59, 130, 246, 0.12)",
        }}
      >
        <style>{`
          .alert-message-editor {
            width: 100%;
            min-height: 260px;
            outline: none;
            line-height: 1.7;
            font-size: 1rem;
            color: var(--chakra-colors-gray-900);
          }
          .alert-message-editor p {
            margin: 0 0 0.75rem;
          }
          .alert-message-editor > :first-child {
            margin-top: 0;
          }
          .alert-message-editor > :last-child {
            margin-bottom: 0;
          }
          .alert-message-editor p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: var(--chakra-colors-gray-400);
            pointer-events: none;
            height: 0;
          }
          .alert-message-editor ul,
          .alert-message-editor ol {
            padding-left: 1.35rem;
            margin: 0 0 0.75rem;
          }
          .alert-message-editor blockquote {
            border-left: 4px solid var(--chakra-colors-blue-500);
            margin: 0 0 0.75rem;
            padding-left: 1rem;
            color: var(--chakra-colors-gray-700);
          }
          .alert-message-editor h1,
          .alert-message-editor h2,
          .alert-message-editor h3 {
            line-height: 1.2;
            margin: 1rem 0 0.65rem;
          }
          .alert-message-editor p code,
          .alert-message-editor li code {
            padding: 0.1rem 0.35rem;
            border-radius: 0.35rem;
            background: var(--chakra-colors-gray-100);
            font-size: 0.95em;
          }
          .alert-message-editor h1 { font-size: 1.45rem; }
          .alert-message-editor h2 { font-size: 1.2rem; }
          .alert-message-editor h3 { font-size: 1.05rem; }
        `}</style>
        <EditorContent editor={editor} />
      </Box>

      <Text fontSize="xs" color="text.secondary">
        Rich text is stored as sanitized HTML. Keep content concise for alerts.
      </Text>
    </Stack>
  )
}
