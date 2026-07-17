import { useMemo, useState } from "react"
import { Controller, useFormContext, useWatch } from "react-hook-form"
import { Box, Button, Dialog, Field, Flex, Text } from "@chakra-ui/react"
import { Check, Plus, Trash2 } from "lucide-react"
import ReactSelect, { components, type MultiValue, type MultiValueRemoveProps, type OptionProps, type StylesConfig } from "react-select"
import { useEventChargeRuleOptions } from "../hooks/useEventChargeRuleOptions"
import { ChargeRuleDialog } from "@/features/charge-rules/components/ChargeRuleDialog"
import type { OrganizerChargeRuleInput } from "@/api/chargeRules"
import type { EventWizardValues } from "../schemas/eventWizard.schemas"

interface ChargeRuleSelectOption {
  value: string
  label: string
  description: string
  isActive: boolean
}

function ChargeRuleSelectOptionItem(props: OptionProps<ChargeRuleSelectOption, true>) {
  return (
    <components.Option {...props}>
      <Flex align="center" gap={3}>
        <Box
          flexShrink={0}
          boxSize="18px"
          borderRadius="6px"
          border="1px solid"
          borderColor={props.isSelected ? "brand.500" : "gray.300"}
          bg={props.isSelected ? "brand.500" : "white"}
          color="white"
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
        >
          {props.isSelected ? <Check size={12} /> : null}
        </Box>
        <Box minW={0}>
          <Text fontSize="sm" fontWeight="600" color="gray.800" lineClamp={1}>
            {props.label}
          </Text>
          <Text fontSize="xs" color="gray.500" lineClamp={1}>
            {props.data.description}
          </Text>
        </Box>
      </Flex>
    </components.Option>
  )
}

function ChargeRuleMultiValueRemove(props: MultiValueRemoveProps<ChargeRuleSelectOption, true>) {
  return (
    <components.MultiValueRemove {...props}>
      <Trash2 size={12} />
    </components.MultiValueRemove>
  )
}

