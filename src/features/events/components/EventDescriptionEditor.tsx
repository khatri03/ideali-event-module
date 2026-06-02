import { Box, Button, HStack, Stack, Text } from "@chakra-ui/react"
import { useEffect, useMemo } from "react"
import type { ReactNode } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { Bold, Italic, List, ListOrdered, Quote, Redo2, Undo2 } from "lucide-react"

interface EventDescriptionEditorProps {
  value: string
  onChange: (value: string) => void
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
    <Button
      type="button"
      size="sm"
      variant={isActive ? "solid" : "ghost"}
      colorPalette={isActive ? "green" : undefined}
      onClick={onClick}
      borderRadius="md"
      minW="36px"
      h="36px"
      px={3}
      aria-label={label}
      title={label}
    >
      {icon}
    </Button>
  )
}

export function EventDescriptionEditor({ onChange, value }: EventDescriptionEditorProps) {
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Write a clear, engaging description for attendees, speakers, and internal teams...",
      }),
    ],
    []
  )

  const editor = useEditor({
    extensions,
    content: value || "<p></p>",
    editorProps: {
      attributes: {
        class: "event-description-editor",
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
    <Stack gap={3}>
      <HStack flexWrap="wrap" gap={2}>
        <ToolbarButton icon={<Bold size={16} />} label="Bold" isActive={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()} />
        <ToolbarButton icon={<Italic size={16} />} label="Italic" isActive={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()} />
        <ToolbarButton icon={<Quote size={16} />} label="Quote" isActive={editor?.isActive("blockquote")} onClick={() => editor?.chain().focus().toggleBlockquote().run()} />
        <ToolbarButton icon={<List size={16} />} label="Bullet list" isActive={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()} />
        <ToolbarButton icon={<ListOrdered size={16} />} label="Numbered list" isActive={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()} />
        <Box flex="1" />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!editor?.can().chain().focus().undo().run()}
        >
          <HStack gap={2}>
            <Undo2 size={16} />
            <Text fontSize="sm">Undo</Text>
          </HStack>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={!editor?.can().chain().focus().redo().run()}
        >
          <HStack gap={2}>
            <Redo2 size={16} />
            <Text fontSize="sm">Redo</Text>
          </HStack>
        </Button>
      </HStack>

      <Box
        minH="220px"
        borderRadius="16px"
        border="1px solid"
        borderColor="gray.200"
        bg="white"
        px={4}
        py={3}
        transition="border-color 0.15s ease, box-shadow 0.15s ease"
        _focusWithin={{
          borderColor: "green.500",
          boxShadow: "0 0 0 1px var(--chakra-colors-green-500), 0 0 0 4px rgba(1, 181, 116, 0.12)",
        }}
      >
        <style>{`
          .event-description-editor {
            min-height: 220px;
            outline: none;
            line-height: 1.7;
            font-size: 0.98rem;
          }
          .event-description-editor p {
            margin: 0 0 0.75rem;
          }
          .event-description-editor p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: var(--chakra-colors-gray-400);
            pointer-events: none;
            height: 0;
          }
          .event-description-editor ul,
          .event-description-editor ol {
            padding-left: 1.25rem;
            margin: 0 0 0.75rem;
          }
          .event-description-editor blockquote {
            border-left: 4px solid var(--chakra-colors-green-500);
            margin: 0 0 0.75rem;
            padding-left: 1rem;
            color: var(--chakra-colors-gray-700);
          }
          .event-description-editor h1,
          .event-description-editor h2,
          .event-description-editor h3 {
            line-height: 1.2;
            margin: 1rem 0 0.65rem;
          }
          .event-description-editor h1 { font-size: 1.45rem; }
          .event-description-editor h2 { font-size: 1.2rem; }
          .event-description-editor h3 { font-size: 1.05rem; }
        `}</style>
        <EditorContent editor={editor} />
      </Box>

      <Text fontSize="xs" color="gray.500">
        Rich text is stored as HTML so your formatting stays intact across draft, review, and edit flows.
      </Text>
    </Stack>
  )
}
