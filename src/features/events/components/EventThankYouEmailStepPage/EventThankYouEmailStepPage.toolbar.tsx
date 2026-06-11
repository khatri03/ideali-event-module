import type { Editor } from "@tiptap/react"
import { Box, Button, Flex, Input, Text, VisuallyHidden } from "@chakra-ui/react"
import type { ChangeEvent, ReactNode } from "react"
import type { EventEmailPlaceholderGroup } from "@/api/events"
import {
  getPlaceholderLabel,
  isSelectedPlaceholderFormatted,
  toggleSelectedPlaceholderTokenAttr,
  updateSelectedPlaceholderToken,
} from "./EventThankYouEmailStepPage.toolbar.helpers"

function ToolbarSection({ children }: { children: ReactNode }) {
  return (
    <Flex
      align="center"
      gap={2}
      flexWrap="wrap"
      px={2}
      py={2}
      borderRadius="18px"
      border="1px solid"
      borderColor="gray.200"
      bg="white"
      boxShadow="0 8px 18px rgba(15, 23, 42, 0.04)"
    >
      {children}
    </Flex>
  )
}

function ToolbarButton({
  editor,
  label,
  onClick,
  isActive,
  children,
}: {
  editor: Editor | null
  label: string
  onClick: () => void
  isActive?: boolean
  children: ReactNode
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={isActive ? "solid" : "outline"}
      colorPalette={isActive ? "cyan" : "gray"}
      borderRadius="12px"
      h="11"
      minW="11"
      px={3}
      onClick={onClick}
      disabled={!editor}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  )
}

function SelectField({
  label,
  minW = "140px",
  onChange,
  groups,
  options,
}: {
  label: string
  minW?: string
  onChange: (value: string) => void
  groups?: Array<{
    label: string
    options: Array<{ label: string; value: string; disabled?: boolean }>
  }>
  options?: Array<{ label: string; value: string; disabled?: boolean }>
}) {
  return (
    <Box
      as="label"
      display="inline-flex"
      alignItems="center"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="12px"
      bg="white"
      px={3}
      py={2}
      minH="11"
      minW={minW}
    >
      <VisuallyHidden>{label}</VisuallyHidden>
      <Box
        as="select"
        w="full"
        bg="transparent"
        outline="none"
        fontSize="sm"
        color="gray.700"
        onChange={(event: ChangeEvent<HTMLSelectElement>) => {
          onChange(event.target.value)
          event.currentTarget.value = ""
        }}
        defaultValue=""
      >
        <option value="">{label}</option>
        {groups?.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </optgroup>
        ))}
        {options?.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </Box>
    </Box>
  )
}

