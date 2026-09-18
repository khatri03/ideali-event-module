import type { ReactElement } from "react"
import { Badge, Box, Flex, HStack, Stack, Text } from "@chakra-ui/react"
import { Info } from "lucide-react"
import type { UseQueryResult } from "@tanstack/react-query"
import type { SeatsIoEventCategory, SeatsIoEventChannel, SeatsIoEventTableBookingReport } from "@/api/seatsio"
import { useEventCategories, useEventChannels, useEventTables } from "../../hooks/useEventReports"
import { ReportEmpty, ReportError, ReportPanelShell, ReportSkeleton } from "../ReportStates"

interface GroupTabProps {
  eventUniqueId: string
  formatCount: (value: number) => string
}

/** Renders the loading and error states every report panel shares, then hands the loaded data to a renderer. */
function PanelState<T>({ query, children }: { query: UseQueryResult<T>; children: (data: T) => ReactElement }) {
  if (query.isError) {
    return (
      <ReportPanelShell>
        <ReportError error={query.error} />
      </ReportPanelShell>
    )
  }

  if (query.isLoading || query.data === undefined) {
    return (
      <ReportPanelShell>
        <ReportSkeleton />
      </ReportPanelShell>
    )
  }

  return children(query.data)
}

/** A round colour swatch, falling back to a neutral fill when the object carries no colour. */
function ColorDot({ color }: { color: string }) {
  return (
    <Box
      boxSize="14px"
      borderRadius="999px"
      flexShrink={0}
      bg={color || "gray.300"}
      border="1px solid"
      borderColor="blackAlpha.200"
    />
  )
}

export function TablesPanel({ eventUniqueId }: GroupTabProps) {
  const query = useEventTables(eventUniqueId, true)

  return (
    <PanelState query={query}>
      {(report: SeatsIoEventTableBookingReport) => (
        <ReportPanelShell>
          <Stack gap={4}>
            <Flex
              align="center"
              gap={3}
              borderRadius="16px"
              border="1px solid"
              borderColor="border.subtle"
              bg="linear-gradient(135deg, rgba(117,81,255,0.08) 0%, rgba(66,42,251,0.04) 100%)"
              px={5}
              py={4}
            >
              <Box color="brand.600">
                <Info size={20} />
              </Box>
              <Box>
                <Text fontSize="sm" fontWeight="800" color="text.primary">
                  {report.modeLabel || "Table booking"}
                </Text>
                <Text fontSize="sm" color="text.secondary">
                  {report.inheritsChartSettings
                    ? "Table booking settings from the chart are currently used."
                    : "This event sets its own table booking."}
                </Text>
              </Box>
            </Flex>

            {report.tables.length > 0 ? (
              <Stack gap={2.5}>
                {report.tables.map((table) => (
                  <Flex
                    key={table.label}
                    justify="space-between"
                    align="center"
                    gap={4}
                    borderRadius="14px"
                    border="1px solid"
                    borderColor="border.subtle"
                    bg="card.bg"
                    px={4}
                    py={3}
                  >
                    <Text fontSize="sm" fontWeight="700" color="text.primary" wordBreak="break-word">
                      Table {table.label}
                    </Text>
                    <Badge variant="subtle" colorPalette="purple" borderRadius="999px" px={3} py={1}>
                      {table.bookingType || "Unknown"}
                    </Badge>
                  </Flex>
                ))}
              </Stack>
            ) : null}
          </Stack>
        </ReportPanelShell>
      )}
    </PanelState>
  )
}

export function ChannelsPanel({ eventUniqueId, formatCount }: GroupTabProps) {
  const query = useEventChannels(eventUniqueId, true)

  return (
    <PanelState query={query}>
      {(channels: SeatsIoEventChannel[]) =>
        channels.length === 0 ? (
          <ReportEmpty
            title="No channels created yet"
            description="This event has no sales channels. Channels group objects for staged or restricted selling."
          />
        ) : (
          <ReportPanelShell>
            <Stack gap={2.5}>
              {channels.map((channel) => (
                <Flex
                  key={channel.key || channel.name}
                  justify="space-between"
                  align="center"
                  gap={4}
                  borderRadius="14px"
                  border="1px solid"
                  borderColor="border.subtle"
                  bg="card.bg"
                  px={4}
                  py={3}
                >
                  <HStack gap={3} minW={0}>
                    <ColorDot color={channel.color} />
                    <Text fontSize="sm" fontWeight="700" color="text.primary" wordBreak="break-word">
                      {channel.name || "Unnamed channel"}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color="text.secondary" fontVariantNumeric="tabular-nums" flexShrink={0}>
                    {formatCount(channel.objectCount)} {channel.objectCount === 1 ? "object" : "objects"}
                  </Text>
                </Flex>
              ))}
            </Stack>
          </ReportPanelShell>
        )
      }
    </PanelState>
  )
}

export function CategoriesPanel({ eventUniqueId, formatCount }: GroupTabProps) {
  const query = useEventCategories(eventUniqueId, true)

  return (
    <PanelState query={query}>
      {(categories: SeatsIoEventCategory[]) =>
        categories.length === 0 ? (
          <ReportEmpty
            title="No categories to show"
            description="This event's chart has no price categories, or none hold any objects."
          />
        ) : (
          <ReportPanelShell>
            <Stack gap={2.5}>
              {categories.map((category) => (
                <Flex
                  key={category.key || category.label}
                  justify="space-between"
                  align="center"
                  gap={4}
                  borderRadius="14px"
                  border="1px solid"
                  borderColor="border.subtle"
                  bg="card.bg"
                  px={4}
                  py={3}
                >
                  <HStack gap={3} minW={0}>
                    <ColorDot color={category.color} />
                    <Text fontSize="sm" fontWeight="700" color="text.primary" wordBreak="break-word">
                      {category.label}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color="text.secondary" fontVariantNumeric="tabular-nums" flexShrink={0}>
                    {formatCount(category.count)} {category.count === 1 ? "place" : "places"}
                  </Text>
                </Flex>
              ))}
            </Stack>
          </ReportPanelShell>
        )
      }
    </PanelState>
  )
}
