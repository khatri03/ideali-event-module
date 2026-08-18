import { Box, Flex, Text } from "@chakra-ui/react"
import { splitDuration, visibleDurationUnits, type DurationUnit } from "@/utils/duration"

type CountdownSize = "sm" | "lg"

interface CountdownCardsProps {
  remainingMs: number
  size?: CountdownSize
}

const UNIT_INITIALS: Record<DurationUnit, string> = {
  days: "D",
  hours: "H",
  minutes: "M",
  seconds: "S",
}

/**
 * Sized rather than stretched. A row of `flex: 1` cards spreads to whatever it is dropped into, which
 * on a desk monitor produced four letterbox tiles with a digit adrift in each; fixed-width tiles keep
 * the same shape wherever the row is used and stay legible from a pace back from the screen.
 */
const SIZES: Record<CountdownSize, {
  width: Record<string, string>
  numberSize: Record<string, string>
  labelSize: string
  labelGap: number
  gap: Record<string, number>
  padY: Record<string, number>
}> = {
  sm: {
    width: { base: "64px", md: "76px" },
    numberSize: { base: "xl", md: "2xl" },
    labelSize: "xs",
    labelGap: 2,
    gap: { base: 2, md: 3 },
    padY: { base: 3, md: 3 },
  },
  lg: {
    width: { base: "64px", sm: "92px", md: "132px" },
    numberSize: { base: "4xl", sm: "5xl", md: "6xl" },
    labelSize: "sm",
    labelGap: 3,
    gap: { base: 2, sm: 4, md: 5 },
    padY: { base: 5, md: 7 },
  },
}

/**
 * Presentational only, and hidden from assistive technology: a row that repaints every second would be
 * read out every second. The banner around it carries the spoken wording at a coarser granularity.
 */
export function CountdownCards({ remainingMs, size = "lg" }: CountdownCardsProps) {
  const parts = splitDuration(remainingMs)
  const scale = SIZES[size]

  return (
    <Flex gap={scale.gap} justify="center" aria-hidden="true">
      {visibleDurationUnits(parts).map((unit) => (
        <Box
          key={unit}
          w={scale.width}
          flexShrink={0}
          borderWidth="1px"
          borderColor="border.subtle"
          borderRadius="16px"
          bg="card.bg"
          boxShadow="card"
          py={scale.padY}
          textAlign="center"
        >
          <Text
            fontSize={scale.numberSize}
            fontWeight="800"
            lineHeight="1"
            letterSpacing="-0.04em"
            color="text.primary"
            fontVariantNumeric="tabular-nums"
          >
            {/* Padded so the row keeps its width as each unit rolls over rather than nudging sideways. */}
            {unit === "days" ? parts[unit] : String(parts[unit]).padStart(2, "0")}
          </Text>
          <Text
            mt={scale.labelGap}
            fontSize={scale.labelSize}
            fontWeight="700"
            letterSpacing="0.12em"
            color="text.secondary"
            lineHeight="1"
          >
            {UNIT_INITIALS[unit]}
          </Text>
        </Box>
      ))}
    </Flex>
  )
}
