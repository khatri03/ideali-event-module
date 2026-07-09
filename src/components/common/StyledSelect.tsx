import { useMemo } from "react"
import { Box, createListCollection, Select, Text } from "@chakra-ui/react"
import { ChevronDown, Check } from "lucide-react"
import {
  CONTROL_SELECT_CONTENT,
  CONTROL_SELECT_ITEM,
  CONTROL_SELECT_TRIGGER,
} from "./controlStyles"

export interface SelectOption {
  label: string
  value: string
  description?: string
  swatchColor?: string
  disabled?: boolean
}

interface StyledSelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** "md" = 44px height, 16px radius (modal fields). "sm" = 38px height, 12px radius (filter bars). */
  size?: "sm" | "md"
  disabled?: boolean
  minW?: string
}

export function StyledSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  size = "md",
  disabled,
  minW,
}: StyledSelectProps) {
  const collection = useMemo(() => createListCollection({ items: options }), [options])

  const h = size === "sm" ? "40px" : "46px"
  const radius = size === "sm" ? "14px" : "16px"

  return (
    <Select.Root
      collection={collection}
      value={value ? [value] : []}
      onValueChange={({ value: val }) => onChange(val[0] ?? "")}
      disabled={disabled}
      w="full"
    >
      <Select.HiddenSelect />
      <Select.Trigger
        h={h}
        w="full"
        borderRadius={radius}
        minH={h}
        minW={minW}
        {...CONTROL_SELECT_TRIGGER}
      >
        <Select.ValueText placeholder={placeholder} />
        <Select.Indicator color="secondaryGray.600" _dark={{ color: "secondaryGray.300" }}>
          <ChevronDown size={15} />
        </Select.Indicator>
      </Select.Trigger>

      <Select.Positioner>
        <Select.Content {...CONTROL_SELECT_CONTENT}>
          {collection.items.map((item) => (
            <Select.Item
              key={item.value}
              item={item}
              {...CONTROL_SELECT_ITEM}
            >
              {item.swatchColor ? (
                <Box
                  w="11px"
                  h="11px"
                  borderRadius="full"
                  border="1px solid"
                  borderColor="border.subtle"
                  bg={item.swatchColor}
                  boxShadow="sm"
                  flexShrink={0}
                  aria-hidden="true"
                  mr={2.5}
                />
              ) : null}
              <Box flex={1} minW={0}>
                <Select.ItemText>{item.label}</Select.ItemText>
                {item.description ? (
                  <Text fontSize="xs" color="secondaryGray.500" lineHeight={1.4} mt={0.5}>
                    {item.description}
                  </Text>
                ) : null}
              </Box>
              <Select.ItemIndicator color="brand.500" _dark={{ color: "brand.400" }}>
                <Check size={13} />
              </Select.ItemIndicator>
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  )
}
