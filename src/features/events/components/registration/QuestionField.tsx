import { Box, Checkbox, Input, NativeSelect, Text, Textarea } from "@chakra-ui/react"
import type { EventRegistrationQuestion } from "@/api/events"

export interface QuestionFieldProps {
  question: EventRegistrationQuestion
  value: string
  errorMessage: string | null
  onChange: (value: string) => void
}

function normalizeControlType(controlType: string) {
  return controlType.trim().toLowerCase().replace(/[\s_-]/g, "")
}

/**
 * Renders one custom question as a real input. `controlType` is whatever the organizer picked when
 * building the form, so unknown types fall back to a single-line text input rather than rendering
 * nothing and silently losing the answer.
 */
export function QuestionField({ question, value, errorMessage, onChange }: QuestionFieldProps) {
  const controlType = normalizeControlType(question.controlType)
  const placeholder = question.placeHolder ?? ""
  const isInvalid = Boolean(errorMessage)
  const borderColor = isInvalid ? "red.300" : "gray.200"

  function renderControl() {
    if (controlType === "checkbox") {
      return (
        <Checkbox.Root
          checked={value === "true"}
          onCheckedChange={(details) => onChange(details.checked === true ? "true" : "false")}
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control cursor="pointer" />
          <Checkbox.Label cursor="pointer" fontSize="sm">
            {placeholder || question.label}
          </Checkbox.Label>
        </Checkbox.Root>
      )
    }

    if (controlType === "dropdown" || controlType === "select" || controlType === "radio") {
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
            {question.options.map((option) => (
              <option key={option.uniqueId} value={option.uniqueId}>
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
        h="12"
        px={4}
      />
    )
  }

  return (
    <Box>
      <Text fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
        {question.label}
        {question.required ? (
          <Text as="span" color="red.500">
            {" *"}
          </Text>
        ) : null}
      </Text>

      {renderControl()}

      {question.tooltip ? (
        <Text mt={1.5} fontSize="xs" color="gray.500">
          {question.tooltip}
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
