import { Field, Text } from "@chakra-ui/react"

interface StepFieldLabelProps {
  label: string
  isRequired?: boolean
}

export function StepFieldLabel({ label, isRequired = false }: StepFieldLabelProps) {
  return (
    <Field.Label display="flex" alignItems="center" gap={2} flexWrap="wrap">
      <Text as="span">{label}</Text>
      {isRequired ? (
        <Text as="span" color="red.500" fontWeight="800" aria-hidden="true">
          *
        </Text>
      ) : null}
    </Field.Label>
  )
}
