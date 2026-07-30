import { Box, Input, SimpleGrid, Text } from "@chakra-ui/react"
import type { BuyerAttendeeInfoState } from "@/features/events/components/registration/types"

interface ContactDetailsFieldsProps {
  values: BuyerAttendeeInfoState
  onChange: (field: keyof BuyerAttendeeInfoState, value: string) => void
  disabled?: boolean
}

interface ContactFieldConfig {
  field: keyof BuyerAttendeeInfoState
  label: string
  placeholder: string
  isRequired: boolean
  type?: string
  autoComplete?: string
  inputMode?: "tel"
  helperText?: string
}

const CONTACT_FIELDS: ContactFieldConfig[] = [
  { field: "firstName", label: "First name", placeholder: "First name", isRequired: false },
  { field: "lastName", label: "Last name", placeholder: "Last name", isRequired: true },
  {
    field: "email",
    label: "Email",
    placeholder: "Email address",
    isRequired: true,
    type: "email",
    autoComplete: "email",
  },
  {
    field: "phone",
    label: "Phone",
    placeholder: "(123) 456-7890",
    isRequired: false,
    autoComplete: "tel",
    inputMode: "tel",
    helperText: "Optional. Format is kept as (xxx) xxx-xxxx.",
  },
]

export function ContactDetailsFields({ values, onChange, disabled = false }: ContactDetailsFieldsProps) {
  const fieldCursor = disabled ? "not-allowed" : "text"

  return (
    <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
      {CONTACT_FIELDS.map((config) => (
        <Box key={config.field}>
          <Text fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
            {config.label}
            {config.isRequired ? (
              <Text as="span" color="red.500">
                {" *"}
              </Text>
            ) : null}
          </Text>
          <Input
            value={values[config.field]}
            onChange={(event) => onChange(config.field, event.target.value)}
            placeholder={config.placeholder}
            aria-label={config.label}
            type={config.type}
            autoComplete={config.autoComplete}
            inputMode={config.inputMode}
            disabled={disabled}
            cursor={fieldCursor}
            borderColor="gray.200"
            bg={disabled ? "gray.100" : "white"}
            borderRadius="14px"
            h="12"
            px={4}
          />
          {config.helperText ? (
            <Text mt={2} fontSize="xs" color="gray.500" lineHeight="1.5">
              {config.helperText}
            </Text>
          ) : null}
        </Box>
      ))}
    </SimpleGrid>
  )
}
