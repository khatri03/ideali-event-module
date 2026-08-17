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
  /** Names the control for screen readers when no visible label is wired to it. */
  ariaLabel?: string
}

export function StyledSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  size = "md",
  disabled,
  minW,
  ariaLabel,
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
        aria-label={ariaLabel}
        h={h}
        w="full"
        borderRadius={radius}
        minH={h}
        minW={minW}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap={3}
        px={4}
        {...CONTROL_SELECT_TRIGGER}
        bg="app.bg"
        borderColor="border.subtle"
        boxShadow="0 1px 2px rgba(15, 23, 42, 0.04)"
        _hover={{
          borderColor: "brand.300",
          boxShadow: "0 8px 18px rgba(15, 23, 42, 0.04)",
        }}
      >
        <Select.ValueText placeholder={placeholder} flex="1" minW={0} fontWeight="600" />
        <Select.Indicator
          color="secondaryGray.600"
          _dark={{ color: "secondaryGray.300" }}
          transition="transform 0.18s ease, color 0.18s ease"
          flexShrink={0}
          ml="auto"
        >
          <ChevronDown size={15} />
        </Select.Indicator>
      </Select.Trigger>

      <Select.Positioner>
        <Select.Content
          {...CONTROL_SELECT_CONTENT}
          bg="white"
          borderColor="border.subtle"
          borderRadius="20px"
          p={2}
          boxShadow="0 24px 60px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.05)"
        >
          {collection.items.map((item) => (
            <Select.Item
              key={item.value}
              item={item}
              {...CONTROL_SELECT_ITEM}
              minH="44px"
              px={3.5}
              py={2.5}
              borderRadius="14px"
              _highlighted={{
                bg: "brand.50",
                _dark: { bg: "navy.700" },
                outline: "none",
              }}
              _checked={{
                color: "brand.600",
                _dark: { color: "brand.400" },
                fontWeight: "700",
                bg: "brand.50",
              }}
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
                <Select.ItemText style={{ fontWeight: 600 }}>{item.label}</Select.ItemText>
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
