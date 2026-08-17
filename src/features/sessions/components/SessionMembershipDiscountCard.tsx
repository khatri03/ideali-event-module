import { Badge, Box, Flex, Input, SimpleGrid, Text } from "@chakra-ui/react"
import { CheckCircle2 } from "lucide-react"
import type { SessionWizardMembershipDiscountType } from "@/api/sessions"
import { StyledSelect, type SelectOption } from "@/components/common/StyledSelect"

export type MembershipDiscountField = "discountType" | "discountValueInput" | "maxDiscountAmountInput"

interface SessionMembershipDiscountCardProps {
  membershipTypeUniqueId: string
  membershipName: string
  discountTypeOptions: SelectOption[]
  discountType: SessionWizardMembershipDiscountType | null
  discountValueInput: string
  maxDiscountAmountInput: string
  onFieldChange: (membershipTypeUniqueId: string, field: MembershipDiscountField, value: string) => void
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: string }) {
  return (
    <Text asChild display="block" mb={1.5} fontSize="xs" fontWeight="700" color="gray.600" lineClamp={1}>
      <label htmlFor={htmlFor}>{children}</label>
    </Text>
  )
}

export function SessionMembershipDiscountCard({
  membershipTypeUniqueId,
  membershipName,
  discountTypeOptions,
  discountType,
  discountValueInput,
  maxDiscountAmountInput,
  onFieldChange,
}: SessionMembershipDiscountCardProps) {
  const fieldId = (field: string) => `membership-${membershipTypeUniqueId}-${field}`
  const isPercentage = discountType === "Percentage"

  return (
    <Box
      as="fieldset"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="20px"
      bg="gray.50"
      p={4}
    >
      <Flex align="center" justify="space-between" gap={3}>
        <Box minW={0}>
          <Text as="legend" fontSize="sm" fontWeight="800" color="brand.600" lineClamp={1}>
            {membershipName}
          </Text>
          <Text fontSize="xs" color="gray.600">
            Discount applied to {membershipName} members. Leave blank for no discount.
          </Text>
        </Box>
        <Badge variant="subtle" colorPalette="green" borderRadius="999px" px={3} py={1} flexShrink={0}>
          <Flex align="center" gap={1.5}>
            <CheckCircle2 size={14} />
            <Text as="span" fontSize="xs" fontWeight="800">
              Selected
            </Text>
          </Flex>
        </Badge>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 3 }} gap={3} mt={4}>
        <Box>
          <FieldLabel>Discount type</FieldLabel>
          <StyledSelect
            options={discountTypeOptions}
            value={discountType ?? "FixedAmount"}
            onChange={(value) => onFieldChange(membershipTypeUniqueId, "discountType", value || "FixedAmount")}
            placeholder="Discount type"
            size="sm"
            ariaLabel={`Discount type for ${membershipName}`}
          />
        </Box>

        <Box>
          <FieldLabel htmlFor={fieldId("discount-value")}>Discount value</FieldLabel>
          <Input
            id={fieldId("discount-value")}
            value={discountValueInput}
            onChange={(event) =>
              onFieldChange(membershipTypeUniqueId, "discountValueInput", event.target.value)
            }
            placeholder={isPercentage ? "e.g. 10 (%)" : "e.g. 25.00"}
            type="number"
            step="0.01"
            min="0"
            bg="white"
            h="40px"
            px={4}
            borderRadius="12px"
          />
        </Box>

        <Box>
          <FieldLabel htmlFor={fieldId("max-discount")}>Max discount amount</FieldLabel>
          <Input
            id={fieldId("max-discount")}
            value={maxDiscountAmountInput}
            onChange={(event) =>
              onFieldChange(membershipTypeUniqueId, "maxDiscountAmountInput", event.target.value)
            }
            placeholder={isPercentage ? "Cap for percentage" : "Percentage only"}
            type="number"
            step="0.01"
            min="0"
            bg="white"
            h="40px"
            px={4}
            borderRadius="12px"
            disabled={!isPercentage}
            cursor={isPercentage ? "text" : "not-allowed"}
          />
        </Box>
      </SimpleGrid>
    </Box>
  )
}
