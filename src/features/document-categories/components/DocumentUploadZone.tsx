import { useRef, useState } from "react"
import { Box, Button, Flex, Input, Stack, Text } from "@chakra-ui/react"
import { FileText, UploadCloud, X } from "lucide-react"
import { toaster } from "@/lib/toaster"
import {
  MAX_FILES_PER_UPLOAD,
  MAX_FILE_SIZE_BYTES,
  UPLOAD_ACCEPT,
  formatFileSize,
  validateUploadFile,
} from "../constants"

interface DocumentUploadZoneProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  disabled?: boolean
  /**
   * Supply to have the zone render its own Upload/Clear actions, as on the detail page. Omit when the
   * parent's own submit drives the upload, as in the create form - the zone is then purely a picker.
   */
  onUpload?: () => void | Promise<void>
  isUploading?: boolean
}

/** Two files are the same pick if name and size match - enough to stop an accidental double-add. */
function fileKey(file: File): string {
  return `${file.name}:${file.size}`
}

export function DocumentUploadZone({
  files,
  onFilesChange,
  disabled = false,
  onUpload,
  isUploading = false,
}: DocumentUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Drag events fire for every child element entering/leaving, so a plain boolean flickers. Counting
  // enters against leaves is what keeps the highlight steady while moving across the zone's contents.
  const dragDepthRef = useRef(0)
  const [isDragActive, setIsDragActive] = useState(false)

  const isBusy = disabled || isUploading

  function stageFiles(incoming: File[]) {
    if (incoming.length === 0) {
      return
    }

    const rejection = incoming.map(validateUploadFile).find(Boolean)
    if (rejection) {
      toaster.create({ type: "error", title: rejection })
      return
    }

    const seen = new Set(files.map(fileKey))
    const additions = incoming.filter((file) => !seen.has(fileKey(file)))
    if (additions.length === 0) {
      return
    }

    if (files.length + additions.length > MAX_FILES_PER_UPLOAD) {
      toaster.create({
        type: "error",
        title: `Upload at most ${MAX_FILES_PER_UPLOAD} files at a time.`,
      })
      return
    }

    onFilesChange([...files, ...additions])
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepthRef.current = 0
    setIsDragActive(false)

    if (isBusy) {
      return
    }

    stageFiles(Array.from(event.dataTransfer.files ?? []))
  }

  function handleDragEnter(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepthRef.current += 1
    setIsDragActive(true)
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepthRef.current -= 1
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0
      setIsDragActive(false)
    }
  }

  return (
    <Stack gap={3}>
      <Box
        role="button"
        tabIndex={isBusy ? -1 : 0}
        aria-label="Add documents by dropping files here or browsing"
        onClick={() => !isBusy && fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (!isBusy && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault()
            fileInputRef.current?.click()
          }
        }}
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        borderRadius="16px"
        border="2px dashed"
        borderColor={isDragActive ? "brand.500" : "border.subtle"}
        bg={isDragActive ? "brand.50" : "app.bg"}
        transition="all 0.18s ease"
        px={{ base: 4, md: 6 }}
        py={{ base: 6, md: 8 }}
        textAlign="center"
        cursor={isBusy ? "not-allowed" : "pointer"}
        opacity={isBusy ? 0.6 : 1}
        _hover={isBusy ? {} : { borderColor: "brand.400", bg: "brand.50" }}
      >
        <Flex justify="center" color={isDragActive ? "brand.600" : "gray.400"} mb={2}>
          <UploadCloud size={26} />
        </Flex>
        <Text fontSize="sm" fontWeight="700" color="gray.900">
          {isDragActive ? "Drop to add" : "Drop files here, or click to browse"}
        </Text>
        <Text fontSize="xs" color="text.secondary" mt={1}>
          Up to {MAX_FILES_PER_UPLOAD} files, {MAX_FILE_SIZE_BYTES / 1024 / 1024} MB each
        </Text>
      </Box>

      <Input
        ref={fileInputRef}
        type="file"
        multiple
        accept={UPLOAD_ACCEPT}
        hidden
        onChange={(event) => {
          stageFiles(Array.from(event.target.files ?? []))
          // Reset so re-picking the same file still fires a change event.
          event.currentTarget.value = ""
        }}
      />

      {files.length > 0 ? (
        <Stack gap={2}>
          {files.map((file) => (
            <Flex
              key={fileKey(file)}
              align="center"
              justify="space-between"
              gap={3}
              borderRadius="12px"
              border="1px solid"
              borderColor="border.subtle"
              bg="card.bg"
              px={3}
              py={2}
            >
              <Flex align="center" gap={3} minW={0}>
                <Box color="brand.600" flexShrink={0} display="flex">
                  <FileText size={16} />
                </Box>
                <Box minW={0}>
                  <Text fontSize="sm" fontWeight="600" color="gray.900" lineClamp={1}>
                    {file.name}
                  </Text>
                  <Text fontSize="xs" color="text.secondary">
                    {formatFileSize(file.size)}
                  </Text>
                </Box>
              </Flex>
              <Button
                size="sm"
                variant="ghost"
                borderRadius="10px"
                minW="9"
                h="9"
                p={0}
                disabled={isBusy}
                cursor={isBusy ? "not-allowed" : "pointer"}
                aria-label={`Remove ${file.name}`}
                onClick={() => onFilesChange(files.filter((item) => fileKey(item) !== fileKey(file)))}
              >
                <X size={15} />
              </Button>
            </Flex>
          ))}

          {onUpload ? (
            <Flex justify="flex-end" gap={2}>
              <Button
                variant="outline"
                borderRadius="12px"
                minH="10"
                px={4}
                disabled={isBusy}
                cursor={isBusy ? "not-allowed" : "pointer"}
                onClick={() => onFilesChange([])}
              >
                Clear
              </Button>
              <Button
                borderRadius="12px"
                minH="10"
                px={5}
                color="white"
                loading={isUploading}
                loadingText="Uploading..."
                disabled={isBusy}
                cursor={isBusy ? "not-allowed" : "pointer"}
                onClick={() => void onUpload()}
                style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
              >
                Upload {files.length} file{files.length === 1 ? "" : "s"}
              </Button>
            </Flex>
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  )
}
