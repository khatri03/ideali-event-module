import type { Editor } from "@tiptap/react"
import {
  Box,
  Button,
  Flex,
  IconButton,
  Input,
  Menu,
  Portal,
  Text,
  VisuallyHidden,
} from "@chakra-ui/react"
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  PencilLine,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  Trash2,
  Type,
  Rows3,
} from "lucide-react"
import type { EventEmailPlaceholderGroup, EventEmailSnippet } from "@/api/events"
import type { ReactNode } from "react"
import {
  getPlaceholderLabel,
  isSelectedPlaceholderFormatted,
  toggleSelectedPlaceholderTokenAttr,
  updateSelectedPlaceholderToken,
} from "./EventThankYouEmailStepPage.toolbar.helpers"

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
    <IconButton
      type="button"
      size="sm"
      variant={isActive ? "solid" : "ghost"}
      colorPalette={isActive ? "cyan" : "gray"}
      borderRadius="12px"
      h="11"
      minW="11"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={!editor}
    >
      {children}
    </IconButton>
  )
}

function ToolbarMenuButton({
  editor,
  icon,
  label,
  minW = "11rem",
  onSelect,
  groups,
  options,
}: {
  editor: Editor | null
  icon: ReactNode
  label: string
  minW?: string
  onSelect: (value: string) => void
  groups?: Array<{
    label: string
    options: Array<{ label: string; value: string; disabled?: boolean }>
  }>
  options?: Array<{ label: string; value: string; disabled?: boolean }>
}) {
  const hasOptions = (groups?.length ?? 0) > 0 || (options?.length ?? 0) > 0

  return (
    <Menu.Root positioning={{ placement: "bottom-start" }}>
      <Menu.Trigger asChild>
        <IconButton
          type="button"
          size="sm"
          variant="ghost"
          borderRadius="12px"
          h="11"
          minW="11"
          aria-label={label}
          title={label}
          disabled={!editor || !hasOptions}
        >
          {icon}
        </IconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content
            minW={minW}
            borderRadius="16px"
            border="1px solid"
            borderColor="gray.200"
            boxShadow="0 16px 40px rgba(15, 23, 42, 0.12)"
            p={1.5}
            bg="white"
          >
            <Box px={3} pt={2} pb={1}>
              <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
                {label}
              </Text>
            </Box>

            {groups?.map((group, index) => (
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
                    value={`${group.label}:${option.value}`}
                    disabled={option.disabled}
                    borderRadius="10px"
                    fontSize="sm"
                    fontWeight="500"
                    color="gray.700"
                    px={3}
                    py={2}
                    mx={1}
                    mb={0.5}
                    _hover={{ bg: "gray.50" }}
                    onClick={() => onSelect(option.value)}
                  >
                    {option.label}
                  </Menu.Item>
                ))}
              </Box>
            ))}

            {options?.map((option, index) => (
              <Box key={option.value}>
                {groups?.length ? null : index > 0 ? <Menu.Separator borderColor="gray.100" mx={1} my={1} /> : null}
                <Menu.Item
                  value={option.value || `${label}:${index}`}
                  disabled={option.disabled}
                  borderRadius="10px"
                  fontSize="sm"
                  fontWeight="500"
                  color="gray.700"
                  px={3}
                  py={2}
                  mx={1}
                  mb={0.5}
                  _hover={{ bg: "gray.50" }}
                  onClick={() => onSelect(option.value)}
                >
                  {option.label}
                </Menu.Item>
              </Box>
            ))}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}

function ToolbarDivider() {
  return <Box w="1px" h="28px" bg="gray.200" mx={0.5} flexShrink={0} />
}

