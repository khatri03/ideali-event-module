import { Button, HStack, Input, Text } from "@chakra-ui/react"
import { Paperclip, X } from "lucide-react"
import { useRef, useState } from "react"
import type { UploadedAnswerFile } from "@/features/events/schemas/eventCart.schemas"

export interface AnswerFileFieldProps {
  accept: string | null
  file: UploadedAnswerFile | undefined
  isInvalid: boolean
  onSelect: (file: File) => Promise<UploadedAnswerFile>
  onClear: () => void
}

/** Organizer free text such as "pdf docx" or ".pdf,.docx" normalised into an accept attribute. */
function toAcceptAttribute(accept: string | null) {
  if (!accept?.trim()) return undefined

  return accept
    .split(/[,;|\s]+/)
    .filter(Boolean)
    .map((token) => (token.startsWith(".") ? token : `.${token}`))
    .join(",")
}

export function AnswerFileField({ accept, file, isInvalid, onSelect, onClear }: AnswerFileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.currentTarget.files?.[0]
    // Clearing here lets the same file be re-picked after a failed upload.
    event.currentTarget.value = ""
    if (!selected) return

    setIsUploading(true)
    setUploadError(null)

    try {
      await onSelect(selected)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "The file could not be uploaded.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <Input ref={inputRef} type="file" accept={toAcceptAttribute(accept)} onChange={handleChange} display="none" />

      <HStack gap={3} flexWrap="wrap" alignItems="center">
        <Button
          variant="outline"
          size="sm"
          minH="11"
          borderRadius="12px"
          borderColor={isInvalid ? "red.300" : "gray.200"}
          cursor="pointer"
          loading={isUploading}
          loadingText="Uploading..."
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip size={16} />
          {file ? "Replace file" : "Choose file"}
        </Button>

        {file ? (
          <HStack gap={2} minW="0">
            <Text fontSize="sm" color="gray.700" truncate maxW={{ base: "44", md: "72" }}>
              {file.fileName}
            </Text>
            <Button
              variant="ghost"
              size="xs"
              minH="11"
              minW="11"
              cursor="pointer"
              aria-label={`Remove ${file.fileName}`}
              onClick={onClear}
            >
              <X size={14} />
            </Button>
          </HStack>
        ) : null}
      </HStack>

      {uploadError ? (
        <Text mt={2} fontSize="xs" color="red.600">
          {uploadError}
        </Text>
      ) : null}
    </>
  )
}
