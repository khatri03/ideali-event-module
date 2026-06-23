import { useMemo } from "react"
import { Box, createListCollection, Select, Text } from "@chakra-ui/react"
import { ChevronDown, Check } from "lucide-react"

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

  const h = size === "sm" ? "38px" : "44px"
  const radius = size === "sm" ? "12px" : "16px"

  const FOCUS_RING = {
    borderColor: "brand.400",
    boxShadow: "0 0 0 3px rgba(117, 81, 255, 0.15)",
    outline: "none",
  }

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
        px={4}
        bg="app.bg"
        border="1px solid"
        borderColor="secondaryGray.100"
        _dark={{ borderColor: "navy.600", bg: "navy.800", color: "white" }}
        _hover={{ borderColor: "secondaryGray.500", _dark: { borderColor: "navy.500" } }}
        _focus={FOCUS_RING}
        _focusVisible={FOCUS_RING}
        _open={{ borderColor: "brand.400" }}
        fontSize="sm"
        fontWeight="400"
        color="navy.700"
        _placeholder={{ color: "secondaryGray.500" }}
        transition="all 0.15s ease"
        minW={minW}
        cursor={disabled ? "not-allowed" : "pointer"}
        _disabled={{
          opacity: 0.6,
          cursor: "not-allowed",
        }}
      >
        <Select.ValueText placeholder={placeholder} />
        <Select.Indicator color="secondaryGray.600" _dark={{ color: "secondaryGray.500" }}>
          <ChevronDown size={14} />
        </Select.Indicator>
      </Select.Trigger>

      <Select.Positioner>
        <Select.Content
          bg="card.bg"
          borderRadius="16px"
          boxShadow="0px 20px 50px rgba(112, 144, 176, 0.2), 0px 0px 0px 1px rgba(112, 144, 176, 0.1)"
          _dark={{
            boxShadow: "0px 20px 50px rgba(0,0,0,0.45), 0px 0px 0px 1px rgba(255,255,255,0.06)",
          }}
          p={1.5}
          minW="var(--reference-width)"
          zIndex={1500}
        >
          {collection.items.map((item) => (
            <Select.Item
              key={item.value}
              item={item}
              px={3}
              py={2.5}
              borderRadius="10px"
              fontSize="sm"
              color="navy.700"
              _dark={{ color: "secondaryGray.100" }}
              _disabled={{
                opacity: 0.55,
                cursor: "not-allowed",
              }}
              _highlighted={{
                bg: "secondaryGray.300",
                _dark: { bg: "navy.700" },
                outline: "none",
              }}
              _checked={{
                color: "brand.500",
                _dark: { color: "brand.400" },
                fontWeight: "600",
              }}
              cursor="pointer"
              transition="background 0.1s ease"
            >
              {item.swatchColor ? (
                <Box
                  w="12px"
                  h="12px"
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
                <Check size={12} />
              </Select.ItemIndicator>
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  )
}
