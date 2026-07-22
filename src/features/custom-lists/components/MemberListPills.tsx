import { useState } from "react"
import { Flex, Tag, Text } from "@chakra-ui/react"
import type { CustomListOption } from "@/api/customLists"

const VISIBLE_PILL_COUNT = 2

interface MemberListPillsProps {
  lists: CustomListOption[]
  onRemoveFromList: (list: CustomListOption) => void
}

export function MemberListPills({ lists, onRemoveFromList }: MemberListPillsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (lists.length === 0) {
    return (
      <Text fontSize="sm" color="text.secondary">
        —
      </Text>
    )
  }

  const visibleLists = isExpanded ? lists : lists.slice(0, VISIBLE_PILL_COUNT)
  const hiddenCount = lists.length - visibleLists.length

  return (
    <Flex align="center" gap={1.5} flexWrap="wrap">
      {visibleLists.map((list) => (
        <Tag.Root
          key={list.uniqueId}
          size="md"
          variant="surface"
          colorPalette="gray"
          borderRadius="full"
          maxW="200px"
          minH="28px"
          ps={3}
          pe={1.5}
          py={1}
          gap={1.5}
        >
          <Tag.Label lineClamp={1} title={list.name} fontWeight="600">
            {list.name}
          </Tag.Label>
          <Tag.EndElement ms={0}>
            <Tag.CloseTrigger
              aria-label={`Remove from ${list.name}`}
              title={`Remove from ${list.name}`}
              cursor="pointer"
              boxSize="18px"
              borderRadius="full"
              _hover={{ bg: "red.100", color: "red.600" }}
              onClick={() => onRemoveFromList(list)}
            />
          </Tag.EndElement>
        </Tag.Root>
      ))}

      {hiddenCount > 0 ? (
        <Tag.Root
          size="md"
          variant="solid"
          colorPalette="gray"
          borderRadius="full"
          minH="28px"
          px={3}
          py={1}
          cursor="pointer"
          onClick={() => setIsExpanded(true)}
          title={lists
            .slice(VISIBLE_PILL_COUNT)
            .map((list) => list.name)
            .join(", ")}
        >
          <Tag.Label fontWeight="800">+{hiddenCount}</Tag.Label>
        </Tag.Root>
      ) : null}

      {isExpanded && lists.length > VISIBLE_PILL_COUNT ? (
        <Tag.Root
          size="md"
          variant="solid"
          colorPalette="gray"
          borderRadius="full"
          minH="28px"
          px={3}
          py={1}
          cursor="pointer"
          onClick={() => setIsExpanded(false)}
        >
          <Tag.Label fontWeight="700">Show less</Tag.Label>
        </Tag.Root>
      ) : null}
    </Flex>
  )
}
