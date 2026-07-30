import type { ReactNode } from "react"
import { Field, Text } from "@chakra-ui/react"

export function RequiredFieldLabel({ children }: { children: ReactNode }) {
  return (
    <Field.Label display="flex" alignItems="center" gap={1} flexWrap="wrap" fontSize="sm" fontWeight="700" color="text.primary">
      <Text as="span">{children}</Text>
      <Text as="span" color="red.500" fontWeight="800" aria-hidden="true">
        *
      </Text>
    </Field.Label>
  )
}
