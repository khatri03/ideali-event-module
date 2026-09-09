import { Box, Flex, SimpleGrid, Stack, Text } from "@chakra-ui/react"
import type { EventSeatingCategory } from "@/features/events/schemas/eventSeating.schemas"
import { UNAVAILABLE_SEAT_COLOR } from "@/features/events/utils/seatColors"
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
 * What the legend says about the most of a category one order may take.
 *
 * A category the organizer left uncapped says nothing rather than "unlimited": the cap is the exception, and naming
 * its absence on every other category makes the one that has a cap harder to spot, not easier.
 */
function getMaximumLabel(category: EventSeatingCategory): string | null {
  if (category.maxPurchase === null || category.maxPurchase <= 0) {
    return null
  }

  return category.maxPurchase === 1 ? "Max 1 per order" : `Max ${category.maxPurchase} per order`
}

/**
 * The key to the seat map: every colour on the chart named, priced, and — where the organizer opted in — counted.
 *
 * Colour is never the only carrier of the meaning. The swatch repeats what the category name already says, so a
 * buyer who cannot tell the colours apart still reads the same legend.
 *
 * Seats already taken are on the chart too, in a colour no category uses, so the legend names that colour as well.
 * Without the line a buyer meets it only by clicking a seat and being refused.
 *
 * The seat count sits above its card rather than inside it, because the organizer sets that disclosure per ticket
 * type: a count inside the card would make the one category that discloses taller than its neighbours, and read as
 * a difference in the categories rather than a difference in what the organizer chose to publish. Its line is held
 * open on every entry for the same reason — without it the cards either side would sit at different heights. The
 * per-order maximum shares that line, pinned to its far end, so the buyer reads what is left and what they may take
 * of it in one glance instead of meeting the cap only when the chart refuses their next seat.
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
          const maximum = getMaximumLabel(category)

          return (
            <Stack as="li" key={category.categoryKey} gap={1}>
              <Flex minH="18px" px={1} align="center" justify="space-between" gap={2}>
                {remaining ? (
                  <Text fontSize="xs" fontWeight="600" color={remaining.isSoldOut ? "red.600" : "green.600"}>
                    {remaining.text}
                  </Text>
                ) : (
                  <Box />
                )}
                {maximum ? (
                  <Text fontSize="xs" fontWeight="600" color="gray.600" whiteSpace="nowrap">
                    {maximum}
                  </Text>
                ) : null}
              </Flex>
              <Flex
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
                  borderRadius="full"
                  borderWidth="1px"
                  borderColor="blackAlpha.300"
                  bg={category.color || UNKNOWN_CATEGORY_COLOR}
                />
                <Text fontSize="sm" fontWeight="700" color="gray.900" minW={0} flex="1" truncate>
                  {category.categoryName || category.ticketTypeName}
                </Text>
                <Text fontSize="sm" fontWeight="700" color="gray.900" whiteSpace="nowrap">
                  {formatCurrencyCode(category.price.toFixed(2), currencyCode)}
                </Text>
              </Flex>
            </Stack>
          )
        })}
      </SimpleGrid>
      <Flex align="center" gap={3} px={1}>
        <Box
          aria-hidden
          flexShrink={0}
          w="14px"
          h="14px"
          borderRadius="full"
          borderWidth="1px"
          borderColor="blackAlpha.300"
          bg={UNAVAILABLE_SEAT_COLOR}
        />
        <Text fontSize="xs" fontWeight="600" color="gray.600">
          Seats in this colour are already taken
        </Text>
      </Flex>
    </Stack>
  )
}
