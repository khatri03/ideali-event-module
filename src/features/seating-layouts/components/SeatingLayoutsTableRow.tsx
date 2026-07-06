import { memo } from "react"
import { Box, Button, HStack, Menu, Portal, Skeleton, Stack, Table, Text, Tooltip } from "@chakra-ui/react"
import { CheckCircle2, CircleAlert, Edit3, MoreHorizontal } from "lucide-react"
import { type SeatsIoSeatingLayout } from "@/api/seatsio"
import { extractApiError } from "@/utils/errors"
import { useSeatsIoChartValidation } from "../hooks/useSeatsIoChartValidation"

interface SeatingLayoutsTableRowProps {
  layout: SeatsIoSeatingLayout
  onEdit: (layout: SeatsIoSeatingLayout) => void
}

function SeatingLayoutsValidationCell({ layout }: { layout: SeatsIoSeatingLayout }) {
  const validationQuery = useSeatsIoChartValidation(layout.seatsIoChartKey)
  const chartKey = layout.seatsIoChartKey?.trim() ?? ""

  if (!chartKey) {
    return (
      <Text fontSize="sm" color="gray.500">
        Not linked yet
      </Text>
    )
  }

  if (validationQuery.isLoading) {
    return (
      <Stack gap={2} minW="180px">
        <Skeleton height="4" width="140px" borderRadius="999px" />
        <Skeleton height="3" width="110px" borderRadius="999px" />
      </Stack>
    )
  }

  if (validationQuery.isError) {
    return (
      <HStack gap={2} align="start" color="red.600">
        <CircleAlert size={18} />
        <Text fontSize="sm" fontWeight="600">
          {extractApiError(validationQuery.error)}
        </Text>
      </HStack>
    )
  }

  const validation = validationQuery.data
  if (!validation) {
    return null
  }

  if (validation.isValid) {
    return (
      <HStack gap={2} align="center" color="green.600">
        <CheckCircle2 size={18} />
        <Text fontSize="sm" fontWeight="700">
          {validation.summary || "Ready"}
        </Text>
      </HStack>
    )
  }

  const issueText = validation.issues.length > 0 ? validation.issues.join(" ") : validation.summary

  return (
    <Tooltip.Root openDelay={250} closeDelay={100}>
      <Tooltip.Trigger asChild>
        <HStack gap={2} align="start" color="orange.600" cursor="help">
          <CircleAlert size={18} />
          <Box minW={0}>
            <Text fontSize="sm" fontWeight="700">
              {validation.summary || "Chart needs attention"}
            </Text>
            {issueText ? (
              <Text fontSize="xs" color="gray.600" lineClamp={2}>
                {issueText}
              </Text>
            ) : null}
          </Box>
        </HStack>
      </Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content>
          <Stack gap={1}>
            <Text fontSize="sm" fontWeight="700">
              Chart issues
            </Text>
            {validation.issues.length > 0 ? (
              validation.issues.map((issue) => (
                <Text key={issue} fontSize="xs">
                  {issue}
                </Text>
              ))
            ) : (
              <Text fontSize="xs">{validation.summary}</Text>
            )}
          </Stack>
        </Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  )
}

function SeatingLayoutsTableRowComponent({ layout, onEdit }: SeatingLayoutsTableRowProps) {
  return (
    <Table.Row key={layout.uniqueId} _hover={{ bg: "app.bg" }} transition="background 0.15s">
      <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4} textAlign="center" verticalAlign="top">
        <Menu.Root positioning={{ placement: "bottom-start" }}>
          <Menu.Trigger asChild>
            <Button
              variant="outline"
              w="10"
              h="10"
              minW="10"
              minH="10"
              p={0}
              borderRadius="full"
              borderColor="border.subtle"
              bg="white"
              color="gray.500"
              cursor="pointer"
              aria-label={`Actions for ${layout.name}`}
              title="Actions"
            >
              <MoreHorizontal size={16} />
            </Button>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content
                minW="12rem"
                borderRadius="16px"
                border="1px solid"
                borderColor="gray.200"
                boxShadow="0 16px 40px rgba(15, 23, 42, 0.12)"
                p={1.5}
                bg="white"
                _dark={{ bg: "navy.800", borderColor: "whiteAlpha.200" }}
              >
                <Menu.Item
                  value="edit-layout"
                  borderRadius="10px"
                  fontSize="sm"
                  fontWeight="600"
                  color="gray.700"
                  _dark={{ color: "gray.200" }}
                  _hover={{ bg: "gray.50", _dark: { bg: "whiteAlpha.100" } }}
                  px={3}
                  py={2}
                  gap={2.5}
                  onClick={() => onEdit(layout)}
                >
                  <Edit3 size={14} />
                  <Text as="span" flex="1" textAlign="left">
                    Edit
                  </Text>
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </Table.Cell>
      <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={6} py={4}>
        <Box>
          <Text fontSize="sm" fontWeight="700" color="text.primary">
            {layout.name}
          </Text>
        </Box>
      </Table.Cell>
      <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4}>
        <Text fontSize="sm" color="text.primary">
          {layout.venueName ?? "Not mapped yet"}
        </Text>
      </Table.Cell>
      <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4}>
        <Text fontSize="sm" color="text.primary" wordBreak="break-all">
          {layout.seatsIoChartKey ?? "Not linked yet"}
        </Text>
      </Table.Cell>
      <Table.Cell borderColor="border.subtle" px={4} py={4}>
        <SeatingLayoutsValidationCell layout={layout} />
      </Table.Cell>
    </Table.Row>
  )
}

export const SeatingLayoutsTableRow = memo(SeatingLayoutsTableRowComponent)
