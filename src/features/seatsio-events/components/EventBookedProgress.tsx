import { Box, Text } from "@chakra-ui/react"

interface EventBookedProgressProps {
  booked: number
  total: number
  available: number
  /** A background refresh of these counts is in flight, so the meter dims and marks itself busy rather than flashing. */
  isUpdating?: boolean
}

/**
 * The compact booked-vs-available meter shown above the report tabs, so every tab keeps the "how full is this event"
 * figure in view rather than only the summary. The solid segment is the booked share of the total. The available figure
 * is Seats.io's own count of what a buyer can purchase now, which is why it is passed in rather than derived from
 * total minus booked: seats held off sale are neither booked nor available. It is a labelled progressbar so the figure
 * reads for anyone not seeing the colour. Counts are clamped so a stale or malformed report can never overfill the bar
 * or print a negative figure.
 */
export function EventBookedProgress({ booked, total, available, isUpdating = false }: EventBookedProgressProps) {
  const safeTotal = Math.max(total, 0)
  const safeBooked = Math.min(Math.max(booked, 0), safeTotal)
  const safeAvailable = Math.min(Math.max(available, 0), safeTotal)
  const percent = safeTotal > 0 ? Math.round((safeBooked / safeTotal) * 100) : 0

  return (
    <Box w={{ base: "300px", md: "360px" }} maxW="full" opacity={isUpdating ? 0.55 : 1} transition="opacity 0.2s ease">
      <Box
        role="progressbar"
        aria-label="Booked seats"
        aria-busy={isUpdating || undefined}
        aria-valuenow={safeBooked}
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-valuetext={`${safeBooked} booked, ${safeAvailable} available`}
        h="12px"
        borderRadius="full"
        bg="brand.100"
        overflow="hidden"
      >
        <Box h="full" w={`${percent}%`} bg="brand.500" borderRadius="full" transition="width 0.3s ease" />
      </Box>
      <Text mt={1} fontSize="xs" fontWeight="700" color="gray.600" textAlign="right">
        {safeBooked} booked · {safeAvailable} available
      </Text>
    </Box>
  )
}
