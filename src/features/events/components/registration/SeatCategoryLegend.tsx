import { Badge, Box, Flex, SimpleGrid, Stack, Text } from "@chakra-ui/react"
import type { EventSeatingCategory } from "@/features/events/schemas/eventSeating.schemas"
import { formatCurrencyCode } from "@/utils/format"

/** Fallback swatch colour for a category the chart never gave one, so the row still reads as a legend entry. */
const UNKNOWN_CATEGORY_COLOR = "#A3AED0"

interface SeatCategoryLegendProps {
  /** Categories the session's chart is drawn in, in the order the organizer arranged them. */
  categories: EventSeatingCategory[]
  /** Currency the seat prices are shown in, or null when the event has none set. */
  currencyCode: string | null
}

interface RemainingLabel {
  text: string
  isSoldOut: boolean
}

/**
 * What the legend says about how much of a category is left.
 *
 * Null covers two different silences that must look identical to the buyer: the organizer chose not to disclose the
 * count, and the category has no capacity to count down from. Neither is "sold out", and printing zero for either
 * would turn buyers away from seats that are still on sale.
 */
function getRemainingLabel(category: EventSeatingCategory): RemainingLabel | null {
  if (!category.showRemainingTickets || category.remainingSeats === null) {
    return null
  }

  return category.remainingSeats > 0
    ? { text: `${new Intl.NumberFormat("en-US").format(category.remainingSeats)} left`, isSoldOut: false }
    : { text: "Sold out", isSoldOut: true }
}

/**
 * The key to the seat map: every colour on the chart named, priced, and — where the organizer opted in — counted.
 *
 * Colour is never the only carrier of the meaning. The swatch repeats what the category name already says, so a
 * buyer who cannot tell the colours apart still reads the same legend.
 */
export function SeatCategoryLegend({ categories, currencyCode }: SeatCategoryLegendProps) {
  if (categories.length === 0) {
    return (
      <Stack gap={1} px={4} py={4} borderRadius="16px" borderWidth="1px" borderColor="gray.200" bg="gray.50">
        <Text fontSize="sm" fontWeight="700" color="gray.800">
          No seat prices published yet
        </Text>
        <Text fontSize="sm" color="gray.600">
          This session's seats are not on sale until the organizer prices its seating categories.
        </Text>
      </Stack>
    )
  }

  return (
    <Stack
      as="section"
      aria-label="Seat categories"
      gap={3}
      px={{ base: 3, md: 4 }}
      py={4}
      w="full"
      borderRadius="16px"
      borderWidth="1px"
      borderColor="gray.200"
      bg="white"
    >
      <Text fontSize="sm" fontWeight="700" color="gray.800">
        Seat categories
      </Text>
      <SimpleGrid as="ul" listStyleType="none" columns={{ base: 1, md: 2, xl: 3 }} gap={{ base: 2, md: 3 }}>
        {categories.map((category) => {
          const remaining = getRemainingLabel(category)

          return (
            <Flex
              as="li"
              key={category.categoryKey}
              align="center"
              gap={3}
              minH="11"
              px={3}
              py={2}
              borderRadius="12px"
              borderWidth="1px"
              borderColor="gray.100"
              bg="gray.50"
            >
              <Box
                aria-hidden
                flexShrink={0}
                w="14px"
                h="14px"
                borderRadius="4px"
                borderWidth="1px"
                borderColor="blackAlpha.300"
                bg={category.color || UNKNOWN_CATEGORY_COLOR}
              />
              <Stack gap={0} minW={0} flex="1">
                <Text fontSize="sm" fontWeight="700" color="gray.900" truncate>
                  {category.categoryName || category.ticketTypeName}
                </Text>
                {remaining ? (
                  <Badge
                    alignSelf="flex-start"
                    colorPalette={remaining.isSoldOut ? "red" : "green"}
                    variant="subtle"
                    fontSize="xs"
                  >
                    {remaining.text}
                  </Badge>
                ) : null}
              </Stack>
              <Text fontSize="sm" fontWeight="700" color="gray.900" whiteSpace="nowrap">
                {formatCurrencyCode(category.price.toFixed(2), currencyCode)}
              </Text>
            </Flex>
          )
        })}
      </SimpleGrid>
    </Stack>
  )
}