export function EventThankYouEmailToolbar({
  editor,
  onInsertVariable,
  placeholders,
}: {
  editor: Editor | null
  onInsertVariable: (value: { label: string; token: string }) => void
  placeholders: EventEmailPlaceholderGroup[]
}) {
  const variableGroups = placeholders.map((group) => ({
    label: group.label,
    options: group.items.map((item) => ({
      label: item.displayText || getPlaceholderLabel(item.placeHolderText) || item.placeHolderText,
      value: item.placeHolderText,
    })),
  }))

  return (
    <Box
      border="1px solid"
      borderColor="gray.200"
      borderRadius="20px"
      bg="gray.50"
      p={3}
      overflowX="auto"
    >
      <Flex gap={2} flexWrap="wrap" align="center" minW="max-content">
        <ToolbarSection>
          <ToolbarButton editor={editor} label="Undo" onClick={() => editor?.chain().focus().undo().run()}>
            Undo
          </ToolbarButton>
          <ToolbarButton editor={editor} label="Redo" onClick={() => editor?.chain().focus().redo().run()}>
            Redo
          </ToolbarButton>
        </ToolbarSection>

        <ToolbarSection>
          <SelectField
            label="Font size"
            minW="6rem"
            onChange={(value) => {
              if (!value || !editor) {
                return
              }

              if (!updateSelectedPlaceholderToken(editor, { fontSize: value })) {
                editor.chain().focus().setMark("textStyle", { fontSize: value }).run()
              }
            }}
            options={[
              { label: "12px", value: "12px" },
              { label: "14px", value: "14px" },
              { label: "16px", value: "16px" },
              { label: "18px", value: "18px" },
              { label: "20px", value: "20px" },
              { label: "24px", value: "24px" },
            ]}
          />
          <SelectField
            label="Line height"
            minW="6rem"
            onChange={(value) => {
              if (!value || !editor) {
                return
              }

              editor
                .chain()
                .focus()
                .updateAttributes("paragraph", { lineHeight: value })
                .updateAttributes("heading", { lineHeight: value })
                .run()
            }}
            options={[
              { label: "1", value: "1" },
              { label: "1.15", value: "1.15" },
              { label: "1.5", value: "1.5" },
              { label: "1.75", value: "1.75" },
              { label: "2", value: "2" },
            ]}
          />
          <Input
            type="color"
            w="11"
            h="11"
            p={1}
            borderRadius="12px"
            borderColor="gray.200"
            onChange={(event) => {
              if (!editor) {
                return
              }

              const value = event.target.value
              if (!updateSelectedPlaceholderToken(editor, { color: value })) {
                editor.chain().focus().setColor(value).run()
              }
            }}
            aria-label="Text color"
            title="Text color"
          />
          <SelectField
            label="Variable"
            minW="9rem"
            onChange={(value) => {
              if (!value) {
                return
              }

              const placeholder = placeholders
                .flatMap((group) => group.items)
                .find((item) => item.placeHolderText === value)

              onInsertVariable({
                label: placeholder?.displayText || getPlaceholderLabel(value) || value,
                token: value,
              })
            }}
            groups={variableGroups.length > 0 ? variableGroups : undefined}
            options={variableGroups.length > 0 ? undefined : [{ label: "No variables available", value: "", disabled: true }]}
          />
          <SelectField
            label="Button"
            minW="7.5rem"
            onChange={(value) => {
              if (!value || !editor) {
                return
              }

              editor
                .chain()
                .focus()
                .insertContent(
                  `<a href="#" style="display:inline-block;padding:12px 20px;border-radius:9999px;background:#0ea5e9;color:#ffffff;text-decoration:none;font-weight:600;">${value}</a>`,
                )
                .run()
            }}
            options={[
              { label: "Primary button", value: "Click here" },
              { label: "Secondary button", value: "Learn more" },
            ]}
          />
          <SelectField
            label="Snippets"
            minW="7.5rem"
            onChange={(value) => {
              if (!value || !editor) {
                return
              }

              editor.chain().focus().insertContent(value).run()
            }}
            options={[
              { label: "Divider", value: "<hr />" },
              { label: "Greeting", value: "<p>Hi there,</p>" },
              { label: "Closing", value: "<p>Best regards,</p>" },
            ]}
          />
        </ToolbarSection>

        <ToolbarSection>
          <ToolbarButton
            editor={editor}
            label="Bold"
            onClick={() => {
              if (!toggleSelectedPlaceholderTokenAttr(editor, "bold")) {
                editor?.chain().focus().toggleBold().run()
              }
            }}
            isActive={isSelectedPlaceholderFormatted(editor, "bold") || editor?.isActive("bold")}
          >
            <Text as="span" fontWeight="700">
              B
            </Text>
          </ToolbarButton>
          <ToolbarButton
            editor={editor}
            label="Italic"
            onClick={() => {
              if (!toggleSelectedPlaceholderTokenAttr(editor, "italic")) {
                editor?.chain().focus().toggleItalic().run()
              }
            }}
            isActive={isSelectedPlaceholderFormatted(editor, "italic") || editor?.isActive("italic")}
          >
            <Text as="span" fontStyle="italic">
              I
            </Text>
          </ToolbarButton>
          <ToolbarButton
            editor={editor}
            label="Underline"
            onClick={() => {
              if (!toggleSelectedPlaceholderTokenAttr(editor, "underline")) {
                editor?.chain().focus().toggleUnderline().run()
              }
            }}
            isActive={isSelectedPlaceholderFormatted(editor, "underline") || editor?.isActive("underline")}
          >
            <Text as="span" textDecoration="underline">
              U
            </Text>
          </ToolbarButton>
          <ToolbarButton
            editor={editor}
            label="Strike"
            onClick={() => {
              if (!toggleSelectedPlaceholderTokenAttr(editor, "strike")) {
                editor?.chain().focus().toggleStrike().run()
              }
            }}
            isActive={isSelectedPlaceholderFormatted(editor, "strike") || editor?.isActive("strike")}
          >
            <Text as="span" textDecoration="line-through">
              S
            </Text>
          </ToolbarButton>
          <ToolbarButton editor={editor} label="Align left" onClick={() => editor?.chain().focus().setTextAlign("left").run()} isActive={editor?.isActive({ textAlign: "left" })}>
            L
          </ToolbarButton>
          <ToolbarButton editor={editor} label="Align center" onClick={() => editor?.chain().focus().setTextAlign("center").run()} isActive={editor?.isActive({ textAlign: "center" })}>
            C
          </ToolbarButton>
          <ToolbarButton editor={editor} label="Align right" onClick={() => editor?.chain().focus().setTextAlign("right").run()} isActive={editor?.isActive({ textAlign: "right" })}>
            R
          </ToolbarButton>
          <ToolbarButton editor={editor} label="Justify" onClick={() => editor?.chain().focus().setTextAlign("justify").run()} isActive={editor?.isActive({ textAlign: "justify" })}>
            J
          </ToolbarButton>
          <ToolbarButton editor={editor} label="Bullet list" onClick={() => editor?.chain().focus().toggleBulletList().run()} isActive={editor?.isActive("bulletList")}>
            •
          </ToolbarButton>
          <ToolbarButton editor={editor} label="Numbered list" onClick={() => editor?.chain().focus().toggleOrderedList().run()} isActive={editor?.isActive("orderedList")}>
            1.
          </ToolbarButton>
          <ToolbarButton editor={editor} label="Quote" onClick={() => editor?.chain().focus().toggleBlockquote().run()} isActive={editor?.isActive("blockquote")}>
            "
          </ToolbarButton>
          <ToolbarButton
            editor={editor}
            label="Insert link"
            onClick={() => {
              if (!editor) {
                return
              }

              const url = window.prompt("Enter link URL")
              if (!url) {
                return
              }

              editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
            }}
            isActive={editor?.isActive("link")}
          >
            ↗
          </ToolbarButton>
        </ToolbarSection>
      </Flex>
    </Box>
  )
}
