import { Box, Checkbox, Input, NativeSelect, Text, Textarea } from "@chakra-ui/react"
import { AnswerFileField } from "@/features/events/components/registration/AnswerFileField"
import type { UploadedAnswerFile } from "@/features/events/schemas/eventCart.schemas"
import type { RegistrationFieldDescriptor } from "@/features/events/utils/registrationFields"

export interface RegistrationFieldProps {
  descriptor: RegistrationFieldDescriptor
  value: string
  file: UploadedAnswerFile | undefined
  errorMessage: string | null
  onChange: (value: string) => void
  onUpload: (file: File) => Promise<UploadedAnswerFile>
  onClearFile: () => void
}

function normalizeControlType(controlType: string) {
  return controlType.trim().toLowerCase().replace(/[\s_-]/g, "")
}

/** Multi-value answers travel as one comma-joined string, the same shape the organizer authors defaults in. */
function parseSelectedValues(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function toggleValue(selected: string[], value: string, isChecked: boolean) {
  const remaining = selected.filter((entry) => entry !== value)
  return isChecked ? [...remaining, value] : remaining
}

/**
 * Renders one custom form field or custom question as a real input. `controlType` is whatever the
 * organizer picked when building the form, so unknown types fall back to a single-line text input
 * rather than rendering nothing and silently losing the answer.
 */
export function RegistrationField({
  descriptor,
  value,
  file,
  errorMessage,
  onChange,
  onUpload,
  onClearFile,
}: RegistrationFieldProps) {
  const controlType = normalizeControlType(descriptor.controlType)
  const placeholder = descriptor.placeHolder ?? ""
  const isInvalid = Boolean(errorMessage)
  const borderColor = isInvalid ? "red.300" : "gray.200"

  function renderControl() {
    if (controlType === "file") {
      return (
        <AnswerFileField
          accept={descriptor.acceptedFileTypes}
          file={file}
          isInvalid={isInvalid}
          onSelect={onUpload}
          onClear={onClearFile}
        />
      )
    }

    if (controlType === "checkbox") {
      return (
        <Checkbox.Root
          checked={value === "true"}
          onCheckedChange={(details) => onChange(details.checked === true ? "true" : "false")}
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control cursor="pointer" />
          <Checkbox.Label cursor="pointer" fontSize="sm">
            {placeholder || descriptor.label}
          </Checkbox.Label>
        </Checkbox.Root>
      )
    }

    if (controlType === "multiselect" && descriptor.options.length > 0) {
      const selected = parseSelectedValues(value)

      return (
        <Box
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="14px"
          px={4}
          py={3}
          display="flex"
          flexDirection="column"
          gap={2}
        >
          {descriptor.options.map((option) => (
            <Checkbox.Root
              key={option.value}
              checked={selected.includes(option.value)}
              onCheckedChange={(details) =>
                onChange(toggleValue(selected, option.value, details.checked === true).join(","))
              }
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control cursor="pointer" />
              <Checkbox.Label cursor="pointer" fontSize="sm">
                {option.displayText}
              </Checkbox.Label>
            </Checkbox.Root>
          ))}
        </Box>
      )
    }

    if (descriptor.options.length > 0) {
      return (
        <NativeSelect.Root>
          <NativeSelect.Field
            value={value}
            onChange={(event) => onChange(event.currentTarget.value)}
            borderColor={borderColor}
            borderRadius="14px"
            h="12"
            cursor="pointer"
          >
            <option value="">{placeholder || "Select an option"}</option>
            {descriptor.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.displayText}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      )
    }

    if (controlType === "textarea" || controlType === "multilinetext") {
      return (
        <Textarea
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder={placeholder}
          borderColor={borderColor}
          borderRadius="14px"
          maxLength={descriptor.maxLength ?? undefined}
          rows={4}
        />
      )
    }

    const inputType =
      controlType === "email" ? "email" : controlType === "number" ? "number" : controlType === "date" ? "date" : "text"

    return (
      <Input
        type={inputType}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        borderColor={borderColor}
        borderRadius="14px"
        maxLength={descriptor.maxLength ?? undefined}
        h="12"
        px={4}
      />
    )
  }

  return (
    <Box>
      <Text fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
        {descriptor.label}
        {descriptor.isRequired ? (
          <Text as="span" color="red.500">
            {" *"}
          </Text>
        ) : null}
      </Text>

      {renderControl()}

      {descriptor.tooltip ? (
        <Text mt={1.5} fontSize="xs" color="gray.500">
          {descriptor.tooltip}
        </Text>
      ) : null}

      {errorMessage ? (
        <Text mt={2} fontSize="xs" color="red.600">
          {errorMessage}
        </Text>
      ) : null}
    </Box>
  )
}
