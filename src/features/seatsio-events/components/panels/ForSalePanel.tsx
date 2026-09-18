import { Badge, Box, Flex, HStack, SimpleGrid, Stack, Text, Wrap } from "@chakra-ui/react"
import { CheckCircle2 } from "lucide-react"
import { useEventForSale } from "../../hooks/useEventReports"
import { ReportError, ReportPanelShell, ReportSkeleton } from "../ReportStates"
import { ReportGroupList } from "../ReportGroupList"

interface ForSalePanelProps {
  eventUniqueId: string
  formatCount: (value: number) => string
}

function LabelChips({ title, values }: { title: string; values: string[] }) {
  if (values.length === 0) {
    return null
  }

  return (
    <Stack gap={2}>
      <Text fontSize="xs" fontWeight="800" textTransform="uppercase" letterSpacing="0.1em" color="gray.500">
        {title}
      </Text>
      <Wrap gap={2}>
        {values.map((value) => (
          <Badge key={value} variant="subtle" colorPalette="purple" borderRadius="999px" px={3} py={1}>
            {value}
          </Badge>
        ))}
      </Wrap>
    </Stack>
  )
}

export function ForSalePanel({ eventUniqueId, formatCount }: ForSalePanelProps) {
  const query = useEventForSale(eventUniqueId, true)

  if (query.isError) {
    return (
      <ReportPanelShell>
        <ReportError error={query.error} />
      </ReportPanelShell>
    )
  }

  if (query.isLoading || !query.data) {
    return (
      <ReportPanelShell>
        <ReportSkeleton />
      </ReportPanelShell>
    )
  }

  const report = query.data

  if (report.everythingForSale) {
    return (
      <ReportPanelShell>
        <Flex
          align="center"
          gap={3}
          borderRadius="16px"
          border="1px solid"
          borderColor="green.200"
          bg="green.50"
          px={5}
          py={4}
          _dark={{ bg: "whiteAlpha.100", borderColor: "green.400" }}
        >
          <Box color="green.600">
            <CheckCircle2 size={22} />
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="800" color="green.700" _dark={{ color: "green.200" }}>
              Everything is on sale
            </Text>
            <Text fontSize="sm" color="green.600">
              No for-sale restriction is set, so every object on this event can be sold.
            </Text>
          </Box>
        </Flex>
      </ReportPanelShell>
    )
  }

  const hasSelection = report.objects.length > 0 || report.categories.length > 0 || report.areaPlaces.length > 0

  return (
    <ReportPanelShell>
      <Stack gap={5}>
        <HStack gap={3}>
          <Badge
            variant="subtle"
            colorPalette={report.forSale ? "green" : "orange"}
            borderRadius="999px"
            px={3}
            py={1}
          >
            {report.forSale ? "Only these are on sale" : "These are held back from sale"}
          </Badge>
        </HStack>

        {hasSelection ? (
          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
            <LabelChips title="Objects" values={report.objects} />
            <LabelChips title="Categories" values={report.categories} />
            {report.areaPlaces.length > 0 ? (
              <Stack gap={2}>
                <Text fontSize="xs" fontWeight="800" textTransform="uppercase" letterSpacing="0.1em" color="gray.500">
                  Area places
                </Text>
                <ReportGroupList groups={report.areaPlaces} formatCount={formatCount} />
              </Stack>
            ) : null}
          </SimpleGrid>
        ) : (
          <Text fontSize="sm" color="gray.600">
            A for-sale restriction is set but names no specific objects.
          </Text>
        )}
      </Stack>
    </ReportPanelShell>
  )
}
