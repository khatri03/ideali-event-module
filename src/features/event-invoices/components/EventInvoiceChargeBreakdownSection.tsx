import { useId, useState } from "react"
import { Badge, Box, Button, Flex, HStack, Stack, Text } from "@chakra-ui/react"
import { ChevronDown } from "lucide-react"
import type { EventInvoiceCharge } from "@/api/eventInvoices"

interface EventInvoiceChargeBreakdownSectionProps {
  charges: EventInvoiceCharge[]
  currencySymbol: string
}

function formatMoney(value: number, currencySymbol: string) {
  return `${currencySymbol}${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`
}

export function EventInvoiceChargeBreakdownSection({ charges, currencySymbol }: EventInvoiceChargeBreakdownSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const contentId = useId()

  if (charges.length === 0) {
    return null
  }

  return (
    <Box border="1px solid" borderColor="border.subtle" borderRadius="20px" bg="card.bg" boxShadow="card" overflow="hidden">
      <Flex align="center" justify="space-between" gap={3} px={{ base: 4, md: 6 }} py={4}>
        <Button
          variant="ghost"
          justifyContent="flex-start"
          minH="11"
          px={0}
          color="text.primary"
          cursor="pointer"
          aria-expanded={isExpanded}
          aria-controls={contentId}
          onClick={() => setIsExpanded((value) => !value)}
        >
          <ChevronDown
            size={18}
            style={{
              transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform 0.16s ease",
            }}
          />
          <Text fontWeight="800">Charge breakdown</Text>
          <Badge colorPalette="brand" variant="subtle" borderRadius="full">
            {charges.length}
          </Badge>
        </Button>
      </Flex>

      {isExpanded ? (
        <Stack id={contentId} gap={3} px={{ base: 4, md: 6 }} pb={{ base: 4, md: 6 }}>
          {charges.map((charge) => (
            <Box
              key={`${charge.displayOrder}-${charge.label}-${charge.amount}`}
              border="1px solid"
              borderColor="border.subtle"
              borderRadius="16px"
              bg="app.bg"
              p={4}
            >
              <Flex justify="space-between" gap={4} align="start">
                <Stack gap={1} minW={0}>
                  <Text fontSize="sm" fontWeight="800" color="text.primary">
                    {charge.label}
                  </Text>
                  <HStack gap={2} wrap="wrap" fontSize="xs" color="text.secondary">
                    <Text>{charge.chargeKindLabel}</Text>
                    <Text aria-hidden="true">•</Text>
                    <Text>{charge.sourceTypeLabel}</Text>
                    <Text aria-hidden="true">•</Text>
                    <Text>{charge.calculationTypeLabel}</Text>
                  </HStack>
                </Stack>
                <Text fontSize="sm" fontWeight="800" color="text.primary" textAlign="right">
                  {formatMoney(charge.amount, currencySymbol)}
                </Text>
              </Flex>
            </Box>
          ))}
        </Stack>
      ) : null}
    </Box>
  )
}