export function EventThankYouEmailToolbar({
  editor,
  onInsertVariable,
  onOpenSaveSnippet,
  onLoadSavedSnippet,
  onEditSavedSnippet,
  onDeleteSavedSnippet,
  savedSnippets,
  placeholders,
}: {
  editor: Editor | null
  onInsertVariable: (value: { label: string; token: string }) => void
  onOpenSaveSnippet: () => void
  onLoadSavedSnippet: (snippet: EventEmailSnippet) => void
  onEditSavedSnippet: (snippet: EventEmailSnippet) => void
  onDeleteSavedSnippet: (snippet: EventEmailSnippet) => void
  savedSnippets: EventEmailSnippet[]
  placeholders: EventEmailPlaceholderGroup[]
}) {
  const variableGroups = placeholders.map((group) => ({
    label: group.label.toUpperCase(),
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
    >
      <Flex gap={2} flexWrap="wrap" align="center">
        <ToolbarButton editor={editor} label="Undo" onClick={() => editor?.chain().focus().undo().run()}>
          <Undo2 size={16} />
        </ToolbarButton>
        <ToolbarButton editor={editor} label="Redo" onClick={() => editor?.chain().focus().redo().run()}>
          <Redo2 size={16} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarMenuButton
          editor={editor}
          label="Font size"
          icon={<Type size={16} />}
          minW="10rem"
          onSelect={(value) => {
            if (!value || !editor) {
              return
            }

            if (!updateSelectedPlaceholderToken(editor, { fontSize: value })) {
              editor.chain().focus().setMark("textStyle", { fontSize: value }).run()
            }
          }}
          options={[
            { label: "12 px", value: "12px" },
            { label: "14 px", value: "14px" },
            { label: "16 px", value: "16px" },
            { label: "18 px", value: "18px" },
            { label: "20 px", value: "20px" },
            { label: "24 px", value: "24px" },
          ]}
        />
        <ToolbarMenuButton
          editor={editor}
          label="Line height"
          icon={<Rows3 size={16} />}
          minW="9rem"
          onSelect={(value) => {
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

        <Box
          as="label"
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="12px"
          bg="white"
          h="11"
          w="11"
          boxShadow="0 8px 18px rgba(15, 23, 42, 0.04)"
          title="Text color"
        >
          <VisuallyHidden>Text color</VisuallyHidden>
          <Input
            type="color"
            w="8"
            h="8"
            p={0}
            border="none"
            background="transparent"
            cursor="pointer"
            aria-label="Text color"
            onChange={(event) => {
              if (!editor) {
                return
              }

              const value = event.target.value
              if (!updateSelectedPlaceholderToken(editor, { color: value })) {
                editor.chain().focus().setColor(value).run()
              }
            }}
          />
        </Box>

        <ToolbarDivider />

        <ToolbarMenuButton
          editor={editor}
          label="Button"
          icon={<Code size={16} />}
          minW="11rem"
          onSelect={(value) => {
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

        <Box
          display="inline-flex"
          alignItems="center"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="12px"
          bg="white"
          overflow="hidden"
          boxShadow="0 8px 18px rgba(15, 23, 42, 0.04)"
        >
          <Menu.Root positioning={{ placement: "bottom-start" }}>
            <Menu.Trigger asChild>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                borderRadius={0}
                h="11"
                px={4}
                fontSize="sm"
                fontWeight="700"
                color="gray.700"
                disabled={!editor || variableGroups.length === 0}
                aria-label="Variables"
                title="Variables"
              >
                Variables
              </Button>
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                <Menu.Content
                  minW="11rem"
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
                      Variables
                    </Text>
                  </Box>
                  {variableGroups.length > 0 ? (
                    variableGroups.map((group, index) => (
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
                            value={`variable:${group.label}:${option.value}`}
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

                              onInsertVariable({
                                label: placeholder?.displayText || getPlaceholderLabel(option.value) || option.value,
                                token: option.value,
                              })
                            }}
                          >
                            {option.label}
                          </Menu.Item>
                        ))}
                      </Box>
                    ))
                  ) : (
                    <Menu.Item
                      value="no-variables-available"
                      disabled
                      borderRadius="10px"
                      fontSize="sm"
                      fontWeight="500"
                      color="gray.500"
                      px={3}
                      py={2}
                      mx={1}
                      mb={0.5}
                    >
                      No variables available
                    </Menu.Item>
                  )}
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>

          <Box w="1px" h="28px" bg="gray.200" />

          <Menu.Root positioning={{ placement: "bottom-start" }}>
            <Menu.Trigger asChild>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                borderRadius={0}
                h="11"
                px={4}
                fontSize="sm"
                fontWeight="700"
                color="gray.700"
                disabled={!editor}
                aria-label="Snippets"
                title="Snippets"
              >
                Snippets
              </Button>
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                <Menu.Content
                  minW="18rem"
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
                      Snippets
                    </Text>
                  </Box>

                  <Menu.Item
                    value="save-current-snippet"
                    borderRadius="10px"
                    fontSize="sm"
                    fontWeight="500"
                    color="gray.700"
                    px={3}
                    py={2}
                    mx={1}
                    mb={0.5}
                    _hover={{ bg: "gray.50" }}
                    onClick={onOpenSaveSnippet}
                  >
                    Save current as snippet
                  </Menu.Item>

                  <Menu.Separator borderColor="gray.100" mx={1} my={1} />

                {savedSnippets.length > 0 ? (
                  savedSnippets.map((snippet) => (
                    <Box key={snippet.uniqueId} mb={1}>
                      <Menu.Item
                        value={`snippet:${snippet.uniqueId}`}
                        borderRadius="10px"
                        fontSize="sm"
                        fontWeight="500"
                        color="gray.700"
                        px={3}
                        py={2}
                        mx={1}
                        mb={0.5}
                        _hover={{ bg: "gray.50" }}
                        onClick={() => onLoadSavedSnippet(snippet)}
                      >
                        <Flex align="flex-start" justify="space-between" gap={3} w="full">
                          <Box textAlign="left" minW={0} flex={1}>
                            <Text fontSize="sm" fontWeight="600" color="gray.800">
                              {snippet.name}
                            </Text>
                            {snippet.description ? (
                              <Text fontSize="xs" color="gray.500" lineClamp={2}>
                                {snippet.description}
                              </Text>
                            ) : null}
                          </Box>
                          <Flex align="center" gap={1} flexShrink={0}>
                            <IconButton
                              type="button"
                              aria-label={`Edit ${snippet.name}`}
                              title={`Edit ${snippet.name}`}
                              size="xs"
                              variant="ghost"
                              colorPalette="gray"
                              borderRadius="999px"
                              h="8"
                              w="8"
                              minW="8"
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                onEditSavedSnippet(snippet)
                              }}
                              _hover={{ bg: "gray.100" }}
                            >
                              <PencilLine size={14} />
                            </IconButton>
                            <IconButton
                              type="button"
                              aria-label={`Delete ${snippet.name}`}
                              title={`Delete ${snippet.name}`}
                              size="xs"
                              variant="ghost"
                              colorPalette="red"
                              borderRadius="999px"
                              h="8"
                              w="8"
                              minW="8"
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                onDeleteSavedSnippet(snippet)
                              }}
                              _hover={{ bg: "red.50" }}
                            >
                              <Trash2 size={14} />
                            </IconButton>
                          </Flex>
                        </Flex>
                      </Menu.Item>
                    </Box>
                  ))
                ) : (
                    <Menu.Item
                      value="no-saved-snippets"
                      disabled
                      borderRadius="10px"
                      fontSize="sm"
                      fontWeight="500"
                      color="gray.500"
                      px={3}
                      py={2}
                      mx={1}
                      mb={0.5}
                    >
                      No saved snippets yet
                    </Menu.Item>
                  )}
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
        </Box>

        <ToolbarDivider />

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
          <Bold size={16} />
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
          <Italic size={16} />
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
          <Underline size={16} />
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
          <Strikethrough size={16} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          editor={editor}
          label="Align left"
          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
          isActive={editor?.isActive({ textAlign: "left" })}
        >
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton
          editor={editor}
          label="Align center"
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
          isActive={editor?.isActive({ textAlign: "center" })}
        >
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton
          editor={editor}
          label="Align right"
          onClick={() => editor?.chain().focus().setTextAlign("right").run()}
          isActive={editor?.isActive({ textAlign: "right" })}
        >
          <AlignRight size={16} />
        </ToolbarButton>
        <ToolbarButton
          editor={editor}
          label="Justify"
          onClick={() => editor?.chain().focus().setTextAlign("justify").run()}
          isActive={editor?.isActive({ textAlign: "justify" })}
        >
          <AlignJustify size={16} />
        </ToolbarButton>
        <ToolbarButton
          editor={editor}
          label="Bullet list"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          isActive={editor?.isActive("bulletList")}
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          editor={editor}
          label="Numbered list"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          isActive={editor?.isActive("orderedList")}
        >
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton
          editor={editor}
          label="Quote"
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          isActive={editor?.isActive("blockquote")}
        >
          <Quote size={16} />
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
          <Link2 size={16} />
        </ToolbarButton>
      </Flex>
    </Box>
  )
}