export function EventChargeRulesSection() {
  const { control, setValue } = useFormContext<EventWizardValues>()
  const selectedChargeRuleUniqueIds = useWatch({ control, name: "chargeRuleUniqueIds" }) ?? []
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [pendingRemoval, setPendingRemoval] = useState<ChargeRuleSelectOption | null>(null)
  const optionsQuery = useEventChargeRuleOptions()

  const options = optionsQuery.data ?? []
  const selectedOptions = options.filter((option) => selectedChargeRuleUniqueIds.includes(option.value))

  const multiSelectStyles = useMemo(
    () =>
      ({
        control: (base, state) => ({
          ...base,
          width: "100%",
          minHeight: 46,
          borderRadius: 16,
          borderColor: state.isFocused ? "#7551FF" : "#E2E8F0",
          boxShadow: state.isFocused ? "0 0 0 3px rgba(117, 81, 255, 0.15)" : "none",
          backgroundColor: "#fff",
        }),
        container: (base) => ({
          ...base,
          width: "100%",
        }),
        valueContainer: (base) => ({
          ...base,
          flex: 1,
          minWidth: 0,
          paddingLeft: 12,
          paddingRight: 12,
        }),
        input: (base) => ({
          ...base,
          width: "100%",
        }),
        placeholder: (base) => ({
          ...base,
          color: "#A0AEC0",
          fontWeight: 500,
        }),
        menu: (base) => ({
          ...base,
          zIndex: 40,
          borderRadius: 14,
        }),
        multiValue: (base) => ({
          ...base,
          borderRadius: 999,
          backgroundColor: "rgba(117, 81, 255, 0.12)",
          border: "1px solid rgba(117, 81, 255, 0.18)",
          margin: "2px",
        }),
        multiValueLabel: (base) => ({
          ...base,
          fontSize: 12,
          fontWeight: 700,
          color: "#422AFB",
          paddingLeft: "8px",
          paddingRight: "4px",
        }),
        multiValueRemove: (base) => ({
          ...base,
          borderRadius: 999,
          color: "#7551FF",
          paddingLeft: "6px",
          paddingRight: "8px",
          ":hover": {
            backgroundColor: "rgba(117, 81, 255, 0.18)",
            color: "#422AFB",
          },
        }),
      }) satisfies StylesConfig<ChargeRuleSelectOption, true>,
    [],
  )

  function applySelection(nextIds: string[]) {
    setValue("chargeRuleUniqueIds", nextIds, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    })
  }

  async function handleChargeRuleSaved(savedInput: OrganizerChargeRuleInput) {
    const refreshed = await optionsQuery.refetch()
    const createdRule = refreshed.data?.find((item) => item.label === savedInput.label && item.description.includes(savedInput.name))

    if (!createdRule) {
      return
    }

    const nextIds = Array.from(new Set([...selectedChargeRuleUniqueIds, createdRule.value]))
    if (nextIds.length !== selectedChargeRuleUniqueIds.length) {
      applySelection(nextIds)
    }
  }

  function handleSelectChange(nextValue: MultiValue<ChargeRuleSelectOption>) {
    applySelection(nextValue.map((item) => item.value))
  }

  return (
    <Field.Root>
      <Flex align="center" gap={4} mb={3} w="full">
        <Box minW={0} flex="1">
          <Field.Label fontSize="sm" fontWeight="700" color="text.primary" mb={0}>
            Charge rules
          </Field.Label>
          <Field.HelperText mt={1}>Choose one or more buyer-facing charge rules for this event.</Field.HelperText>
        </Box>
        <Button
          type="button"
          variant="outline"
          borderRadius="full"
          h="32px"
          w="32px"
          minW="32px"
          p={0}
          ml="auto"
          flexShrink={0}
          onClick={() => setIsCreateDialogOpen(true)}
          title="Add charge rule"
          aria-label="Add charge rule"
        >
          <Plus size={14} />
        </Button>
      </Flex>

      <Controller
        control={control}
        name="chargeRuleUniqueIds"
        render={({ field }) => (
          <ReactSelect
            isMulti
            closeMenuOnSelect={false}
            hideSelectedOptions={false}
            isLoading={optionsQuery.isLoading}
            isDisabled={optionsQuery.isLoading}
            options={options}
            value={options.filter((option) => field.value?.includes(option.value))}
            onChange={(nextValue, actionMeta) => {
              if (actionMeta.action === "remove-value" || actionMeta.action === "pop-value" || actionMeta.action === "deselect-option") {
                const removed = actionMeta.removedValue as ChargeRuleSelectOption | undefined
                if (removed) {
                  setPendingRemoval(removed)
                }
                return
              }

              handleSelectChange(nextValue as MultiValue<ChargeRuleSelectOption>)
            }}
            components={{
              Option: ChargeRuleSelectOptionItem,
              MultiValueRemove: ChargeRuleMultiValueRemove,
            }}
            styles={multiSelectStyles}
            placeholder={optionsQuery.isLoading ? "Loading charge rules..." : "Select charge rules"}
            noOptionsMessage={() => "No charge rules available"}
          />
        )}
      />

      {selectedOptions.length > 0 ? (
        <Box mt={4} w="full" borderRadius="18px" border="1px solid" borderColor="border.subtle" bg="app.bg" px={4} py={4}>
          <Text fontSize="sm" fontWeight="700" color="text.primary" mb={3}>
            Mapped rules
          </Text>
          <Box maxH="240px" overflowY="auto" pr={1}>
            {selectedOptions.map((option) => (
              <Flex
                key={option.value}
                w="full"
                align="center"
                justify="space-between"
                gap={4}
                py={2.5}
                borderBottom="1px solid"
                borderColor="gray.100"
                _last={{ borderBottom: "none" }}
              >
                <Box flex="1" minW={0}>
                  <Text fontSize="sm" fontWeight="700" color="text.primary" lineClamp={1}>
                    {option.label}
                  </Text>
                  <Text fontSize="xs" color="text.secondary" lineClamp={1}>
                    {option.description}
                  </Text>
                </Box>
                <Button
                  type="button"
                  variant="ghost"
                  colorPalette="red"
                  borderRadius="full"
                  h="36px"
                  w="36px"
                  minW="36px"
                  p={0}
                  onClick={() => setPendingRemoval(option)}
                  aria-label={`Remove ${option.label}`}
                  title={`Remove ${option.label}`}
                >
                  <Trash2 size={15} />
                </Button>
              </Flex>
            ))}
          </Box>
        </Box>
      ) : null}

      <ChargeRuleDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSaved={handleChargeRuleSaved}
      />

      <Dialog.Root
        open={Boolean(pendingRemoval)}
        onOpenChange={(details) => {
          if (!details.open) {
            setPendingRemoval(null)
          }
        }}
        size="sm"
      >
        <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius={{ base: 0, md: "24px" }}
            maxW={{ base: "100vw", md: "520px" }}
            m={{ base: 0, md: "auto" }}
            overflow="hidden"
          >
            <Box px={6} pt={6} pb={4} borderBottom="1px solid" borderColor="gray.200">
              <Text fontSize="lg" fontWeight="800" color="gray.900">
                Remove charge rule?
              </Text>
              <Text fontSize="sm" color="gray.600" mt={1}>
                This will remove the mapping from the event. You can add it back later if needed.
              </Text>
            </Box>

            <Dialog.Body px={6} py={6}>
              <Text fontSize="sm" color="gray.700">
                {pendingRemoval?.label ?? "This charge rule"} will no longer be mapped to this event.
              </Text>
              <Flex pt={5} justify="space-between" gap={3} flexWrap="wrap">
                <Button
                  variant="outline"
                  colorPalette="gray"
                  borderRadius="14px"
                  h="44px"
                  px={6}
                  minW={{ base: "full", md: "140px" }}
                  onClick={() => setPendingRemoval(null)}
                >
                  Cancel
                </Button>
                <Button
                  borderRadius="14px"
                  h="44px"
                  px={6}
                  minW={{ base: "full", md: "160px" }}
                  colorPalette="red"
                  onClick={() => {
                    if (!pendingRemoval) {
                      return
                    }

                    applySelection(selectedChargeRuleUniqueIds.filter((id) => id !== pendingRemoval.value))
                    setPendingRemoval(null)
                  }}
                >
                  Remove
                </Button>
              </Flex>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Field.Root>
  )
}
